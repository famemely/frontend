/**
 * Family Service - Implements FR-2.1, FR-2.2, FR-2.3, FR-2.4
 * Uses Supabase with RPC functions for atomic operations
 *
 * Requirements Implementation:
 * - FR-2.1: Family Creation (adults only)
 * - FR-2.2: Multi-Family Support (unlimited families per user)
 * - FR-2.3: Role-Based Access Control (head, member, child_member)
 * - FR-2.4: Member Invitations (invite codes, QR codes, expiration)
 */

import { supabase } from "./supabase.client";
import { cacheSyncService } from "./cache-sync.service";
import {
  Family,
  FamilyMember,
  FamilyWithMembers,
  FamilyInvite,
  CreateFamilyDto,
  UpdateFamilyDto,
  CreateInviteDto,
  JoinFamilyDto,
  UpdateMemberRoleDto,
  FamilyRole,
  FamilyPermissions,
} from "../types/family.types";

class FamilyService {
  /**
   * Helper to safely retrieve the current auth user
   */
  private async requireUser() {
    try {
      if (!supabase || !supabase.auth) {
        throw new Error(
          "Supabase client not properly initialized. Please check your environment variables."
        );
      }
      const { data, error } = await supabase.auth.getUser();
      if (error) throw error;
      if (!data.user) throw new Error("User not authenticated");
      return data.user;
    } catch (error) {
      console.error("Error in requireUser:", error);
      throw error;
    }
  }

  /**
   * FR-2.1: Family Creation
   * Adult users can create new families with custom names
   * Uses RPC function for atomic operation (family + membership + invite)
   */
  async createFamily(data: CreateFamilyDto): Promise<Family> {
    const user = await this.requireUser();

    // Create family using RPC function (handles all validations)
    const { data: familyData, error: rpcError } = await supabase.rpc(
      "create_family_with_head",
      {
        _name: data.name,
        _avatar_url: data.avatar_url || null,
        _theme_color: data.theme_color || null,
        _creator: user.id,
      }
    );

    if (rpcError) {
      console.error("Failed to create family:", rpcError);
      throw new Error(rpcError.message || "Failed to create family");
    }

    if (!familyData) {
      throw new Error("No family data returned from creation");
    }

    // The RPC returns JSON, parse if needed
    const family =
      typeof familyData === "string" ? JSON.parse(familyData) : familyData;

    // Notify backend to update cache for new family (creator is family head)
    try {
      await cacheSyncService.notifyUserAddedToFamily(
        family.id,
        user.id,
        "head"
      );
    } catch (error) {
      console.warn("Failed to sync cache for new family:", error);
      // Non-critical error, continue
    }

    return family as Family;
  }

  /**
   * FR-2.2: Multi-Family Support
   * Get all families the current user belongs to
   */
  async getUserFamilies(): Promise<FamilyWithMembers[]> {
    const user = await this.requireUser();

    // Get all families where user is a member
    const { data: memberships, error: memberError } = await supabase
      .from("family_members")
      .select(
        `
        role,
        family_id,
        families (
          id,
          name,
          avatar_url,
          theme_color,
          created_by,
          created_at,
          updated_at
        )
      `
      )
      .eq("user_id", user.id);

    if (memberError) throw memberError;

    // For each family, get full member list
    const familiesWithMembers: FamilyWithMembers[] = [];

    for (const membership of memberships || []) {
      const family = membership.families as any;

      // Get all members of this family
      const { data: members, error: membersError } = await supabase
        .from("family_members")
        .select(
          `
          id,
          family_id,
          user_id,
          role,
          joined_at,
          invited_by,
          users!family_members_user_id_fkey (
            id,
            name,
            username,
            avatar_url,
            account_type
          )
        `
        )
        .eq("family_id", family.id);

      if (membersError) throw membersError;

      familiesWithMembers.push({
        ...family,
        members: members.map((m: FamilyMember & { users?: any }) => ({
          ...m,
          user: m.users as any,
        })),
        my_role: membership.role as FamilyRole,
        member_count: members.length,
      });
    }

    return familiesWithMembers;
  }

