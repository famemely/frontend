/**
 * Expo App Configuration
 * This file allows us to use environment variables in the app configuration
 */

module.exports = {
  expo: {
    name: 'Famemely',
    slug: 'famemely',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: 'famemely',
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.famemely.app',
    },
    android: {
      permissions: [
        'ACCESS_COARSE_LOCATION',
        'ACCESS_FINE_LOCATION',
        'FOREGROUND_SERVICE',
        'ACCESS_BACKGROUND_LOCATION',
      ],
      config: {
        googleMaps: {
          apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
        },
      },
      package: 'com.famemely.app',
      adaptiveIcon: {
        backgroundColor: '#E6F4FE',
        foregroundImage: './assets/images/android-icon-foreground.png',
        backgroundImage: './assets/images/android-icon-background.png',
        monochromeImage: './assets/images/android-icon-monochrome.png',
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
    },
    web: {
      output: 'static',
      favicon: './assets/images/favicon.png',
    },
    plugins: [
      'expo-router',
      [
        'expo-splash-screen',
        {
          image: './assets/images/splash-icon.png',
          imageWidth: 200,
          resizeMode: 'contain',
          backgroundColor: '#ffffff',
          dark: {
            backgroundColor: '#000000',
          },
        },
      ],
      [
        '@react-native-google-signin/google-signin',
        {
          androidClientId: process.env.EXPO_ANDROID_CLIENT_ID,
          iosUrlScheme: `com.googleusercontent.apps.${process.env.EXPO_ANDROID_CLIENT_ID?.split('-')[0]}`,
        },
      ],
      'expo-font',
      'expo-web-browser',
      'expo-sqlite',
      'expo-secure-store',
      [
        'expo-location',
        {
          locationAlwaysAndWhenInUsePermission:
            'Allow Famemely to use your location to share with family members.',
          locationAlwaysPermission:
            'Allow Famemely to use your location even when the app is in the background.',
          locationWhenInUsePermission:
            'Allow Famemely to use your location while you are using the app.',
          isIosBackgroundLocationEnabled: true,
          isAndroidBackgroundLocationEnabled: true,
          isAndroidForegroundServiceEnabled: true,
        },
      ],
      'expo-task-manager',
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
    extra: {
      router: {
        origin: false,
      },
      eas: {
        projectId: 'bfed8786-ab81-411f-b0e5-7b9e5e10116f',
      },
      // Make environment variables available in the app
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
      supabaseKey: process.env.EXPO_PUBLIC_SUPABASE_KEY,
      googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
      apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL,
    },
    updates: {
      enabled: false,
      fallbackToCacheTimeout: 0,
    },
    runtimeVersion: {
      policy: 'appVersion',
    },
  },
};
