# Frontend Cache Sync Integration Guide

This guide shows how to integrate cache synchronization in your React Native frontend to automatically update the backend cache when family/user changes occur.

## Overview

When users are added/removed from families or families are deleted, the frontend sends WebSocket signals to the backend to invalidate and update the Redis cache. This ensures data consistency across all connected clients.

## Setup

### 1. Install Dependencies

The `cache-sync.service.ts` is already created and uses `socket.io-client`. Ensure it's installed:

```bash
cd frontend
npm install socket.io-client
# or
pnpm add socket.io-client
```

### 2. Import the Service

```typescript
import { cacheSyncService } from "../services/cache-sync.service";
```

### 3. Connect on App Start

Connect the cache sync service when the user logs in:

```typescript
// In your auth flow, after successful login
import { cacheSyncService } from "../services/cache-sync.service";

async function handleLogin(token: string) {
  // ... your login logic ...

  // Connect cache sync
  try {
    await cacheSyncService.connect(token);
    console.log("Cache sync connected");
  } catch (error) {
    console.error("Failed to connect cache sync:", error);
    // Non-critical - app can continue
  }
}
```

### 4. Disconnect on Logout

```typescript
async function handleLogout() {
  // Disconnect cache sync
  cacheSyncService.disconnect();

  // ... rest of logout logic ...
}
```

## Usage Examples

### Example 1: Adding a User to Family

```typescript
import { cacheSyncService } from "../services/cache-sync.service";
import { supabase } from "../services/supabase.client";

async function addMemberToFamily(
  familyId: string,
  userId: string,
  role: string = "member"
) {
  try {
    // 1. Add user to database
    const { error: dbError } = await supabase.from("family_members").insert({
      family_id: familyId,
      user_id: userId,
      role: role,
    });

    if (dbError) throw dbError;

    // 2. Notify backend to invalidate cache
    const result = await cacheSyncService.notifyUserAddedToFamily(
      familyId,
      userId,
      role
    );

    if (result.success) {
      console.log("✓ User added and cache updated");
    } else {
      console.warn("⚠ User added but cache sync failed:", result.error);
      // Continue anyway - cache will eventually be consistent
    }

    return { success: true };
  } catch (error) {
    console.error("Failed to add member:", error);
    return { success: false, error };
  }
}
```

### Example 2: Removing a User from Family

```typescript
async function removeMemberFromFamily(familyId: string, userId: string) {
  try {
    // 1. Remove user from database
    const { error: dbError } = await supabase
      .from("family_members")
      .delete()
      .eq("family_id", familyId)
      .eq("user_id", userId);

    if (dbError) throw dbError;

    // 2. Notify backend to invalidate cache
    const result = await cacheSyncService.notifyUserRemovedFromFamily(
      familyId,
      userId
    );

    if (result.success) {
      console.log("✓ User removed and cache updated");
    } else {
      console.warn("⚠ User removed but cache sync failed:", result.error);
    }

    return { success: true };
  } catch (error) {
    console.error("Failed to remove member:", error);
    return { success: false, error };
  }
}
```

### Example 3: Deleting a Family

```typescript
async function deleteFamily(familyId: string) {
  try {
    // 1. Delete family from database
    const { error: dbError } = await supabase
      .from("families")
      .delete()
      .eq("id", familyId);

    if (dbError) throw dbError;

    // 2. Notify backend to invalidate all family cache
    const result = await cacheSyncService.notifyFamilyDeleted(familyId);

    if (result.success) {
      console.log("✓ Family deleted and all cache invalidated");
    } else {
      console.warn("⚠ Family deleted but cache sync failed:", result.error);
    }

    return { success: true };
  } catch (error) {
    console.error("Failed to delete family:", error);
    return { success: false, error };
  }
}
```

### Example 4: Updating Member Role

