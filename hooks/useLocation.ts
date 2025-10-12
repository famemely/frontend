import { useState, useEffect, useCallback, useRef } from "react";
import websocketService from "../services/websocket.service";
import backgroundLocationService, {
  TrackingMode,
} from "../services/background-location.service";
import locationApiService from "../services/location-api.service";

interface LocationUpdate {
  user_id: string;
  family_id: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
  batteryLevel: number;
}

interface PresenceUpdate {
  user_id: string;
  family_id: string;
  status: "online" | "offline";
  timestamp: number;
  last_seen?: number;
}

interface UseLocationReturn {
  // Connection state
  isConnected: boolean;
  isTracking: boolean;
  currentMode: TrackingMode;
  error: string | null;

  // Actions
  connect: () => Promise<void>;
  disconnect: () => void;
  startTracking: (mode: TrackingMode) => Promise<void>;
  stopTracking: () => Promise<void>;
  checkIn: () => Promise<LocationUpdate | null>;

  // Data
  memberLocations: Map<string, LocationUpdate>;
  memberPresence: Map<string, PresenceUpdate>;
  memberGhost: Map<
    string,
    { enabled: boolean; scope: "global" | "family" | null }
  >;
  getMemberLocation: (userId: string) => LocationUpdate | undefined;
  getMemberPresence: (userId: string) => PresenceUpdate | undefined;
  refreshLocations: () => Promise<void>;
}

