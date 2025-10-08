/**
 * Family Service - Implements FR-2.1, FR-2.2, FR-2.3, FR-2.4
 * Uses Supabase directly for family management
 */

import { supabase } from "./auth.service";
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
   * FR-2.1: Family Creation
   * Adult users can create new families with custom names
   */
  async createFamily(data: CreateFamilyDto): Promise<Family> {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("User not authenticated");
    }

    // Check if user is adult (child accounts cannot create families)
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("account_type")
      .eq("id", user.id)
      .single();

    if (userError) throw userError;

    if (userData.account_type === "child") {
      throw new Error("Child accounts cannot create families");
    }

    // Create family
    const { data: family, error } = await supabase
      .from("families")
      .insert({
        name: data.name,
        avatar_url: data.avatar_url,
        theme_color: data.theme_color || this.generateRandomColor(),
        created_by: user.id,
      })
      .select()
      .single();

    if (error) throw error;

    // Assign creator as Head (admin)
    const { error: memberError } = await supabase
      .from("family_members")
      .insert({
        family_id: family.id,
        user_id: user.id,
        role: "head",
      });

    if (memberError) throw memberError;

    // Generate initial invite code
    await this.createInvite({
      family_id: family.id,
      role: "member",
      expires_in_days: 30,
    });

    return family;
  }

  /**
   * FR-2.2: Multi-Family Support
   * Get all families the current user belongs to
   */
  async getUserFamilies(): Promise<FamilyWithMembers[]> {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("User not authenticated");
    }

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
          users (
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
        members: members.map((m) => ({
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
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("User not authenticated");
    }

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
        users (
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
      members: members.map((m) => ({
        ...m,
        user: m.users as any,
      })),
      my_role: membership.role as FamilyRole,
      member_count: members.length,
    };
  }

  /**
   * FR-2.2: Leave a family (non-admins only)
   */
  async leaveFamily(familyId: string): Promise<void> {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("User not authenticated");
    }

    // Check user's role
    const { data: membership, error: memberError } = await supabase
      .from("family_members")
      .select("role")
      .eq("family_id", familyId)
      .eq("user_id", user.id)
      .single();

    if (memberError) throw memberError;

    if (membership.role === "head") {
      throw new Error(
        "Head cannot leave family. Transfer ownership or delete the family."
      );
    }

    // Remove membership
    const { error } = await supabase
      .from("family_members")
      .delete()
      .eq("family_id", familyId)
      .eq("user_id", user.id);

    if (error) throw error;
  }

  /**
   * FR-2.2: Delete a family (admins only)
   */
  async deleteFamily(familyId: string): Promise<void> {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("User not authenticated");
    }

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
  }

  /**
   * FR-2.1: Update family details
   */
  async updateFamily(familyId: string, data: UpdateFamilyDto): Promise<Family> {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("User not authenticated");
    }

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

    return family;
  }

  /**
   * FR-2.3: Role-Based Access Control
   * Get permissions for current user in a family
   */
  async getFamilyPermissions(familyId: string): Promise<FamilyPermissions> {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("User not authenticated");
    }

    const { data: membership, error } = await supabase
      .from("family_members")
      .select("role, users(account_type)")
      .eq("family_id", familyId)
      .eq("user_id", user.id)
      .single();

    if (error || !membership) {
      return this.getDefaultPermissions();
    }

    const role = membership.role as FamilyRole;
    const accountType = (membership.users as any)?.account_type;

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
      .single();

    if (error) throw error;

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
   */
  async joinFamily(data: JoinFamilyDto): Promise<Family> {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("User not authenticated");
    }

    // Get invite details
    const invite = await this.getInviteDetails(data.invite_code);

    // Check if user is already a member
    const { data: existingMember } = await supabase
      .from("family_members")
      .select("id")
      .eq("family_id", invite.family_id)
      .eq("user_id", user.id)
      .single();

    if (existingMember) {
      throw new Error("You are already a member of this family");
    }

    // For child accounts, require parental approval
    const { data: userData } = await supabase
      .from("users")
      .select("account_type, parent_id")
      .eq("id", user.id)
      .single();

    if (userData?.account_type === "child") {
      // TODO: Implement parental approval flow
      throw new Error(
        "Child accounts require parental approval to join families"
      );
    }

    // Add user to family
    const { error: memberError } = await supabase
      .from("family_members")
      .insert({
        family_id: invite.family_id,
        user_id: user.id,
        role: invite.role,
        invited_by: invite.created_by,
      });

    if (memberError) throw memberError;

    // Increment invite uses
    const { error: updateError } = await supabase
      .from("family_invites")
      .update({ uses: invite.uses + 1 })
      .eq("id", invite.id);

    if (updateError)
      console.error("Failed to update invite uses:", updateError);

    // Return family details
    const { data: family, error: familyError } = await supabase
      .from("families")
      .select("*")
      .eq("id", invite.family_id)
      .single();

    if (familyError) throw familyError;

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

    return invites.map((invite) => ({
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
