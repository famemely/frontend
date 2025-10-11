import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useRouter } from 'expo-router';

import AuthScreen from '@/components/auth/AuthScreen';
import HomeScreen from '@/components/home/HomeScreen';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';

export default function Index() {
  const { user, isLoading, login } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();

  console.log('📱 Index: Rendering with state:', {
    hasUser: !!user,
    isLoading,
    userId: user?.id
  });

  if (isLoading) {
    console.log('📱 Index: Showing loading screen');
    return (
      <View style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.colors.background
      }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!user) {
    console.log('📱 Index: No user, showing AuthScreen');
    return <AuthScreen onAuthSuccess={login} />;
  }

  console.log('📱 Index: User found, showing HomeScreen (Map)');
  return <HomeScreen />;
}
