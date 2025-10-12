import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import * as Battery from "expo-battery";
import AsyncStorage from "@react-native-async-storage/async-storage";
import websocketService from "./websocket.service";
import locationApiService from "./location-api.service";

const LOCATION_TASK_NAME = "background-location-task";

export type TrackingMode = "high" | "balanced" | "power_saver" | "manual";

interface LocationUpdate {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude?: number;
  bearing?: number;
  speed?: number;
  timestamp: number;
  batteryLevel: number;
  batteryState: string;
}

class BackgroundLocationService {
  private static instance: BackgroundLocationService;
  private isTracking = false;
  private currentMode: TrackingMode = "balanced";
  private isGhostMode = false;
  private currentFamilyId: string | null = null;

  private constructor() {}

  static getInstance(): BackgroundLocationService {
    if (!BackgroundLocationService.instance) {
      BackgroundLocationService.instance = new BackgroundLocationService();
    }
    return BackgroundLocationService.instance;
  }

  async initialize(): Promise<void> {
    // Request foreground permissions first
    const { status: foregroundStatus } =
      await Location.requestForegroundPermissionsAsync();
    if (foregroundStatus !== "granted") {
      throw new Error("Foreground location permission not granted");
    }

    // Request background permissions
    const { status: backgroundStatus } =
      await Location.requestBackgroundPermissionsAsync();
    if (backgroundStatus !== "granted") {
      throw new Error(
        "Background location permission not granted. Please enable 'Allow all the time' in location settings."
      );
    }

    console.log("[Location] ✅ Permissions granted and initialized");
  }

  async startTracking(mode: TrackingMode, familyId: string): Promise<void> {
    if (this.isTracking) {
      console.log("[Location] Already tracking");
      return;
    }

    // Check and request foreground permissions
    let { status: foregroundStatus } =
      await Location.getForegroundPermissionsAsync();

    if (foregroundStatus !== "granted") {
      console.log("[Location] 📍 Requesting foreground location permission...");
      const result = await Location.requestForegroundPermissionsAsync();
      foregroundStatus = result.status;

      if (foregroundStatus !== "granted") {
        throw new Error(
          "Location permission denied. Please enable location access in Settings."
        );
      }
    }

    // Check and request background permissions
    let { status: backgroundStatus } =
      await Location.getBackgroundPermissionsAsync();

    if (backgroundStatus !== "granted") {
      console.log("[Location] 🔄 Requesting background location permission...");
      const result = await Location.requestBackgroundPermissionsAsync();
      backgroundStatus = result.status;

      if (backgroundStatus !== "granted") {
        throw new Error(
          "Background location permission denied. Please go to Settings → Famemely → Permissions → Location and select 'Allow all the time'."
        );
      }
    }

    console.log("[Location] ✅ All permissions granted!");

    this.currentMode = mode;
    this.currentFamilyId = familyId;

    await AsyncStorage.setItem("tracking_mode", mode);
    await AsyncStorage.setItem("tracking_family_id", familyId);

    const interval = this.getUpdateInterval(mode);
    const accuracy = this.getAccuracyLevel(mode);
    const distanceInterval = this.getDistanceInterval(mode);

    try {
      await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
        accuracy,
        timeInterval: interval,
        distanceInterval,
        foregroundService: {
          notificationTitle: "Famemely Location Sharing",
          notificationBody: "Sharing your location with family",
          notificationColor: "#4F46E5",
        },
        pausesUpdatesAutomatically: mode === "power_saver",
        activityType: Location.ActivityType.Other,
      });

