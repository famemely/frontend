/**
 * Cache Sync Service
 *
 * This service provides methods to notify the backend about family/user changes
 * so the backend can invalidate and update the Redis cache accordingly.
 *
 * Uses WebSocket for real-time cache synchronization.
 */

import { io, Socket } from "socket.io-client";

class CacheSyncService {
  private socket: Socket | null = null;
  private isConnected: boolean = false;

  /**
   * Initialize the WebSocket connection
   */
  async connect(
    token: string,
    backendUrl: string = process.env.EXPO_PUBLIC_BACKEND_URL ||
      "http://localhost:3000"
  ) {
    if (this.socket?.connected) {
      console.log("WebSocket already connected");
      return;
    }

    this.socket = io(backendUrl, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    return new Promise<void>((resolve, reject) => {
      if (!this.socket) {
        reject(new Error("Socket not initialized"));
        return;
      }

      this.socket.on("connect", () => {
        console.log("Cache sync WebSocket connected");
        this.isConnected = true;
        resolve();
      });

      this.socket.on("connect_error", (error) => {
        console.error("WebSocket connection error:", error);
        this.isConnected = false;
        reject(error);
      });

      this.socket.on("disconnect", () => {
        console.log("Cache sync WebSocket disconnected");
        this.isConnected = false;
      });
    });
  }

  /**
   * Disconnect the WebSocket
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  /**
   * Check if connected
   */
  isSocketConnected(): boolean {
    return this.isConnected && this.socket?.connected === true;
  }

  /**
   * Notify backend that a user was added to a family
   * This will invalidate the cache for family members and user's family list
   */
  async notifyUserAddedToFamily(
    familyId: string,
    addedUserId: string,
    role: string
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    if (!this.socket || !this.isConnected) {
      console.warn("WebSocket not connected, skipping cache invalidation");
      return { success: false, error: "Not connected" };
    }

    return new Promise((resolve) => {
      this.socket!.emit(
        "user_added_to_family",
        {
          family_id: familyId,
          added_user_id: addedUserId,
          role,
        },
        (response: { success: boolean; message?: string; error?: string }) => {
          if (response.success) {
            console.log(
              `✓ Cache invalidated: User ${addedUserId} added to family ${familyId}`
            );
          } else {
            console.error(`✗ Cache invalidation failed:`, response.error);
          }
          resolve(response);
        }
      );
    });
  }

  /**
   * Notify backend that a user was removed from a family
   * This will invalidate the cache for family members and user's family list
   */
  async notifyUserRemovedFromFamily(
    familyId: string,
    removedUserId: string
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    if (!this.socket || !this.isConnected) {
      console.warn("WebSocket not connected, skipping cache invalidation");
      return { success: false, error: "Not connected" };
    }

    return new Promise((resolve) => {
      this.socket!.emit(
        "user_removed_from_family",
        {
          family_id: familyId,
          removed_user_id: removedUserId,
        },
        (response: { success: boolean; message?: string; error?: string }) => {
          if (response.success) {
            console.log(
              `✓ Cache invalidated: User ${removedUserId} removed from family ${familyId}`
            );
          } else {
            console.error(`✗ Cache invalidation failed:`, response.error);
          }
          resolve(response);
        }
      );
    });
  }

  /**
   * Notify backend that a family was deleted
   * This will invalidate all cache related to the family
   */
  async notifyFamilyDeleted(
    familyId: string
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    if (!this.socket || !this.isConnected) {
      console.warn("WebSocket not connected, skipping cache invalidation");
      return { success: false, error: "Not connected" };
    }

    return new Promise((resolve) => {
      this.socket!.emit(
        "family_deleted",
        {
          family_id: familyId,
        },
        (response: { success: boolean; message?: string; error?: string }) => {
          if (response.success) {
            console.log(`✓ Cache invalidated: Family ${familyId} deleted`);
          } else {
            console.error(`✗ Cache invalidation failed:`, response.error);
          }
          resolve(response);
        }
      );
    });
  }

  /**
   * Notify backend that a member's role was updated
   * This will invalidate the role cache
   */
  async notifyMemberRoleUpdated(
    familyId: string,
    userId: string,
    newRole: string
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    if (!this.socket || !this.isConnected) {
      console.warn("WebSocket not connected, skipping cache invalidation");
      return { success: false, error: "Not connected" };
    }

    return new Promise((resolve) => {
      this.socket!.emit(
        "member_role_updated",
        {
          family_id: familyId,
          user_id: userId,
          new_role: newRole,
        },
        (response: { success: boolean; message?: string; error?: string }) => {
          if (response.success) {
            console.log(
              `✓ Cache invalidated: Role updated for ${userId} in family ${familyId}`
            );
          } else {
            console.error(`✗ Cache invalidation failed:`, response.error);
          }
          resolve(response);
        }
      );
    });
  }

  /**
   * Request manual cache refresh for a family (admin operation)
   */
  async refreshFamilyCache(
    familyId: string
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    if (!this.socket || !this.isConnected) {
      console.warn("WebSocket not connected, skipping cache refresh");
      return { success: false, error: "Not connected" };
    }

    return new Promise((resolve) => {
      this.socket!.emit(
        "refresh_family_cache",
        {
          family_id: familyId,
        },
        (response: { success: boolean; message?: string; error?: string }) => {
          if (response.success) {
            console.log(`✓ Cache refreshed for family ${familyId}`);
          } else {
            console.error(`✗ Cache refresh failed:`, response.error);
          }
          resolve(response);
        }
      );
    });
  }

  /**
   * Listen for cache-related events from the backend
   */
  onFamilyMemberAdded(
    callback: (data: {
      family_id: string;
      user_id: string;
      role: string;
      added_by: string;
      timestamp: number;
    }) => void
  ) {
    if (!this.socket) return;

    this.socket.on("family_member_added", callback);
  }

  onFamilyMemberRemoved(
    callback: (data: {
      family_id: string;
      user_id: string;
      removed_by: string;
      timestamp: number;
    }) => void
  ) {
    if (!this.socket) return;

    this.socket.on("family_member_removed", callback);
  }

  onFamilyDeleted(
    callback: (data: {
      family_id: string;
      deleted_by: string;
      timestamp: number;
    }) => void
  ) {
    if (!this.socket) return;

    this.socket.on("family_deleted", callback);
  }

  onMemberRoleUpdated(
    callback: (data: {
      family_id: string;
      user_id: string;
      new_role: string;
      updated_by: string;
      timestamp: number;
    }) => void
  ) {
    if (!this.socket) return;

    this.socket.on("member_role_updated", callback);
  }

  onYourRoleUpdated(
    callback: (data: {
      family_id: string;
      new_role: string;
      updated_by: string;
      timestamp: number;
    }) => void
  ) {
    if (!this.socket) return;

    this.socket.on("your_role_updated", callback);
  }

  onAddedToFamily(
    callback: (data: {
      family_id: string;
      role: string;
      added_by: string;
      timestamp: number;
    }) => void
  ) {
    if (!this.socket) return;

    this.socket.on("added_to_family", callback);
  }

  onRemovedFromFamily(
    callback: (data: {
      family_id: string;
      removed_by: string;
      timestamp: number;
    }) => void
  ) {
    if (!this.socket) return;

    this.socket.on("removed_from_family", callback);
  }

  onCacheRefreshed(
    callback: (data: {
      family_id: string;
      refreshed_by: string;
      timestamp: number;
    }) => void
  ) {
    if (!this.socket) return;

    this.socket.on("cache_refreshed", callback);
  }

  /**
   * Remove all event listeners
   */
  removeAllListeners() {
    if (!this.socket) return;

    this.socket.off("family_member_added");
    this.socket.off("family_member_removed");
    this.socket.off("family_deleted");
    this.socket.off("member_role_updated");
    this.socket.off("your_role_updated");
    this.socket.off("added_to_family");
    this.socket.off("removed_from_family");
    this.socket.off("cache_refreshed");
  }
}

// Export singleton instance
export const cacheSyncService = new CacheSyncService();
