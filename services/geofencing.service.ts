/**
 * Geofencing Service
 * Handles CRUD operations for family geofences using Supabase
 */

import { supabase } from "./supabase.client";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface Geofence {
  id: string;
  family_id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
  notify_on_enter: boolean;
  notify_on_exit: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateGeofenceDto {
  family_id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
  notify_on_enter?: boolean;
  notify_on_exit?: boolean;
}

export interface UpdateGeofenceDto {
  name?: string;
  latitude?: number;
  longitude?: number;
  radius?: number;
  notify_on_enter?: boolean;
  notify_on_exit?: boolean;
}

class GeofencingService {
  private static instance: GeofencingService;

  private constructor() {}

  static getInstance(): GeofencingService {
    if (!GeofencingService.instance) {
      GeofencingService.instance = new GeofencingService();
    }
    return GeofencingService.instance;
  }

  /**
   * Get user ID from session
   */
  private async getUserId(): Promise<string> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");
    return user.id;
  }

  /**
   * Get all geofences for a family
   */
  async getFamilyGeofences(familyId: string): Promise<Geofence[]> {
    const { data, error } = await supabase
      .from("geofences")
      .select("*")
      .eq("family_id", familyId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching geofences:", error);
      throw new Error(error.message || "Failed to fetch geofences");
    }

    return data || [];
  }

  /**
   * Create a new geofence
   */
  async createGeofence(dto: CreateGeofenceDto): Promise<Geofence> {
    const userId = await this.getUserId();

    const { data, error } = await supabase
      .from("geofences")
      .insert({
        family_id: dto.family_id,
        name: dto.name,
        latitude: dto.latitude,
        longitude: dto.longitude,
        radius: dto.radius,
        notify_on_enter: dto.notify_on_enter ?? true,
        notify_on_exit: dto.notify_on_exit ?? false,
        created_by: userId,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating geofence:", error);
      throw new Error(error.message || "Failed to create geofence");
    }

    return data;
  }

  /**
   * Update an existing geofence
   */
  async updateGeofence(
    geofenceId: string,
    dto: UpdateGeofenceDto
  ): Promise<Geofence> {
    const { data, error } = await supabase
      .from("geofences")
      .update(dto)
      .eq("id", geofenceId)
      .select()
      .single();

    if (error) {
      console.error("Error updating geofence:", error);
      throw new Error(error.message || "Failed to update geofence");
    }

    return data;
  }

  /**
   * Delete a geofence
   */
  async deleteGeofence(geofenceId: string): Promise<void> {
    const { error } = await supabase
      .from("geofences")
      .delete()
      .eq("id", geofenceId);

    if (error) {
      console.error("Error deleting geofence:", error);
      throw new Error(error.message || "Failed to delete geofence");
    }
  }

  /**
   * Check if a location is within a geofence
   */
  isWithinGeofence(lat: number, lng: number, geofence: Geofence): boolean {
    const R = 6371000; // Earth's radius in meters
    const dLat = this.toRad(geofence.latitude - lat);
    const dLon = this.toRad(geofence.longitude - lng);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat)) *
        Math.cos(this.toRad(geofence.latitude)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return distance <= geofence.radius;
  }

  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}

export const geofencingService = GeofencingService.getInstance();
export default geofencingService;
