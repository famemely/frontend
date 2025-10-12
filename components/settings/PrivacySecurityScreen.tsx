/**
 * Privacy & Security Screen
 * Consolidates Two-Factor Auth and Account Deletion
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';

export default function PrivacySecurityScreen() {
  const { theme } = useTheme();
  const router = useRouter();

  const styles = createStyles(theme);

  const securityItems = [
    {
      id: 'two-factor',
      title: 'Two-Factor Authentication',
      description: 'Add an extra layer of security to your account',
      icon: '🔐',
      onPress: () => router.push('/settings/two-factor-auth' as any),
    },
    {
      id: 'password',
      title: 'Change Password',
      description: 'Update your account password',
      icon: '🔑',
      onPress: () => router.push('/settings/change-password' as any),
    },
    {
      id: 'sessions',
      title: 'Active Sessions',
      description: 'Manage devices signed into your account',
      icon: '📱',
      onPress: () => router.push('/settings/sessions' as any),
    },
  ];

  const dangerItems = [
    {
      id: 'delete-account',
      title: 'Delete Account',
      description: 'Permanently delete your account and all data',
      icon: '⚠️',
      onPress: () => router.push('/settings/delete-account' as any),
    },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy & Security</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Info Section */}
        <View style={styles.infoSection}>
          <Text style={styles.infoIcon}>🔒</Text>
          <Text style={styles.infoTitle}>Protect Your Account</Text>
          <Text style={styles.infoText}>
            Manage your security settings and control who has access to your information.
          </Text>
        </View>

        {/* Security Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security</Text>
          <View style={styles.sectionContent}>
            {securityItems.map((item, index) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.item, index < securityItems.length - 1 && styles.itemBorder]}
                onPress={item.onPress}
              >
                <Text style={styles.itemIcon}>{item.icon}</Text>
                <View style={styles.itemContent}>
                  <Text style={styles.itemTitle}>{item.title}</Text>
                  <Text style={styles.itemDescription}>{item.description}</Text>
                </View>
                <Text style={styles.itemArrow}>›</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Danger Zone */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Danger Zone</Text>
          <View style={styles.dangerContent}>
            {dangerItems.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.dangerItem}
                onPress={item.onPress}
              >
                <Text style={styles.itemIcon}>{item.icon}</Text>
                <View style={styles.itemContent}>
                  <Text style={styles.dangerTitle}>{item.title}</Text>
                  <Text style={styles.itemDescription}>{item.description}</Text>
                </View>
                <Text style={styles.dangerArrow}>›</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
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
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: Platform.OS === 'ios' ? 60 : 40,
      paddingHorizontal: theme.spacing.lg,
      paddingBottom: theme.spacing.md,
      backgroundColor: '#FFFFFF',
      borderBottomWidth: 1,
      borderBottomColor: '#E5E5E5',
    },
    backButton: {
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
    },
    backIcon: {
      fontSize: 32,
      color: '#053326',
      fontWeight: '300',
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: '#000000',
    },
    placeholder: {
      width: 40,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: 40,
    },

    // Info Section
    infoSection: {
      alignItems: 'center',
      paddingVertical: theme.spacing.xl,
      paddingHorizontal: theme.spacing.lg,
      backgroundColor: '#FFFFFF',
      borderBottomWidth: 1,
      borderBottomColor: '#E5E5E5',
    },
    infoIcon: {
      fontSize: 64,
      marginBottom: theme.spacing.md,
    },
    infoTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: '#000000',
      marginBottom: theme.spacing.sm,
    },
    infoText: {
      fontSize: 14,
      color: '#666666',
      textAlign: 'center',
      lineHeight: 20,
    },

    // Sections
    section: {
      marginTop: theme.spacing.lg,
      paddingHorizontal: theme.spacing.lg,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: '600',
      color: '#666666',
      marginBottom: theme.spacing.sm,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    sectionContent: {
      backgroundColor: '#FFFFFF',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#E5E5E5',
      overflow: 'hidden',
    },
    item: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.md,
    },
    itemBorder: {
      borderBottomWidth: 1,
      borderBottomColor: '#F5F5F5',
    },
    itemIcon: {
      fontSize: 24,
      marginRight: theme.spacing.md,
    },
    itemContent: {
      flex: 1,
    },
    itemTitle: {
      fontSize: 16,
      color: '#000000',
      fontWeight: '500',
      marginBottom: 4,
    },
    itemDescription: {
      fontSize: 13,
      color: '#666666',
    },
    itemArrow: {
      fontSize: 24,
      color: '#999999',
    },

    // Danger Zone
    dangerContent: {
      backgroundColor: '#FEE2E2',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#FECACA',
      overflow: 'hidden',
    },
    dangerItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.md,
    },
    dangerTitle: {
      fontSize: 16,
      color: '#DC2626',
      fontWeight: '600',
      marginBottom: 4,
    },
    dangerArrow: {
      fontSize: 24,
      color: '#DC2626',
    },
  });
