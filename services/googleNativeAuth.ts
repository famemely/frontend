import Constants from 'expo-constants';
import { supabase } from './auth.service';

const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

type GoogleSignInModule = typeof import('@react-native-google-signin/google-signin');
type GoogleSignInInstance = GoogleSignInModule['GoogleSignin'];

type LoadOptions = {
  requireAvailability?: boolean;
};

let googleSigninPromise: Promise<GoogleSignInInstance> | null = null;

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

  if (!googleSigninPromise) {
    googleSigninPromise = import('@react-native-google-signin/google-signin').then(
      (module) => module.GoogleSignin
    );
  }

  return googleSigninPromise;
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
    if (__DEV__) {
      console.warn('[GoogleSignIn] Native module unavailable, skipping configuration.', error);
    }
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
    if (__DEV__) {
      console.warn('[GoogleSignIn] Sign-out skipped.', error);
    }
  }
}
