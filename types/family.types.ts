/**
 * Family-related type definitions
 */

export interface Family {
  id: number | string;
  name: string;
  ownerId?: string;
  members?: FamilyMember[];
  createdAt?: string;
  updatedAt?: string;
}

export interface FamilyMember {
  id: number | string;
  name: string;
  color: string;
  status: "active" | "idle" | "offline";
  location?: LocationCoordinates;
  lastSeen?: string;
  avatar?: string;
  userId?: string;
}

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp?: string;
}

export interface SidebarProps {
  navigation?: any;
  userName?: string;
  profileImage?: any;
  families?: Family[];
  unreadBoardsCount?: number;
}
