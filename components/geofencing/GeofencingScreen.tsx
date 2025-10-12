/**
 * Geofencing Screen
 * Per-family tabbed interface for managing geofences
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
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useFamily } from '@/hooks/useFamily';
import { geofencingService, Geofence } from '@/services/geofencing.service';

export default function GeofencingScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { families } = useFamily();
  
  const [selectedFamily, setSelectedFamily] = useState<string | null>(
    families && families.length > 0 ? families[0].id : null
  );
  const [geofences, setGeofences] = useState<Record<string, Geofence[]>>({});
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newGeofence, setNewGeofence] = useState({
    name: '',
    radius: '100',
  });

  const styles = createStyles(theme);

  useEffect(() => {
    if (selectedFamily) {
      loadGeofences(selectedFamily);
    }
  }, [selectedFamily]);

  const loadGeofences = async (familyId: string) => {
    setLoading(true);
    try {
      const data = await geofencingService.getFamilyGeofences(familyId);
      setGeofences(prev => ({ ...prev, [familyId]: data }));
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load geofences');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(async () => {
    if (!selectedFamily) return;
    setRefreshing(true);
    await loadGeofences(selectedFamily);
  }, [selectedFamily]);

  const handleAddGeofence = async () => {
    if (!selectedFamily) return;
    
    if (!newGeofence.name.trim()) {
      Alert.alert('Error', 'Please enter a location name');
      return;
    }

    // For now, use a default location (could be user's current location or map picker)
    // TODO: Integrate with map picker
    const defaultLat = 37.7879;
    const defaultLng = -122.4074;

    try {
      setLoading(true);
      await geofencingService.createGeofence({
        family_id: selectedFamily,
        name: newGeofence.name.trim(),
        latitude: defaultLat,
        longitude: defaultLng,
        radius: parseInt(newGeofence.radius) || 100,
        notify_on_enter: true,
        notify_on_exit: false,
      });

      await loadGeofences(selectedFamily);
      Alert.alert('Success', 'Geofence created successfully');
      setShowAddForm(false);
      setNewGeofence({ name: '', radius: '100' });
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create geofence');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteGeofence = async (geofenceId: string) => {
    Alert.alert(
      'Delete Geofence',
      'Are you sure you want to delete this geofence?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await geofencingService.deleteGeofence(geofenceId);
              if (selectedFamily) {
                await loadGeofences(selectedFamily);
              }
              Alert.alert('Success', 'Geofence deleted');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete geofence');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const selectedGeofences = selectedFamily ? geofences[selectedFamily] || [] : [];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Geofencing</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddForm(true)}
          disabled={loading}
        >
          <Text style={styles.addButtonText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#053326" />
        </View>
      )}

      {families && families.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🗺️</Text>
          <Text style={styles.emptyTitle}>No Families</Text>
          <Text style={styles.emptyText}>
            Create or join a family to manage geofences
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
              const geofenceCount = geofences[family.id]?.length || 0;
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
                  {geofenceCount > 0 && (
                    <View style={[styles.badge, isSelected && styles.badgeActive]}>
                      <Text style={[styles.badgeText, isSelected && styles.badgeTextActive]}>
                        {geofenceCount}
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
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          >
            {/* Info */}
            <View style={styles.infoCard}>
              <Text style={styles.infoText}>
                🗺️ Geofences notify you when family members enter or exit specific locations
                like home, school, or work.
              </Text>
            </View>

            {/* Add Form */}
            {showAddForm && (
              <View style={styles.addForm}>
                <Text style={styles.formTitle}>Add New Geofence</Text>
                
                <TextInput
                  style={styles.input}
                  placeholder="Location name (e.g., Home, School)"
                  value={newGeofence.name}
                  onChangeText={(text) => setNewGeofence({ ...newGeofence, name: text })}
                />
                
                <TextInput
                  style={styles.input}
                  placeholder="Radius (meters)"
                  value={newGeofence.radius}
                  onChangeText={(text) => setNewGeofence({ ...newGeofence, radius: text })}
                  keyboardType="numeric"
                />
                
                <View style={styles.formActions}>
                  <TouchableOpacity
                    style={styles.formButtonSecondary}
                    onPress={() => {
                      setShowAddForm(false);
                      setNewGeofence({ name: '', radius: '100' });
                    }}
                  >
                    <Text style={styles.formButtonSecondaryText}>Cancel</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.formButtonPrimary}
                    onPress={handleAddGeofence}
                  >
                    <Text style={styles.formButtonPrimaryText}>Add Location</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Geofences List */}
            {selectedGeofences.length === 0 ? (
              <View style={styles.noGeofences}>
                <Text style={styles.noGeofencesIcon}>📍</Text>
                <Text style={styles.noGeofencesTitle}>No Geofences</Text>
                <Text style={styles.noGeofencesText}>
                  Add your first geofence to get location-based notifications
                </Text>
              </View>
            ) : (
              <View style={styles.geofencesList}>
                {selectedGeofences.map((geofence) => (
                  <View key={geofence.id} style={styles.geofenceCard}>
                    <View style={styles.geofenceHeader}>
                      <Text style={styles.geofenceName}>{geofence.name}</Text>
                      <TouchableOpacity
                        onPress={() => handleDeleteGeofence(geofence.id)}
                      >
                        <Text style={styles.deleteButton}>🗑️</Text>
                      </TouchableOpacity>
                    </View>
                    
                    <View style={styles.geofenceDetails}>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Radius:</Text>
                        <Text style={styles.detailValue}>{geofence.radius}m</Text>
                      </View>
                      
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Notify on enter:</Text>
                        <Text style={styles.detailValue}>
                          {geofence.notify_on_enter ? '✓ Yes' : '✗ No'}
                        </Text>
                      </View>
                      
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Notify on exit:</Text>
                        <Text style={styles.detailValue}>
                          {geofence.notify_on_exit ? '✓ Yes' : '✗ No'}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
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
    loadingOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(255, 255, 255, 0.8)',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 999,
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
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    addButtonText: {
      fontSize: 16,
      color: '#053326',
      fontWeight: '600',
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

    // Info Card
    infoCard: {
      backgroundColor: '#F0F9FF',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#BAE6FD',
      padding: theme.spacing.md,
      marginBottom: theme.spacing.lg,
    },
    infoText: {
      fontSize: 14,
      color: '#0369A1',
      lineHeight: 20,
    },

    // Add Form
    addForm: {
      backgroundColor: '#FFFFFF',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#E5E5E5',
      padding: theme.spacing.md,
      marginBottom: theme.spacing.lg,
    },
    formTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: '#000000',
      marginBottom: theme.spacing.md,
    },
    input: {
      backgroundColor: '#F5F5F5',
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#E5E5E5',
      padding: theme.spacing.md,
      fontSize: 16,
      color: '#000000',
      marginBottom: theme.spacing.sm,
    },
    formActions: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
      marginTop: theme.spacing.sm,
    },
    formButtonPrimary: {
      flex: 1,
      backgroundColor: '#053326',
      borderRadius: 8,
      paddingVertical: theme.spacing.sm,
      alignItems: 'center',
    },
    formButtonPrimaryText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '600',
    },
    formButtonSecondary: {
      flex: 1,
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: '#E5E5E5',
      borderRadius: 8,
      paddingVertical: theme.spacing.sm,
      alignItems: 'center',
    },
    formButtonSecondaryText: {
      color: '#666666',
      fontSize: 14,
      fontWeight: '600',
    },

    // No Geofences
    noGeofences: {
      alignItems: 'center',
      paddingVertical: theme.spacing.xl * 2,
    },
    noGeofencesIcon: {
      fontSize: 64,
      marginBottom: theme.spacing.md,
    },
    noGeofencesTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: '#000000',
      marginBottom: theme.spacing.sm,
    },
    noGeofencesText: {
      fontSize: 14,
      color: '#666666',
      textAlign: 'center',
    },

    // Geofence Card
    geofencesList: {
      gap: theme.spacing.md,
    },
    geofenceCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#E5E5E5',
      padding: theme.spacing.md,
    },
    geofenceHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.md,
      paddingBottom: theme.spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: '#F5F5F5',
    },
    geofenceName: {
      fontSize: 18,
      fontWeight: '600',
      color: '#000000',
      flex: 1,
    },
    deleteButton: {
      fontSize: 20,
      padding: theme.spacing.sm,
    },
    geofenceDetails: {
      gap: theme.spacing.sm,
    },
    detailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    detailLabel: {
      fontSize: 14,
      color: '#666666',
    },
    detailValue: {
      fontSize: 14,
      color: '#000000',
      fontWeight: '500',
    },
  });
