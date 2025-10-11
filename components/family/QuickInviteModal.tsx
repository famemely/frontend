/**
 * QuickInviteModal - Simple modal for creating and sharing family invitations
 * Redesigned to match auth screen aesthetic
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TextInput,
  Share,
  ScrollView,
  Platform,
} from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useFamily } from '@/hooks/useFamily';
import { FamilyRole } from '@/types/family.types';

interface QuickInviteModalProps {
  visible: boolean;
  familyId: string;
  familyName: string;
  themeColor?: string;
  onClose: () => void;
}

export default function QuickInviteModal({
  visible,
  familyId,
  familyName,
  themeColor = '#053326',
  onClose,
}: QuickInviteModalProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  const { createInvite } = useFamily();

  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<FamilyRole>('member');
  const [expiresInDays, setExpiresInDays] = useState('7');
  const [maxUses, setMaxUses] = useState('');
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);

  const handleCreateInvite = async () => {
    setLoading(true);
    try {
      const invite = await createInvite({
        family_id: familyId,
        role: selectedRole,
        expires_in_days: expiresInDays ? parseInt(expiresInDays) : undefined,
        max_uses: maxUses ? parseInt(maxUses) : undefined,
      });

      setGeneratedCode(invite.invite_code);
      Alert.alert('Success', 'Invitation created!');
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to create invite');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!generatedCode) return;

    const message = `You're invited to join "${familyName}" on Famemely!\n\nInvitation Code: ${generatedCode}\n\nUse this code in the app to join the family.`;

    try {
      await Share.share({
        message,
        title: `Join ${familyName} on Famemely`,
      });
    } catch (error) {
      console.error('Error sharing invite:', error);
    }
  };

  const handleClose = () => {
    setGeneratedCode(null);
    setSelectedRole('member');
    setExpiresInDays('7');
    setMaxUses('');
    onClose();
  };

  const roleOptions: { value: FamilyRole; label: string; description: string }[] = [
    { value: 'member', label: 'Member', description: 'Can share location and view family' },
    {
      value: 'child_member',
      label: 'Child Member',
      description: 'Limited permissions for children',
    },
  ];

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={handleClose}>
      <View style={styles.backdrop}>
        <View style={styles.container}>
          {/* Close Button */}
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Text style={styles.closeIcon}>×</Text>
          </TouchableOpacity>

          <ScrollView showsVerticalScrollIndicator={false}>
            {!generatedCode ? (
              <>
                {/* Icon & Title */}
                <View style={styles.iconContainer}>
                  <Text style={styles.icon}>✉️</Text>
                </View>
                <Text style={styles.title}>Invite to {familyName}</Text>
                <Text style={styles.subtitle}>
                  Create an invitation code to share with family members
                </Text>

                {/* Role Selection */}
                <Text style={styles.sectionTitle}>Select Role</Text>
                <View style={styles.roleContainer}>
                  {roleOptions.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.roleOption,
                        selectedRole === option.value && styles.roleOptionSelected,
                      ]}
                      onPress={() => setSelectedRole(option.value)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.roleContent}>
                        <Text style={styles.roleLabel}>
                          {option.value === 'member' ? '👤' : '👶'} {option.label}
                        </Text>
                        {selectedRole === option.value && (
                          <Text style={styles.roleCheck}>✓</Text>
                        )}
                      </View>
                      <Text style={styles.roleDescription}>{option.description}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Expiration */}
                <Text style={styles.sectionTitle}>Expiration (Optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Days until expiration (e.g., 7)"
                  placeholderTextColor={theme.colors.placeholder}
                  value={expiresInDays}
                  onChangeText={setExpiresInDays}
                  keyboardType="numeric"
                />

                {/* Max Uses */}
                <Text style={styles.sectionTitle}>Max Uses (Optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Number of uses (leave empty for unlimited)"
                  placeholderTextColor={theme.colors.placeholder}
                  value={maxUses}
                  onChangeText={setMaxUses}
                  keyboardType="numeric"
                />

                {/* Create Button */}
                <TouchableOpacity
                  style={[styles.createButton, loading && styles.buttonDisabled]}
                  onPress={handleCreateInvite}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.createButtonText}>Create Invitation</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <>
                {/* Success View */}
                <View style={styles.iconContainer}>
                  <Text style={styles.successIcon}>✅</Text>
                </View>
                <Text style={styles.title}>Invitation Created!</Text>
                <Text style={styles.subtitle}>
                  Share this code with people you want to invite
                </Text>

                <View style={styles.codeContainer}>
                  <Text style={styles.codeLabel}>INVITATION CODE</Text>
                  <Text style={styles.code}>{generatedCode}</Text>
                  <Text style={styles.codeCopy}>Tap to copy</Text>
                </View>

                {/* Info */}
                <View style={styles.infoBox}>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Role:</Text>
                    <Text style={styles.infoValue}>
                      {roleOptions.find((r) => r.value === selectedRole)?.label}
                    </Text>
                  </View>

                  {expiresInDays && (
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Expires in:</Text>
                      <Text style={styles.infoValue}>{expiresInDays} days</Text>
                    </View>
                  )}

                  {maxUses && (
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Max uses:</Text>
                      <Text style={styles.infoValue}>{maxUses}</Text>
                    </View>
                  )}
                </View>

                {/* Share Button */}
                <TouchableOpacity
                  style={styles.shareButton}
                  onPress={handleShare}
                  activeOpacity={0.8}
                >
                  <Text style={styles.shareButtonText}>📤 Share Invitation</Text>
                </TouchableOpacity>

                {/* Create Another */}
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={() => setGeneratedCode(null)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.secondaryButtonText}>Create Another</Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: theme.spacing.lg,
    },
    container: {
      backgroundColor: '#FFFFFF',
      borderRadius: 16,
      width: '100%',
      maxWidth: 450,
      maxHeight: '90%',
      padding: theme.spacing.xl,
      position: 'relative',
    },
    closeButton: {
      position: 'absolute',
      top: theme.spacing.md,
      right: theme.spacing.md,
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
    iconContainer: {
      alignItems: 'center',
      marginTop: theme.spacing.lg,
      marginBottom: theme.spacing.md,
    },
    icon: {
      fontSize: 64,
    },
    successIcon: {
      fontSize: 72,
    },
    title: {
      fontSize: 26,
      fontWeight: '600',
      color: '#000000',
      textAlign: 'center',
      marginBottom: theme.spacing.sm,
      letterSpacing: 0.3,
    },
    subtitle: {
      fontSize: 14,
      color: '#666666',
      textAlign: 'center',
      marginBottom: theme.spacing.xl,
      lineHeight: 20,
      opacity: 0.8,
      fontWeight: '400',
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: '600',
      color: '#666666',
      marginTop: theme.spacing.lg,
      marginBottom: theme.spacing.sm,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    roleContainer: {
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.md,
    },
    roleOption: {
      backgroundColor: '#FAFAFA',
      borderWidth: 1,
      borderColor: '#E5E5E5',
      borderRadius: 8,
      padding: theme.spacing.md,
    },
    roleOptionSelected: {
      backgroundColor: '#F0FDF4',
      borderColor: '#053326',
      borderWidth: 1.5,
    },
    roleContent: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 4,
    },
    roleLabel: {
      fontSize: 16,
      fontWeight: '600',
      color: '#000000',
    },
    roleCheck: {
      fontSize: 16,
      color: '#053326',
      fontWeight: '700',
    },
    roleDescription: {
      fontSize: 13,
      color: '#666666',
      fontWeight: '400',
    },
    input: {
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: '#053326',
      borderRadius: 6,
      padding: theme.spacing.md,
      fontSize: 16,
      color: '#000000',
      marginBottom: theme.spacing.sm,
      fontWeight: '400',
      opacity: 0.7,
    },
    createButton: {
      backgroundColor: '#053326',
      borderRadius: 8,
      padding: theme.spacing.md + 2,
      alignItems: 'center',
      marginTop: theme.spacing.xl,
      marginBottom: theme.spacing.md,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    createButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '500',
      letterSpacing: 0.3,
    },
    codeContainer: {
      backgroundColor: '#FAFAFA',
      borderWidth: 2,
      borderColor: '#053326',
      borderRadius: 12,
      padding: theme.spacing.xl,
      marginVertical: theme.spacing.xl,
      alignItems: 'center',
    },
    codeLabel: {
      fontSize: 11,
      color: '#666666',
      fontWeight: '600',
      letterSpacing: 1,
      marginBottom: theme.spacing.sm,
    },
    code: {
      fontSize: 32,
      fontWeight: '700',
      color: '#053326',
      letterSpacing: 4,
      marginBottom: theme.spacing.xs,
    },
    codeCopy: {
      fontSize: 12,
      color: '#666666',
      opacity: 0.7,
      fontWeight: '400',
    },
    infoBox: {
      backgroundColor: '#FAFAFA',
      borderRadius: 8,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.xl,
    },
    infoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: theme.spacing.xs,
    },
    infoLabel: {
      fontSize: 14,
      color: '#666666',
      fontWeight: '400',
    },
    infoValue: {
      fontSize: 14,
      fontWeight: '600',
      color: '#000000',
    },
    shareButton: {
      backgroundColor: '#053326',
      borderRadius: 8,
      padding: theme.spacing.md + 2,
      alignItems: 'center',
      marginBottom: theme.spacing.md,
    },
    shareButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '500',
      letterSpacing: 0.3,
    },
    secondaryButton: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: '#053326',
      borderRadius: 8,
      padding: theme.spacing.md,
      alignItems: 'center',
    },
    secondaryButtonText: {
      color: '#053326',
      fontSize: 16,
      fontWeight: '500',
    },
  });
