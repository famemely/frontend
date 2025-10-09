/**
 * Family Management Screen
 * Main screen for viewing and managing families (FR-2.1, FR-2.2, FR-2.3, FR-2.4)
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
  Modal,
  TextInput,
  Image,
} from 'react-native';
import { useColorScheme } from 'react-native';
import { lightTheme, darkTheme } from '@/constants/theme';
import { useFamily } from '@/hooks/useFamily';
import { FamilyWithMembers, FamilyPermissions } from '@/types/family.types';
import FamilyMembersManagement from './FamilyMembersManagement';
import UserManagementScreen from './UserManagementScreen';
import QuickInviteModal from './QuickInviteModal';
import JoinFamilyModal from './JoinFamilyModal';

interface FamilyManagementScreenProps {
  onClose?: () => void;
  autoOpenCreate?: boolean;
}

export default function FamilyManagementScreen({ onClose, autoOpenCreate }: FamilyManagementScreenProps) {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;
  const styles = createStyles(theme);

  const {
    families,
    currentFamily,
    currentFamilyId,
    loading,
    error,
    switchFamily,
    createFamily,
    updateFamily,
    deleteFamily,
    leaveFamily,
    getPermissions,
    updateMemberRole,
    removeMember,
    reload,
  } = useFamily();

  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [showUserManagementModal, setShowUserManagementModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [permissions, setPermissions] = useState<FamilyPermissions | null>(null);

  // Form state for create/edit
  const [familyName, setFamilyName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [themeColor, setThemeColor] = useState('#4ECDC4');

  useEffect(() => {
    if (currentFamily) {
      loadPermissions();
    }
  }, [currentFamilyId]);

  useEffect(() => {
    if (autoOpenCreate) {
      // Small timeout to allow mount to complete before opening modal
      setTimeout(() => openCreateModal(), 250);
    }
  }, [autoOpenCreate]);

  const loadPermissions = async () => {
    const perms = await getPermissions();
    setPermissions(perms);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  };

  const handleCreateFamily = async () => {
    if (!familyName.trim()) {
      Alert.alert('Error', 'Please enter a family name');
      return;
    }

    try {
      await createFamily({
        name: familyName.trim(),
        avatar_url: avatarUrl.trim() || undefined,
        theme_color: themeColor,
      });
      setShowCreateModal(false);
      setFamilyName('');
      setAvatarUrl('');
      setThemeColor('#4ECDC4');
      Alert.alert('Success', 'Family created successfully!');
    } catch (err) {
      console.error('createFamily error:', err);
      const message = err instanceof Error ? err.message : JSON.stringify(err);
      Alert.alert('Error', message || 'Failed to create family');
    }
  };

  const handleUpdateFamily = async () => {
    if (!currentFamilyId || !familyName.trim()) {
      Alert.alert('Error', 'Please enter a family name');
      return;
    }

    try {
      await updateFamily(currentFamilyId, {
        name: familyName.trim(),
        avatar_url: avatarUrl.trim() || undefined,
        theme_color: themeColor,
      });
      setShowEditModal(false);
      Alert.alert('Success', 'Family updated successfully!');
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to update family');
    }
  };

  const handleLeaveFamily = (familyId: string, familyName: string) => {
    Alert.alert(
      'Leave Family',
      `Are you sure you want to leave "${familyName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              await leaveFamily(familyId);
              Alert.alert('Success', 'Left family successfully');
            } catch (err) {
              Alert.alert('Error', err instanceof Error ? err.message : 'Failed to leave family');
            }
          },
        },
      ]
    );
  };

  const handleDeleteFamily = (familyId: string, familyName: string) => {
    Alert.alert(
      'Delete Family',
      `Are you sure you want to delete "${familyName}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteFamily(familyId);
              Alert.alert('Success', 'Family deleted successfully');
            } catch (err) {
              Alert.alert('Error', err instanceof Error ? err.message : 'Failed to delete family');
            }
          },
        },
      ]
    );
  };

  const openEditModal = () => {
    if (currentFamily) {
      setFamilyName(currentFamily.name);
      setAvatarUrl(currentFamily.avatar_url || '');
      setThemeColor(currentFamily.theme_color || '#4ECDC4');
      setShowEditModal(true);
    }
  };

  const openCreateModal = () => {
    setFamilyName('');
    setAvatarUrl('');
    setThemeColor('#4ECDC4');
    setShowCreateModal(true);
  };

  if (loading && families.length === 0) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>My Families</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            onPress={() => setShowJoinModal(true)}
            style={styles.joinButton}
          >
            <Text style={styles.joinButtonText}>🎟️ Join</Text>
          </TouchableOpacity>
          {currentFamily && permissions?.canInviteMembers && (
            <TouchableOpacity
              onPress={() => setShowInviteModal(true)}
              style={[styles.inviteButton, { backgroundColor: currentFamily.theme_color }]}
            >
              <Text style={styles.inviteButtonText}>📤 Invite</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={openCreateModal} style={styles.createButton}>
            <Text style={styles.createButtonText}>+ Create</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Error Message */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Family List */}
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {families.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No families yet</Text>
            <Text style={styles.emptySubtext}>Create your first family to get started</Text>
          </View>
        ) : (
          families.map((family) => (
            <FamilyCard
              key={family.id}
              family={family}
              isSelected={family.id === currentFamilyId}
              onSelect={() => switchFamily(family.id)}
              onEdit={family.my_role === 'head' ? openEditModal : undefined}
              onLeave={family.my_role !== 'head' ? () => handleLeaveFamily(family.id, family.name) : undefined}
              onDelete={family.my_role === 'head' ? () => handleDeleteFamily(family.id, family.name) : undefined}
              theme={theme}
            />
          ))
        )}
      </ScrollView>

      {/* Current Family Details */}
      {currentFamily && permissions && (
        <View style={styles.currentFamilyContainer}>
          <Text style={styles.currentFamilyTitle}>Current Family</Text>
          <View style={[styles.currentFamilyCard, { borderColor: currentFamily.theme_color }]}>
            <Text style={styles.currentFamilyName}>{currentFamily.name}</Text>
            <Text style={styles.currentFamilyRole}>Your role: {currentFamily.my_role}</Text>
            <Text style={styles.currentFamilyMembers}>{currentFamily.member_count} members</Text>
            
            <View style={styles.permissionsContainer}>
              <Text style={styles.permissionsTitle}>Permissions:</Text>
              <Text style={styles.permissionItem}>
                {permissions.canManageMembers ? '✓' : '✗'} Manage members
              </Text>
              <Text style={styles.permissionItem}>
                {permissions.canEditSettings ? '✓' : '✗'} Edit settings
              </Text>
              <Text style={styles.permissionItem}>
                {permissions.canInviteMembers ? '✓' : '✗'} Invite members
              </Text>
            </View>

            {/* Manage Members Button */}
            <TouchableOpacity
              style={[styles.manageMembersButton, { backgroundColor: currentFamily.theme_color }]}
              onPress={() => setShowMembersModal(true)}
            >
              <Text style={styles.manageMembersButtonText}>👥 Manage Members & Invites</Text>
            </TouchableOpacity>

            {/* User Management Button */}
            {permissions.canManageMembers && (
              <TouchableOpacity
                style={[styles.userManagementButton, { borderColor: currentFamily.theme_color }]}
                onPress={() => setShowUserManagementModal(true)}
              >
                <Text style={[styles.userManagementButtonText, { color: currentFamily.theme_color }]}>
                  ⚙️ Advanced User Management
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Create Family Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Create Family</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Family Name *"
              placeholderTextColor={theme.colors.placeholder}
              value={familyName}
              onChangeText={setFamilyName}
            />
            
            <TextInput
              style={styles.input}
              placeholder="Avatar URL (optional)"
              placeholderTextColor={theme.colors.placeholder}
              value={avatarUrl}
              onChangeText={setAvatarUrl}
            />
            
            <Text style={styles.colorLabel}>Theme Color:</Text>
            <View style={styles.colorPicker}>
              {['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#6C5CE7'].map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorOption,
                    { backgroundColor: color },
                    themeColor === color && styles.colorOptionSelected,
                  ]}
                  onPress={() => setThemeColor(color)}
                />
              ))}
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowCreateModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.createModalButton]}
                onPress={handleCreateFamily}
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

      {/* Edit Family Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Edit Family</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Family Name *"
              placeholderTextColor={theme.colors.placeholder}
              value={familyName}
              onChangeText={setFamilyName}
            />
            
            <TextInput
              style={styles.input}
              placeholder="Avatar URL (optional)"
              placeholderTextColor={theme.colors.placeholder}
              value={avatarUrl}
              onChangeText={setAvatarUrl}
            />
            
            <Text style={styles.colorLabel}>Theme Color:</Text>
            <View style={styles.colorPicker}>
              {['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#6C5CE7'].map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorOption,
                    { backgroundColor: color },
                    themeColor === color && styles.colorOptionSelected,
                  ]}
                  onPress={() => setThemeColor(color)}
                />
              ))}
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowEditModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.createModalButton]}
                onPress={handleUpdateFamily}
                disabled={loading}
              >
                <Text style={styles.createModalButtonText}>
                  {loading ? 'Updating...' : 'Update'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Members Management Modal */}
      <Modal
        visible={showMembersModal}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowMembersModal(false)}
      >
        {currentFamilyId && (
          <FamilyMembersManagement
            familyId={currentFamilyId}
            onClose={() => {
              setShowMembersModal(false);
              reload(); // Refresh family data after closing
            }}
          />
        )}
      </Modal>

      {/* User Management Modal */}
      <Modal
        visible={showUserManagementModal}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowUserManagementModal(false)}
      >
        {currentFamilyId && (
          <UserManagementScreen
            familyId={currentFamilyId}
            onClose={() => {
              setShowUserManagementModal(false);
              reload(); // Refresh family data after closing
            }}
          />
        )}
      </Modal>

      {/* Quick Invite Modal */}
      {currentFamily && currentFamilyId && (
        <QuickInviteModal
          visible={showInviteModal}
          familyId={currentFamilyId}
          familyName={currentFamily.name}
          themeColor={currentFamily.theme_color || '#4ECDC4'}
          onClose={() => {
            setShowInviteModal(false);
            reload(); // Refresh to show new invite
          }}
        />
      )}

      {/* Join Family Modal */}
      <JoinFamilyModal
        visible={showJoinModal}
        onClose={() => setShowJoinModal(false)}
        onSuccess={() => reload()}
      />
    </View>
  );
}

