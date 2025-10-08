// Black Dominant Theme with Green Accents - Minimal & Clean
import { Platform } from "react-native";

export const lightTheme = {
  colors: {
    primary: "#053326", // Darker Forest Green (accent only)
    secondary: "#064E3B", // Dark Green (accent only)
    background: "#FFFFFF", // Pure White
    surface: "#FAFAFA", // Light Gray Surface
    card: "#FFFFFF", // Pure White
    text: "#000000", // Pure Black Text
    textSecondary: "#666666", // Medium Gray
    border: "#E5E5E5", // Light Gray Border
    placeholder: "#999999", // Muted Gray
    error: "#DC2626", // Elegant Red
    success: "#059669", // Vibrant Green
    warning: "#F59E0B", // Amber
    info: "#0891B2", // Teal
    shadow: "rgba(0, 0, 0, 0.04)",
    tint: "#000000",
    icon: "#000000", // Monochromatic
    tabIconDefault: "#666666",
    tabIconSelected: "#000000",
    accent: "#053326", // Green accent for design elements
    muted: "#F5F5F5", // Soft Background
  },
  fonts: {
    regular: Platform.select({
      ios: "SF Pro Display",
      android: "sans-serif",
      default: "System",
    }),
    medium: Platform.select({
      ios: "SF Pro Display",
      android: "sans-serif",
      default: "System",
    }),
    light: Platform.select({
      ios: "SF Pro Display",
      android: "sans-serif-light",
      default: "System",
    }),
    heading: Platform.select({
      ios: "SF Pro Display",
      android: "sans-serif",
      default: "System",
    }),
  },
  spacing: {
    xs: 6,
    sm: 12,
    md: 20,
    lg: 28,
    xl: 40,
    xxl: 56,
    xxxl: 72,
  },
  borderRadius: {
    sm: 4,
    md: 6,
    lg: 8,
    xl: 10,
    xxl: 12,
    full: 999,
  },
};

export const darkTheme = {
  colors: {
    primary: "#053326", // Green accent for dark mode
    secondary: "#064E3B", // Dark Green
    background: "#000000", // Pure Black Background
    surface: "#1A1A1A", // Dark Gray Surface
    card: "#1A1A1A", // Dark Gray Card
    text: "#FFFFFF", // Pure White Text
    textSecondary: "#999999", // Medium Gray
    border: "#333333", // Dark Border
    placeholder: "#666666", // Muted Gray
    error: "#F87171", // Soft Red
    success: "#34D399", // Bright Green
    warning: "#FBBF24", // Gold
    info: "#22D3EE", // Cyan
    shadow: "rgba(0, 0, 0, 0.2)",
    tint: "#FFFFFF",
    icon: "#FFFFFF", // Monochromatic
    tabIconDefault: "#999999",
    tabIconSelected: "#FFFFFF",
    accent: "#053326", // Green accent
    muted: "#262626", // Muted dark
  },
  fonts: {
    regular: Platform.select({
      ios: "SF Pro Display",
      android: "sans-serif",
      default: "System",
    }),
    medium: Platform.select({
      ios: "SF Pro Display",
      android: "sans-serif",
      default: "System",
    }),
    light: Platform.select({
      ios: "SF Pro Display",
      android: "sans-serif-light",
      default: "System",
    }),
    heading: Platform.select({
      ios: "SF Pro Display",
      android: "sans-serif",
      default: "System",
    }),
  },
  spacing: {
    xs: 6,
    sm: 12,
    md: 20,
    lg: 28,
    xl: 40,
    xxl: 56,
    xxxl: 72,
  },
  borderRadius: {
    sm: 4,
    md: 6,
    lg: 8,
    xl: 10,
    xxl: 12,
    full: 999,
  },
};

export type Theme = typeof lightTheme;
export { lightTheme as defaultTheme };

// Legacy export for backward compatibility
export const Colors = {
  light: lightTheme.colors,
  dark: darkTheme.colors,
};
