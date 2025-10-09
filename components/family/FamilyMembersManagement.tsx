/**
 * Family Members Management Component
 * Comprehensive UI for managing family members - inviting, role changes, removal
 * Implements FR-2.3, FR-2.4
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  Share,
  useColorScheme,
} from 'react-native';
import { useFamily } from '@/hooks/useFamily';
import { lightTheme, darkTheme } from '@/constants/theme';
import {
  FamilyMember,
  FamilyInvite,
  FamilyRole,
  FamilyPermissions,
} from '@/types/family.types';

interface FamilyMembersManagementProps {
  familyId: string;
  onClose?: () => void;
}

export default function FamilyMembersManagement({
  familyId,
  onClose,
}: FamilyMembersManagementProps) {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;
  const styles = createStyles(theme);

  const {
    currentFamily,
    loading,
    error,
    getPermissions,
    updateMemberRole,
    removeMember,
    createInvite,
    getFamilyInvites,
    deleteInvite,
    reload,
  } = useFamily();

  const [permissions, setPermissions] = useState<FamilyPermissions | null>(null);
  const [invites, setInvites] = useState<FamilyInvite[]>([]);
  const [loadingInvites, setLoadingInvites] = useState(false);

  // Modals
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);

  // Invite form
  const [inviteRole, setInviteRole] = useState<FamilyRole>('member');
  const [inviteExpireDays, setInviteExpireDays] = useState<string>('7');
  const [inviteMaxUses, setInviteMaxUses] = useState<string>('');

  useEffect(() => {
    loadData();
  }, [familyId]);

  const loadData = async () => {
    const perms = await getPermissions();
    setPermissions(perms);
    
    if (perms?.canManageMembers) {
      await loadInvites();
    }
  };

  const loadInvites = async () => {
    setLoadingInvites(true);
    try {
      const data = await getFamilyInvites(familyId);
      setInvites(data);
    } catch (err) {
      console.error('Failed to load invites:', err);
    } finally {
      setLoadingInvites(false);
    }
  };

  const handleCreateInvite = async () => {
    try {
      const invite = await createInvite({
        family_id: familyId,
        role: inviteRole,
        expires_in_days: inviteExpireDays ? parseInt(inviteExpireDays) : undefined,
        max_uses: inviteMaxUses ? parseInt(inviteMaxUses) : undefined,
      });

      Alert.alert('Success', 'Invite created successfully');
      setShowInviteModal(false);
      await loadInvites();
      
      // Offer to share the invite code
      shareInvite(invite.invite_code);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to create invite');
    }
  };

  const shareInvite = async (inviteCode: string) => {
    try {
      await Share.share({
        message: `Join my family on Famemely! Use invite code: ${inviteCode}`,
        title: 'Family Invite',
      });
    } catch (err) {
      console.error('Failed to share:', err);
    }
  };

  const handleDeleteInvite = async (inviteId: string) => {
    Alert.alert(
      'Delete Invite',
      'Are you sure you want to delete this invite?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteInvite(inviteId);
              await loadInvites();
              Alert.alert('Success', 'Invite deleted');
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to delete invite');
            }
          },
        },
      ]
    );
  };

  const handleChangeRole = async (newRole: FamilyRole) => {
    if (!selectedMember) return;

    try {
      await updateMemberRole({
        family_id: familyId,
        user_id: selectedMember.user_id,
        new_role: newRole,
      });
      
      Alert.alert('Success', 'Member role updated');
      setShowRoleModal(false);
      setSelectedMember(null);
      await reload();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update role');
    }
  };

  const handleRemoveMember = (member: FamilyMember) => {
    Alert.alert(
      'Remove Member',
      `Are you sure you want to remove ${member.user?.name} from the family?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeMember(member.user_id);
              Alert.alert('Success', 'Member removed');
              await reload();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to remove member');
            }
          },
        },
      ]
    );
  };

  const openRoleModal = (member: FamilyMember) => {
    setSelectedMember(member);
    setShowRoleModal(true);
  };

  const getRoleBadgeColor = (role: FamilyRole) => {
    switch (role) {
      case 'head':
        return '#FF6B6B';
      case 'member':
        return '#4ECDC4';
      case 'child_member':
        return '#FFA07A';
      default:
        return '#8E8E93';
    }
  };

  const getRoleLabel = (role: FamilyRole) => {
    switch (role) {
      case 'head':
        return 'Head';
      case 'member':
        return 'Member';
      case 'child_member':
        return 'Child Member';
      default:
        return role;
    }
  };

  if (!currentFamily) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Family not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{currentFamily.name} - Members</Text>
        {onClose && (
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Action Buttons */}
      {permissions?.canInviteMembers && (
        <TouchableOpacity
          style={styles.inviteButton}
          onPress={() => setShowInviteModal(true)}
        >
          <Text style={styles.inviteButtonText}>+ Create Invite Link</Text>
        </TouchableOpacity>
      )}

      <ScrollView style={styles.scrollView}>
        {/* Members List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Members ({currentFamily.member_count})
          </Text>
          {currentFamily.members.map((member) => (
            <View key={member.id} style={styles.memberCard}>
              {/* Member Info */}
              <View style={styles.memberInfo}>
                {member.user?.avatar_url && (
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {member.user.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                <View style={styles.memberDetails}>
                  <Text style={styles.memberName}>{member.user?.name}</Text>
                  {member.user?.username && (
                    <Text style={styles.memberUsername}>@{member.user.username}</Text>
                  )}
                  <View style={styles.memberMeta}>
                    <View
                      style={[
                        styles.roleBadge,
                        { backgroundColor: getRoleBadgeColor(member.role) },
                      ]}
                    >
                      <Text style={styles.roleBadgeText}>
                        {getRoleLabel(member.role)}
                      </Text>
                    </View>
                    {member.user?.account_type === 'child' && (
                      <View style={styles.childBadge}>
                        <Text style={styles.childBadgeText}>Child Account</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.joinedDate}>
                    Joined {new Date(member.joined_at).toLocaleDateString()}
                  </Text>
                </View>
              </View>

              {/* Member Actions */}
              {permissions?.canManageMembers && member.role !== 'head' && (
                <View style={styles.memberActions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => openRoleModal(member)}
                  >
                    <Text style={styles.actionButtonText}>Change Role</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.removeButton]}
                    onPress={() => handleRemoveMember(member)}
                  >
                    <Text style={styles.removeButtonText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Active Invites */}
        {permissions?.canManageMembers && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Active Invites</Text>
              {loadingInvites && <ActivityIndicator size="small" />}
            </View>
            {invites.length === 0 ? (
              <Text style={styles.emptyText}>No active invites</Text>
            ) : (
              invites.map((invite) => (
                <View key={invite.id} style={styles.inviteCard}>
                  <View style={styles.inviteInfo}>
                    <Text style={styles.inviteCode}>{invite.invite_code}</Text>
                    <View
                      style={[
                        styles.roleBadge,
                        { backgroundColor: getRoleBadgeColor(invite.role) },
                      ]}
                    >
                      <Text style={styles.roleBadgeText}>
                        {getRoleLabel(invite.role)}
                      </Text>
                    </View>
                    <Text style={styles.inviteMeta}>
                      Uses: {invite.uses}
                      {invite.max_uses ? `/${invite.max_uses}` : '/∞'}
                    </Text>
                    {invite.expires_at && (
                      <Text style={styles.inviteMeta}>
                        Expires: {new Date(invite.expires_at).toLocaleDateString()}
                      </Text>
                    )}
                  </View>
                  <View style={styles.inviteActions}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => shareInvite(invite.invite_code)}
                    >
                      <Text style={styles.actionButtonText}>Share</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.removeButton]}
                      onPress={() => handleDeleteInvite(invite.id)}
                    >
                      <Text style={styles.removeButtonText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* Create Invite Modal */}
      <Modal
        visible={showInviteModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowInviteModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Create Invite</Text>

            <Text style={styles.label}>Role to Assign:</Text>
            <View style={styles.roleSelector}>
              {['member', 'child_member'].map((role) => (
                <TouchableOpacity
                  key={role}
                  style={[
                    styles.roleOption,
                    inviteRole === role && styles.roleOptionSelected,
                  ]}
                  onPress={() => setInviteRole(role as FamilyRole)}
                >
                  <Text
                    style={[
                      styles.roleOptionText,
                      inviteRole === role && styles.roleOptionTextSelected,
                    ]}
                  >
                    {getRoleLabel(role as FamilyRole)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Expires In (days):</Text>
            <TextInput
              style={styles.input}
              placeholder="7 (leave empty for no expiration)"
              placeholderTextColor={theme.colors.placeholder}
              value={inviteExpireDays}
              onChangeText={setInviteExpireDays}
              keyboardType="number-pad"
            />

            <Text style={styles.label}>Max Uses:</Text>
            <TextInput
              style={styles.input}
              placeholder="Leave empty for unlimited"
              placeholderTextColor={theme.colors.placeholder}
              value={inviteMaxUses}
              onChangeText={setInviteMaxUses}
              keyboardType="number-pad"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={() => setShowInviteModal(false)}
              >
                <Text style={styles.modalButtonTextSecondary}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={handleCreateInvite}
              >
                <Text style={styles.modalButtonText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Change Role Modal */}
      <Modal
        visible={showRoleModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowRoleModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Change Member Role</Text>
            {selectedMember && (
              <>
                <Text style={styles.modalSubtitle}>
                  {selectedMember.user?.name}
                </Text>
                <Text style={styles.modalDescription}>
                  Current role: {getRoleLabel(selectedMember.role)}
                </Text>

                <Text style={styles.label}>Select New Role:</Text>
                <View style={styles.roleSelector}>
                  {['member', 'child_member', 'head'].map((role) => (
                    <TouchableOpacity
                      key={role}
                      style={styles.roleOptionLarge}
                      onPress={() => handleChangeRole(role as FamilyRole)}
                    >
                      <View
                        style={[
                          styles.roleBadge,
                          { backgroundColor: getRoleBadgeColor(role as FamilyRole) },
                        ]}
                      >
                        <Text style={styles.roleBadgeText}>
                          {getRoleLabel(role as FamilyRole)}
                        </Text>
                      </View>
                      <Text style={styles.roleDescription}>
                        {role === 'head' && 'Full control over family'}
                        {role === 'member' && 'Can invite and manage content'}
                        {role === 'child_member' && 'Limited permissions'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonSecondary]}
                  onPress={() => {
                    setShowRoleModal(false);
                    setSelectedMember(null);
                  }}
                >
                  <Text style={styles.modalButtonTextSecondary}>Cancel</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
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
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    title: {
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.colors.text,
    },
    closeButton: {
      padding: 8,
    },
    closeButtonText: {
      fontSize: 24,
      color: theme.colors.textSecondary,
    },
    inviteButton: {
      backgroundColor: theme.colors.primary,
      margin: 16,
      padding: 16,
      borderRadius: 12,
      alignItems: 'center',
    },
    inviteButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
    scrollView: {
      flex: 1,
    },
    section: {
      padding: 16,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 12,
    },
    memberCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    memberInfo: {
      flexDirection: 'row',
      marginBottom: 12,
    },
    avatar: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    avatarText: {
      color: '#FFFFFF',
      fontSize: 20,
      fontWeight: 'bold',
    },
    memberDetails: {
      flex: 1,
    },
    memberName: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 4,
    },
    memberUsername: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginBottom: 8,
    },
    memberMeta: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 4,
    },
    roleBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    roleBadgeText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '600',
    },
    childBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      backgroundColor: '#FFA07A',
    },
    childBadgeText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '600',
    },
    joinedDate: {
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
    memberActions: {
      flexDirection: 'row',
      gap: 8,
    },
    actionButton: {
      flex: 1,
      backgroundColor: theme.colors.primary,
      padding: 10,
      borderRadius: 8,
      alignItems: 'center',
    },
    actionButtonText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '600',
    },
    removeButton: {
      backgroundColor: '#FF3B30',
    },
    removeButtonText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '600',
    },
    emptyText: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      paddingVertical: 20,
    },
    inviteCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    inviteInfo: {
      marginBottom: 12,
    },
    inviteCode: {
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.colors.text,
      marginBottom: 8,
      fontFamily: 'monospace',
    },
    inviteMeta: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginTop: 4,
    },
    inviteActions: {
      flexDirection: 'row',
      gap: 8,
    },
    errorText: {
      color: theme.colors.error,
      textAlign: 'center',
      padding: 16,
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContainer: {
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      padding: 24,
      width: '90%',
      maxWidth: 400,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.colors.text,
      marginBottom: 8,
    },
    modalSubtitle: {
      fontSize: 16,
      color: theme.colors.text,
      marginBottom: 4,
    },
    modalDescription: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginBottom: 16,
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 8,
      marginTop: 16,
    },
    input: {
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      color: theme.colors.text,
      marginBottom: 16,
    },
    roleSelector: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 16,
    },
    roleOption: {
      flex: 1,
      padding: 12,
      borderRadius: 8,
      borderWidth: 2,
      borderColor: theme.colors.border,
      alignItems: 'center',
    },
    roleOptionSelected: {
      borderColor: theme.colors.primary,
      backgroundColor: `${theme.colors.primary}20`,
    },
    roleOptionText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.textSecondary,
    },
    roleOptionTextSelected: {
      color: theme.colors.primary,
    },
    roleOptionLarge: {
      padding: 16,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginBottom: 12,
    },
    roleDescription: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginTop: 8,
    },
    modalButtons: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 24,
    },
    modalButton: {
      flex: 1,
      backgroundColor: theme.colors.primary,
      padding: 14,
      borderRadius: 8,
      alignItems: 'center',
    },
    modalButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
    modalButtonSecondary: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    modalButtonTextSecondary: {
      color: theme.colors.text,
      fontSize: 16,
      fontWeight: '600',
    },
  });
