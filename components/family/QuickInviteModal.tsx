/**
 * QuickInviteModal - Simple modal for creating and sharing family invitations
 * Provides quick access to invite functionality without full member management
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
} from 'react-native';
import { useColorScheme } from 'react-native';
import { lightTheme, darkTheme } from '@/constants/theme';
import { useFamily } from '@/hooks/useFamily';
import { FamilyRole } from '@/types/family.types';

interface QuickInviteModalProps {
  visible: boolean;
  familyId: string;
  familyName: string;
  themeColor: string;
  onClose: () => void;
}

export default function QuickInviteModal({
  visible,
  familyId,
  familyName,
  themeColor,
  onClose,
}: QuickInviteModalProps) {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;
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
    { value: 'member', label: '👤 Member', description: 'Can share location, view board' },
    {
      value: 'child_member',
      label: '👶 Child Member',
      description: 'Limited permissions, posts need approval',
    },
  ];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={styles.backdrop}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Invite to {familyName}</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {!generatedCode ? (
              <>
                {/* Role Selection */}
                <Text style={styles.sectionTitle}>Select Role</Text>
                <View style={styles.roleContainer}>
                  {roleOptions.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.roleOption,
                        selectedRole === option.value && {
                          ...styles.roleOptionSelected,
                          borderColor: themeColor,
                        },
                      ]}
                      onPress={() => setSelectedRole(option.value)}
                    >
                      <Text style={styles.roleLabel}>{option.label}</Text>
                      <Text style={styles.roleDescription}>{option.description}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Expiration */}
                <Text style={styles.sectionTitle}>Expires In (days)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="7 (leave empty for no expiration)"
                  placeholderTextColor={theme.colors.placeholder}
                  value={expiresInDays}
                  onChangeText={setExpiresInDays}
                  keyboardType="numeric"
                />

                {/* Max Uses */}
                <Text style={styles.sectionTitle}>Max Uses (optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Leave empty for unlimited"
                  placeholderTextColor={theme.colors.placeholder}
                  value={maxUses}
                  onChangeText={setMaxUses}
                  keyboardType="numeric"
                />

                {/* Create Button */}
                <TouchableOpacity
                  style={[styles.createButton, { backgroundColor: themeColor }]}
                  onPress={handleCreateInvite}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.createButtonText}>🎟️ Create Invitation</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <>
                {/* Success View */}
                <View style={styles.successContainer}>
                  <Text style={styles.successIcon}>✅</Text>
                  <Text style={styles.successTitle}>Invitation Created!</Text>
                  <Text style={styles.successSubtitle}>
                    Share this code with people you want to invite
                  </Text>

                  <View style={[styles.codeContainer, { borderColor: themeColor }]}>
                    <Text style={styles.codeLabel}>Invitation Code</Text>
                    <Text style={[styles.code, { color: themeColor }]}>{generatedCode}</Text>
                  </View>

                  {/* Info */}
                  <View style={styles.infoContainer}>
                    <Text style={styles.infoLabel}>Role: </Text>
                    <Text style={styles.infoValue}>
                      {roleOptions.find((r) => r.value === selectedRole)?.label}
                    </Text>
                  </View>

                  {expiresInDays && (
                    <View style={styles.infoContainer}>
                      <Text style={styles.infoLabel}>Expires in: </Text>
                      <Text style={styles.infoValue}>{expiresInDays} days</Text>
                    </View>
                  )}

                  {maxUses && (
                    <View style={styles.infoContainer}>
                      <Text style={styles.infoLabel}>Max uses: </Text>
                      <Text style={styles.infoValue}>{maxUses}</Text>
                    </View>
                  )}

                  {/* Share Button */}
                  <TouchableOpacity
                    style={[styles.shareButton, { backgroundColor: themeColor }]}
                    onPress={handleShare}
                  >
                    <Text style={styles.shareButtonText}>📤 Share Invitation</Text>
                  </TouchableOpacity>

                  {/* Create Another */}
                  <TouchableOpacity
                    style={styles.anotherButton}
                    onPress={() => setGeneratedCode(null)}
                  >
                    <Text style={[styles.anotherButtonText, { color: themeColor }]}>
                      + Create Another Invitation
                    </Text>
                  </TouchableOpacity>

                  {/* Close Button */}
                  <TouchableOpacity style={styles.doneButton} onPress={handleClose}>
                    <Text style={styles.doneButtonText}>Done</Text>
                  </TouchableOpacity>
                </View>
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
      justifyContent: 'flex-end',
    },
    container: {
      backgroundColor: theme.colors.surface,
      borderTopLeftRadius: theme.borderRadius.xl,
      borderTopRightRadius: theme.borderRadius.xl,
      maxHeight: '90%',
      paddingBottom: theme.spacing.xl,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: theme.spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    title: {
      fontSize: 20,
      fontWeight: '600',
      color: theme.colors.text,
    },
    closeButton: {
      padding: theme.spacing.sm,
    },
    closeButtonText: {
      fontSize: 24,
      color: theme.colors.textSecondary,
    },
    content: {
      padding: theme.spacing.lg,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
      marginTop: theme.spacing.md,
      marginBottom: theme.spacing.sm,
    },
    roleContainer: {
      gap: theme.spacing.sm,
    },
    roleOption: {
      backgroundColor: theme.colors.background,
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
      borderWidth: 2,
      borderColor: theme.colors.border,
    },
    roleOptionSelected: {
      borderWidth: 2,
      backgroundColor: theme.colors.surface,
    },
    roleLabel: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 4,
    },
    roleDescription: {
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    input: {
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.md,
      fontSize: 16,
      color: theme.colors.text,
      marginBottom: theme.spacing.sm,
    },
    createButton: {
      marginTop: theme.spacing.xl,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      borderRadius: theme.borderRadius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    createButtonText: {
      color: '#FFFFFF',
      fontSize: 18,
      fontWeight: '600',
    },
    successContainer: {
      alignItems: 'center',
      paddingVertical: theme.spacing.lg,
    },
    successIcon: {
      fontSize: 64,
      marginBottom: theme.spacing.md,
    },
    successTitle: {
      fontSize: 24,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: theme.spacing.xs,
    },
    successSubtitle: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginBottom: theme.spacing.xl,
    },
    codeContainer: {
      backgroundColor: theme.colors.background,
      padding: theme.spacing.lg,
      borderRadius: theme.borderRadius.lg,
      borderWidth: 2,
      marginBottom: theme.spacing.lg,
      width: '100%',
      alignItems: 'center',
    },
    codeLabel: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      textTransform: 'uppercase',
      marginBottom: theme.spacing.xs,
    },
    code: {
      fontSize: 28,
      fontWeight: '700',
      letterSpacing: 2,
    },
    infoContainer: {
      flexDirection: 'row',
      marginBottom: theme.spacing.xs,
    },
    infoLabel: {
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    infoValue: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.text,
    },
    shareButton: {
      marginTop: theme.spacing.xl,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.xl,
      borderRadius: theme.borderRadius.md,
      width: '100%',
      alignItems: 'center',
    },
    shareButtonText: {
      color: '#FFFFFF',
      fontSize: 18,
      fontWeight: '600',
    },
    anotherButton: {
      marginTop: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    anotherButtonText: {
      fontSize: 16,
      fontWeight: '500',
    },
    doneButton: {
      marginTop: theme.spacing.lg,
      paddingVertical: theme.spacing.sm,
    },
    doneButtonText: {
      fontSize: 16,
      color: theme.colors.textSecondary,
    },
  });
