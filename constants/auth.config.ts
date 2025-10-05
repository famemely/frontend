/**
 * Authentication Configuration
 * Centralized constants for authentication service
 */

export const AUTH_CONFIG = {
  // API Configuration
  API: {
    BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL || "http://localhost:3001",
    ENDPOINTS: {
      EXCHANGE_TOKEN: "/auth/exchange-token",
      HEALTH: "/auth/health",
      PROFILE: "/auth/profile",
      SYNC_USER: "/auth/sync-user",
    },
  },

  // OAuth Configuration
  OAUTH: {
    REDIRECT_URI:
      process.env.EXPO_PUBLIC_AUTH_REDIRECT_URI || "exp://localhost:8081",
    GOOGLE_PROVIDER: "google",
  },

  // Supabase Configuration
  SUPABASE: {
    URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_KEY,
  },

  // Debug Configuration
  DEBUG: {
    ENABLED: process.env.EXPO_PUBLIC_DEBUG_AUTH === "1",
    LOG_PREFIX: "[AUTH DEBUG]",
  },

  // Storage Keys
  STORAGE_KEYS: {
    APP_TOKEN: "@app_token",
    USER_DATA: "@user_data",
    SESSION: "@session",
  },

  // MFA Configuration
  MFA: {
    ISSUER_NAME: "Famemely",
    FACTOR_TYPE: "totp" as const,
    FRIENDLY_NAME: "Authenticator App",
    OTPAUTH_TEMPLATE: "otpauth://totp/{label}?secret={secret}&issuer={issuer}",
  },

  // KIDS config removed

  // Error Messages
  ERRORS: {
    MISSING_SUPABASE_ENV: "Missing Supabase environment variables",
    NOT_AUTHENTICATED: "Not authenticated - no app token",
    NO_TOKEN_PROVIDED: "No token provided",
    INVALID_TOKEN: "Invalid token",
    TOKEN_EXCHANGE_FAILED: "Token exchange failed",
    FAILED_TO_EXCHANGE: "Failed to exchange token",
    SIGNUP_NO_SESSION: "Signup successful but no session returned",
    LOGIN_NO_SESSION: "Login successful but no session returned",
    GOOGLE_LOGIN_NO_SESSION: "Google login successful but no session returned",
    NO_OAUTH_URL: "No OAuth URL returned",
    MFA_ENROLL_FAILED: "Failed to enroll MFA",
    MFA_REQUIRED: "Multi-factor authentication required",
    MFA_INVALID_CODE: "Invalid verification code",
    MFA_NO_FACTORS: "No MFA factors found",
    EXCHANGE_INVALID_JSON: "Invalid JSON in response",
    EXCHANGE_MISSING_DATA: "Missing appToken or user in response",
  },

  // Success Messages
  SUCCESS: {
    ACCOUNT_CREATED: "Account created! Please check your email to verify.",
    // KIDS_ACCOUNT_CREATED removed
    GOOGLE_NATIVE_SIGNIN: "Signed in with Google using native dialog",
    GOOGLE_BROWSER_SIGNIN: "Signed in with Google via browser",
    // KIDS_APPROVAL_PENDING removed
    MFA_ENABLED: "Multi-Factor Authentication has been enabled!",
    MFA_DISABLED: "Multi-Factor Authentication has been disabled.",
    MFA_VERIFIED: "Authentication code verified successfully!",
  },

  // Network Configuration
  NETWORK: {
    ANDROID_EMULATOR_LOCALHOST: "10.0.2.2",
    LOCALHOST_PATTERNS: /^(http:\/\/)(localhost|127\.0\.0\.1)(:\d+)?/i,
  },
} as const;

/**
 * Helper function to build otpauth URI for MFA
 */
export function buildOtpAuthUri(email: string, secret: string): string {
  const issuer = AUTH_CONFIG.MFA.ISSUER_NAME;
  const label = encodeURIComponent(`${issuer}:${email}`);
  return AUTH_CONFIG.MFA.OTPAUTH_TEMPLATE.replace("{label}", label)
    .replace("{secret}", secret)
    .replace("{issuer}", encodeURIComponent(issuer));
}

// buildKidsEmail removed along with kids config

/**
 * Helper function to resolve API base URL for Android emulator
 */
export function resolveApiBaseUrl(rawUrl: string, platform: string): string {
  if (
    platform === "android" &&
    AUTH_CONFIG.NETWORK.LOCALHOST_PATTERNS.test(rawUrl)
  ) {
    return rawUrl
      .replace("localhost", AUTH_CONFIG.NETWORK.ANDROID_EMULATOR_LOCALHOST)
      .replace("127.0.0.1", AUTH_CONFIG.NETWORK.ANDROID_EMULATOR_LOCALHOST);
  }
  return rawUrl;
}
