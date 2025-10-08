/**
 * Family Members Screen
 * View and manage family members (FR-2.3)
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Image,
  Modal,
} from 'react-native';
import { useColorScheme } from 'react-native';
import { lightTheme, darkTheme } from '@/constants/theme';
import { useFamily } from '@/hooks/useFamily';
import { FamilyMember, FamilyRole, FamilyPermissions } from '@/types/family.types';

export default function FamilyMembersScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;
  const styles = createStyles(theme);

  const {
    currentFamily,
    loading,
    getPermissions,
    updateMemberRole,
    removeMember,
    reload,
  } = useFamily();

  const [refreshing, setRefreshing] = useState(false);
  const [permissions, setPermissions] = useState<FamilyPermissions | null>(null);
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);
  const [showRoleModal, setShowRoleModal] = useState(false);

  useEffect(() => {
    loadPermissions();
  }, [currentFamily]);

  const loadPermissions = async () => {
    const perms = await getPermissions();
    setPermissions(perms);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await reload();
    await loadPermissions();
    setRefreshing(false);
  };

  const handleChangeRole = async (newRole: FamilyRole) => {
    if (!selectedMember || !currentFamily) return;

    try {
      await updateMemberRole({
        family_id: currentFamily.id,
        user_id: selectedMember.user_id,
        new_role: newRole,
      });
      setShowRoleModal(false);
      setSelectedMember(null);
      Alert.alert('Success', 'Member role updated successfully');
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to update role');
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
              Alert.alert('Success', 'Member removed successfully');
            } catch (err) {
              Alert.alert('Error', err instanceof Error ? err.message : 'Failed to remove member');
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

  if (loading && !currentFamily) {
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
        <Text style={styles.title}>{currentFamily.name}</Text>
        <Text style={styles.subtitle}>{currentFamily.member_count} members</Text>
      </View>

      {/* Members List */}
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {currentFamily.members.map((member) => (
          <MemberCard
            key={member.id}
            member={member}
            canManage={permissions?.canManageMembers || false}
            onChangeRole={() => openRoleModal(member)}
            onRemove={() => handleRemoveMember(member)}
            theme={theme}
          />
        ))}
      </ScrollView>

      {/* Role Change Modal */}
      <Modal
        visible={showRoleModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowRoleModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Change Role</Text>
            <Text style={styles.modalSubtitle}>
              {selectedMember?.user?.name}
            </Text>

            <TouchableOpacity
              style={[
                styles.roleOption,
                selectedMember?.role === 'head' && styles.roleOptionSelected,
              ]}
              onPress={() => handleChangeRole('head')}
            >
              <View>
                <Text style={styles.roleOptionTitle}>Head</Text>
                <Text style={styles.roleOptionDesc}>
                  Full control: manage members, edit settings, delete family
                </Text>
              </View>
              {selectedMember?.role === 'head' && <Text style={styles.checkmark}>✓</Text>}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.roleOption,
                selectedMember?.role === 'member' && styles.roleOptionSelected,
              ]}
              onPress={() => handleChangeRole('member')}
            >
              <View>
                <Text style={styles.roleOptionTitle}>Member</Text>
                <Text style={styles.roleOptionDesc}>
                  Share location, post to board, add geofences, invite members
                </Text>
              </View>
              {selectedMember?.role === 'member' && <Text style={styles.checkmark}>✓</Text>}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.roleOption,
                selectedMember?.role === 'child_member' && styles.roleOptionSelected,
              ]}
              onPress={() => handleChangeRole('child_member')}
            >
              <View>
                <Text style={styles.roleOptionTitle}>Child Member</Text>
                <Text style={styles.roleOptionDesc}>
                  Share location, view board, post with moderation
                </Text>
              </View>
              {selectedMember?.role === 'child_member' && <Text style={styles.checkmark}>✓</Text>}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowRoleModal(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

interface MemberCardProps {
  member: FamilyMember;
  canManage: boolean;
  onChangeRole: () => void;
  onRemove: () => void;
  theme: any;
}

function MemberCard({ member, canManage, onChangeRole, onRemove, theme }: MemberCardProps) {
  const styles = createStyles(theme);

  const getRoleBadgeColor = (role: FamilyRole) => {
    switch (role) {
      case 'head':
        return '#6C5CE7';
      case 'member':
        return '#4ECDC4';
      case 'child_member':
        return '#FFA07A';
      default:
        return theme.colors.textSecondary;
    }
  };

  const formatJoinedDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <View style={styles.memberCard}>
      <View style={styles.memberCardHeader}>
        {member.user?.avatar_url ? (
          <Image 
            source={{ uri: member.user.avatar_url }} 
            style={styles.memberAvatar} 
          />
        ) : (
          <View style={styles.memberAvatarPlaceholder}>
            <Text style={styles.memberAvatarText}>
              {member.user?.name?.[0] || '?'}
            </Text>
          </View>
        )}
        
        <View style={styles.memberInfo}>
          <Text style={styles.memberName}>{member.user?.name || 'Unknown'}</Text>
          {member.user?.username && (
            <Text style={styles.memberUsername}>@{member.user.username}</Text>
          )}
          <View style={styles.memberMeta}>
            <View style={[styles.roleBadge, { backgroundColor: getRoleBadgeColor(member.role) }]}>
              <Text style={styles.roleBadgeText}>
                {member.role.replace('_', ' ')}
              </Text>
            </View>
            {member.user?.account_type === 'child' && (
              <View style={styles.childBadge}>
                <Text style={styles.childBadgeText}>Child</Text>
              </View>
            )}
          </View>
          <Text style={styles.memberJoined}>
            Joined {formatJoinedDate(member.joined_at)}
          </Text>
        </View>
      </View>

      {canManage && (
        <View style={styles.memberActions}>
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={onChangeRole}
          >
            <Text style={styles.actionButtonText}>Change Role</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionButton, styles.removeButton]} 
            onPress={onRemove}
          >
            <Text style={styles.removeButtonText}>Remove</Text>
          </TouchableOpacity>
        </View>
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
      padding: theme.spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    title: {
      fontSize: 24,
      fontWeight: '600',
      color: theme.colors.text,
    },
    subtitle: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginTop: 4,
    },
    scrollView: {
      flex: 1,
    },
    emptyText: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginTop: theme.spacing.xl,
    },
    memberCard: {
      backgroundColor: theme.colors.surface,
      marginHorizontal: theme.spacing.lg,
      marginTop: theme.spacing.md,
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.lg,
    },
    memberCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: theme.spacing.md,
    },
    memberAvatar: {
      width: 60,
      height: 60,
      borderRadius: 30,
      marginRight: theme.spacing.md,
    },
    memberAvatarPlaceholder: {
      width: 60,
      height: 60,
      borderRadius: 30,
      marginRight: theme.spacing.md,
      backgroundColor: theme.colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    memberAvatarText: {
      color: '#FFFFFF',
      fontSize: 24,
      fontWeight: '600',
    },
    memberInfo: {
      flex: 1,
    },
    memberName: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 2,
    },
    memberUsername: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginBottom: 4,
    },
    memberMeta: {
      flexDirection: 'row',
      gap: theme.spacing.xs,
      marginTop: 4,
    },
    roleBadge: {
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 2,
      borderRadius: theme.borderRadius.sm,
    },
    roleBadgeText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '500',
      textTransform: 'capitalize',
    },
    childBadge: {
      backgroundColor: '#FFA07A',
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 2,
      borderRadius: theme.borderRadius.sm,
    },
    childBadgeText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '500',
    },
    memberJoined: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginTop: 4,
    },
    memberActions: {
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
    removeButton: {
      backgroundColor: theme.colors.error,
    },
    removeButtonText: {
      color: '#FFFFFF',
      fontWeight: '500',
      fontSize: 14,
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
    modalTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: theme.spacing.sm,
    },
    modalSubtitle: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.lg,
    },
    roleOption: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
      borderWidth: 2,
      borderColor: theme.colors.border,
      marginBottom: theme.spacing.sm,
    },
    roleOptionSelected: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.primary + '10',
    },
    roleOptionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 4,
    },
    roleOptionDesc: {
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
    checkmark: {
      fontSize: 20,
      color: theme.colors.primary,
      fontWeight: 'bold',
    },
    cancelButton: {
      marginTop: theme.spacing.md,
      paddingVertical: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
      backgroundColor: theme.colors.border,
      alignItems: 'center',
    },
    cancelButtonText: {
      color: theme.colors.text,
      fontWeight: '500',
    },
  });