  /**
   * FR-2.2: Switch between families (just retrieve specific family)
   */
  async getFamily(familyId: string): Promise<FamilyWithMembers> {
    const user = await this.requireUser();

    // Check if user is member of this family
    const { data: membership, error: memberError } = await supabase
      .from("family_members")
      .select("role")
      .eq("family_id", familyId)
      .eq("user_id", user.id)
      .single();

    if (memberError || !membership) {
      throw new Error("You are not a member of this family");
    }

    // Get family details
    const { data: family, error: familyError } = await supabase
      .from("families")
      .select("*")
      .eq("id", familyId)
      .single();

    if (familyError) throw familyError;

    // Get all members
    const { data: members, error: membersError } = await supabase
      .from("family_members")
      .select(
        `
        id,
        family_id,
        user_id,
        role,
        joined_at,
        invited_by,
        users!family_members_user_id_fkey (
          id,
          name,
          username,
          avatar_url,
          account_type
        )
      `
      )
      .eq("family_id", familyId);

    if (membersError) throw membersError;

    return {
      ...family,
      members: members.map((m: FamilyMember & { users?: any }) => ({
        ...m,
        user: m.users as any,
      })),
      my_role: membership.role as FamilyRole,
      member_count: members.length,
    };
  }

  /**
   * FR-2.2: Leave a family (non-head or multi-head families)
   * Uses RPC function for validation and atomic operation
   */
  async leaveFamily(familyId: string): Promise<void> {
    const user = await this.requireUser();

    const { data, error } = await supabase.rpc("leave_family", {
      _family_id: familyId,
      _user_id: user.id,
    });

    if (error) {
      console.error("Failed to leave family:", error);
      throw new Error(error.message || "Failed to leave family");
    }

    // Notify backend to invalidate caches for user leaving family
    try {
      await cacheSyncService.notifyUserRemovedFromFamily(familyId, user.id);
    } catch (error) {
      console.warn("Failed to sync cache for leaving family:", error);
      // Non-critical error, continue
    }
  }

  /**
   * FR-2.2: Delete a family (admins only)
   */
  async deleteFamily(familyId: string): Promise<void> {
    const user = await this.requireUser();

    // Check if user is head
    const { data: membership, error: memberError } = await supabase
      .from("family_members")
      .select("role")
      .eq("family_id", familyId)
      .eq("user_id", user.id)
      .single();

    if (memberError) throw memberError;

    if (membership.role !== "head") {
      throw new Error("Only family head can delete the family");
    }

    // Delete family (cascade will remove members)
    const { error } = await supabase
      .from("families")
      .delete()
      .eq("id", familyId);

    if (error) throw error;

    // Notify backend to invalidate all caches for this family
    try {
      await cacheSyncService.notifyFamilyDeleted(familyId);
    } catch (error) {
      console.warn("Failed to sync cache for deleted family:", error);
      // Non-critical error, continue
    }
  }

  /**
   * FR-2.1: Update family details
   */
  async updateFamily(familyId: string, data: UpdateFamilyDto): Promise<Family> {
    const user = await this.requireUser();

    // Check permissions (head only)
    const permissions = await this.getFamilyPermissions(familyId);
    if (!permissions.canEditSettings) {
      throw new Error("You do not have permission to edit family settings");
    }

    const { data: family, error } = await supabase
      .from("families")
      .update(data)
      .eq("id", familyId)
      .select()
      .single();

    if (error) throw error;

    // Notify backend to refresh family cache
    try {
      await cacheSyncService.refreshFamilyCache(familyId);
    } catch (error) {
      console.warn("Failed to sync cache for updated family:", error);
      // Non-critical error, continue
    }

    return family;
  }

  /**
   * FR-2.3: Role-Based Access Control
   * Get permissions for current user in a family
   */
  async getFamilyPermissions(familyId: string): Promise<FamilyPermissions> {
    const user = await this.requireUser();

    const { data: membership, error } = await supabase
      .from("family_members")
      .select("role, users!family_members_user_id_fkey(account_type)")
      .eq("family_id", familyId)
      .eq("user_id", user.id)
      .single();

    if (error || !membership) {
      console.error("Error fetching permissions:", error);
      return this.getDefaultPermissions();
    }

    const role = membership.role as FamilyRole;
    const accountType = (membership.users as any)?.account_type;

    console.log("📋 Permission Check:", {
      familyId,
      userId: user.id,
      role,
      accountType,
      rawMembership: membership,
    });

    return {
      // Head: Full control
      canManageMembers: role === "head",
      canEditSettings: role === "head",
      canDeleteFamily: role === "head",

      // Head & Member: Can create geofences
      canCreateGeofences: role === "head" || role === "member",

      // Head & Member: Can invite (if adult)
      canInviteMembers:
        (role === "head" || role === "member") && accountType !== "child",

      // All roles: Can share location
      canShareLocation: true,

      // All roles: Can view board
      canViewBoard: true,

      // Child members: Post with moderation, others can post freely
      canPostToBoard: true,
    };
  }

