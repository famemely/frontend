/**
 * Change Password Screen
 * Allows users to update their password with validation
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Platform,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { authService } from '@/services/auth.service';

export default function ChangePasswordScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const styles = createStyles(theme);

  const validatePassword = (password: string): string | null => {
    if (password.length < 8) {
      return 'Password must be at least 8 characters';
    }
    if (!/[A-Z]/.test(password)) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!/[a-z]/.test(password)) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!/[0-9]/.test(password)) {
      return 'Password must contain at least one number';
    }
    return null;
  };

  const handleChangePassword = async () => {
    // Validation
    if (!currentPassword) {
      Alert.alert('Error', 'Please enter your current password');
      return;
    }

    if (!newPassword) {
      Alert.alert('Error', 'Please enter a new password');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }

    if (currentPassword === newPassword) {
      Alert.alert('Error', 'New password must be different from current password');
      return;
    }

    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      Alert.alert('Invalid Password', passwordError);
      return;
    }

    setLoading(true);
    try {
      await authService.updatePassword(newPassword);
      
      Alert.alert(
        'Success',
        'Your password has been changed successfully',
        [
          {
            text: 'OK',
            onPress: () => {
              setCurrentPassword('');
              setNewPassword('');
              setConfirmPassword('');
              router.back();
            },
          },
        ]
      );
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.message || 'Failed to change password. Please check your current password and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrength = (password: string): { label: string; color: string; percentage: number } => {
    if (!password) return { label: '', color: '#E5E5E5', percentage: 0 };
    
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;

    if (strength <= 2) return { label: 'Weak', color: '#DC2626', percentage: 33 };
    if (strength <= 4) return { label: 'Medium', color: '#F59E0B', percentage: 66 };
    return { label: 'Strong', color: '#10B981', percentage: 100 };
  };

  const passwordStrength = getPasswordStrength(newPassword);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Change Password</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Info Card */}
        <View style={styles.infoCard}>
          <Text style={styles.infoIcon}>🔐</Text>
          <Text style={styles.infoText}>
            Choose a strong password to protect your account. We recommend using a password manager.
          </Text>
        </View>

        {/* Current Password */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Current Password</Text>
          <View style={styles.passwordInputContainer}>
            <TextInput
              style={styles.passwordInput}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder="Enter current password"
              secureTextEntry={!showCurrentPassword}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowCurrentPassword(!showCurrentPassword)}
            >
              <Text style={styles.eyeIcon}>{showCurrentPassword ? '👁️' : '👁️‍🗨️'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* New Password */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>New Password</Text>
          <View style={styles.passwordInputContainer}>
            <TextInput
              style={styles.passwordInput}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Enter new password"
              secureTextEntry={!showNewPassword}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowNewPassword(!showNewPassword)}
            >
              <Text style={styles.eyeIcon}>{showNewPassword ? '👁️' : '👁️‍🗨️'}</Text>
            </TouchableOpacity>
          </View>
          
          {/* Password Strength Indicator */}
          {newPassword.length > 0 && (
            <View style={styles.strengthContainer}>
              <View style={styles.strengthBar}>
                <View
                  style={[
                    styles.strengthFill,
                    { width: `${passwordStrength.percentage}%`, backgroundColor: passwordStrength.color },
                  ]}
                />
              </View>
              <Text style={[styles.strengthLabel, { color: passwordStrength.color }]}>
                {passwordStrength.label}
              </Text>
            </View>
          )}
        </View>

        {/* Confirm Password */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Confirm New Password</Text>
          <View style={styles.passwordInputContainer}>
            <TextInput
              style={styles.passwordInput}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirm new password"
              secureTextEntry={!showConfirmPassword}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              <Text style={styles.eyeIcon}>{showConfirmPassword ? '👁️' : '👁️‍🗨️'}</Text>
            </TouchableOpacity>
          </View>
          {confirmPassword.length > 0 && (
            <Text style={[
              styles.matchIndicator,
              { color: newPassword === confirmPassword ? '#10B981' : '#DC2626' }
            ]}>
              {newPassword === confirmPassword ? '✓ Passwords match' : '✗ Passwords do not match'}
            </Text>
          )}
        </View>

        {/* Requirements */}
        <View style={styles.requirementsCard}>
          <Text style={styles.requirementsTitle}>Password Requirements:</Text>
          <Text style={[styles.requirement, newPassword.length >= 8 && styles.requirementMet]}>
            {newPassword.length >= 8 ? '✓' : '○'} At least 8 characters
          </Text>
          <Text style={[styles.requirement, /[A-Z]/.test(newPassword) && styles.requirementMet]}>
            {/[A-Z]/.test(newPassword) ? '✓' : '○'} One uppercase letter
          </Text>
          <Text style={[styles.requirement, /[a-z]/.test(newPassword) && styles.requirementMet]}>
            {/[a-z]/.test(newPassword) ? '✓' : '○'} One lowercase letter
          </Text>
          <Text style={[styles.requirement, /[0-9]/.test(newPassword) && styles.requirementMet]}>
            {/[0-9]/.test(newPassword) ? '✓' : '○'} One number
          </Text>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleChangePassword}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitButtonText}>Change Password</Text>
          )}
        </TouchableOpacity>
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

    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: theme.spacing.lg,
    },

    // Info Card
    infoCard: {
      flexDirection: 'row',
      backgroundColor: '#F0F9FF',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#BAE6FD',
      padding: theme.spacing.md,
      marginBottom: theme.spacing.lg,
      gap: theme.spacing.sm,
    },
    infoIcon: {
      fontSize: 24,
    },
    infoText: {
      flex: 1,
      fontSize: 14,
      color: '#0369A1',
      lineHeight: 20,
    },

    // Form Groups
    formGroup: {
      marginBottom: theme.spacing.lg,
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: '#000000',
      marginBottom: theme.spacing.sm,
    },
    passwordInputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#F5F5F5',
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#E5E5E5',
    },
    passwordInput: {
      flex: 1,
      padding: theme.spacing.md,
      fontSize: 16,
      color: '#000000',
    },
    eyeButton: {
      padding: theme.spacing.md,
    },
    eyeIcon: {
      fontSize: 20,
    },

    // Password Strength
    strengthContainer: {
      marginTop: theme.spacing.sm,
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    strengthBar: {
      flex: 1,
      height: 4,
      backgroundColor: '#E5E5E5',
      borderRadius: 2,
      overflow: 'hidden',
    },
    strengthFill: {
      height: '100%',
      borderRadius: 2,
    },
    strengthLabel: {
      fontSize: 12,
      fontWeight: '600',
      minWidth: 60,
    },
    matchIndicator: {
      fontSize: 12,
      fontWeight: '500',
      marginTop: theme.spacing.xs,
    },

    // Requirements
    requirementsCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#E5E5E5',
      padding: theme.spacing.md,
      marginBottom: theme.spacing.lg,
    },
    requirementsTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: '#000000',
      marginBottom: theme.spacing.sm,
    },
    requirement: {
      fontSize: 14,
      color: '#666666',
      marginBottom: theme.spacing.xs,
    },
    requirementMet: {
      color: '#10B981',
      fontWeight: '500',
    },

    // Submit Button
    submitButton: {
      backgroundColor: '#053326',
      borderRadius: 8,
      paddingVertical: theme.spacing.md,
      alignItems: 'center',
      marginTop: theme.spacing.md,
    },
    submitButtonDisabled: {
      opacity: 0.6,
    },
    submitButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
  });
