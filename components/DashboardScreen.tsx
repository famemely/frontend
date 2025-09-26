import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Modal } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import TwoFactorScreen from './auth/TwoFactorScreen';

export default function DashboardScreen() {
  const { user, logout } = useAuth();
  const { theme, themeMode, toggleTheme } = useTheme();
  const [show2FAModal, setShow2FAModal] = useState(false);

  const styles = createStyles(theme);

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: logout },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Welcome to Famemely!</Text>
        <Text style={styles.subtitle}>Family Location & Board App</Text>
      </View>

      <View style={styles.userInfo}>
        <Text style={styles.greeting}>
          Hello, {user?.fullName || user?.username || 'User'}!
        </Text>
        
        <View style={styles.userDetails}>
          {user?.email && (
            <Text style={styles.detail}>Email: {user.email}</Text>
          )}
          {user?.username && (
            <Text style={styles.detail}>Username: {user.username}</Text>
          )}
          {user?.age && (
            <Text style={styles.detail}>Age: {user.age}</Text>
          )}
          <Text style={styles.detail}>
            Account Type: {user?.isUnder13 ? 'Kids Account' : 'Adult Account'}
          </Text>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.button} onPress={toggleTheme}>
          <Text style={styles.buttonText}>
            Theme: {themeMode} (Tap to change)
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={() => setShow2FAModal(true)}
        >
          <Text style={styles.buttonText}>
            Setup MFA Security
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.logoutButton]}
          onPress={handleLogout}
        >
          <Text style={styles.buttonText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          🚀 Authentication system powered by Supabase!
        </Text>
        <Text style={styles.footerText}>
          🔒 Multi-Factor Authentication available
        </Text>
        <Text style={styles.footerText}>
          Ready for family features implementation.
        </Text>
      </View>

      <Modal
        visible={show2FAModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <TwoFactorScreen 
          onComplete={() => setShow2FAModal(false)} 
          onCancel={() => setShow2FAModal(false)}
        />
      </Modal>
    </View>
  );
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
      padding: theme.spacing.lg,
    },
    header: {
      alignItems: 'center',
      marginTop: theme.spacing.xl,
      marginBottom: theme.spacing.xl,
    },
    title: {
      fontSize: 32,
      fontWeight: 'bold',
      color: theme.colors.text,
      marginBottom: theme.spacing.sm,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
    userInfo: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.lg,
      marginBottom: theme.spacing.xl,
    },
    greeting: {
      fontSize: 24,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: theme.spacing.md,
    },
    userDetails: {
      marginTop: theme.spacing.md,
    },
    detail: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.sm,
    },
    actions: {
      marginBottom: theme.spacing.xl,
    },
    button: {
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.md,
      alignItems: 'center',
      marginBottom: theme.spacing.md,
    },
    logoutButton: {
      backgroundColor: theme.colors.error,
    },
    secondaryButton: {
      backgroundColor: theme.colors.secondary,
    },
    buttonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
    footer: {
      alignItems: 'center',
      marginTop: 'auto',
    },
    footerText: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginBottom: theme.spacing.sm,
    },
  });