import axios from "axios";
import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  Constants.expoConfig?.extra?.EXPO_PUBLIC_API_BASE_URL ||
  "http://192.168.3.105:3001";

console.log("🌐 API Base URL:", API_BASE_URL);

interface LocationUpdate {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
  batteryLevel: number;
  batteryState: string;
  family_id: string;
}

interface FamilyLocation {
  user_id: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
  batteryLevel: number;
}

class LocationApiService {
  private static instance: LocationApiService;

  private constructor() {}

  static getInstance(): LocationApiService {
    if (!LocationApiService.instance) {
      LocationApiService.instance = new LocationApiService();
    }
    return LocationApiService.instance;
  }

  private async getAuthHeaders(): Promise<Record<string, string>> {
    const token = await AsyncStorage.getItem("app_token");
    return {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  /**
   * Update user's location via REST API
   */
  async updateLocation(location: LocationUpdate): Promise<any> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await axios.post(
        `${API_BASE_URL}/location/update`,
        location,
        { headers }
      );
      return response.data;
    } catch (error: any) {
      console.error(
        "[Location API] Update failed:",
        error.response?.data || error.message
      );
      throw error;
    }
  }

  /**
   * Get all current locations for family members
   */
  async getFamilyLocations(familyId: string): Promise<FamilyLocation[]> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await axios.get(
        `${API_BASE_URL}/location/family/${familyId}`,
        { headers }
      );
      return response.data.locations || [];
    } catch (error: any) {
      console.error(
        "[Location API] Get family locations failed:",
        error.response?.data || error.message
      );
      throw error;
    }
  }

  /**
   * Get location history from stream
   */
  async getLocationHistory(
    familyId: string,
    userId?: string,
    limit: number = 100,
    lastId?: string
  ): Promise<any> {
    try {
      const headers = await this.getAuthHeaders();
      const params: any = { family_id: familyId, limit };
      if (userId) params.user_id = userId;
      if (lastId) params.lastId = lastId;

      const response = await axios.get(`${API_BASE_URL}/location/history`, {
        headers,
        params,
      });
      return response.data;
    } catch (error: any) {
      console.error(
        "[Location API] Get history failed:",
        error.response?.data || error.message
      );
      throw error;
    }
  }

  /**
   * Get specific user's last location
   */
  async getUserLocation(
    userId: string,
    familyId: string
  ): Promise<FamilyLocation | null> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await axios.get(
        `${API_BASE_URL}/location/user/${userId}/family/${familyId}`,
        { headers }
      );
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      console.error(
        "[Location API] Get user location failed:",
        error.response?.data || error.message
      );
      throw error;
    }
  }
}

export const locationApiService = LocationApiService.getInstance();
export default locationApiService;
