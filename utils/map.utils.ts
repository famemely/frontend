/**
 * Utility functions for the FamilyMapScreen component
 */

import { FamilyMember } from "@/types/family.types";

/**
 * Generate random coordinate near a base position
 */
export function generateRandomCoordinate(
  baseLatitude: number,
  baseLongitude: number,
  range: number = 0.01
): { latitude: number; longitude: number } {
  return {
    latitude: baseLatitude + (Math.random() - 0.5) * range,
    longitude: baseLongitude + (Math.random() - 0.5) * range,
  };
}

/**
 * Filter members by status
 */
export function filterMembersByStatus(
  members: FamilyMember[],
  status?: "active" | "idle" | "offline"
): FamilyMember[] {
  if (!status) return members;
  return members.filter((member) => member.status === status);
}

/**
 * Filter members by proximity (placeholder - would need actual distance calculation)
 */
export function filterMembersByProximity(
  members: FamilyMember[],
  userLocation?: { latitude: number; longitude: number },
  maxDistance: number = 10
): FamilyMember[] {
  // TODO: Implement actual distance calculation using Haversine formula
  return members;
}

/**
 * Get status indicator color
 */
export function getStatusColor(status: "active" | "idle" | "offline"): string {
  switch (status) {
    case "active":
      return "#059669"; // theme.colors.success
    case "idle":
      return "#999999"; // theme.colors.placeholder
    case "offline":
      return "#DC2626"; // theme.colors.error
    default:
      return "#999999";
  }
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}
