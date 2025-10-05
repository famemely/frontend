import Constants from 'expo-constants';
import { supabase } from './auth.service';

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
};
type GoogleSignInInstance = GoogleSignInModule['GoogleSignin'];

type LoadOptions = {
  requireAvailability?: boolean;
};

let cachedGoogleSignin: GoogleSignInInstance | null = null;

function isExpoGo(): boolean {
  return Constants.appOwnership === 'expo';
}

async function loadGoogleSignInModule({ requireAvailability = true }: LoadOptions = {}) {
  if (isExpoGo()) {
    if (requireAvailability) {
      throw new Error('Native Google Sign-In is not available in Expo Go. Use an Expo development build or EAS build.');
    }
    throw new Error('Google Sign-In native module unavailable.');
  }

  if (!cachedGoogleSignin) {
    try {
      // Use require to avoid creating a separate async chunk that EAS eager bundling tries to pre-resolve.
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const mod: GoogleSignInModule = require('@react-native-google-signin/google-signin');
      cachedGoogleSignin = mod.GoogleSignin;
    } catch (e) {
      throw new Error('Failed to load Google Sign-In native module. Make sure the development build includes the plugin.');
    }
  }
  return cachedGoogleSignin;
}

export async function configureGoogleSignIn() {
  try {
    const GoogleSignin = await loadGoogleSignInModule({ requireAvailability: false });
    GoogleSignin.configure({
      webClientId: GOOGLE_WEB_CLIENT_ID,
      offlineAccess: false,
      forceCodeForRefreshToken: false,
    });
  } catch (error) {
    // Native Google sign-in not available; skip configuration silently in production
  }
}

export async function signInWithGoogleNative() {
  const GoogleSignin = await loadGoogleSignInModule();

  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const userInfo = await GoogleSignin.signIn();
  const idToken = (userInfo as any)?.idToken ?? (userInfo as any)?.data?.idToken;

  if (!idToken) {
    throw new Error('No idToken returned from Google Sign-In');
  }

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'google',
    token: idToken,
  });

  if (error) {
    throw error;
  }

  return data.session;
}

export async function signOutGoogleNative() {
  try {
    const GoogleSignin = await loadGoogleSignInModule({ requireAvailability: false });
    await GoogleSignin.signOut();
  } catch (error) {
    // Sign-out skipped if native module missing; no-op in production
  }
}
