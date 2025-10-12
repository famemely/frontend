/**
 * Manage Members Screen
 * Enhanced member management with role updates and removal
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useFamily } from '@/hooks/useFamily';
import { familyService } from '@/services/family.service';
import { FamilyRole } from '@/types/family.types';

export default function ManageMembersScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { families, reload } = useFamily();
  
  const familyId = params.familyId as string;
  const [loading, setLoading] = useState(false);

  const styles = createStyles(theme);

  const selectedFamily = families?.find(f => f.id === familyId);
  const members = selectedFamily?.members || [];
  const myRole = selectedFamily?.my_role;
  const canManageMembers = myRole === 'head';

  const handleChangeRole = async (userId: string, currentRole: FamilyRole, userName: string) => {
    if (!canManageMembers) {
      Alert.alert('Permission Denied', 'Only family heads can change member roles');
      return;
    }

    const roles: FamilyRole[] = ['head', 'member', 'child_member'];
    const roleLabels = {
      head: '👑 Head - Full control',
      member: '👤 Member - Can share location',
      child_member: '👶 Child - Limited permissions',
    };

    Alert.alert(
      `Change Role for ${userName}`,
      'Select a new role:',
      [
        ...roles.map((role) => ({
          text: roleLabels[role],
          onPress: async () => {
            if (role === currentRole) return;
            
            setLoading(true);
            try {
              await familyService.updateMemberRole({
                family_id: familyId,
                user_id: userId,
                new_role: role,
              });
              
              await reload();
              Alert.alert('Success', `Role updated to ${roleLabels[role]}`);
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to update role');
            } finally {
              setLoading(false);
            }
          },
        })),
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleRemoveMember = async (userId: string, userName: string) => {
    if (!canManageMembers) {
      Alert.alert('Permission Denied', 'Only family heads can remove members');
      return;
    }

    Alert.alert(
      'Remove Member',
      `Are you sure you want to remove ${userName} from ${selectedFamily?.name}? They will no longer be able to see family locations.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await familyService.removeMember(familyId, userId);
              await reload();
              Alert.alert('Success', `${userName} has been removed from the family`);
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to remove member');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const getRoleBadgeColor = (role: FamilyRole) => {
    switch (role) {
      case 'head': return '#FFD700';
      case 'child_member': return '#93C5FD';
      default: return '#E5E5E5';
    }
  };

  const getRoleIcon = (role: FamilyRole) => {
    switch (role) {
      case 'head': return '👑';
      case 'child_member': return '👶';
      default: return '👤';
    }
  };

  const getRoleLabel = (role: FamilyRole) => {
    switch (role) {
      case 'head': return 'Family Head';
      case 'child_member': return 'Child Member';
      default: return 'Member';
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Manage Members</Text>
          <Text style={styles.headerSubtitle}>{selectedFamily?.name}</Text>
        </View>
        <TouchableOpacity
          style={styles.inviteButton}
          onPress={() => router.push('/invitations' as any)}
        >
          <Text style={styles.inviteButtonText}>+ Invite</Text>
        </TouchableOpacity>
      </View>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#053326" />
        </View>
      )}

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Permission Info */}
        {!canManageMembers && (
          <View style={styles.permissionCard}>
            <Text style={styles.permissionIcon}>🔒</Text>
            <Text style={styles.permissionText}>
              You don't have permission to manage members. Only family heads can change roles or remove members.
            </Text>
          </View>
        )}

        {/* Members List */}
        <View style={styles.membersSection}>
          <Text style={styles.sectionTitle}>
            FAMILY MEMBERS ({members.length})
          </Text>

          {members.map((member, index) => {
            const isYou = member.user_id === members.find(m => m.role === myRole)?.user_id;
            
            return (
              <View key={member.user_id} style={styles.memberCard}>
                {/* Member Info */}
                <View style={styles.memberHeader}>
                  <View
                    style={[
                      styles.memberAvatar,
                      { backgroundColor: `hsl(${index * 45}, 70%, 60%)` },
                    ]}
                  >
                    <Text style={styles.memberAvatarText}>
                      {member.user?.name?.[0]?.toUpperCase() || '?'}
                    </Text>
                  </View>

                  <View style={styles.memberInfo}>
                    <Text style={styles.memberName}>
                      {member.user?.name || 'Unknown User'}
                      {isYou && <Text style={styles.youBadge}> (You)</Text>}
                    </Text>
                    
                    <View style={styles.memberBadges}>
                      <View
                        style={[
                          styles.roleBadge,
                          { backgroundColor: getRoleBadgeColor(member.role) },
                        ]}
                      >
                        <Text style={styles.roleBadgeIcon}>{getRoleIcon(member.role)}</Text>
                        <Text style={styles.roleBadgeText}>{getRoleLabel(member.role)}</Text>
                      </View>
                      
                      {/* Temporarily hide ghost mode badge until added to type */}
                      {/* {member.is_ghost_mode && (
                        <View style={styles.ghostBadge}>
                          <Text style={styles.ghostBadgeText}>👻 Invisible</Text>
                        </View>
                      )} */}
                    </View>
                    
                    <Text style={styles.joinedText}>
                      Joined {new Date(member.joined_at || Date.now()).toLocaleDateString()}
                    </Text>
                  </View>
                </View>

                {/* Actions */}
                {canManageMembers && !isYou && (
                  <View style={styles.memberActions}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() =>
                        handleChangeRole(
                          member.user_id,
                          member.role,
                          member.user?.name || 'Member'
                        )
                      }
                    >
                      <Text style={styles.actionButtonText}>🔄 Change Role</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.actionButtonDanger}
                      onPress={() =>
                        handleRemoveMember(member.user_id, member.user?.name || 'this member')
                      }
                    >
                      <Text style={styles.actionButtonDangerText}>🗑️ Remove</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })}
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
    headerTitleContainer: {
      flex: 1,
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: '#000000',
    },
    headerSubtitle: {
      fontSize: 14,
      color: '#666666',
      marginTop: 2,
    },
    inviteButton: {
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    inviteButtonText: {
      fontSize: 14,
      color: '#053326',
      fontWeight: '600',
    },

    // Loading
    loadingOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
    },

    // Content
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: theme.spacing.lg,
    },

    // Permission Card
    permissionCard: {
      backgroundColor: '#FEF3C7',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#FCD34D',
      padding: theme.spacing.md,
      marginBottom: theme.spacing.lg,
      flexDirection: 'row',
      gap: theme.spacing.sm,
    },
    permissionIcon: {
      fontSize: 24,
    },
    permissionText: {
      flex: 1,
      fontSize: 14,
      color: '#92400E',
      lineHeight: 20,
    },

    // Members Section
    membersSection: {
      marginBottom: theme.spacing.xl,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: '600',
      color: '#666666',
      marginBottom: theme.spacing.md,
      letterSpacing: 1,
    },

    // Member Card
    memberCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#E5E5E5',
      padding: theme.spacing.md,
      marginBottom: theme.spacing.md,
    },
    memberHeader: {
      flexDirection: 'row',
      marginBottom: theme.spacing.sm,
    },
    memberAvatar: {
      width: 64,
      height: 64,
      borderRadius: 32,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: theme.spacing.md,
    },
    memberAvatarText: {
      fontSize: 28,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    memberInfo: {
      flex: 1,
      justifyContent: 'center',
    },
    memberName: {
      fontSize: 18,
      fontWeight: '600',
      color: '#000000',
      marginBottom: theme.spacing.xs,
    },
    youBadge: {
      fontSize: 14,
      fontWeight: '500',
      color: '#053326',
    },
    memberBadges: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.xs,
    },
    roleBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 12,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 4,
      gap: 4,
    },
    roleBadgeIcon: {
      fontSize: 14,
    },
    roleBadgeText: {
      fontSize: 12,
      fontWeight: '600',
      color: '#000000',
    },
    ghostBadge: {
      backgroundColor: '#F3F4F6',
      borderRadius: 12,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 4,
    },
    ghostBadgeText: {
      fontSize: 11,
      fontWeight: '500',
      color: '#666666',
    },
    joinedText: {
      fontSize: 12,
      color: '#999999',
    },

    // Actions
    memberActions: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
      marginTop: theme.spacing.md,
      borderTopWidth: 1,
      borderTopColor: '#F5F5F5',
      paddingTop: theme.spacing.md,
    },
    actionButton: {
      flex: 1,
      backgroundColor: '#053326',
      borderRadius: 8,
      paddingVertical: theme.spacing.sm + 2,
      alignItems: 'center',
    },
    actionButtonText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '600',
    },
    actionButtonDanger: {
      flex: 1,
      backgroundColor: 'transparent',
      borderWidth: 1.5,
      borderColor: '#DC2626',
      borderRadius: 8,
      paddingVertical: theme.spacing.sm + 2,
      alignItems: 'center',
    },
    actionButtonDangerText: {
      color: '#DC2626',
      fontSize: 14,
      fontWeight: '600',
    },
  });