      this.isTracking = true;
      console.log(`[Location] Started tracking in ${mode} mode`);
    } catch (error) {
      console.error("[Location] Failed to start tracking:", error);
      throw error;
    }
  }

  async stopTracking(): Promise<void> {
    if (!this.isTracking) {
      return;
    }

    try {
      const hasStarted = await Location.hasStartedLocationUpdatesAsync(
        LOCATION_TASK_NAME
      );
      if (hasStarted) {
        await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
      }

      this.isTracking = false;
      this.currentFamilyId = null;
      await AsyncStorage.removeItem("tracking_mode");
      await AsyncStorage.removeItem("tracking_family_id");

      console.log("[Location] Stopped tracking");
    } catch (error) {
      console.error("[Location] Failed to stop tracking:", error);
      throw error;
    }
  }

  async checkIn(familyId: string): Promise<LocationUpdate> {
    try {
      console.log("[Location] ▶️ Check-in initiated", { familyId });
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const batteryLevel = await Battery.getBatteryLevelAsync();
      const batteryState = await Battery.getBatteryStateAsync();

      const locationUpdate: LocationUpdate = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy || 0,
        altitude: location.coords.altitude || undefined,
        bearing: location.coords.heading || undefined,
        speed: location.coords.speed || undefined,
        timestamp: location.timestamp,
        batteryLevel: Math.round(batteryLevel * 100),
        batteryState: this.getBatteryStateString(batteryState),
      };

      // Send via WebSocket if connected, otherwise fallback to REST and queue
      if (websocketService.isConnected()) {
        try {
          await websocketService.sendLocationUpdate({
            family_id: familyId,
            ...locationUpdate,
          });
          console.log("[Location] ✅ Check-in sent via WS", {
            family_id: familyId,
            ts: locationUpdate.timestamp,
          });
        } catch (e) {
          console.warn(
            "[Location] WS send failed on check-in, falling back to REST",
            e
          );
          try {
            await locationApiService.updateLocation({
              family_id: familyId,
              ...locationUpdate,
            } as any);
            console.log("[Location] ✅ Check-in sent via REST fallback");
          } catch (restErr) {
            console.error(
              "[Location] ❌ REST fallback failed, queueing",
              restErr
            );
            await this.queueLocationUpdate(familyId, locationUpdate);
          }
        }
      } else {
        console.warn(
          "[Location] WS not connected on check-in, attempting REST fallback"
        );
        try {
          await locationApiService.updateLocation({
            family_id: familyId,
            ...locationUpdate,
          } as any);
          console.log("[Location] ✅ Check-in sent via REST (WS offline)");
        } catch (restErr) {
          console.error(
            "[Location] ❌ REST fallback failed, queueing",
            restErr
          );
          await this.queueLocationUpdate(familyId, locationUpdate);
        }
      }

      return locationUpdate;
    } catch (error) {
      console.error("[Location] Check-in failed:", error);
      throw error;
    }
  }

  private async processLocationUpdate(
    location: Location.LocationObject
  ): Promise<void> {
    try {
      console.log("[Background Location] Processing periodic update...");
      const familyId =
        this.currentFamilyId ||
        (await AsyncStorage.getItem("tracking_family_id"));
      if (!familyId) {
        console.warn("[Location] No family ID set, skipping update");
        return;
      }

      const batteryLevel = await Battery.getBatteryLevelAsync();
      const batteryState = await Battery.getBatteryStateAsync();

      const locationUpdate: LocationUpdate = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy || 0,
        altitude: location.coords.altitude || undefined,
        bearing: location.coords.heading || undefined,
        speed: location.coords.speed || undefined,
        timestamp: location.timestamp,
        batteryLevel: Math.round(batteryLevel * 100),
        batteryState: this.getBatteryStateString(batteryState),
      };

      // Apply ghost mode if enabled
      if (this.isGhostMode) {
        // Blur location - add random offset
        const blurRadius = 0.01; // ~1km
        locationUpdate.latitude += (Math.random() - 0.5) * blurRadius;
        locationUpdate.longitude += (Math.random() - 0.5) * blurRadius;
      }

      // Send via WebSocket if connected, else REST fallback, else queue
      if (websocketService.isConnected()) {
        try {
          await websocketService.sendLocationUpdate({
            family_id: familyId,
            ...locationUpdate,
          });
          console.log("[Background Location] ✅ Sent via WS", {
            family_id: familyId,
            ts: locationUpdate.timestamp,
          });
        } catch (e) {
          console.warn(
            "[Background Location] WS send failed, trying REST fallback",
            e
          );
          try {
            await locationApiService.updateLocation({
              family_id: familyId,
              ...locationUpdate,
            } as any);
            console.log("[Background Location] ✅ Sent via REST fallback");
          } catch (restErr) {
            console.error(
              "[Background Location] ❌ REST fallback failed, queueing",
              restErr
            );
            await this.queueLocationUpdate(familyId, locationUpdate);
          }
        }
      } else {
        try {
          await locationApiService.updateLocation({
            family_id: familyId,
            ...locationUpdate,
          } as any);
          console.log("[Background Location] ✅ Sent via REST (WS offline)");
        } catch (restErr) {
          console.warn("[Background Location] REST failed, queueing", restErr);
          await this.queueLocationUpdate(familyId, locationUpdate);
        }
      }

      console.log("[Location] Update processed");
    } catch (error) {
      console.error("[Location] Failed to process update:", error);
    }
  }

  private async queueLocationUpdate(
    familyId: string,
    location: LocationUpdate
  ): Promise<void> {
    try {
      const queueKey = "location_queue";
      const existingQueue = await AsyncStorage.getItem(queueKey);
      const queue = existingQueue ? JSON.parse(existingQueue) : [];

      queue.push({
        family_id: familyId,
        ...location,
        queued_at: Date.now(),
      });

      // Keep only last 50 updates
      const trimmedQueue = queue.slice(-50);
      await AsyncStorage.setItem(queueKey, JSON.stringify(trimmedQueue));

      console.log("[Location] Update queued for later");
    } catch (error) {
      console.error("[Location] Failed to queue update:", error);
    }
  }

  async processQueuedUpdates(): Promise<void> {
    try {
      const queueKey = "location_queue";
      const existingQueue = await AsyncStorage.getItem(queueKey);
      if (!existingQueue) return;

      const queue = JSON.parse(existingQueue);
      if (queue.length === 0) return;

      console.log(`[Location] Processing ${queue.length} queued updates`);

      for (const update of queue) {
        try {
          if (websocketService.isConnected()) {
            await websocketService.sendLocationUpdate(update);
          } else {
            await locationApiService.updateLocation(update as any);
          }
        } catch (error) {
          console.error("[Location] Failed to send queued update:", error);
        }
      }

      // Clear queue
      await AsyncStorage.removeItem(queueKey);
      console.log("[Location] Queued updates processed");
    } catch (error) {
      console.error("[Location] Failed to process queue:", error);
    }
  }

  setGhostMode(enabled: boolean): void {
    this.isGhostMode = enabled;
    AsyncStorage.setItem("ghost_mode", enabled ? "true" : "false");
  }

  async getGhostMode(): Promise<boolean> {
    const value = await AsyncStorage.getItem("ghost_mode");
    return value === "true";
  }

  getTrackingStatus(): { isTracking: boolean; mode: TrackingMode } {
    return {
      isTracking: this.isTracking,
      mode: this.currentMode,
    };
  }

  private getUpdateInterval(mode: TrackingMode): number {
    switch (mode) {
      case "high":
        return 30 * 1000; // 30 seconds
      case "balanced":
        return 5 * 60 * 1000; // 5 minutes
      case "power_saver":
        return 30 * 60 * 1000; // 30 minutes
      case "manual":
        return 0; // No automatic updates
      default:
        return 5 * 60 * 1000;
    }
  }

  private getAccuracyLevel(mode: TrackingMode): Location.Accuracy {
    switch (mode) {
      case "high":
        return Location.Accuracy.High;
      case "balanced":
        return Location.Accuracy.Balanced;
      case "power_saver":
        return Location.Accuracy.Low;
      default:
        return Location.Accuracy.Balanced;
    }
  }

  private getDistanceInterval(mode: TrackingMode): number {
    switch (mode) {
      case "high":
        return 10; // 10 meters
      case "balanced":
        return 50; // 50 meters
      case "power_saver":
        return 200; // 200 meters
      default:
        return 50;
    }
  }

  private getBatteryStateString(state: Battery.BatteryState): string {
    switch (state) {
      case Battery.BatteryState.CHARGING:
        return "charging";
      case Battery.BatteryState.FULL:
        return "full";
      case Battery.BatteryState.UNPLUGGED:
        return "unplugged";
      default:
        return "unknown";
    }
  }
}

export const backgroundLocationService =
  BackgroundLocationService.getInstance();
export default backgroundLocationService;

// Register background location task at module scope (once)
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }: any) => {
  try {
    if (error) {
      console.error("[Background Location] Task error:", error);
      return;
    }
    const locations = data?.locations;
    if (locations && locations.length > 0) {
      await backgroundLocationService["processLocationUpdate"](locations[0]);
    }
  } catch (e) {
    console.error("[Background Location] Task handler failed:", e);
  }
});
