/**
 * Map Configuration Constants
 */

export const MAP_CONFIG = {
  // Default initial region for maps
  DEFAULT_REGION: {
    latitude: 37.78825,
    longitude: -122.4324,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  },

  // Map display settings
  SETTINGS: {
    // Don't enable user location until runtime permission is granted.
    // This was causing a native crash before permissions flow.
    // showsUserLocation will be passed explicitly once handled.
    showsMyLocationButton: false,
    showsCompass: true,
    showsScale: false,
    showsTraffic: false,
    showsIndoors: true,
    showsBuildings: true,
    showsPointsOfInterest: true,
  },

  // Marker settings
  MARKER: {
    defaultColor: "#FF6B6B",
    activeColor: "#4ECDC4",
    idleColor: "#95E1D3",
  },

  // Animation settings
  ANIMATION: {
    duration: 300,
    easing: "easeInOut",
  },
} as const;

/**
 * Family member status types
 */
export type MemberStatus = "active" | "idle" | "offline";

/**
 * Map tab types
 */
export type MapTab = "all" | "nearby" | "favorites" | "recent";

/**
 * Tab configuration
 */
export const MAP_TABS: Array<{ id: MapTab; label: string }> = [
  { id: "all", label: "All" },
  { id: "nearby", label: "Nearby" },
  { id: "favorites", label: "Favorites" },
  { id: "recent", label: "Recent" },
];
