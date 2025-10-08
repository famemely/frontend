import Constants from "expo-constants";
import { supabase } from "./auth.service";

// Use the OAuth 2.0 Web Client ID from Supabase configuration
const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

// We avoid dynamic import during EAS eager bundling; use lazy require inside a try/catch.
// Types are declared manually to prevent TS complaining without importing the module at top level.
type GoogleSignInModule = {
  GoogleSignin: {
    configure: (options: any) => void;
    hasPlayServices: (opts?: any) => Promise<boolean>;
    signIn: () => Promise<any>;
    signOut: () => Promise<void>;
  };
  statusCodes: {
    SIGN_IN_CANCELLED: string;
    IN_PROGRESS: string;
    PLAY_SERVICES_NOT_AVAILABLE: string;
  };
};
type GoogleSignInInstance = GoogleSignInModule["GoogleSignin"];

type LoadOptions = {
  requireAvailability?: boolean;
};

let cachedGoogleSignin: GoogleSignInInstance | null = null;

function isExpoGo(): boolean {
  return Constants.appOwnership === "expo";
}

async function loadGoogleSignInModule({
  requireAvailability = true,
}: LoadOptions = {}) {
  if (isExpoGo()) {
    if (requireAvailability) {
      throw new Error(
        "Native Google Sign-In is not available in Expo Go. Use an Expo development build or EAS build."
      );
    }
    throw new Error("Google Sign-In native module unavailable.");
  }

  if (!cachedGoogleSignin) {
    try {
      // Use require to avoid creating a separate async chunk that EAS eager bundling tries to pre-resolve.
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const mod: GoogleSignInModule = require("@react-native-google-signin/google-signin");
      cachedGoogleSignin = mod.GoogleSignin;
    } catch (e) {
      throw new Error(
        "Failed to load Google Sign-In native module. Make sure the development build includes the plugin."
      );
    }
  }
  return cachedGoogleSignin;
}

export async function configureGoogleSignIn() {
  try {
    // Skip configuration if web client ID is not provided
    if (!GOOGLE_WEB_CLIENT_ID) {
      console.warn("EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID not configured");
      return;
    }

    const GoogleSignin = await loadGoogleSignInModule({
      requireAvailability: false,
    });

    GoogleSignin.configure({
      webClientId: GOOGLE_WEB_CLIENT_ID, // OAuth 2.0 client ID from Supabase
      offlineAccess: false,
    });

    console.log("Google Sign-In configured successfully");
  } catch (error) {
    // Native Google sign-in not available; skip configuration silently
    console.log(
      "Google Sign-In configuration skipped:",
      error instanceof Error ? error.message : "Unknown error"
    );
  }
}

export async function signInWithGoogleNative() {
  try {
    const GoogleSignin = await loadGoogleSignInModule();

    // Check if Play Services are available
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

    // Sign in with Google
    const userInfo = await GoogleSignin.signIn();

    // Extract idToken from the response (handle both possible formats)
    const idToken = userInfo?.data?.idToken || userInfo?.idToken;

    if (!idToken) {
      console.error("Google Sign-In response:", JSON.stringify(userInfo));
      throw new Error("No ID token present!");
    }

    console.log("Got ID token, signing in to Supabase...");

    // Sign in to Supabase with the Google ID token
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: "google",
      token: idToken,
    });

    if (error) {
      console.error("Supabase signInWithIdToken error:", error);
      throw error;
    }

    if (!data?.session) {
      throw new Error("No session returned from Supabase");
    }

    console.log("Successfully signed in with Google");
    return data.session;
  } catch (error) {
    console.error("signInWithGoogleNative error:", error);
    throw error;
  }
}

export async function signOutGoogleNative() {
  try {
    const GoogleSignin = await loadGoogleSignInModule({
      requireAvailability: false,
    });
    await GoogleSignin.signOut();
  } catch (error) {
    // Sign-out skipped if native module missing; no-op in production
  }
}