export function useLocation(familyId: string | null): UseLocationReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [currentMode, setCurrentMode] = useState<TrackingMode>("balanced");
  const [error, setError] = useState<string | null>(null);
  const [memberLocations, setMemberLocations] = useState<
    Map<string, LocationUpdate>
  >(new Map());
  const [memberPresence, setMemberPresence] = useState<
    Map<string, PresenceUpdate>
  >(new Map());
  const [memberGhost, setMemberGhost] = useState<
    Map<string, { enabled: boolean; scope: "global" | "family" | null }>
  >(new Map());

  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // WebSocket event handlers
  useEffect(() => {
    if (!familyId) return;

    const handleConnect = () => {
      console.log("[useLocation] WebSocket connected");
      setIsConnected(true);
      setError(null);

      // Process any queued location updates
      backgroundLocationService.processQueuedUpdates().catch(console.error);

      // Immediately send a one-time check-in on connect if we have a family
      if (familyId) {
        console.log(
          "[useLocation] Triggering immediate check-in after connect",
          { familyId }
        );
        backgroundLocationService
          .checkIn(familyId)
          .then(() => console.log("[useLocation] Immediate check-in completed"))
          .catch((e) =>
            console.warn("[useLocation] Immediate check-in failed", e)
          );
      }
    };

    const handleDisconnect = () => {
      console.log("[useLocation] WebSocket disconnected");
      setIsConnected(false);
    };

    const handleError = (err: any) => {
      console.error("[useLocation] WebSocket error:", err);
      setError(err.message || "WebSocket error");
    };

    const handleLocationUpdate = (update: LocationUpdate) => {
      if (update.family_id === familyId) {
        setMemberLocations((prev) => {
          const newMap = new Map(prev);
          newMap.set(update.user_id, update);
          return newMap;
        });
      }
    };

    const handlePresenceUpdate = (update: PresenceUpdate) => {
      if (update.family_id === familyId) {
        setMemberPresence((prev) => {
          const newMap = new Map(prev);
          newMap.set(update.user_id, update);
          return newMap;
        });
      }
    };

    const handleGhostUpdate = (update: any) => {
      // update can be global or family-scoped; reflect only when relevant family
      if (update.scope === "global" || update.family_id === familyId) {
        setMemberGhost((prev) => {
          const newMap = new Map(prev);
          newMap.set(update.user_id, {
            enabled: !!update.enabled,
            scope: update.scope,
          });
          return newMap;
        });
      }
    };

    // Register event listeners
    websocketService.on("connect", handleConnect);
    websocketService.on("disconnect", handleDisconnect);
    websocketService.on("error", handleError);
    websocketService.on("location_update", handleLocationUpdate);
    websocketService.on("presence_update", handlePresenceUpdate);
    websocketService.on("ghost_mode", handleGhostUpdate);

    // Check initial connection state
    setIsConnected(websocketService.isConnected());

    // Cleanup
    return () => {
      websocketService.off("connect", handleConnect);
      websocketService.off("disconnect", handleDisconnect);
      websocketService.off("error", handleError);
      websocketService.off("location_update", handleLocationUpdate);
      websocketService.off("presence_update", handlePresenceUpdate);
      websocketService.off("ghost_mode", handleGhostUpdate);
    };
  }, [familyId]);

  // Check tracking status
  useEffect(() => {
    const status = backgroundLocationService.getTrackingStatus();
    setIsTracking(status.isTracking);
    setCurrentMode(status.mode);
  }, []);

  const connect = useCallback(async () => {
    try {
      await websocketService.connect();

      // Start heartbeat
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
      }
      heartbeatRef.current = websocketService.startHeartbeat();

      // Join family room if familyId is set
      if (familyId) {
        await websocketService.joinFamily(familyId);
      }

      // Also trigger a one-time check-in once connected and joined
      if (familyId) {
        console.log("[useLocation] Post-join immediate check-in", { familyId });
        backgroundLocationService
          .checkIn(familyId)
          .catch((e) =>
            console.warn("[useLocation] Post-join check-in failed", e)
          );
      }

      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to connect");
      throw err;
    }
  }, [familyId]);

  const disconnect = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
    websocketService.disconnect();
  }, []);

  const startTracking = useCallback(
    async (mode: TrackingMode) => {
      if (!familyId) {
        throw new Error("No family selected");
      }

      try {
        await backgroundLocationService.startTracking(mode, familyId);
        setIsTracking(true);
        setCurrentMode(mode);
        setError(null);
      } catch (err: any) {
        setError(err.message || "Failed to start tracking");
        throw err;
      }
    },
    [familyId]
  );

  const stopTracking = useCallback(async () => {
    try {
      await backgroundLocationService.stopTracking();
      setIsTracking(false);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to stop tracking");
      throw err;
    }
  }, []);

  const checkIn = useCallback(async (): Promise<LocationUpdate | null> => {
    if (!familyId) {
      throw new Error("No family selected");
    }

    try {
      const location = await backgroundLocationService.checkIn(familyId);
      setError(null);
      return {
        user_id: "current_user", // Will be set by backend
        family_id: familyId,
        ...location,
      };
    } catch (err: any) {
      setError(err.message || "Failed to check in");
      throw err;
    }
  }, [familyId]);

  const refreshLocations = useCallback(async () => {
    if (!familyId) return;

    try {
      const locations = await locationApiService.getFamilyLocations(familyId);
      const newMap = new Map<string, LocationUpdate>();

      locations.forEach((loc) => {
        newMap.set(loc.user_id, {
          ...loc,
          family_id: familyId,
        });
      });

      setMemberLocations(newMap);
      setError(null);
    } catch (err: any) {
      console.error("[useLocation] Failed to refresh locations:", err);
      setError(err.message || "Failed to refresh locations");
    }
  }, [familyId]);

  const getMemberLocation = useCallback(
    (userId: string): LocationUpdate | undefined => {
      return memberLocations.get(userId);
    },
    [memberLocations]
  );

  const getMemberPresence = useCallback(
    (userId: string): PresenceUpdate | undefined => {
      return memberPresence.get(userId);
    },
    [memberPresence]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
      }
    };
  }, []);

  return {
    isConnected,
    isTracking,
    currentMode,
    error,
    connect,
    disconnect,
    startTracking,
    stopTracking,
    checkIn,
    memberLocations,
    memberPresence,
    memberGhost,
    getMemberLocation,
    getMemberPresence,
    refreshLocations,
  };
}
