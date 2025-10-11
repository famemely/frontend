/**
 * Invitations Screen
 * Manage family invitations using family.service.ts
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert,
  ActivityIndicator,
  Share,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useFamily } from '@/hooks/useFamily';
import { familyService } from '@/services/family.service';
import { FamilyInvite } from '@/types/family.types';

export default function InvitationsScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { families } = useFamily();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [invitesByFamily, setInvitesByFamily] = useState<Record<string, FamilyInvite[]>>({});
  const [selectedFamily, setSelectedFamily] = useState<string | null>(null);

  const styles = createStyles(theme);

  useEffect(() => {
    loadInvitations();
  }, [families]);

  const loadInvitations = async () => {
    if (refreshing === false) {
      // normal load path
    }
    if (!families || families.length === 0) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    setLoading(true);
    try {
      const invitesMap: Record<string, FamilyInvite[]> = {};
      
      for (const family of families) {
        try {
          const invites = await familyService.getFamilyInvites(family.id);
          invitesMap[family.id] = invites;
        } catch (error) {
          console.error(`Failed to load invites for family ${family.id}:`, error);
          invitesMap[family.id] = [];
        }
      }
      
      setInvitesByFamily(invitesMap);
      
      // Auto-select first family
      if (families.length > 0 && !selectedFamily) {
        setSelectedFamily(families[0].id);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load invitations');
      console.error('Load invitations error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadInvitations();
  }, [families]);

  const handleDeleteInvite = async (inviteId: string) => {
    Alert.alert(
      'Delete Invitation',
      'Are you sure you want to delete this invitation? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await familyService.deleteInvite(inviteId);
              Alert.alert('Success', 'Invitation deleted');
              await loadInvitations();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete invitation');
            }
          },
        },
      ]
    );
  };

  const handleShareInvite = async (invite: FamilyInvite) => {
    try {
      const familyName = invite.family?.name || 'our family';
      const message = `Join my family "${familyName}" on Famemely!\n\nInvitation Code: ${invite.invite_code}\n\nDownload Famemely and use this code to join.`;
      
      await Share.share({
        message,
        title: `Join ${familyName}`,
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const isExpired = (invite: FamilyInvite) => {
    if (!invite.expires_at) return false;
    return new Date(invite.expires_at) < new Date();
  };

  const isMaxedOut = (invite: FamilyInvite) => {
    if (!invite.max_uses) return false;
    return invite.uses >= invite.max_uses;
  };

  const selectedInvites = selectedFamily ? invitesByFamily[selectedFamily] || [] : [];
  const selectedFamilyData = families?.find(f => f.id === selectedFamily);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Invitations</Text>
        <View style={styles.placeholder} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#053326" />
          <Text style={styles.loadingText}>Loading invitations...</Text>
        </View>
      ) : families && families.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>✉️</Text>
          <Text style={styles.emptyTitle}>No Families</Text>
          <Text style={styles.emptyText}>
            Create or join a family to manage invitations
          </Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => router.push('/families' as any)}
          >
            <Text style={styles.emptyButtonText}>Go to Families</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {/* Family Tabs */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.tabsContainer}
            contentContainerStyle={styles.tabsContent}
          >
            {families?.map((family) => {
              const inviteCount = invitesByFamily[family.id]?.length || 0;
              const isSelected = selectedFamily === family.id;
              
              return (
                <TouchableOpacity
                  key={family.id}
                  style={[styles.tab, isSelected && styles.tabActive]}
                  onPress={() => setSelectedFamily(family.id)}
                >
                  <Text style={[styles.tabText, isSelected && styles.tabTextActive]}>
                    {family.name}
                  </Text>
                  {inviteCount > 0 && (
                    <View style={[styles.badge, isSelected && styles.badgeActive]}>
                      <Text style={[styles.badgeText, isSelected && styles.badgeTextActive]}>
                        {inviteCount}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          >
            {/* Invitations List */}
            {selectedInvites.length === 0 ? (
              <View style={styles.noInvites}>
                <Text style={styles.noInvitesIcon}>📭</Text>
                <Text style={styles.noInvitesTitle}>No Invitations</Text>
                <Text style={styles.noInvitesText}>
                  This family has no active invitations
                </Text>
              </View>
            ) : (
              <View style={styles.invitesList}>
                {selectedInvites.map((invite, index) => {
                  const expired = isExpired(invite);
                  const maxedOut = isMaxedOut(invite);
                  const inactive = expired || maxedOut;
                  
                  return (
                    <View
                      key={invite.id}
                      style={[
                        styles.inviteCard,
                        inactive && styles.inviteCardInactive,
                      ]}
                    >
                      {/* Header */}
                      <View style={styles.inviteHeader}>
                        <View style={styles.inviteCodeContainer}>
                          <Text style={styles.inviteCodeLabel}>CODE</Text>
                          <Text style={[styles.inviteCode, inactive && styles.inviteCodeInactive]}>
                            {invite.invite_code}
                          </Text>
                        </View>
                        
                        {inactive ? (
                          <View style={styles.statusBadgeInactive}>
                            <Text style={styles.statusBadgeText}>
                              {expired ? 'Expired' : 'Max Uses'}
                            </Text>
                          </View>
                        ) : (
                          <View style={styles.statusBadgeActive}>
                            <Text style={styles.statusBadgeTextActive}>Active</Text>
                          </View>
                        )}
                      </View>

                      {/* Details */}
                      <View style={styles.inviteDetails}>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Role:</Text>
                          <Text style={styles.detailValue}>
                            {invite.role === 'head' ? '👑 Head' : 
                             invite.role === 'member' ? '👤 Member' : '👶 Child'}
                          </Text>
                        </View>
                        
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Uses:</Text>
                          <Text style={styles.detailValue}>
                            {invite.uses} {invite.max_uses ? `/ ${invite.max_uses}` : '/ ∞'}
                          </Text>
                        </View>
                        
                        {invite.expires_at && (
                          <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Expires:</Text>
                            <Text style={[styles.detailValue, expired && styles.detailValueExpired]}>
                              {new Date(invite.expires_at).toLocaleDateString()}
                            </Text>
                          </View>
                        )}
                        
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Created by:</Text>
                          <Text style={styles.detailValue}>{invite.creator?.name || 'Unknown'}</Text>
                        </View>
                      </View>

                      {/* Actions */}
                      <View style={styles.inviteActions}>
                        {!inactive && (
                          <TouchableOpacity
                            style={styles.actionButtonPrimary}
                            onPress={() => handleShareInvite(invite)}
                          >
                            <Text style={styles.actionButtonPrimaryText}>Share</Text>
                          </TouchableOpacity>
                        )}
                        
                        <TouchableOpacity
                          style={[
                            styles.actionButtonSecondary,
                            !inactive && styles.actionButtonSecondarySmall,
                          ]}
                          onPress={() => handleDeleteInvite(invite.id)}
                        >
                          <Text style={styles.actionButtonSecondaryText}>Delete</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </ScrollView>
        </>
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
    placeholder: {
      width: 40,
    },

    // Loading
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      fontSize: 14,
      color: '#666666',
      marginTop: theme.spacing.md,
    },

    // Empty State
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.xl,
    },
    emptyIcon: {
      fontSize: 64,
      marginBottom: theme.spacing.md,
    },
    emptyTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: '#000000',
      marginBottom: theme.spacing.sm,
    },
    emptyText: {
      fontSize: 14,
      color: '#666666',
      textAlign: 'center',
      marginBottom: theme.spacing.lg,
    },
    emptyButton: {
      backgroundColor: '#053326',
      borderRadius: 8,
      paddingHorizontal: theme.spacing.xl,
      paddingVertical: theme.spacing.md,
    },
    emptyButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },

    // Tabs
    tabsContainer: {
      backgroundColor: '#FFFFFF',
      borderBottomWidth: 1,
      borderBottomColor: '#E5E5E5',
      maxHeight: 60, // Limit tab height
    },
    tabsContent: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xs,
      gap: theme.spacing.xs,
    },
    tab: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#F5F5F5',
      borderRadius: 16,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xs,
      marginRight: theme.spacing.xs,
      height: 36, // Fixed tab height
    },
    tabActive: {
      backgroundColor: '#053326',
    },
    tabText: {
      fontSize: 14,
      fontWeight: '500',
      color: '#666666',
    },
    tabTextActive: {
      color: '#FFFFFF',
    },
    badge: {
      backgroundColor: '#053326',
      borderRadius: 10,
      minWidth: 20,
      height: 20,
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: theme.spacing.sm,
      paddingHorizontal: 6,
    },
    badgeActive: {
      backgroundColor: '#FFFFFF',
    },
    badgeText: {
      fontSize: 11,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    badgeTextActive: {
      color: '#053326',
    },

    // Content
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: theme.spacing.lg,
    },

    // No Invites
    noInvites: {
      alignItems: 'center',
      paddingVertical: theme.spacing.xl * 2,
    },
    noInvitesIcon: {
      fontSize: 64,
      marginBottom: theme.spacing.md,
    },
    noInvitesTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: '#000000',
      marginBottom: theme.spacing.sm,
    },
    noInvitesText: {
      fontSize: 14,
      color: '#666666',
      textAlign: 'center',
    },

    // Invite Card
    invitesList: {
      gap: theme.spacing.md,
    },
    inviteCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#E5E5E5',
      padding: theme.spacing.md,
    },
    inviteCardInactive: {
      opacity: 0.6,
      backgroundColor: '#F5F5F5',
    },
    inviteHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.md,
      paddingBottom: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: '#F5F5F5',
    },
    inviteCodeContainer: {
      flex: 1,
    },
    inviteCodeLabel: {
      fontSize: 11,
      color: '#999999',
      fontWeight: '600',
      marginBottom: 4,
      letterSpacing: 0.5,
    },
    inviteCode: {
      fontSize: 24,
      fontWeight: '700',
      color: '#053326',
      letterSpacing: 2,
    },
    inviteCodeInactive: {
      color: '#999999',
    },
    statusBadgeActive: {
      backgroundColor: '#D1FAE5',
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 4,
    },
    statusBadgeTextActive: {
      fontSize: 12,
      fontWeight: '600',
      color: '#059669',
    },
    statusBadgeInactive: {
      backgroundColor: '#FEE2E2',
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 4,
    },
    statusBadgeText: {
      fontSize: 12,
      fontWeight: '600',
      color: '#DC2626',
    },
    inviteDetails: {
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.md,
    },
    detailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    detailLabel: {
      fontSize: 14,
      color: '#666666',
      fontWeight: '400',
    },
    detailValue: {
      fontSize: 14,
      color: '#000000',
      fontWeight: '500',
    },
    detailValueExpired: {
      color: '#DC2626',
    },
    inviteActions: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
    },
    actionButtonPrimary: {
      flex: 1,
      backgroundColor: '#053326',
      borderRadius: 8,
      paddingVertical: theme.spacing.sm,
      alignItems: 'center',
    },
    actionButtonPrimaryText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '600',
    },
    actionButtonSecondary: {
      flex: 1,
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: '#DC2626',
      borderRadius: 8,
      paddingVertical: theme.spacing.sm,
      alignItems: 'center',
    },
    actionButtonSecondarySmall: {
      flex: 0.4,
    },
    actionButtonSecondaryText: {
      color: '#DC2626',
      fontSize: 14,
      fontWeight: '600',
    },
  });
