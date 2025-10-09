/**
 * User Profile Service
 * Ensures user profiles exist in public.users table
 */

import { supabase } from "./auth.service";

class UserProfileService {
  /**
   * Ensure user profile exists in public.users table
   * This is called after authentication to create/update the user record
   */
  async ensureUserProfile(
    userId: string,
    email: string,
    name?: string
  ): Promise<void> {
    try {
      // Call the RPC function to ensure profile exists
      const { data, error } = await supabase.rpc("ensure_user_profile", {
        _user_id: userId,
        _email: email,
        _name: name || email,
      });

      if (error) {
        console.error("Failed to ensure user profile:", error);
        throw error;
      }

      console.log("User profile ensured:", data);
    } catch (error) {
      console.error("Error ensuring user profile:", error);
      throw error;
    }
  }

  /**
   * Get user profile from public.users table
   */
  async getUserProfile(userId: string) {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Update user profile
   */
  async updateUserProfile(
    userId: string,
    updates: {
      name?: string;
      username?: string;
      avatar_url?: string;
      date_of_birth?: string;
    }
  ) {
    const { data, error } = await supabase
      .from("users")
      .update(updates)
      .eq("id", userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}

export const userProfileService = new UserProfileService();
