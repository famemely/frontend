/**
 * useFamily Hook - React hook for family management
 * Implements FR-2.1, FR-2.2, FR-2.3, FR-2.4
 */

import { useState, useEffect, useCallback } from "react";
import { familyService } from "@/services/family.service";
import {
  FamilyWithMembers,
  CreateFamilyDto,
  UpdateFamilyDto,
  CreateInviteDto,
  FamilyInvite,
  FamilyPermissions,
  UpdateMemberRoleDto,
} from "@/types/family.types";

export function useFamily() {
  const [families, setFamilies] = useState<FamilyWithMembers[]>([]);
  const [currentFamilyId, setCurrentFamilyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // FR-2.2: Get all user's families
  const loadFamilies = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await familyService.getUserFamilies();
      setFamilies(data);

      // Set first family as current if none selected
      if (!currentFamilyId && data.length > 0) {
        setCurrentFamilyId(data[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load families");
    } finally {
      setLoading(false);
    }
  }, [currentFamilyId]);

  // Load families on mount
  useEffect(() => {
    loadFamilies();
  }, []);

  // Get current family
  const currentFamily = families.find((f) => f.id === currentFamilyId);

  // FR-2.2: Switch between families
  const switchFamily = useCallback((familyId: string) => {
    setCurrentFamilyId(familyId);
  }, []);

  // FR-2.1: Create new family
  const createFamily = useCallback(
    async (data: CreateFamilyDto) => {
      setLoading(true);
      setError(null);
      try {
        const newFamily = await familyService.createFamily(data);
        await loadFamilies(); // Reload to get full data with members
        setCurrentFamilyId(newFamily.id); // Switch to new family
        return newFamily;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to create family";
        setError(message);
        throw new Error(message);
      } finally {
        setLoading(false);
      }
    },
    [loadFamilies]
  );

  // FR-2.1: Update family
  const updateFamily = useCallback(
    async (familyId: string, data: UpdateFamilyDto) => {
      setLoading(true);
      setError(null);
      try {
        await familyService.updateFamily(familyId, data);
        await loadFamilies(); // Reload to get updated data
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to update family";
        setError(message);
        throw new Error(message);
      } finally {
        setLoading(false);
      }
    },
    [loadFamilies]
  );

  // FR-2.2: Leave family
  const leaveFamily = useCallback(
    async (familyId: string) => {
      setLoading(true);
      setError(null);
      try {
        await familyService.leaveFamily(familyId);

        // If leaving current family, switch to another
        if (familyId === currentFamilyId) {
          const remainingFamilies = families.filter((f) => f.id !== familyId);
          setCurrentFamilyId(
            remainingFamilies.length > 0 ? remainingFamilies[0].id : null
          );
        }

        await loadFamilies();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to leave family";
        setError(message);
        throw new Error(message);
      } finally {
        setLoading(false);
      }
    },
    [currentFamilyId, families, loadFamilies]
  );

  // FR-2.2: Delete family
  const deleteFamily = useCallback(
    async (familyId: string) => {
      setLoading(true);
      setError(null);
      try {
        await familyService.deleteFamily(familyId);

        // If deleting current family, switch to another
        if (familyId === currentFamilyId) {
          const remainingFamilies = families.filter((f) => f.id !== familyId);
          setCurrentFamilyId(
            remainingFamilies.length > 0 ? remainingFamilies[0].id : null
          );
        }

        await loadFamilies();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to delete family";
        setError(message);
        throw new Error(message);
      } finally {
        setLoading(false);
      }
    },
    [currentFamilyId, families, loadFamilies]
  );

  // FR-2.3: Get permissions for current family
  const getPermissions =
    useCallback(async (): Promise<FamilyPermissions | null> => {
      if (!currentFamilyId) return null;

      try {
        return await familyService.getFamilyPermissions(currentFamilyId);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to get permissions"
        );
        return null;
      }
    }, [currentFamilyId]);

  // FR-2.3: Update member role
  const updateMemberRole = useCallback(
    async (data: UpdateMemberRoleDto) => {
      setLoading(true);
      setError(null);
      try {
        await familyService.updateMemberRole(data);
        await loadFamilies();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to update member role";
        setError(message);
        throw new Error(message);
      } finally {
        setLoading(false);
      }
    },
    [loadFamilies]
  );

  // FR-2.3: Remove member
  const removeMember = useCallback(
    async (userId: string) => {
      if (!currentFamilyId) throw new Error("No family selected");

      setLoading(true);
      setError(null);
      try {
        await familyService.removeMember(currentFamilyId, userId);
        await loadFamilies();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to remove member";
        setError(message);
        throw new Error(message);
      } finally {
        setLoading(false);
      }
    },
    [currentFamilyId, loadFamilies]
  );

  return {
    // State
    families,
    currentFamily,
    currentFamilyId,
    loading,
    error,

    // FR-2.2: Multi-family support
    switchFamily,
    leaveFamily,

    // FR-2.1: Family creation
    createFamily,
    updateFamily,
    deleteFamily,

    // FR-2.3: RBAC
    getPermissions,
    updateMemberRole,
    removeMember,

    // Utility
    reload: loadFamilies,
  };
}

// Hook for family invitations (FR-2.4)
export function useFamilyInvites(familyId: string | null) {
  const [invites, setInvites] = useState<FamilyInvite[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadInvites = useCallback(async () => {
    if (!familyId) return;

    setLoading(true);
    setError(null);
    try {
      const data = await familyService.getFamilyInvites(familyId);
      setInvites(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load invites");
    } finally {
      setLoading(false);
    }
  }, [familyId]);

  useEffect(() => {
    loadInvites();
  }, [loadInvites]);

  // FR-2.4: Create invite
  const createInvite = useCallback(
    async (data: CreateInviteDto) => {
      setLoading(true);
      setError(null);
      try {
        const invite = await familyService.createInvite(data);
        await loadInvites();
        return invite;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to create invite";
        setError(message);
        throw new Error(message);
      } finally {
        setLoading(false);
      }
    },
    [loadInvites]
  );

  // FR-2.4: Delete invite
  const deleteInvite = useCallback(
    async (inviteId: string) => {
      setLoading(true);
      setError(null);
      try {
        await familyService.deleteInvite(inviteId);
        await loadInvites();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to delete invite";
        setError(message);
        throw new Error(message);
      } finally {
        setLoading(false);
      }
    },
    [loadInvites]
  );

  // FR-2.4: Get invite details (for preview)
  const getInviteDetails = useCallback(async (inviteCode: string) => {
    setError(null);
    try {
      return await familyService.getInviteDetails(inviteCode);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to get invite details";
      setError(message);
      throw new Error(message);
    }
  }, []);

  // FR-2.4: Join family
  const joinFamily = useCallback(async (inviteCode: string) => {
    setLoading(true);
    setError(null);
    try {
      const family = await familyService.joinFamily({
        invite_code: inviteCode,
      });
      return family;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to join family";
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    invites,
    loading,
    error,
    createInvite,
    deleteInvite,
    getInviteDetails,
    joinFamily,
    reload: loadInvites,
  };
}
