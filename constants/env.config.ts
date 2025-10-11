/**
 * Environment Configuration
 * Centralized access to environment variables
 */

import Constants from 'expo-constants';

/**
 * Get environment variable with fallback
 */
function getEnvVar(key: string, fallback?: string): string {
  // Try to get from process.env first (for local development)
  const processEnv = process.env[key];
  if (processEnv) return processEnv;

  // Try to get from Expo Constants extra (for builds)
  const extraValue = Constants.expoConfig?.extra?.[key];
  if (extraValue) return extraValue;

  // Return fallback or throw error
  if (fallback !== undefined) return fallback;
  
  throw new Error(`Environment variable ${key} is not defined`);
}

/**
 * Environment configuration object
 */
export const env = {
  // Supabase
  supabaseUrl: getEnvVar('EXPO_PUBLIC_SUPABASE_URL', ''),
  supabaseKey: getEnvVar('EXPO_PUBLIC_SUPABASE_KEY', ''),

  // Google Maps
  googleMapsApiKey: getEnvVar('EXPO_PUBLIC_GOOGLE_MAPS_API_KEY', ''),

  // API
  apiBaseUrl: getEnvVar('EXPO_PUBLIC_API_BASE_URL', 'http://localhost:3001'),
  authRedirectUri: getEnvVar('EXPO_PUBLIC_AUTH_REDIRECT_URI', 'exp://localhost:8081'),

  // Google OAuth
  googleWebClientId: getEnvVar('EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID', ''),
  androidClientId: getEnvVar('EXPO_ANDROID_CLIENT_ID', ''),

  // Debug
  debugAuth: getEnvVar('EXPO_PUBLIC_DEBUG_AUTH', '0') === '1',
} as const;

/**
 * Validate that all required environment variables are set
 */
export function validateEnv(): { valid: boolean; missing: string[] } {
  const required = [
    'EXPO_PUBLIC_SUPABASE_URL',
    'EXPO_PUBLIC_SUPABASE_KEY',
    'EXPO_PUBLIC_GOOGLE_MAPS_API_KEY',
  ];

  const missing: string[] = [];

  for (const key of required) {
    try {
      getEnvVar(key);
    } catch {
      missing.push(key);
    }
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}

// Log environment configuration in development
if (__DEV__) {
  console.log('🔧 Environment Configuration:');
  console.log('- Supabase URL:', env.supabaseUrl ? '✓ Set' : '✗ Missing');
  console.log('- Supabase Key:', env.supabaseKey ? '✓ Set' : '✗ Missing');
  console.log('- Google Maps API Key:', env.googleMapsApiKey ? '✓ Set' : '✗ Missing');
  console.log('- API Base URL:', env.apiBaseUrl);
  console.log('- Debug Auth:', env.debugAuth);

  const validation = validateEnv();
  if (!validation.valid) {
    console.warn('⚠️ Missing required environment variables:', validation.missing);
  }
}

export default env;
