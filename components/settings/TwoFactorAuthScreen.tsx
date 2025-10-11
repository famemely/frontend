/**
 * Two-Factor Authentication Configuration Screen
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Platform,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { authService } from '@/services/auth.service';

export default function TwoFactorAuthScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [factors, setFactors] = useState<any[]>([]);
  const [currentAAL, setCurrentAAL] = useState<string>('aal1');

  const styles = createStyles(theme);

  useEffect(() => {
    loadMFAStatus();
  }, []);

  const loadMFAStatus = async () => {
    setLoading(true);
    try {
      const mfaEnabled = await authService.isMFAEnabled();
      const mfaFactors = await authService.listMFAFactors();
      const aal = await authService.getAAL();
      
      setEnabled(mfaEnabled);
      setFactors(mfaFactors);
      setCurrentAAL(aal.currentLevel);
    } catch (error) {
      console.error('Failed to load MFA status:', error);
      Alert.alert('Error', 'Failed to load two-factor authentication status');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleEnable = async (value: boolean) => {
    if (!value && factors.length > 0) {
      // Disable MFA - need to remove all factors
      Alert.alert(
        'Disable Two-Factor Authentication',
        'This will make your account less secure. You will need to verify with your current 2FA code.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Disable',
            style: 'destructive',
            onPress: () => handleDisableMFA(),
          },
        ]
      );
    } else if (value) {
      // Enable MFA
      handleEnableMFA();
    }
  };

  const handleEnableMFA = async () => {
    try {
      setLoading(true);
      const result = await authService.enableMFA();
      
      Alert.alert(
        'Setup Authenticator App',
        `Secret: ${result.secret}\n\nScan this QR code with your authenticator app:\n${result.qr_code}\n\nFactor ID: ${result.factorId}`,
        [
          {
            text: 'I\'ve Added It',
            onPress: () => {
              router.push('/two-factor-verify' as any);
              loadMFAStatus();
            },
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to enable two-factor authentication');
    } finally {
      setLoading(false);
    }
  };

  const handleDisableMFA = () => {
    Alert.prompt(
      'Enter Verification Code',
      'Enter your 6-digit code from your authenticator app',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Verify & Disable',
          onPress: async (code?: string) => {
            if (!code || code.length !== 6) {
              Alert.alert('Error', 'Please enter a valid 6-digit code');
              return;
            }
            
            try {
              setLoading(true);
              const factorId = factors[0]?.id;
              if (!factorId) {
                throw new Error('No MFA factor found');
              }
              
              await authService.verifyAndDisableMFA(factorId, code);
              Alert.alert('Success', 'Two-factor authentication has been disabled');
              await loadMFAStatus();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Invalid verification code');
            } finally {
              setLoading(false);
            }
          },
        },
      ],
      'plain-text',
      '',
      'numeric'
    );
  };

  const handleSetupAuthenticator = () => {
    handleEnableMFA();
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Two-Factor Auth</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Info Section */}
        <View style={styles.infoSection}>
          <Text style={styles.infoIcon}>🔐</Text>
          <Text style={styles.infoTitle}>Secure Your Account</Text>
          <Text style={styles.infoText}>
            Two-factor authentication adds an extra layer of security to your account by requiring
            a verification code in addition to your password.
          </Text>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#053326" />
            <Text style={styles.loadingText}>Loading MFA settings...</Text>
          </View>
        ) : (
          <>
            {/* Enable Toggle */}
            <View style={styles.section}>
              <View style={styles.sectionContent}>
                <View style={styles.item}>
                  <View style={styles.itemLeft}>
                    <Text style={styles.itemLabel}>Enable 2FA</Text>
                    <Text style={styles.itemDescription}>
                      {enabled 
                        ? `Active with ${factors.length} factor${factors.length !== 1 ? 's' : ''}`
                        : 'Require verification code when signing in'}
                    </Text>
                  </View>
                  <Switch
                    value={enabled}
                    onValueChange={handleToggleEnable}
                    trackColor={{ false: '#E5E5E5', true: '#053326' }}
                    thumbColor="#FFFFFF"
                    ios_backgroundColor="#E5E5E5"
                  />
                </View>
              </View>
            </View>

            {enabled && (
              <>
                {/* Authentication Methods */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Authentication Method</Text>
                  <View style={styles.sectionContent}>
                    <View style={styles.item}>
                      <View style={styles.itemLeft}>
                        <Text style={styles.itemLabel}>Authenticator App (TOTP)</Text>
                        <Text style={styles.itemDescription}>
                          {factors.length > 0 
                            ? `Configured • ${factors[0]?.friendly_name || 'Active'}`
                            : 'Use Google Authenticator, Authy, or similar apps'}
                        </Text>
                      </View>
                    </View>

                    {factors.length === 0 && (
                      <TouchableOpacity style={styles.setupButton} onPress={handleSetupAuthenticator}>
                        <Text style={styles.setupButtonText}>Setup Authenticator</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {/* Current Factors */}
                {factors.length > 0 && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Active Factors</Text>
                    <View style={styles.sectionContent}>
                      {factors.map((factor, index) => (
                        <View key={factor.id} style={[styles.item, index < factors.length - 1 && styles.itemBorder]}>
                          <View style={styles.itemLeft}>
                            <Text style={styles.itemLabel}>{factor.friendly_name || 'Authenticator'}</Text>
                            <Text style={styles.itemDescription}>
                              Created: {new Date(factor.created_at).toLocaleDateString()}
                            </Text>
                          </View>
                          <Text style={styles.statusBadge}>✓ Active</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* Security Level */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Security Level</Text>
                  <View style={styles.sectionContent}>
                    <View style={styles.item}>
                      <View style={styles.itemLeft}>
                        <Text style={styles.itemLabel}>Current Assurance Level</Text>
                        <Text style={styles.itemDescription}>
                          {currentAAL === 'aal2' ? 'AAL2 - Verified with 2FA' : 'AAL1 - Password only'}
                        </Text>
                      </View>
                      <Text style={[styles.aalBadge, currentAAL === 'aal2' && styles.aalBadgeHigh]}>
                        {currentAAL.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                </View>
              </>
            )}

            {!enabled && (
              <View style={styles.section}>
                <View style={styles.infoCard}>
                  <Text style={styles.infoCardText}>
                    ℹ️ Two-factor authentication is currently disabled. Your account is protected by
                    password only. Enable 2FA for enhanced security.
                  </Text>
                </View>
              </View>
            )}
          </>
        )}
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
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.md,
    },
    itemBorder: {
      borderBottomWidth: 1,
      borderBottomColor: '#F5F5F5',
    },
    itemLeft: {
      flex: 1,
      marginRight: theme.spacing.md,
    },
    itemRight: {
      flexDirection: 'row',
      alignItems: 'center',
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
    itemArrow: {
      fontSize: 24,
      color: '#999999',
    },
    setupButton: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderTopWidth: 1,
      borderTopColor: '#F5F5F5',
    },
    setupButtonText: {
      fontSize: 14,
      color: '#053326',
      fontWeight: '500',
      textAlign: 'center',
    },
    helpText: {
      fontSize: 12,
      color: '#999999',
      marginTop: theme.spacing.sm,
      lineHeight: 16,
    },

    // Loading
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: theme.spacing.xl * 2,
    },
    loadingText: {
      fontSize: 14,
      color: '#666666',
      marginTop: theme.spacing.md,
    },

    // Status Badges
    statusBadge: {
      fontSize: 12,
      color: '#059669',
      fontWeight: '600',
      backgroundColor: '#D1FAE5',
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 12,
    },
    aalBadge: {
      fontSize: 12,
      color: '#DC2626',
      fontWeight: '600',
      backgroundColor: '#FEE2E2',
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 12,
      textTransform: 'uppercase',
    },
    aalBadgeHigh: {
      color: '#059669',
      backgroundColor: '#D1FAE5',
    },

    // Info Card
    infoCard: {
      backgroundColor: '#F0F9FF',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#BAE6FD',
      padding: theme.spacing.md,
    },
    infoCardText: {
      fontSize: 14,
      color: '#0369A1',
      lineHeight: 20,
    },
  });
