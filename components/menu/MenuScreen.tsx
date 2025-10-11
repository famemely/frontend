/**
 * Menu Screen - Elegant Side Menu
 * Following the auth screen aesthetic
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useFamily } from '@/hooks/useFamily';

export default function MenuScreen() {
  const { user, logout } = useAuth();
  const { theme } = useTheme();
  const { currentFamily, families } = useFamily();
  const router = useRouter();

  const styles = createStyles(theme);

  const handleLogout = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
              // Logout will handle navigation via AuthContext
            } catch (error) {
              Alert.alert('Error', 'Failed to sign out');
            }
          },
        },
      ]
    );
  };

  const menuItems = [
    {
      id: 'profile',
      title: 'My Profile',
      icon: '👤',
      onPress: () => router.push('/profile' as any),
    },
    {
      id: 'families',
      title: 'My Families',
      icon: '🏠',
      subtitle: `${families?.length || 0} families`,
      onPress: () => router.push('/families' as any),
    },
    {
      id: 'invitations',
      title: 'Invitations',
      icon: '✉️',
      onPress: () => router.push('/invitations' as any),
    },
    {
      id: 'geofencing',
      title: 'Geofencing',
      icon: '�️',
      onPress: () => router.push('/geofencing' as any),
    },
    {
      id: 'location',
      title: 'Location Settings',
      icon: '�',
      onPress: () => router.push('/settings/location' as any),
    },
    {
      id: 'ghost-mode',
      title: 'Ghost Mode',
      icon: '�',
      onPress: () => router.push('/settings/ghost-mode' as any),
    },
    {
      id: 'notifications',
      title: 'Notifications',
      icon: '🔔',
      onPress: () => router.push('/notifications' as any),
    },
    {
      id: 'privacy',
      title: 'Privacy & Security',
      icon: '🔒',
      onPress: () => router.push('/settings/privacy-security' as any),
    },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => router.back()}
        >
          <Text style={styles.closeIcon}>×</Text>
        </TouchableOpacity>
        
        <Text style={styles.logo}>Famemely</Text>
        
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{user?.fullName || user?.email}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
        </View>
      </View>

      {/* Menu Items */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Theme Switcher removed; use map top-right toggle */}

        {/* Menu List */}
        <View style={styles.menuList}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.menuItem,
                index === menuItems.length - 1 && styles.menuItemLast,
              ]}
              onPress={item.onPress}
              activeOpacity={0.7}
            >
              <View style={styles.menuItemIcon}>
                <Text style={styles.iconEmoji}>{item.icon}</Text>
              </View>
              <View style={styles.menuItemContent}>
                <Text style={styles.menuItemTitle}>{item.title}</Text>
                {item.subtitle && (
                  <Text style={styles.menuItemSubtitle}>{item.subtitle}</Text>
                )}
              </View>
              <Text style={styles.menuItemArrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>

        {/* Version Info */}
        <Text style={styles.versionText}>Version 1.0.0</Text>
      </ScrollView>
    </View>
  );
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      paddingTop: Platform.OS === 'ios' ? 60 : 40,
      paddingHorizontal: theme.spacing.lg,
      paddingBottom: theme.spacing.xl,
      backgroundColor: '#FFFFFF',
      borderBottomWidth: 1,
      borderBottomColor: '#E5E5E5',
    },
    closeButton: {
      position: 'absolute',
      top: Platform.OS === 'ios' ? 60 : 40,
      right: theme.spacing.lg,
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 10,
    },
    closeIcon: {
      fontSize: 32,
      color: '#053326',
      fontWeight: '300',
    },
    logo: {
      fontSize: 48,
      fontFamily: Platform.select({
        ios: 'Zapfino',
        android: 'cursive',
      }),
      color: '#053326',
      marginBottom: theme.spacing.lg,
      letterSpacing: 2,
    },
    userInfo: {
      marginTop: theme.spacing.sm,
    },
    userName: {
      fontSize: 18,
      fontWeight: '600',
      color: '#000000',
      marginBottom: 4,
    },
    userEmail: {
      fontSize: 14,
      color: '#666666',
      fontWeight: '400',
    },

    // Content
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.xl,
    },

    // Theme Switcher styles removed


    // Menu List
    menuList: {
      marginBottom: theme.spacing.xl,
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#FAFAFA',
      borderWidth: 1,
      borderColor: '#E5E5E5',
      borderRadius: 12,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.sm,
    },
    menuItemLast: {
      marginBottom: 0,
    },
    menuItemIcon: {
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: theme.spacing.md,
    },
    iconEmoji: {
      fontSize: 24,
    },
    menuItemContent: {
      flex: 1,
    },
    menuItemTitle: {
      fontSize: 16,
      fontWeight: '500',
      color: '#000000',
    },
    menuItemSubtitle: {
      fontSize: 12,
      color: '#666666',
      marginTop: 2,
    },
    menuItemArrow: {
      fontSize: 24,
      color: '#999999',
    },

    // Logout Button
    logoutButton: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: '#053326',
      borderRadius: 8,
      padding: theme.spacing.md,
      alignItems: 'center',
      marginTop: theme.spacing.lg,
    },
    logoutText: {
      color: '#053326',
      fontSize: 16,
      fontWeight: '500',
    },

    // Version
    versionText: {
      fontSize: 12,
      color: '#999999',
      textAlign: 'center',
      marginTop: theme.spacing.lg,
      fontWeight: '400',
    },
  });
