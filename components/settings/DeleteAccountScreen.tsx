/**
 * Delete Account Screen
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Alert,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';

export default function DeleteAccountScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const styles = createStyles(theme);

  const handleDeleteAccount = async () => {
    if (confirmText.toLowerCase() !== 'delete') {
      Alert.alert('Error', 'Please type "DELETE" to confirm');
      return;
    }

    Alert.alert(
      'Final Confirmation',
      'This action cannot be undone. All your data will be permanently deleted. Are you absolutely sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Forever',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              // TODO: Call delete account API
              // await authService.deleteAccount();
              
              Alert.alert(
                'Account Deleted',
                'Your account has been permanently deleted. We\'re sorry to see you go.',
                [
                  {
                    text: 'OK',
                    onPress: async () => {
                      await logout();
                    },
                  },
                ]
              );
            } catch (error) {
              Alert.alert('Error', 'Failed to delete account. Please try again.');
              console.error('Delete account error:', error);
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Delete Account</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Warning Section */}
        <View style={styles.warningSection}>
          <Text style={styles.warningIcon}>⚠️</Text>
          <Text style={styles.warningTitle}>Permanent Account Deletion</Text>
          <Text style={styles.warningText}>
            This action cannot be undone and will result in permanent data loss.
          </Text>
        </View>

        {/* What Gets Deleted */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What will be deleted</Text>
          <View style={styles.sectionContent}>
            <View style={[styles.item, styles.itemBorder]}>
              <Text style={styles.deleteIcon}>👤</Text>
              <View style={styles.itemText}>
                <Text style={styles.itemLabel}>Your Profile</Text>
                <Text style={styles.itemDescription}>Name, email, and personal information</Text>
              </View>
            </View>

            <View style={[styles.item, styles.itemBorder]}>
              <Text style={styles.deleteIcon}>👨‍👩‍👧‍👦</Text>
              <View style={styles.itemText}>
                <Text style={styles.itemLabel}>Family Memberships</Text>
                <Text style={styles.itemDescription}>
                  You'll be removed from all family groups
                </Text>
              </View>
            </View>

            <View style={[styles.item, styles.itemBorder]}>
              <Text style={styles.deleteIcon}>📍</Text>
              <View style={styles.itemText}>
                <Text style={styles.itemLabel}>Location History</Text>
                <Text style={styles.itemDescription}>All your location data and history</Text>
              </View>
            </View>

            <View style={styles.item}>
              <Text style={styles.deleteIcon}>🔐</Text>
              <View style={styles.itemText}>
                <Text style={styles.itemLabel}>Account Access</Text>
                <Text style={styles.itemDescription}>You won't be able to sign in again</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Alternatives */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Consider These Alternatives</Text>
          <View style={styles.sectionContent}>
            <View style={[styles.item, styles.itemBorder]}>
              <View style={styles.itemText}>
                <Text style={styles.itemLabel}>👻 Enable Ghost Mode</Text>
                <Text style={styles.itemDescription}>Temporarily hide your location</Text>
              </View>
            </View>

            <View style={styles.item}>
              <View style={styles.itemText}>
                <Text style={styles.itemLabel}>🚪 Leave Family Groups</Text>
                <Text style={styles.itemDescription}>
                  Keep your account but stop sharing with families
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Confirmation */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Type "DELETE" to confirm</Text>
          <TextInput
            style={styles.confirmInput}
            value={confirmText}
            onChangeText={setConfirmText}
            placeholder="Type DELETE in capital letters"
            placeholderTextColor="#999999"
            autoCapitalize="characters"
            autoCorrect={false}
          />
        </View>

        {/* Delete Button */}
        <View style={styles.section}>
          <TouchableOpacity
            style={[
              styles.deleteButton,
              confirmText.toLowerCase() !== 'delete' && styles.deleteButtonDisabled,
            ]}
            onPress={handleDeleteAccount}
            disabled={confirmText.toLowerCase() !== 'delete' || deleting}
          >
            {deleting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.deleteButtonText}>Delete My Account Forever</Text>
            )}
          </TouchableOpacity>
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
      color: '#DC2626',
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

    // Warning Section
    warningSection: {
      alignItems: 'center',
      paddingVertical: theme.spacing.xl,
      paddingHorizontal: theme.spacing.lg,
      backgroundColor: '#FEE2E2',
      borderBottomWidth: 1,
      borderBottomColor: '#FECACA',
    },
    warningIcon: {
      fontSize: 64,
      marginBottom: theme.spacing.md,
    },
    warningTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: '#DC2626',
      marginBottom: theme.spacing.sm,
    },
    warningText: {
      fontSize: 14,
      color: '#991B1B',
      textAlign: 'center',
      lineHeight: 20,
      fontWeight: '500',
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
    deleteIcon: {
      fontSize: 24,
      marginRight: theme.spacing.md,
    },
    itemText: {
      flex: 1,
    },
    itemLabel: {
      fontSize: 16,
      color: '#000000',
      fontWeight: '500',
      marginBottom: 4,
    },
    itemDescription: {
      fontSize: 13,
      color: '#666666',
    },

    // Confirmation Input
    confirmInput: {
      backgroundColor: '#FFFFFF',
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#E5E5E5',
      padding: theme.spacing.md,
      fontSize: 16,
      color: '#000000',
      fontWeight: '600',
      textAlign: 'center',
    },

    // Delete Button
    deleteButton: {
      backgroundColor: '#DC2626',
      borderRadius: 8,
      padding: theme.spacing.md,
      alignItems: 'center',
      minHeight: 50,
      justifyContent: 'center',
    },
    deleteButtonDisabled: {
      backgroundColor: '#E5E5E5',
    },
    deleteButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
  });
