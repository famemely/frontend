/**
 * Enhanced User Management Screen
 * Complete UI for managing family members with improved UX
 * Features:
 * - View all family members with detailed info
 * - Change member roles (Head, Member, Child Member)
 * - Remove members from family
 * - Search and filter members
 * - Bulk actions support
 * - Real-time updates
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
  ActivityIndicator,
  useColorScheme,
  Platform,
  RefreshControl,
} from 'react-native';
import { useFamily } from '@/hooks/useFamily';
import { familyService } from '@/services/family.service';
import { authService } from '@/services/auth.service';
import { lightTheme, darkTheme } from '@/constants/theme';
import {
  FamilyMember,
  FamilyWithMembers,
  FamilyRole,
  FamilyPermissions,
} from '@/types/family.types';

interface UserManagementScreenProps {
  familyId: string;
  onClose?: () => void;
}

export default function UserManagementScreen({
  familyId,
  onClose,
}: UserManagementScreenProps) {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;
  const styles = createStyles(theme);

  const {
    families,
    currentFamily,
    loading,
    updateMemberRole,
    removeMember,
    reload,
    switchFamily,
  } = useFamily();

  const [permissions, setPermissions] = useState<FamilyPermissions | null>(null);
  const [family, setFamily] = useState<FamilyWithMembers | null>(null);
  const [loadingFamily, setLoadingFamily] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<FamilyRole | 'all'>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [bulkMode, setBulkMode] = useState(false);

  useEffect(() => {
    loadData();
  }, [familyId, families]);

  const loadData = async () => {
    setLoadingFamily(true);
    try {
      // Get current user ID
      const user = authService.getCurrentUser();
      setCurrentUserId(user?.id || null);
      
      // First, try to find the family in the families list
      let targetFamily = families.find(f => f.id === familyId);
      
      // If not found and this is the current family, use currentFamily
      if (!targetFamily && currentFamily?.id === familyId) {
        targetFamily = currentFamily;
      }
      
      // If still not found, try to reload families
      if (!targetFamily) {
        console.log('🔄 Family not found in list, reloading...');
        await reload();
        targetFamily = families.find(f => f.id === familyId);
      }

      // If we have a family, fetch its specific details
      if (!targetFamily) {
        // Last resort: fetch the family directly
        console.log('🔄 Fetching family details directly...');
        try {
          targetFamily = await familyService.getFamily(familyId);
        } catch (err) {
          console.error('❌ Failed to fetch family:', err);
        }
      }

      setFamily(targetFamily || null);
      
      // Call familyService directly with the specific familyId
      const perms = await familyService.getFamilyPermissions(familyId);
      setPermissions(perms);
      console.log('👑 UserManagementScreen loaded:', {
        familyId,
        familyName: targetFamily?.name,
        permissions: perms,
      });
    } catch (error) {
      console.error('❌ Failed to load data:', error);
    } finally {
      setLoadingFamily(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await reload();
    await loadData();
    setRefreshing(false);
  };

  // Filter and search members
  const filteredMembers = useMemo(() => {
    if (!family?.members) return [];

    let filtered = family.members;

    // Filter by role
    if (selectedRole !== 'all') {
      filtered = filtered.filter((m) => m.role === selectedRole);
    }

    // Search by name or username
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((m) => {
        const name = m.user?.name?.toLowerCase() || '';
        const username = m.user?.username?.toLowerCase() || '';
        return name.includes(query) || username.includes(query);
      });
    }

    return filtered;
  }, [family?.members, selectedRole, searchQuery]);

  // Role statistics
  const roleStats = useMemo(() => {
    if (!family?.members) return { head: 0, member: 0, child_member: 0 };

    return family.members.reduce(
      (acc, m) => {
        acc[m.role] = (acc[m.role] || 0) + 1;
        return acc;
      },
      { head: 0, member: 0, child_member: 0 } as Record<FamilyRole, number>
    );
  }, [family?.members]);

  const handleChangeRole = async (member: FamilyMember, newRole: FamilyRole) => {
    Alert.alert(
      'Change Role',
      `Change ${member.user?.name}'s role to ${getRoleLabel(newRole)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              await updateMemberRole({
                family_id: familyId,
                user_id: member.user_id,
                new_role: newRole,
              });
              Alert.alert('Success', 'Member role updated successfully');
              await reload();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to update role');
            }
          },
        },
      ]
    );
  };

  const handleRemoveMember = (member: FamilyMember) => {
    Alert.alert(
      'Remove Member',
      `Are you sure you want to remove ${member.user?.name} from the family? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeMember(member.user_id);
              Alert.alert('Success', 'Member removed successfully');
              await reload();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to remove member');
            }
          },
        },
      ]
    );
  };

  const toggleMemberSelection = (userId: string) => {
    const newSelection = new Set(selectedMembers);
    if (newSelection.has(userId)) {
      newSelection.delete(userId);
    } else {
      newSelection.add(userId);
    }
    setSelectedMembers(newSelection);
  };

  const handleBulkRemove = () => {
    if (selectedMembers.size === 0) {
      Alert.alert('No Selection', 'Please select members to remove');
      return;
    }

    Alert.alert(
      'Remove Members',
      `Remove ${selectedMembers.size} selected member(s)?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const promises = Array.from(selectedMembers).map((userId) =>
                removeMember(userId)
              );
              await Promise.all(promises);
              Alert.alert('Success', `Removed ${selectedMembers.size} member(s)`);
              setSelectedMembers(new Set());
              setBulkMode(false);
              await reload();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to remove members');
            }
          },
        },
      ]
    );
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
        return 'Child';
      default:
        return role;
    }
  };

  const getRoleIcon = (role: FamilyRole) => {
    switch (role) {
      case 'head':
        return '👑';
      case 'member':
        return '👤';
      case 'child_member':
        return '👶';
      default:
        return '👤';
    }
  };

  // Show loading state
  if (loadingFamily) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading family data...</Text>
        </View>
      </View>
    );
  }

  if (!family) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Family not found</Text>
          {onClose && (
            <TouchableOpacity style={styles.button} onPress={onClose}>
              <Text style={styles.buttonText}>Go Back</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  if (!permissions?.canManageMembers) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            You don't have permission to manage members
          </Text>
          <Text style={styles.errorText}>
            Role: {family.my_role} | Required: head
          </Text>
          <Text style={styles.errorText}>
            Debug: {JSON.stringify(permissions)}
          </Text>
          {onClose && (
            <TouchableOpacity style={styles.button} onPress={onClose}>
              <Text style={styles.buttonText}>Go Back</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          {onClose && (
            <TouchableOpacity onPress={onClose} style={styles.backButton}>
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.title}>Manage Members</Text>
          <TouchableOpacity
            onPress={() => setBulkMode(!bulkMode)}
            style={styles.bulkButton}
          >
            <Text style={styles.bulkButtonText}>
              {bulkMode ? 'Cancel' : 'Select'}
            </Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.familyName}>{family.name}</Text>
      </View>

      {/* Stats Bar */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{family.member_count}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{roleStats.head}</Text>
          <Text style={styles.statLabel}>Heads</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{roleStats.member}</Text>
          <Text style={styles.statLabel}>Members</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{roleStats.child_member}</Text>
          <Text style={styles.statLabel}>Children</Text>
        </View>
      </View>

      {/* Search and Filter */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search members..."
          placeholderTextColor={theme.colors.placeholder}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Role Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
        contentContainerStyle={styles.filterContent}
      >
        <TouchableOpacity
          style={[
            styles.filterChip,
            selectedRole === 'all' && styles.filterChipActive,
          ]}
          onPress={() => setSelectedRole('all')}
        >
          <Text
            style={[
              styles.filterChipText,
              selectedRole === 'all' && styles.filterChipTextActive,
            ]}
          >
            All ({family.member_count})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterChip,
            selectedRole === 'head' && styles.filterChipActive,
          ]}
          onPress={() => setSelectedRole('head')}
        >
          <Text
            style={[
              styles.filterChipText,
              selectedRole === 'head' && styles.filterChipTextActive,
            ]}
          >
            👑 Heads ({roleStats.head})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterChip,
            selectedRole === 'member' && styles.filterChipActive,
          ]}
          onPress={() => setSelectedRole('member')}
        >
          <Text
            style={[
              styles.filterChipText,
              selectedRole === 'member' && styles.filterChipTextActive,
            ]}
          >
            👤 Members ({roleStats.member})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterChip,
            selectedRole === 'child_member' && styles.filterChipActive,
          ]}
          onPress={() => setSelectedRole('child_member')}
        >
          <Text
            style={[
              styles.filterChipText,
              selectedRole === 'child_member' && styles.filterChipTextActive,
            ]}
          >
            👶 Children ({roleStats.child_member})
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Bulk Actions Bar */}
      {bulkMode && selectedMembers.size > 0 && (
        <View style={styles.bulkActionsBar}>
          <Text style={styles.bulkActionsText}>
            {selectedMembers.size} selected
          </Text>
          <TouchableOpacity
            style={styles.bulkRemoveButton}
            onPress={handleBulkRemove}
          >
            <Text style={styles.bulkRemoveButtonText}>Remove Selected</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Members List */}
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {loading && !refreshing ? (
          <ActivityIndicator size="large" style={styles.loader} />
        ) : filteredMembers.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {searchQuery || selectedRole !== 'all'
                ? 'No members found'
                : 'No members yet'}
            </Text>
          </View>
        ) : (
          filteredMembers.map((member) => (
            <TouchableOpacity
              key={member.id}
              style={[
                styles.memberCard,
                bulkMode &&
                  selectedMembers.has(member.user_id) &&
                  styles.memberCardSelected,
              ]}
              onPress={() =>
                bulkMode && member.user_id !== currentUserId
                  ? toggleMemberSelection(member.user_id)
                  : null
              }
              activeOpacity={bulkMode ? 0.7 : 1}
            >
              {/* Selection Checkbox */}
              {bulkMode && member.user_id !== currentUserId && (
                <View style={styles.checkboxContainer}>
                  <View
                    style={[
                      styles.checkbox,
                      selectedMembers.has(member.user_id) &&
                        styles.checkboxChecked,
                    ]}
                  >
                    {selectedMembers.has(member.user_id) && (
                      <Text style={styles.checkboxIcon}>✓</Text>
                    )}
                  </View>
                </View>
              )}

              {/* Member Info */}
              <View style={styles.memberInfo}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {member.user?.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.memberDetails}>
                  <View style={styles.memberHeader}>
                    <Text style={styles.memberName}>{member.user?.name}</Text>
                    <Text style={styles.roleIcon}>{getRoleIcon(member.role)}</Text>
                  </View>
                  {member.user?.username && (
                    <Text style={styles.memberUsername}>
                      @{member.user.username}
                    </Text>
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
              {!bulkMode && member.user_id !== currentUserId && (
                <View style={styles.memberActions}>
                  {/* Role Change Dropdown */}
                  <View style={styles.roleChangeContainer}>
                    <Text style={styles.actionLabel}>Change to:</Text>
                    <View style={styles.roleButtons}>
                      {(['head', 'member', 'child_member'] as FamilyRole[])
                        .filter((role) => role !== member.role)
                        .map((role) => (
                          <TouchableOpacity
                            key={role}
                            style={[
                              styles.roleChangeButton,
                              { borderColor: getRoleBadgeColor(role) },
                            ]}
                            onPress={() => handleChangeRole(member, role)}
                          >
                            <Text
                              style={[
                                styles.roleChangeButtonText,
                                { color: getRoleBadgeColor(role) },
                              ]}
                            >
                              {getRoleIcon(role)} {getRoleLabel(role)}
                            </Text>
                          </TouchableOpacity>
                        ))}
                    </View>
                  </View>

                  {/* Remove Button */}
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => handleRemoveMember(member)}
                  >
                    <Text style={styles.removeButtonText}>🗑️ Remove</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Your Own Member Badge */}
              {member.user_id === currentUserId && (
                <View style={styles.ownMemberBadgeContainer}>
                  <Text style={styles.ownMemberBadgeText}>
                    👤 This is you - Cannot modify your own role or remove yourself
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ))
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
      backgroundColor: theme.colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      paddingTop: Platform.OS === 'ios' ? 50 : 16,
      paddingHorizontal: 16,
      paddingBottom: 16,
    },
    headerTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    backButton: {
      padding: 8,
    },
    backButtonText: {
      fontSize: 16,
      color: theme.colors.primary,
      fontWeight: '600',
    },
    title: {
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.colors.text,
      flex: 1,
      textAlign: 'center',
    },
    bulkButton: {
      padding: 8,
    },
    bulkButtonText: {
      fontSize: 16,
      color: theme.colors.primary,
      fontWeight: '600',
    },
    familyName: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
    statsBar: {
      flexDirection: 'row',
      backgroundColor: theme.colors.surface,
      paddingVertical: 16,
      paddingHorizontal: 8,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    statItem: {
      flex: 1,
      alignItems: 'center',
    },
    statValue: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.colors.text,
    },
    statLabel: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginTop: 4,
    },
    searchContainer: {
      padding: 16,
    },
    searchInput: {
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      padding: 12,
      fontSize: 16,
      color: theme.colors.text,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    filterContainer: {
      maxHeight: 50,
    },
    filterContent: {
      paddingHorizontal: 16,
      gap: 8,
    },
    filterChip: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginRight: 8,
    },
    filterChipActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    filterChipText: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      fontWeight: '500',
    },
    filterChipTextActive: {
      color: '#FFFFFF',
      fontWeight: '600',
    },
    bulkActionsBar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: theme.colors.primary,
      padding: 12,
      marginHorizontal: 16,
      marginTop: 12,
      borderRadius: 12,
    },
    bulkActionsText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
    bulkRemoveButton: {
      backgroundColor: '#FF3B30',
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 8,
    },
    bulkRemoveButtonText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '600',
    },
    scrollView: {
      flex: 1,
      padding: 16,
    },
    loader: {
      marginTop: 32,
    },
    emptyContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 48,
    },
    emptyText: {
      fontSize: 16,
      color: theme.colors.textSecondary,
    },
    memberCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    memberCardSelected: {
      borderColor: theme.colors.primary,
      borderWidth: 2,
      backgroundColor: `${theme.colors.primary}10`,
    },
    checkboxContainer: {
      position: 'absolute',
      top: 16,
      right: 16,
      zIndex: 1,
    },
    checkbox: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.background,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkboxChecked: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    checkboxIcon: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: 'bold',
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
    memberHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 4,
    },
    memberName: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
      flex: 1,
    },
    roleIcon: {
      fontSize: 20,
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
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      paddingTop: 12,
      marginTop: 12,
    },
    roleChangeContainer: {
      marginBottom: 12,
    },
    actionLabel: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginBottom: 8,
      fontWeight: '500',
    },
    roleButtons: {
      flexDirection: 'row',
      gap: 8,
    },
    roleChangeButton: {
      flex: 1,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 8,
      borderWidth: 1.5,
      alignItems: 'center',
    },
    roleChangeButtonText: {
      fontSize: 12,
      fontWeight: '600',
    },
    removeButton: {
      backgroundColor: '#FF3B30',
      padding: 12,
      borderRadius: 8,
      alignItems: 'center',
    },
    removeButtonText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '600',
    },
    headBadgeContainer: {
      backgroundColor: `${theme.colors.warning}20`,
      padding: 8,
      borderRadius: 8,
      marginTop: 12,
      borderWidth: 1,
      borderColor: theme.colors.warning,
    },
    headBadgeText: {
      fontSize: 12,
      color: theme.colors.warning,
      textAlign: 'center',
      fontWeight: '500',
    },
    ownMemberBadgeContainer: {
      backgroundColor: `${theme.colors.primary}20`,
      padding: 8,
      borderRadius: 8,
      marginTop: 12,
      borderWidth: 1,
      borderColor: theme.colors.primary,
    },
    ownMemberBadgeText: {
      fontSize: 12,
      color: theme.colors.primary,
      textAlign: 'center',
      fontWeight: '500',
    },
    errorContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 32,
    },
    errorText: {
      fontSize: 16,
      color: theme.colors.error,
      textAlign: 'center',
      marginBottom: 24,
    },
    loadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 32,
    },
    loadingText: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginTop: 16,
    },
    button: {
      backgroundColor: theme.colors.primary,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 8,
    },
    buttonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
  });