interface FamilyCardProps {
  family: FamilyWithMembers;
  isSelected: boolean;
  onSelect: () => void;
  onEdit?: () => void;
  onLeave?: () => void;
  onDelete?: () => void;
  theme: any;
}

function FamilyCard({ family, isSelected, onSelect, onEdit, onLeave, onDelete, theme }: FamilyCardProps) {
  const styles = createStyles(theme);

  return (
    <TouchableOpacity
      style={[
        styles.familyCard,
        { borderColor: family.theme_color },
        isSelected && styles.familyCardSelected,
      ]}
      onPress={onSelect}
    >
      <View style={styles.familyCardHeader}>
        {family.avatar_url ? (
          <Image source={{ uri: family.avatar_url }} style={styles.familyAvatar} />
        ) : (
          <View style={[styles.familyAvatarPlaceholder, { backgroundColor: family.theme_color }]}>
            <Text style={styles.familyAvatarText}>{family.name[0]}</Text>
          </View>
        )}
        <View style={styles.familyCardInfo}>
          <Text style={styles.familyCardName}>{family.name}</Text>
          <Text style={styles.familyCardRole}>{family.my_role}</Text>
          <Text style={styles.familyCardMembers}>{family.member_count} members</Text>
        </View>
      </View>

      <View style={styles.familyCardActions}>
        {onEdit && (
          <TouchableOpacity style={styles.actionButton} onPress={onEdit}>
            <Text style={styles.actionButtonText}>Edit</Text>
          </TouchableOpacity>
        )}
        {onLeave && (
          <TouchableOpacity style={[styles.actionButton, styles.leaveButton]} onPress={onLeave}>
            <Text style={styles.leaveButtonText}>Leave</Text>
          </TouchableOpacity>
        )}
        {onDelete && (
          <TouchableOpacity style={[styles.actionButton, styles.deleteButton]} onPress={onDelete}>
            <Text style={styles.deleteButtonText}>Delete</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
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
    headerButtons: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
      alignItems: 'center',
    },
    joinButton: {
      backgroundColor: theme.colors.success || '#4ECDC4',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.borderRadius.md,
    },
    joinButtonText: {
      color: '#FFFFFF',
      fontWeight: '500',
      fontSize: 14,
    },
    inviteButton: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.borderRadius.md,
    },
    inviteButtonText: {
      color: '#FFFFFF',
      fontWeight: '500',
      fontSize: 14,
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
    errorContainer: {
      backgroundColor: theme.colors.error + '20',
      padding: theme.spacing.md,
      marginHorizontal: theme.spacing.lg,
      marginTop: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
    },
    errorText: {
      color: theme.colors.error,
      fontSize: 14,
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
    },
    emptySubtext: {
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    familyCard: {
      backgroundColor: theme.colors.surface,
      marginHorizontal: theme.spacing.lg,
      marginTop: theme.spacing.md,
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.lg,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    familyCardSelected: {
      borderWidth: 2,
    },
    familyCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: theme.spacing.md,
    },
    familyAvatar: {
      width: 50,
      height: 50,
      borderRadius: 25,
      marginRight: theme.spacing.md,
    },
    familyAvatarPlaceholder: {
      width: 50,
      height: 50,
      borderRadius: 25,
      marginRight: theme.spacing.md,
      justifyContent: 'center',
      alignItems: 'center',
    },
    familyAvatarText: {
      color: '#FFFFFF',
      fontSize: 24,
      fontWeight: '600',
    },
    familyCardInfo: {
      flex: 1,
    },
    familyCardName: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 4,
    },
    familyCardRole: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      textTransform: 'capitalize',
    },
    familyCardMembers: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
    familyCardActions: {
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
    leaveButton: {
      backgroundColor: theme.colors.warning || '#FFA500',
    },
    leaveButtonText: {
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
    currentFamilyContainer: {
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      padding: theme.spacing.lg,
      backgroundColor: theme.colors.surface,
    },
    currentFamilyTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: theme.spacing.md,
    },
    currentFamilyCard: {
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
      borderWidth: 2,
    },
    currentFamilyName: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text,
    },
    currentFamilyRole: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginTop: 4,
      textTransform: 'capitalize',
    },
    currentFamilyMembers: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
    permissionsContainer: {
      marginTop: theme.spacing.md,
      paddingTop: theme.spacing.md,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    permissionsTitle: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.colors.text,
      marginBottom: theme.spacing.xs,
    },
    permissionItem: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginTop: 4,
    },
    manageMembersButton: {
      marginTop: theme.spacing.md,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      borderRadius: theme.borderRadius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    manageMembersButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
    userManagementButton: {
      marginTop: theme.spacing.sm,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      borderRadius: theme.borderRadius.md,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      backgroundColor: 'transparent',
    },
    userManagementButtonText: {
      fontSize: 16,
      fontWeight: '600',
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
      marginBottom: theme.spacing.lg,
    },
    input: {
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.md,
      fontSize: 16,
      color: theme.colors.text,
      marginBottom: theme.spacing.md,
    },
    colorLabel: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.colors.text,
      marginBottom: theme.spacing.sm,
    },
    colorPicker: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.lg,
    },
    colorOption: {
      width: 40,
      height: 40,
      borderRadius: 20,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    colorOptionSelected: {
      borderColor: theme.colors.text,
      borderWidth: 3,
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
  });
