import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { authService } from '../../services/auth.service';
import { AUTH_CONFIG } from '../../constants/auth.config';
import TwoFactorScreen from './TwoFactorScreen';

interface MFAManagementScreenProps {
  onClose: () => void;
}

export default function MFAManagementScreen({ onClose }: MFAManagementScreenProps) {
  const { theme } = useTheme();
  const colors = theme.colors;

  const [loading, setLoading] = useState(true);
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [factors, setFactors] = useState<any[]>([]);
  const [showSetup, setShowSetup] = useState(false);
  const [disableNeedsCode, setDisableNeedsCode] = useState(false);
  const [disableCode, setDisableCode] = useState('');

  useEffect(() => {
    checkMFAStatus();
  }, []);

  const checkMFAStatus = async () => {
    try {
      setLoading(true);
      const mfaFactors = await authService.listMFAFactors();
      setFactors(mfaFactors);
      setMfaEnabled(mfaFactors.length > 0);
    } catch (error) {
      // Failed to check MFA status (suppressed)
      Alert.alert('Error', 'Failed to check MFA status');
    } finally {
      setLoading(false);
    }
  };

  const handleEnableMFA = () => {
    setShowSetup(true);
  };

  const handleDisableMFA = () => {
    Alert.alert(
      'Disable MFA',
      'Are you sure you want to disable Multi-Factor Authentication? This will make your account less secure.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disable',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              if (factors.length > 0) {
                await authService.disableMFA(factors[0].id);
                Alert.alert('Success', AUTH_CONFIG.SUCCESS.MFA_DISABLED);
                await checkMFAStatus();
              }
            } catch (error) {
              const e: any = error;
              if (e?.code === 'AAL2_REQUIRED' || e?.requiresAAL2) {
                // Show inline code prompt
                setDisableNeedsCode(true);
              } else {
                Alert.alert('Error', 'Failed to disable MFA');
              }
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleConfirmDisableWithCode = async () => {
    if (!disableCode || disableCode.length !== 6) {
      Alert.alert('Error', 'Enter 6-digit code');
      return;
    }
    try {
      setLoading(true);
      if (factors.length > 0) {
        await authService.verifyAndDisableMFA(factors[0].id, disableCode);
        Alert.alert('Success', AUTH_CONFIG.SUCCESS.MFA_DISABLED);
        setDisableNeedsCode(false);
        setDisableCode('');
        await checkMFAStatus();
      }
    } catch (error: any) {
      // Notify the user on error
      Alert.alert('Error', error?.message || 'Failed to disable MFA');
    } finally {
      setLoading(false);
    }
  };

  const handleSetupComplete = async () => {
    setShowSetup(false);
    await checkMFAStatus();
  };

  const handleSetupCancel = () => {
    setShowSetup(false);
  };

  if (showSetup) {
    return (
      <TwoFactorScreen
        onComplete={handleSetupComplete}
        onCancel={handleSetupCancel}
      />
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>
          Multi-Factor Authentication
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Add an extra layer of security to your account
        </Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <>
          <View style={[styles.statusCard, { backgroundColor: colors.surface }]}>
            <View style={styles.statusHeader}>
              <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>
                Status
              </Text>
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor: mfaEnabled
                      ? 'rgba(34, 197, 94, 0.1)'
                      : 'rgba(239, 68, 68, 0.1)',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    { color: mfaEnabled ? '#22C55E' : '#EF4444' },
                  ]}
                >
                  {mfaEnabled ? '✓ Enabled' : '○ Disabled'}
                </Text>
              </View>
            </View>

            <Text style={[styles.statusDescription, { color: colors.text }]}>
              {mfaEnabled
                ? 'Your account is protected with two-factor authentication. You will need your authenticator app to sign in.'
                : 'Enable MFA to require a verification code from your authenticator app when signing in.'}
            </Text>

            {mfaEnabled && factors.length > 0 && (
              <View style={styles.factorsList}>
                <Text style={[styles.factorsTitle, { color: colors.textSecondary }]}>
                  Active Authenticators
                </Text>
                {factors.map((factor, index) => (
                  <View
                    key={factor.id}
                    style={[styles.factorItem, { backgroundColor: colors.background }]}
                  >
                    <Text style={[styles.factorName, { color: colors.text }]}>
                      {factor.friendly_name || 'Authenticator App'}
                    </Text>
                    <Text style={[styles.factorType, { color: colors.textSecondary }]}>
                      TOTP • {factor.status}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          <View style={[styles.infoCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.infoTitle, { color: colors.text }]}>
              How it works
            </Text>
            <View style={styles.infoList}>
              <Text style={[styles.infoItem, { color: colors.textSecondary }]}>
                • Install an authenticator app (Google Authenticator, Authy, etc.)
              </Text>
              <Text style={[styles.infoItem, { color: colors.textSecondary }]}>
                • Scan the QR code or enter the secret key
              </Text>
              <Text style={[styles.infoItem, { color: colors.textSecondary }]}>
                • Enter the 6-digit code when signing in
              </Text>
            </View>
          </View>

          {disableNeedsCode && (
            <View style={[styles.statusCard, { backgroundColor: colors.surface, marginBottom: 16 }]}>
              <Text style={[styles.factorsTitle, { color: colors.textSecondary, marginBottom: 8 }]}>Verification Required</Text>
              <Text style={{ color: colors.text, marginBottom: 12 }}>
                Enter a current MFA code to confirm disabling your authenticator.
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text
                  accessibilityLabel="MFA code input"
                  style={{
                    flex: 1,
                    backgroundColor: colors.background,
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: 8,
                    padding: 12,
                    fontSize: 18,
                    letterSpacing: 6,
                    color: colors.text,
                  }}
                >{disableCode}</Text>
              </View>
              {/* Simple numeric input fallback (no custom keyboard here) */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 12 }}>
                {[...'0123456789'].map(d => (
                  <TouchableOpacity
                    key={d}
                    style={{
                      width: '18%',
                      margin: '1%',
                      padding: 12,
                      backgroundColor: colors.primary,
                      borderRadius: 8,
                      alignItems: 'center',
                    }}
                    onPress={() => disableCode.length < 6 && setDisableCode(disableCode + d)}
                  >
                    <Text style={{ color: '#fff', fontWeight: '600' }}>{d}</Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={{
                    width: '38%',
                    margin: '1%',
                    padding: 12,
                    backgroundColor: '#EF4444',
                    borderRadius: 8,
                    alignItems: 'center',
                  }}
                  onPress={() => setDisableCode(disableCode.slice(0, -1))}
                >
                  <Text style={{ color: '#fff', fontWeight: '600' }}>Del</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{
                    width: '58%',
                    margin: '1%',
                    padding: 12,
                    backgroundColor: colors.secondary,
                    borderRadius: 8,
                    alignItems: 'center',
                  }}
                  onPress={() => setDisableNeedsCode(false)}
                >
                  <Text style={{ color: '#fff', fontWeight: '600' }}>Cancel</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={{
                  marginTop: 12,
                  padding: 14,
                  backgroundColor: disableCode.length === 6 ? colors.primary : colors.border,
                  borderRadius: 8,
                  alignItems: 'center',
                }}
                disabled={disableCode.length !== 6 || loading}
                onPress={handleConfirmDisableWithCode}
              >
                <Text style={{ color: '#fff', fontWeight: '600' }}>
                  {loading ? 'Disabling...' : 'Confirm Disable'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.actions}>
            {mfaEnabled ? (
              <TouchableOpacity
                style={[styles.button, styles.dangerButton]}
                onPress={handleDisableMFA}
                disabled={loading}
              >
                <Text style={styles.buttonText}>Disable MFA</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.button, { backgroundColor: colors.primary }]}
                onPress={handleEnableMFA}
                disabled={loading}
              >
                <Text style={styles.buttonText}>Enable MFA</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.button, styles.secondaryButton, { borderColor: colors.border }]}
              onPress={onClose}
            >
              <Text style={[styles.buttonText, { color: colors.text }]}>Close</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
  },
  statusCard: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  statusDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  factorsList: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  factorsTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  factorItem: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  factorName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  factorType: {
    fontSize: 12,
  },
  infoCard: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  infoList: {
    gap: 8,
  },
  infoItem: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  actions: {
    gap: 12,
    marginBottom: 24,
  },
  button: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  dangerButton: {
    backgroundColor: '#EF4444',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
