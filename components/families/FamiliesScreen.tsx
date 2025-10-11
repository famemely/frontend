/**
 * Families Screen
 * Manage all families with elegant design
 */

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useFamily } from '@/hooks/useFamily';
import JoinFamilyModal from '@/components/family/JoinFamilyModal';
import { familyService } from '@/services/family.service';

export default function FamiliesScreen() {
  const { theme } = useTheme();
  const { families, reload } = useFamily();
  const router = useRouter();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [familyName, setFamilyName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [expandedFamilies, setExpandedFamilies] = useState<Set<string>>(new Set());

  const styles = createStyles(theme);

  const toggleFamily = (familyId: string) => {
    const newExpanded = new Set(expandedFamilies);
    if (newExpanded.has(familyId)) {
      newExpanded.delete(familyId);
    } else {
      newExpanded.add(familyId);
    }
    setExpandedFamilies(newExpanded);
  };

  const handleCreateFamily = async () => {
    if (!familyName.trim()) {
      Alert.alert('Error', 'Please enter a family name');
      return;
    }
    
    try {
      setIsCreating(true);
      await familyService.createFamily({ name: familyName.trim() });
      await reload(); // Reload families to show the new one
      Alert.alert('Success', `Family "${familyName}" created successfully`);
      setFamilyName('');
      setShowCreateModal(false);
    } catch (error) {
      console.error('Failed to create family:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to create family');
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinFamily = () => {
    setShowJoinModal(true);
  };

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  }, [reload]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>My Families</Text>
        
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowCreateModal(true)}
        >
          <Text style={styles.addIcon}>+</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* All Families */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>MY FAMILIES ({families?.length || 0})</Text>
          {families && families.length > 0 ? (
            families.map((family: any) => {
              const isExpanded = expandedFamilies.has(family.id);
              
              return (
                <View key={family.id} style={styles.familyCard}>
                  {/* Family Header - Always Visible */}
                  <TouchableOpacity
                    style={styles.familyCardHeader}
                    onPress={() => toggleFamily(family.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.familyIcon}>
                      <Text style={styles.familyIconText}>👨‍👩‍👧‍👦</Text>
                    </View>
                    <View style={styles.familyInfo}>
                      <Text style={styles.familyName}>{family.name}</Text>
                      <Text style={styles.familyMembers}>
                        {family.member_count || family.members?.length || 0} members • {family.my_role || 'member'}
                      </Text>
                    </View>
                    <Text style={[styles.expandIcon, isExpanded && styles.expandIconRotated]}>
                      ›
                    </Text>
                  </TouchableOpacity>

                  {/* Collapsible Actions */}
                  {isExpanded && (
                    <View style={styles.familyActions}>
                      <TouchableOpacity 
                        style={styles.familyActionButton}
                        onPress={() => router.push(`/manage-members?familyId=${family.id}` as any)}
                      >
                        <Text style={styles.familyActionIcon}>👥</Text>
                        <Text style={styles.familyActionText}>Members</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.familyActionButton}
                        onPress={() => router.push('/invitations' as any)}
                      >
                        <Text style={styles.familyActionIcon}>✉️</Text>
                        <Text style={styles.familyActionText}>Invite</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.familyActionButton}
                        onPress={() => router.push(`/family-settings?familyId=${family.id}` as any)}
                      >
                        <Text style={styles.familyActionIcon}>⚙️</Text>
                        <Text style={styles.familyActionText}>Settings</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🏡</Text>
              <Text style={styles.emptyText}>No families yet</Text>
              <Text style={styles.emptySubtext}>
                Create a family or join an existing one
              </Text>
            </View>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.quickActionCard}
            onPress={() => setShowCreateModal(true)}
          >
            <Text style={styles.quickActionIcon}>➕</Text>
            <Text style={styles.quickActionTitle}>Create Family</Text>
            <Text style={styles.quickActionDesc}>
              Start a new family circle
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionCard}
            onPress={handleJoinFamily}
          >
            <Text style={styles.quickActionIcon}>🔗</Text>
            <Text style={styles.quickActionTitle}>Join Family</Text>
            <Text style={styles.quickActionDesc}>
              Use an invitation code
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Create Family Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Create New Family</Text>
            <Text style={styles.modalSubtitle}>
              Choose a name for your family circle
            </Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Family Name"
              placeholderTextColor="#999999"
              value={familyName}
              onChangeText={setFamilyName}
              autoFocus
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={() => {
                  setFamilyName('');
                  setShowCreateModal(false);
                }}
                disabled={isCreating}
              >
                <Text style={styles.modalButtonTextSecondary}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalButton, 
                  styles.modalButtonPrimary,
                  isCreating && styles.modalButtonDisabled
                ]}
                onPress={handleCreateFamily}
                disabled={isCreating}
              >
                {isCreating ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalButtonTextPrimary}>Create</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Join Family Modal */}
      <JoinFamilyModal
        visible={showJoinModal}
        onClose={() => setShowJoinModal(false)}
        onSuccess={() => {
          setShowJoinModal(false);
          // Refresh families list if needed
        }}
      />
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
    addButton: {
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
    },
    addIcon: {
      fontSize: 28,
      color: '#053326',
      fontWeight: '300',
    },

    // Content
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingVertical: theme.spacing.lg,
      paddingBottom: 40,
    },

    // Sections
    section: {
      marginBottom: theme.spacing.xl,
      paddingHorizontal: theme.spacing.lg,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: '600',
      color: '#666666',
      marginBottom: theme.spacing.md,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },

    // Current Family Card
    familyCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      padding: theme.spacing.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginBottom: theme.spacing.md,
    },
    familyCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: theme.spacing.md,
    },
    familyIcon: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: theme.colors.muted,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: theme.spacing.md,
    },
    familyIconText: {
      fontSize: 28,
    },
    familyInfo: {
      flex: 1,
    },
    familyName: {
      fontSize: 20,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 4,
    },
    familyMembers: {
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    expandIcon: {
      fontSize: 24,
      color: '#999999',
      transform: [{ rotate: '0deg' }],
    },
    expandIconRotated: {
      transform: [{ rotate: '90deg' }],
    },
    activeBadge: {
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 12,
    },
    activeBadgeText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '600',
    },
    familyActions: {
      flexDirection: 'row',
      gap: 12,
    },
    familyActionButton: {
      flex: 1,
      backgroundColor: theme.colors.muted,
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: 'center',
    },
    familyActionIcon: {
      fontSize: 20,
      marginBottom: 4,
    },
    familyActionText: {
      color: theme.colors.text,
      fontSize: 11,
      fontWeight: '500',
    },

    // Family List Items
    familyItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: '#E5E5E5',
      borderRadius: 12,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.sm,
    },
    familyItemActive: {
      backgroundColor: '#F0FDF4',
      borderColor: '#053326',
      borderWidth: 1.5,
    },
    familyItemIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: '#FAFAFA',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: theme.spacing.md,
    },
    familyItemIconText: {
      fontSize: 24,
    },
    familyItemInfo: {
      flex: 1,
    },
    familyItemName: {
      fontSize: 16,
      fontWeight: '600',
      color: '#000000',
      marginBottom: 2,
    },
    familyItemMeta: {
      fontSize: 12,
      color: '#666666',
    },
    familyItemArrow: {
      fontSize: 24,
      color: '#999999',
    },
    checkmark: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: '#053326',
      justifyContent: 'center',
      alignItems: 'center',
    },
    checkmarkText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '600',
    },

    // Empty State
    emptyState: {
      paddingVertical: 40,
      alignItems: 'center',
    },
    emptyIcon: {
      fontSize: 48,
      marginBottom: 16,
    },
    emptyText: {
      fontSize: 18,
      fontWeight: '600',
      color: '#000000',
      marginBottom: 8,
    },
    emptySubtext: {
      fontSize: 14,
      color: '#666666',
      textAlign: 'center',
    },

    // Quick Actions
    quickActions: {
      paddingHorizontal: theme.spacing.lg,
      gap: theme.spacing.md,
    },
    quickActionCard: {
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: '#E5E5E5',
      borderRadius: 12,
      padding: theme.spacing.lg,
      alignItems: 'center',
    },
    quickActionIcon: {
      fontSize: 32,
      marginBottom: theme.spacing.sm,
    },
    quickActionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: '#000000',
      marginBottom: 4,
    },
    quickActionDesc: {
      fontSize: 13,
      color: '#666666',
      textAlign: 'center',
    },

    // Modal
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: theme.spacing.lg,
    },
    modalContainer: {
      width: '100%',
      backgroundColor: '#FFFFFF',
      borderRadius: 16,
      padding: theme.spacing.xl,
    },
    modalTitle: {
      fontSize: 24,
      fontWeight: '600',
      color: '#000000',
      marginBottom: theme.spacing.sm,
      textAlign: 'center',
    },
    modalSubtitle: {
      fontSize: 14,
      color: '#666666',
      textAlign: 'center',
      marginBottom: theme.spacing.xl,
    },
    modalInput: {
      backgroundColor: '#FAFAFA',
      borderWidth: 1,
      borderColor: '#E5E5E5',
      borderRadius: 8,
      padding: theme.spacing.md,
      fontSize: 16,
      color: '#000000',
      marginBottom: theme.spacing.lg,
    },
    modalActions: {
      flexDirection: 'row',
      gap: theme.spacing.md,
    },
    modalButton: {
      flex: 1,
      paddingVertical: theme.spacing.md,
      borderRadius: 8,
      alignItems: 'center',
    },
    modalButtonPrimary: {
      backgroundColor: '#053326',
    },
    modalButtonDisabled: {
      backgroundColor: '#999999',
      opacity: 0.6,
    },
    modalButtonSecondary: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: '#053326',
    },
    modalButtonTextPrimary: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
    modalButtonTextSecondary: {
      color: '#053326',
      fontSize: 16,
      fontWeight: '600',
    },
  });
