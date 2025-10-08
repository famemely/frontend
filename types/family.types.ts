/**
 * Family-related type definitions
 * Based on family_app_requirements.md FR-2.x
 */

// Family roles as per FR-2.3
export type FamilyRole = "head" | "member" | "child_member";

// Family with metadata
export interface Family {
  id: string; // UUID
  name: string;
  avatar_url?: string;
  theme_color?: string; // For FR-2.2 color-coding
  created_by: string; // UUID of creator
  created_at: string;
  updated_at: string;
}

// Family member relationship
export interface FamilyMember {
  id: string; // UUID
  family_id: string;
  user_id: string;
  role: FamilyRole; // FR-2.3 RBAC
  joined_at: string;
  invited_by?: string;
  // Populated user data (from join)
  user?: {
    id: string;
    name: string;
    username?: string;
    avatar_url?: string;
    account_type: "adult" | "child";
  };
}

// Family with members (for display)
export interface FamilyWithMembers extends Family {
  members: FamilyMember[];
  my_role: FamilyRole; // Current user's role in this family
  member_count: number;
}

// Family invitation (FR-2.4)
export interface FamilyInvite {
  id: string;
  family_id: string;
  invite_code: string;
  role: FamilyRole; // Role to be assigned when joining
  max_uses?: number;
  uses: number;
  expires_at?: string;
  created_by: string;
  created_at: string;
  // Populated data
  family?: {
    name: string;
    avatar_url?: string;
  };
  creator?: {
    name: string;
  };
}

// Location coordinates
export interface LocationCoordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp?: string;
}

// Member with location data (for map display)
export interface MemberLocation {
  user_id: string;
  family_id: string;
  name: string;
  avatar_url?: string;
  location: LocationCoordinates;
  last_updated: string;
  battery_level?: number;
  is_ghost_mode: boolean;
}

// Create family DTO (FR-2.1)
export interface CreateFamilyDto {
  name: string;
  avatar_url?: string;
  theme_color?: string;
}

// Update family DTO
export interface UpdateFamilyDto {
  name?: string;
  avatar_url?: string;
  theme_color?: string;
}

// Create invite DTO (FR-2.4)
export interface CreateInviteDto {
  family_id: string;
  role: FamilyRole;
  max_uses?: number;
  expires_in_days?: number;
}

// Join family DTO (FR-2.4)
export interface JoinFamilyDto {
  invite_code: string;
}

// Update member role DTO (FR-2.3)
export interface UpdateMemberRoleDto {
  family_id: string;
  user_id: string;
  new_role: FamilyRole;
}

// Permission checks (FR-2.3)
export interface FamilyPermissions {
  canManageMembers: boolean;
  canEditSettings: boolean;
  canDeleteFamily: boolean;
  canCreateGeofences: boolean;
  canInviteMembers: boolean;
  canPostToBoard: boolean;
  canViewBoard: boolean;
  canShareLocation: boolean;
}

// UI Props
export interface SidebarProps {
  navigation?: any;
  userName?: string;
  profileImage?: any;
  families?: FamilyWithMembers[];
  currentFamilyId?: string;
  onFamilySwitch?: (familyId: string) => void;
  unreadBoardsCount?: number;
}
