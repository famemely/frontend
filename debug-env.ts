/**
 * Debug Environment Variables
 * This file helps debug environment configuration issues
 */

import Constants from "expo-constants";

export function debugEnvironmentVariables() {
  console.log("🔍 Environment Debug Information:");
  console.log("================================");

  console.log("📱 App Info:");
  console.log(`- Platform: ${Constants.platform}`);
  console.log(`- App Version: ${Constants.expoConfig?.version}`);
  console.log(`- SDK Version: ${Constants.expoConfig?.sdkVersion}`);

  console.log("\n🔑 Environment Variables:");
  console.log(
    `- EXPO_PUBLIC_SUPABASE_URL: ${
      process.env.EXPO_PUBLIC_SUPABASE_URL ? "✅ Set" : "❌ Missing"
    }`
  );
  console.log(
    `- EXPO_PUBLIC_SUPABASE_KEY: ${
      process.env.EXPO_PUBLIC_SUPABASE_KEY ? "✅ Set" : "❌ Missing"
    }`
  );
  console.log(
    `- EXPO_PUBLIC_GOOGLE_MAPS_API_KEY: ${
      process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ? "✅ Set" : "❌ Missing"
    }`
  );
  console.log(
    `- EXPO_PUBLIC_API_BASE_URL: ${
      process.env.EXPO_PUBLIC_API_BASE_URL || "Using default"
    }`
  );
  console.log(
    `- EXPO_PUBLIC_DEBUG_AUTH: ${process.env.EXPO_PUBLIC_DEBUG_AUTH || "0"}`
  );

  console.log("\n🏗️ Expo Constants Extra:");
  console.log(JSON.stringify(Constants.expoConfig?.extra, null, 2));

  console.log("\n⚙️ Process Env (filtered):");
  const filteredEnv: Record<string, string> = {};
  Object.keys(process.env).forEach((key) => {
    if (key.startsWith("EXPO_PUBLIC_")) {
      filteredEnv[key] = process.env[key] ? "***SET***" : "undefined";
    }
  });
  console.log(JSON.stringify(filteredEnv, null, 2));

  console.log("================================");
}
