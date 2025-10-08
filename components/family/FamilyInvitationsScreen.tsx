/**
 * Family Invitations Screen
 * Generate and manage invite codes (FR-2.4)
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  Share,
} from 'react-native';
import { useColorScheme } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { lightTheme, darkTheme } from '@/constants/theme';
import { useFamily, useFamilyInvites } from '@/hooks/useFamily';
import { FamilyInvite, FamilyRole } from '@/types/family.types';

export default function FamilyInvitationsScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;
  const styles = createStyles(theme);

  const { currentFamily, currentFamilyId } = useFamily();
  const {
    invites,
    loading,
    createInvite,
    deleteInvite,
    reload,
  } = useFamilyInvites(currentFamilyId);

  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedInvite, setSelectedInvite] = useState<FamilyInvite | null>(null);

  // Form state
  const [selectedRole, setSelectedRole] = useState<FamilyRole>('member');
  const [maxUses, setMaxUses] = useState('');
  const [expiresInDays, setExpiresInDays] = useState('7');

  const onRefresh = async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  };

  const handleCreateInvite = async () => {
    if (!currentFamilyId) return;

    try {
      const invite = await createInvite({
        family_id: currentFamilyId,
        role: selectedRole,
        max_uses: maxUses ? parseInt(maxUses) : undefined,
        expires_in_days: expiresInDays ? parseInt(expiresInDays) : undefined,
      });

      setShowCreateModal(false);
      Alert.alert('Success', 'Invite created successfully!', [
        {
          text: 'Share',
          onPress: () => handleShareInvite(invite),
        },
        { text: 'OK' },
      ]);
      
      // Reset form
      setSelectedRole('member');
      setMaxUses('');
      setExpiresInDays('7');
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to create invite');
    }
  };

  const handleShareInvite = async (invite: FamilyInvite) => {
    const inviteUrl = `famemely://invite/${invite.invite_code}`;
    const message = `Join my family "${currentFamily?.name}" on Famemely!\n\nInvite Code: ${invite.invite_code}\nOr open: ${inviteUrl}`;

    try {
      await Share.share({
        message,
        title: `Join ${currentFamily?.name}`,
      });
    } catch (err) {
      console.error('Error sharing invite:', err);
    }
  };

  const handleShowQR = (invite: FamilyInvite) => {
    setSelectedInvite(invite);
    setShowQRModal(true);
  };

  const handleDeleteInvite = (invite: FamilyInvite) => {
    Alert.alert(
      'Delete Invite',
      'Are you sure you want to delete this invite code?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteInvite(invite.id);
              Alert.alert('Success', 'Invite deleted successfully');
            } catch (err) {
              Alert.alert('Error', err instanceof Error ? err.message : 'Failed to delete invite');
            }
          },
        },
      ]
    );
  };

  if (loading && invites.length === 0) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!currentFamily) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>No family selected</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Invite Codes</Text>
        <TouchableOpacity 
          onPress={() => setShowCreateModal(true)} 
          style={styles.createButton}
        >
          <Text style={styles.createButtonText}>+ Create</Text>
        </TouchableOpacity>
      </View>

      {/* Invites List */}
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {invites.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No invite codes yet</Text>
            <Text style={styles.emptySubtext}>
              Create an invite code to let others join your family
            </Text>
          </View>
        ) : (
          invites.map((invite) => (
            <InviteCard
              key={invite.id}
              invite={invite}
              onShare={() => handleShareInvite(invite)}
              onShowQR={() => handleShowQR(invite)}
              onDelete={() => handleDeleteInvite(invite)}
              theme={theme}
            />
          ))
        )}
      </ScrollView>

      {/* Create Invite Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Create Invite Code</Text>

            <Text style={styles.label}>Role for new members:</Text>
            <View style={styles.roleSelector}>
              <TouchableOpacity
                style={[
                  styles.roleOption,
                  selectedRole === 'member' && styles.roleOptionSelected,
                ]}
                onPress={() => setSelectedRole('member')}
              >
                <Text style={[
                  styles.roleOptionText,
                  selectedRole === 'member' && styles.roleOptionTextSelected,
                ]}>
                  Member
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.roleOption,
                  selectedRole === 'child_member' && styles.roleOptionSelected,
                ]}
                onPress={() => setSelectedRole('child_member')}
              >
                <Text style={[
                  styles.roleOptionText,
                  selectedRole === 'child_member' && styles.roleOptionTextSelected,
                ]}>
                  Child
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Max uses (optional):</Text>
            <TextInput
              style={styles.input}
              placeholder="Unlimited"
              placeholderTextColor={theme.colors.placeholder}
              value={maxUses}
              onChangeText={setMaxUses}
              keyboardType="number-pad"
            />

            <Text style={styles.label}>Expires in (days):</Text>
            <TextInput
              style={styles.input}
              placeholder="7"
              placeholderTextColor={theme.colors.placeholder}
              value={expiresInDays}
              onChangeText={setExpiresInDays}
              keyboardType="number-pad"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowCreateModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.createModalButton]}
                onPress={handleCreateInvite}
                disabled={loading}
              >
                <Text style={styles.createModalButtonText}>
                  {loading ? 'Creating...' : 'Create'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* QR Code Modal */}
      <Modal
        visible={showQRModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowQRModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.qrModalContainer}>
            <Text style={styles.modalTitle}>Scan to Join</Text>
            <Text style={styles.qrFamilyName}>{currentFamily.name}</Text>

            {selectedInvite && (
              <View style={styles.qrContainer}>
                <QRCode
                  value={`famemely://invite/${selectedInvite.invite_code}`}
                  size={250}
                  backgroundColor="white"
                  color="black"
                />
                <Text style={styles.inviteCode}>{selectedInvite.invite_code}</Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowQRModal(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

interface InviteCardProps {
  invite: FamilyInvite;
  onShare: () => void;
  onShowQR: () => void;
  onDelete: () => void;
  theme: any;
}

function InviteCard({ invite, onShare, onShowQR, onDelete, theme }: InviteCardProps) {
  const styles = createStyles(theme);

  const isExpired = invite.expires_at && new Date(invite.expires_at) < new Date();
  const isMaxedOut = invite.max_uses && invite.uses >= invite.max_uses;
  const isActive = !isExpired && !isMaxedOut;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <View style={[styles.inviteCard, !isActive && styles.inviteCardInactive]}>
      <View style={styles.inviteHeader}>
        <Text style={styles.inviteCode}>{invite.invite_code}</Text>
        {!isActive && (
          <View style={styles.inactiveBadge}>
            <Text style={styles.inactiveBadgeText}>
              {isExpired ? 'Expired' : 'Max Uses'}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.inviteDetails}>
        <Text style={styles.inviteDetail}>
          Role: <Text style={styles.inviteDetailValue}>{invite.role.replace('_', ' ')}</Text>
        </Text>
        <Text style={styles.inviteDetail}>
          Uses: <Text style={styles.inviteDetailValue}>
            {invite.uses}/{invite.max_uses || '∞'}
          </Text>
        </Text>
        {invite.expires_at && (
          <Text style={styles.inviteDetail}>
            Expires: <Text style={styles.inviteDetailValue}>
              {formatDate(invite.expires_at)}
            </Text>
          </Text>
        )}
        <Text style={styles.inviteDetail}>
          Created: <Text style={styles.inviteDetailValue}>
            {formatDate(invite.created_at)}
          </Text>
        </Text>
      </View>

      {isActive && (
        <View style={styles.inviteActions}>
          <TouchableOpacity style={styles.actionButton} onPress={onShare}>
            <Text style={styles.actionButtonText}>Share</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={onShowQR}>
            <Text style={styles.actionButtonText}>QR Code</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionButton, styles.deleteButton]} 
            onPress={onDelete}
          >
            <Text style={styles.deleteButtonText}>Delete</Text>
          </TouchableOpacity>
        </View>
      )}

      {!isActive && (
        <TouchableOpacity 
          style={[styles.deleteButtonFull]} 
          onPress={onDelete}
        >
          <Text style={styles.deleteButtonText}>Delete</Text>
        </TouchableOpacity>
      )}
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
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: theme.spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    title: {
      fontSize: 24,
      fontWeight: '600',
      color: theme.colors.text,
    },
    createButton: {
      backgroundColor: theme.colors.primary,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.borderRadius.md,
    },
    createButtonText: {
      color: '#FFFFFF',
      fontWeight: '500',
    },
    scrollView: {
      flex: 1,
    },
    emptyState: {
      padding: theme.spacing.xl,
      alignItems: 'center',
    },
    emptyText: {
      fontSize: 18,
      fontWeight: '500',
      color: theme.colors.text,
      marginBottom: theme.spacing.sm,
      textAlign: 'center',
    },
    emptySubtext: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
    inviteCard: {
      backgroundColor: theme.colors.surface,
      marginHorizontal: theme.spacing.lg,
      marginTop: theme.spacing.md,
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.lg,
    },
    inviteCardInactive: {
      opacity: 0.6,
    },
    inviteHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.md,
    },
    inviteCode: {
      fontSize: 24,
      fontWeight: '700',
      color: theme.colors.primary,
      letterSpacing: 2,
    },
    inactiveBadge: {
      backgroundColor: theme.colors.error,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 4,
      borderRadius: theme.borderRadius.sm,
    },
    inactiveBadgeText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '500',
    },
    inviteDetails: {
      marginBottom: theme.spacing.md,
    },
    inviteDetail: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginBottom: 4,
    },
    inviteDetailValue: {
      fontWeight: '500',
      color: theme.colors.text,
      textTransform: 'capitalize',
    },
    inviteActions: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
    },
    actionButton: {
      flex: 1,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.borderRadius.md,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
    },
    actionButtonText: {
      color: '#FFFFFF',
      fontWeight: '500',
      fontSize: 14,
    },
    deleteButton: {
      backgroundColor: theme.colors.error,
    },
    deleteButtonText: {
      color: '#FFFFFF',
      fontWeight: '500',
      fontSize: 14,
    },
    deleteButtonFull: {
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.borderRadius.md,
      backgroundColor: theme.colors.error,
      alignItems: 'center',
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: theme.spacing.lg,
    },
    modalContainer: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.lg,
      width: '100%',
      maxWidth: 400,
    },
    qrModalContainer: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.xl,
      width: '90%',
      maxWidth: 400,
      alignItems: 'center',
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: theme.spacing.lg,
      textAlign: 'center',
    },
    qrFamilyName: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.lg,
      textAlign: 'center',
    },
    label: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.colors.text,
      marginBottom: theme.spacing.sm,
    },
    roleSelector: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.lg,
    },
    roleOption: {
      flex: 1,
      paddingVertical: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
      borderWidth: 2,
      borderColor: theme.colors.border,
      alignItems: 'center',
    },
    roleOptionSelected: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.primary + '10',
    },
    roleOptionText: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.colors.text,
    },
    roleOptionTextSelected: {
      color: theme.colors.primary,
    },
    input: {
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.md,
      fontSize: 16,
      color: theme.colors.text,
      marginBottom: theme.spacing.lg,
    },
    modalButtons: {
      flexDirection: 'row',
      gap: theme.spacing.md,
    },
    modalButton: {
      flex: 1,
      paddingVertical: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
      alignItems: 'center',
    },
    cancelButton: {
      backgroundColor: theme.colors.border,
    },
    cancelButtonText: {
      color: theme.colors.text,
      fontWeight: '500',
    },
    createModalButton: {
      backgroundColor: theme.colors.primary,
    },
    createModalButtonText: {
      color: '#FFFFFF',
      fontWeight: '500',
    },
    qrContainer: {
      alignItems: 'center',
      marginBottom: theme.spacing.xl,
      padding: theme.spacing.lg,
      backgroundColor: '#FFFFFF',
      borderRadius: theme.borderRadius.lg,
    },
    closeButton: {
      paddingHorizontal: theme.spacing.xl,
      paddingVertical: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
      backgroundColor: theme.colors.border,
    },
    closeButtonText: {
      color: theme.colors.text,
      fontWeight: '500',
    },
  });
