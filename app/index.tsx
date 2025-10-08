import React from 'react';
import { ActivityIndicator, View } from 'react-native';

import AuthScreen from '@/components/auth/AuthScreen';
import FamilyMapScreen from '@/components/FamilyMapScreen';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';

export default function Index() {
  const { user, isLoading, login } = useAuth();
  const { theme } = useTheme();

  if (isLoading) {
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
    return <AuthScreen onAuthSuccess={login} />;
  }

  return <FamilyMapScreen />;
}
