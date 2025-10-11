import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import 'react-native-reanimated';

import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import { debugEnvironmentVariables } from '../debug-env';

function RootNavigator() {
  const { theme, themeMode } = useTheme();
  
  return (
    <>
      <Stack screenOptions={{ 
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.background }
      }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="Dashboard" />
        <Stack.Screen name="FamilyMap" options={{
          presentation: 'card',
          animation: 'slide_from_right'
        }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
      </Stack>
      <StatusBar style={themeMode === 'light' ? 'dark' : 'light'} />
    </>
  );
}

export default function RootLayout() {
  // Debug environment variables on app start
  React.useEffect(() => {
    debugEnvironmentVariables();
  }, []);

  return (
    <ThemeProvider>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </ThemeProvider>
  );
}