```typescript
async function updateMemberRole(
  familyId: string,
  userId: string,
  newRole: string
) {
  try {
    // 1. Update role in database
    const { error: dbError } = await supabase
      .from("family_members")
      .update({ role: newRole })
      .eq("family_id", familyId)
      .eq("user_id", userId);

    if (dbError) throw dbError;

    // 2. Notify backend to invalidate role cache
    const result = await cacheSyncService.notifyMemberRoleUpdated(
      familyId,
      userId,
      newRole
    );

    if (result.success) {
      console.log("✓ Role updated and cache invalidated");
    } else {
      console.warn("⚠ Role updated but cache sync failed:", result.error);
    }

    return { success: true };
  } catch (error) {
    console.error("Failed to update role:", error);
    return { success: false, error };
  }
}
```

### Example 5: Manual Cache Refresh (Admin)

```typescript
async function refreshFamilyCache(familyId: string) {
  try {
    const result = await cacheSyncService.refreshFamilyCache(familyId);

    if (result.success) {
      console.log("✓ Family cache refreshed");
      // Optionally show success message to user
    } else {
      console.error("✗ Cache refresh failed:", result.error);
    }

    return result;
  } catch (error) {
    console.error("Failed to refresh cache:", error);
    return { success: false, error };
  }
}
```

## Listening to Cache Events

You can listen to cache-related events from the backend to update your UI in real-time:

### Example: React Component with Event Listeners

```typescript
import React, { useEffect } from 'react'
import { cacheSyncService } from '../services/cache-sync.service'

function FamilyMembersScreen({ familyId }) {
  const [members, setMembers] = useState([])

  useEffect(() => {
    // Listen for new members added
    cacheSyncService.onFamilyMemberAdded((data) => {
      if (data.family_id === familyId) {
        console.log('New member added:', data.user_id)
        // Refresh member list
        fetchMembers()
      }
    })

    // Listen for members removed
    cacheSyncService.onFamilyMemberRemoved((data) => {
      if (data.family_id === familyId) {
        console.log('Member removed:', data.user_id)
        // Refresh member list
        fetchMembers()
      }
    })

    // Listen for family deletion
    cacheSyncService.onFamilyDeleted((data) => {
      if (data.family_id === familyId) {
        console.log('Family was deleted')
        // Navigate away or show message
        navigation.navigate('Home')
      }
    })

    // Cleanup listeners
    return () => {
      cacheSyncService.removeAllListeners()
    }
  }, [familyId])

  return (
    // ... your component JSX ...
  )
}
```

### Example: Listen for Personal Events

```typescript
useEffect(() => {
  // Listen for when you're added to a family
  cacheSyncService.onAddedToFamily((data) => {
    console.log(
      `You were added to family ${data.family_id} with role ${data.role}`
    );
    // Show notification
    showNotification(
      "Added to Family",
      `You were added to a family as ${data.role}`
    );
    // Refresh family list
    fetchUserFamilies();
  });

  // Listen for when you're removed from a family
  cacheSyncService.onRemovedFromFamily((data) => {
    console.log(`You were removed from family ${data.family_id}`);
    // Show notification
    showNotification("Removed from Family", "You were removed from a family");
    // Refresh family list
    fetchUserFamilies();
  });

  // Listen for role updates
  cacheSyncService.onYourRoleUpdated((data) => {
    console.log(
      `Your role was updated to ${data.new_role} in family ${data.family_id}`
    );
    // Show notification
    showNotification("Role Updated", `Your role is now ${data.new_role}`);
    // Refresh permissions
    fetchUserRole(data.family_id);
  });

  return () => {
    cacheSyncService.removeAllListeners();
  };
}, []);
```

## Integration with Existing Services

### Update Family Service

Modify your `family.service.ts` to use the cache sync service:

