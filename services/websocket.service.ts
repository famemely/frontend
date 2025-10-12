import { io, Socket } from "socket.io-client";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { AUTH_CONFIG, resolveApiBaseUrl } from "../constants/auth.config";

interface LocationUpdate {
  user_id: string;
  family_id: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
  batteryLevel: number;
}

interface GeofenceAlert {
  alert_id: string;
  user_id: string;
  user_name: string;
  geofence_name: string;
  action: "entry" | "exit";
  timestamp: number;
}

interface PresenceUpdate {
  user_id: string;
  family_id: string;
  status: "online" | "offline";
  timestamp: number;
  last_seen?: number;
}

interface GhostModeUpdate {
  user_id: string;
  family_id?: string; // optional for global scope
  enabled: boolean;
  scope: "global" | "family";
  timestamp?: number;
}

type EventCallback = (...args: any[]) => void;

class WebSocketService {
  private static instance: WebSocketService;
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private isManualDisconnect = false;
  private eventListeners = new Map<string, Set<EventCallback>>();
  // Ghost mode state: global and per-family
  private globalGhost = new Map<string, boolean>(); // user_id -> enabled
  private familyGhost = new Map<string, boolean>(); // `${family_id}:${user_id}` -> enabled

  private constructor() {}

  static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }

  async connect(): Promise<void> {
    if (this.socket?.connected) {
      console.log("[WebSocket] Already connected");
      return;
    }

    return new Promise((resolve, reject) => {
      (async () => {
        try {
          const token = await AsyncStorage.getItem(
            AUTH_CONFIG.STORAGE_KEYS.APP_TOKEN
          );
          if (!token) {
            console.warn("[WebSocket] No authentication token available");
            reject(new Error("No authentication token available"));
            return;
          }

          const rawUrl =
            Constants.expoConfig?.extra?.EXPO_PUBLIC_API_BASE_URL ||
            process.env.EXPO_PUBLIC_API_BASE_URL ||
            AUTH_CONFIG.API.BASE_URL;
          const apiUrl = resolveApiBaseUrl(rawUrl, Platform.OS);
          const wsUrl = apiUrl.replace(/^http/, "ws");

          console.log("[WebSocket] Connecting to:", wsUrl);
          console.log(
            "[WebSocket] Token found:",
            token.substring(0, 20) + "..."
          );

          this.socket = io(wsUrl, {
            auth: {
              token,
            },
            transports: ["websocket", "polling"],
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            reconnectionAttempts: this.maxReconnectAttempts,
            timeout: 10000,
          });

          // Wait for connection to be established
          this.socket.once("connect", () => {
            console.log("[WebSocket] ✅ Connected successfully");
            this.reconnectAttempts = 0;
            this.emitToListeners("connect");
            resolve();
          });

          this.socket.once("connect_error", (error) => {
            console.error("[WebSocket] ❌ Connection error:", error.message);
            this.emitToListeners("error", error);
            reject(error);
          });

          this.setupEventHandlers();
          this.isManualDisconnect = false;
          this.reconnectAttempts = 0;

          console.log(
            "[WebSocket] Connection initiated, waiting for handshake..."
          );
        } catch (error) {
          console.error("[WebSocket] Connection error:", error);
          reject(error);
        }
      })();
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.isManualDisconnect = true;
      this.socket.disconnect();
      this.socket = null;
      console.log("[WebSocket] Disconnected");
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  private setupEventHandlers(): void {
    if (!this.socket) return;

    // Note: connect handler is set up in connect() method using .once()
    // Here we set up the regular handlers that persist across reconnections

    this.socket.on("connect", () => {
      console.log("[WebSocket] 🔄 Reconnected successfully");
      this.reconnectAttempts = 0;
      this.emitToListeners("connect");
    });

    this.socket.on("connect_error", (error) => {
      console.error("[WebSocket] ❌ Connection error:", error.message);
      console.error("[WebSocket] Error details:", error);
      this.emitToListeners("error", error);
    });

    this.socket.on("disconnect", (reason) => {
      console.log("[WebSocket] 🔌 Disconnected:", reason);
      this.emitToListeners("disconnect", reason);

      if (
        !this.isManualDisconnect &&
        this.reconnectAttempts < this.maxReconnectAttempts
      ) {
        this.reconnectAttempts++;
        console.log(
          `[WebSocket] 🔄 Reconnecting... (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`
        );
      }
    });

    this.socket.on("error", (error) => {
      console.error("[WebSocket] ❌ Socket error:", error);
      this.emitToListeners("error", error);
    });

    this.socket.on("connected", (data) => {
      console.log("[WebSocket] 🎉 Connection acknowledged:", data);
      this.emitToListeners("connected", data);
    });

    this.socket.on("location_update", (data: LocationUpdate) => {
      console.log("[WebSocket] � Location update received", {
        user_id: data.user_id,
        family_id: data.family_id,
        lat: data.latitude,
        lng: data.longitude,
        acc: data.accuracy,
        ts: data.timestamp,
        battery: data.batteryLevel,
      });
      this.emitToListeners("location_update", data);
    });

    this.socket.on("geofence_alert", (data: GeofenceAlert) => {
      console.log("[WebSocket] 🚨 Geofence alert:", data.geofence_name);
      this.emitToListeners("geofence_alert", data);
    });

    this.socket.on("presence_update", (data: PresenceUpdate) => {
      console.log("[WebSocket] 👤 Presence update:", data.user_id, data.status);
      this.emitToListeners("presence_update", data);
    });

    this.socket.on("notification", (data: any) => {
      console.log("[WebSocket] 🔔 Notification received:", data.type);
      this.emitToListeners("notification", data);
    });

    // Ghost mode updates from server
    this.socket.on("ghost_mode", (data: GhostModeUpdate) => {
      console.log(
        "[WebSocket] 👻 Ghost mode update:",
        data.user_id,
        data.scope,
        data.enabled
      );
      if (data.scope === "global") {
        this.globalGhost.set(data.user_id, data.enabled);
      } else if (data.scope === "family" && data.family_id) {
        this.familyGhost.set(`${data.family_id}:${data.user_id}`, data.enabled);
      }
      this.emitToListeners("ghost_mode", data);
    });

    this.socket.on("location_ack", (data: any) => {
      console.log("[WebSocket] ✓ Location acknowledged");
      this.emitToListeners("location_ack", data);
    });

    this.socket.on("pong", (data: any) => {
      this.emitToListeners("pong", data);
    });
  }

  // Event listener management
  on(event: string, callback: EventCallback): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);
  }

  off(event: string, callback: EventCallback): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  private emitToListeners(event: string, ...args: any[]): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach((callback) => {
        try {
          callback(...args);
        } catch (error) {
          console.error(`[WebSocket] Error in ${event} listener:`, error);
        }
      });
    }
  }

  // Send location update
  async sendLocationUpdate(location: {
    family_id: string;
    latitude: number;
    longitude: number;
    accuracy: number;
    timestamp: number;
    batteryLevel: number;
    batteryState: string;
  }): Promise<void> {
    if (!this.socket?.connected) {
      console.warn("[WebSocket] ⚠️ sendLocationUpdate while disconnected", {
        family_id: location.family_id,
        lat: location.latitude,
        lng: location.longitude,
        ts: location.timestamp,
      });
      throw new Error("WebSocket not connected");
    }

    return new Promise((resolve, reject) => {
      const startedAt = Date.now();
      console.log("[WebSocket] 📤 Sending location_update", {
        family_id: location.family_id,
        lat: location.latitude,
        lng: location.longitude,
        acc: location.accuracy,
        ts: location.timestamp,
        battery: location.batteryLevel,
        state: location.batteryState,
      });
      this.socket!.emit("location_update", location, (response: any) => {
        const took = Date.now() - startedAt;
        if (response?.success) {
          console.log("[WebSocket] ✅ location_update ack", {
            tookMs: took,
            serverTs: response.timestamp,
          });
          resolve();
        } else {
          console.error("[WebSocket] ❌ location_update failed", response);
          reject(new Error("Location update failed"));
        }
      });

      // Timeout after 5 seconds
      setTimeout(() => {
        console.error("[WebSocket] ⏱️ location_update timeout (5s)");
        reject(new Error("Location update timeout"));
      }, 5000);
    });
  }

  // Join family room
  async joinFamily(familyId: string): Promise<void> {
    if (!this.socket?.connected) {
      throw new Error("WebSocket not connected");
    }

    return new Promise((resolve, reject) => {
      this.socket!.emit(
        "join_family",
        { family_id: familyId },
        (response: any) => {
          if (response?.success) {
            resolve();
          } else {
            reject(new Error("Failed to join family"));
          }
        }
      );

      setTimeout(() => reject(new Error("Join family timeout")), 5000);
    });
  }

  // Leave family room
  async leaveFamily(familyId: string): Promise<void> {
    if (!this.socket?.connected) {
      throw new Error("WebSocket not connected");
    }

    return new Promise((resolve, reject) => {
      this.socket!.emit(
        "leave_family",
        { family_id: familyId },
        (response: any) => {
          resolve();
        }
      );

      setTimeout(() => resolve(), 5000);
    });
  }

  // Send ping
  ping(): void {
    if (this.socket?.connected) {
      this.socket.emit("ping");
    }
  }

  // Start heartbeat
  startHeartbeat(intervalMs: number = 30000): ReturnType<typeof setInterval> {
    return setInterval(() => {
      if (this.socket?.connected) {
        this.ping();
      }
    }, intervalMs);
  }

  // Announce local ghost mode change to server
  async setGhostMode(params: {
    enabled: boolean;
    scope: "global" | "family";
    family_id?: string;
  }): Promise<void> {
    if (!this.socket?.connected) return;
    return new Promise((resolve) => {
      this.socket!.emit("ghost_mode", params, () => resolve());
    });
  }

  // Query functions
  getGhostStatus(
    userId: string,
    familyId?: string
  ): {
    enabled: boolean;
    scope: "global" | "family" | null;
  } {
    if (this.globalGhost.get(userId)) {
      return { enabled: true, scope: "global" };
    }
    if (familyId && this.familyGhost.get(`${familyId}:${userId}`)) {
      return { enabled: true, scope: "family" };
    }
    return { enabled: false, scope: null };
  }
}

export const websocketService = WebSocketService.getInstance();
export default websocketService;