  /**
   * FR-2.3: Update member role (head only)
   */
  async updateMemberRole(data: UpdateMemberRoleDto): Promise<void> {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("User not authenticated");
    }

    // Check if current user is head
    const permissions = await this.getFamilyPermissions(data.family_id);
    if (!permissions.canManageMembers) {
      throw new Error("Only family head can change member roles");
    }

    // Cannot change your own role
    if (data.user_id === user.id) {
      throw new Error("Cannot change your own role");
    }

    // Update role
    const { error } = await supabase
      .from("family_members")
      .update({ role: data.new_role })
      .eq("family_id", data.family_id)
      .eq("user_id", data.user_id);

    if (error) throw error;

    // Notify backend to update member role cache
    try {
      await cacheSyncService.notifyMemberRoleUpdated(
        data.family_id,
        data.user_id,
        data.new_role
      );
    } catch (error) {
      console.warn("Failed to sync cache for updated member role:", error);
      // Non-critical error, continue
    }
  }

  /**
   * FR-2.3: Remove member from family (head only)
   */
  async removeMember(familyId: string, userId: string): Promise<void> {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("User not authenticated");
    }

    // Check permissions
    const permissions = await this.getFamilyPermissions(familyId);
    if (!permissions.canManageMembers) {
      throw new Error("Only family head can remove members");
    }

    // Cannot remove yourself
    if (userId === user.id) {
      throw new Error("Use leaveFamily() to leave the family");
    }

    // Remove member
    const { error } = await supabase
      .from("family_members")
      .delete()
      .eq("family_id", familyId)
      .eq("user_id", userId);

    if (error) throw error;

    // Notify backend to invalidate caches for removed member
    try {
      await cacheSyncService.notifyUserRemovedFromFamily(familyId, userId);
    } catch (error) {
      console.warn("Failed to sync cache for removed member:", error);
      // Non-critical error, continue
    }
  }

  /**
   * FR-2.4: Member Invitations
   * Generate shareable invite link with expiration
   */
  async createInvite(data: CreateInviteDto): Promise<FamilyInvite> {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("User not authenticated");
    }

    // Check permissions
    const permissions = await this.getFamilyPermissions(data.family_id);
    if (!permissions.canInviteMembers) {
      throw new Error("You do not have permission to invite members");
    }

    // Generate unique invite code
    const inviteCode = this.generateInviteCode();

    // Calculate expiration
    const expiresAt = data.expires_in_days
      ? new Date(
          Date.now() + data.expires_in_days * 24 * 60 * 60 * 1000
        ).toISOString()
      : null;

    const { data: invite, error } = await supabase
      .from("family_invites")
      .insert({
        family_id: data.family_id,
        invite_code: inviteCode,
        role: data.role,
        max_uses: data.max_uses,
        uses: 0,
        expires_at: expiresAt,
        created_by: user.id,
      })
      .select(
        `
        *,
        families (name, avatar_url),
        users (name)
      `
      )
      .maybeSingle();

    if (error) {
      console.error("Supabase insert family_invites error:", error);
      throw new Error(error.message || "Failed to create invite");
    }

    if (!invite) {
      console.error(
        "Supabase insert returned no rows for family_invites insert"
      );
      throw new Error("Insert succeeded but no invite record was returned");
    }

    return {
      ...invite,
      family: invite.families as any,
      creator: invite.users as any,
    };
  }

  /**
   * FR-2.4: Get invite details (for preview before joining)
   */
  async getInviteDetails(inviteCode: string): Promise<FamilyInvite> {
    const { data: invite, error } = await supabase
      .from("family_invites")
      .select(
        `
        *,
        families (name, avatar_url),
        users (name)
      `
      )
      .eq("invite_code", inviteCode)
      .single();

    if (error) throw error;

    // Check if invite is valid
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      throw new Error("This invite has expired");
    }

    if (invite.max_uses && invite.uses >= invite.max_uses) {
      throw new Error("This invite has reached its maximum uses");
    }

    return {
      ...invite,
      family: invite.families as any,
      creator: invite.users as any,
    };
  }

  /**
   * FR-2.4: Join family via invite code
   * Uses RPC function for validation and atomic operation
   */
  async joinFamily(data: JoinFamilyDto): Promise<Family> {
    const user = await this.requireUser();

    // Use RPC function for atomic join operation
    const { data: result, error } = await supabase.rpc(
      "join_family_with_code",
      {
        _invite_code: data.invite_code,
        _user_id: user.id,
      }
    );

    if (error) {
      console.error("Failed to join family:", error);
      throw new Error(error.message || "Failed to join family");
    }

    const parsedResult =
      typeof result === "string" ? JSON.parse(result) : result;

    if (!parsedResult.success) {
      throw new Error("Failed to join family");
    }

    // Fetch and return the family details
    const { data: family, error: familyError } = await supabase
      .from("families")
      .select("*")
      .eq("id", parsedResult.family_id)
      .single();

    if (familyError) throw familyError;

    // Notify backend to update cache for new member joining
    // Get the role from parsedResult if available, otherwise default to 'member'
    try {
      await cacheSyncService.notifyUserAddedToFamily(
        parsedResult.family_id,
        user.id,
        parsedResult.role || "member"
      );
    } catch (error) {
      console.warn("Failed to sync cache for joining family:", error);
      // Non-critical error, continue
    }

    return family;
  }

  /**
   * FR-2.4: Get all invites for a family
   */
  async getFamilyInvites(familyId: string): Promise<FamilyInvite[]> {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("User not authenticated");
    }

    // Check permissions
    const permissions = await this.getFamilyPermissions(familyId);
    if (!permissions.canManageMembers) {
      throw new Error("You do not have permission to view invites");
    }

    const { data: invites, error } = await supabase
      .from("family_invites")
      .select(
        `
        *,
        families (name, avatar_url),
        users (name)
      `
      )
      .eq("family_id", familyId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return invites.map((invite: any) => ({
      ...invite,
      family: invite.families as any,
      creator: invite.users as any,
    }));
  }

  /**
   * FR-2.4: Delete/revoke an invite
   */
  async deleteInvite(inviteId: string): Promise<void> {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("User not authenticated");
    }

    // Get invite to check family_id
    const { data: invite, error: inviteError } = await supabase
      .from("family_invites")
      .select("family_id")
      .eq("id", inviteId)
      .single();

    if (inviteError) throw inviteError;

    // Check permissions
    const permissions = await this.getFamilyPermissions(invite.family_id);
    if (!permissions.canManageMembers) {
      throw new Error("You do not have permission to delete invites");
    }

    const { error } = await supabase
      .from("family_invites")
      .delete()
      .eq("id", inviteId);

    if (error) throw error;
  }

  /**
   * Utility: Generate random color for family theming (FR-2.2)
   */
  private generateRandomColor(): string {
    const colors = [
      "#FF6B6B",
      "#4ECDC4",
      "#45B7D1",
      "#FFA07A",
      "#98D8C8",
      "#6C5CE7",
      "#A29BFE",
      "#FD79A8",
      "#FDCB6E",
      "#6C5CE7",
      "#74B9FF",
      "#55EFC4",
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  /**
   * Utility: Generate unique invite code (FR-2.4)
   */
  private generateInviteCode(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Exclude similar chars
    let code = "";
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  /**
   * Utility: Default permissions for non-members
   */
  private getDefaultPermissions(): FamilyPermissions {
    return {
      canManageMembers: false,
      canEditSettings: false,
      canDeleteFamily: false,
      canCreateGeofences: false,
      canInviteMembers: false,
      canPostToBoard: false,
      canViewBoard: false,
      canShareLocation: false,
    };
  }
}

export const familyService = new FamilyService();