```typescript
import { cacheSyncService } from "./cache-sync.service";

class FamilyService {
  async addMember(familyId: string, userId: string, role: string) {
    // Add to database
    const { error } = await supabase
      .from("family_members")
      .insert({ family_id: familyId, user_id: userId, role });

    if (error) throw error;

    // Sync cache
    await cacheSyncService.notifyUserAddedToFamily(familyId, userId, role);
  }

  async removeMember(familyId: string, userId: string) {
    // Remove from database
    const { error } = await supabase
      .from("family_members")
      .delete()
      .eq("family_id", familyId)
      .eq("user_id", userId);

    if (error) throw error;

    // Sync cache
    await cacheSyncService.notifyUserRemovedFromFamily(familyId, userId);
  }

  async deleteFamily(familyId: string) {
    // Delete from database
    const { error } = await supabase
      .from("families")
      .delete()
      .eq("id", familyId);

    if (error) throw error;

    // Sync cache
    await cacheSyncService.notifyFamilyDeleted(familyId);
  }

  async updateMemberRole(familyId: string, userId: string, newRole: string) {
    // Update in database
    const { error } = await supabase
      .from("family_members")
      .update({ role: newRole })
      .eq("family_id", familyId)
      .eq("user_id", userId);

    if (error) throw error;

    // Sync cache
    await cacheSyncService.notifyMemberRoleUpdated(familyId, userId, newRole);
  }
}

export const familyService = new FamilyService();
```

## Error Handling

Cache sync failures are non-critical. The app should continue working even if cache sync fails:

```typescript
async function performFamilyOperation() {
  try {
    // Critical: Database operation
    await updateDatabase();

    // Non-critical: Cache sync
    try {
      await cacheSyncService.notifySomething();
    } catch (cacheError) {
      // Log but don't fail
      console.warn("Cache sync failed:", cacheError);
      // Cache will eventually be consistent through TTL expiration
    }

    return { success: true };
  } catch (error) {
    // Only fail on database errors
    return { success: false, error };
  }
}
```

## Connection Status

Check if cache sync is connected before sending signals:

```typescript
if (cacheSyncService.isSocketConnected()) {
  await cacheSyncService.notifyUserAddedToFamily(familyId, userId, role);
} else {
  console.warn("Cache sync not connected, skipping...");
  // App continues normally
}
```

## Best Practices

### ✅ DO

- Connect cache sync after successful login
- Disconnect on logout
- Always perform database operations first, then cache sync
- Treat cache sync failures as warnings, not errors
- Listen to events to update UI in real-time
- Clean up event listeners in useEffect cleanup

### ❌ DON'T

- Don't fail operations if cache sync fails
- Don't wait for cache sync before showing success to user
- Don't retry cache sync indefinitely (socket handles reconnection)
- Don't forget to disconnect on logout
- Don't create multiple instances of cache sync service

## Testing

### Manual Testing

1. Add a user to a family from one device
2. Check that the backend logs show cache invalidation
3. Verify other devices receive the event and update their UI
4. Check Redis to confirm cache was invalidated

### Unit Tests

```typescript
import { cacheSyncService } from "../cache-sync.service";

describe("Cache Sync Service", () => {
  it("should notify user added to family", async () => {
    const result = await cacheSyncService.notifyUserAddedToFamily(
      "family-1",
      "user-1",
      "member"
    );
    expect(result.success).toBe(true);
  });
});
```

## Troubleshooting

### Cache sync not working?

1. Check WebSocket connection: `cacheSyncService.isSocketConnected()`
2. Verify backend is running and WebSocket gateway is active
3. Check JWT token is valid
4. Look for errors in backend logs
5. Verify firewall allows WebSocket connections

### Events not received?

1. Ensure event listeners are registered before the event occurs
2. Check that you're listening to the correct event names
3. Verify the user is in the family room (backend joins them automatically)

## Summary

The cache sync service provides:

- ✅ Real-time cache invalidation when family/user changes occur
- ✅ Automatic WebSocket reconnection
- ✅ Event broadcasting to all affected users
- ✅ Non-blocking, graceful degradation on failures
- ✅ Simple, intuitive API

---

**Next Steps**: Integrate the service into your family management screens and test with multiple devices.
