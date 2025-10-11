/**
 * Family Settings Screen
 * Configure family-wide settings including name, avatar, theme
 */

import React, { useState, useEffect } from 'react';
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
  Switch,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useFamily } from '@/hooks/useFamily';
import { familyService } from '@/services/family.service';
import { backgroundLocationService } from '@/services/background-location.service';

const THEME_COLORS = [
  { name: 'Teal', value: '#4ECDC4' },
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Purple', value: '#8B5CF6' },
  { name: 'Pink', value: '#EC4899' },
  { name: 'Green', value: '#10B981' },
  { name: 'Orange', value: '#F97316' },
  { name: 'Red', value: '#EF4444' },
  { name: 'Yellow', value: '#F59E0B' },
];

export default function FamilySettingsScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { families, reload } = useFamily();
  
  const familyId = params.familyId as string;
  const [loading, setLoading] = useState(false);
  const [ghostMode, setGhostModeState] = useState(false);
  
  const selectedFamily = families?.find(f => f.id === familyId);
  const myRole = selectedFamily?.my_role;
  const canEditSettings = myRole === 'head';

  const [familyName, setFamilyName] = useState(selectedFamily?.name || '');
  const [avatarUrl, setAvatarUrl] = useState(selectedFamily?.avatar_url || '');
  const [themeColor, setThemeColor] = useState(selectedFamily?.theme_color || '#4ECDC4');

  const styles = createStyles(theme);

  useEffect(() => {
    if (selectedFamily) {
      setFamilyName(selectedFamily.name);
      setAvatarUrl(selectedFamily.avatar_url || '');
      setThemeColor(selectedFamily.theme_color || '#4ECDC4');
    }
  }, [selectedFamily]);

  useEffect(() => {
    loadGhostMode();
  }, []);

  const loadGhostMode = async () => {
    try {
      const isGhostMode = await backgroundLocationService.getGhostMode();
      setGhostModeState(isGhostMode);
    } catch (error) {
      console.error('Failed to load ghost mode:', error);
    }
  };

  const handleGhostModeToggle = async (value: boolean) => {
    try {
      backgroundLocationService.setGhostMode(value);
      setGhostModeState(value);
    } catch (error) {
      Alert.alert('Error', 'Failed to update ghost mode');
      console.error('Ghost mode toggle error:', error);
    }
  };

  const handleSave = async () => {
    if (!canEditSettings) {
      Alert.alert('Permission Denied', 'Only family heads can edit family settings');
      return;
    }

    if (!familyName.trim()) {
      Alert.alert('Error', 'Family name is required');
      return;
    }

    setLoading(true);
    try {
      await familyService.updateFamily(familyId, {
        name: familyName.trim(),
        avatar_url: avatarUrl.trim() || undefined,
        theme_color: themeColor,
      });
      
      await reload();
      Alert.alert('Success', 'Family settings updated successfully');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update family settings');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFamily = async () => {
    if (!canEditSettings) {
      Alert.alert('Permission Denied', 'Only family heads can delete the family');
      return;
    }

    Alert.alert(
      'Delete Family',
      `Are you sure you want to delete "${selectedFamily?.name}"? This will:\n\n• Remove all members\n• Delete all geofences\n• Clear all location history\n• Cannot be undone`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Family',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await familyService.deleteFamily(familyId);
              await reload();
              router.back();
              Alert.alert('Deleted', 'Family has been permanently deleted');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete family');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Family Settings</Text>
          <Text style={styles.headerSubtitle}>{selectedFamily?.name}</Text>
        </View>
        {canEditSettings && (
          <TouchableOpacity onPress={handleSave} disabled={loading}>
            <Text style={styles.saveText}>{loading ? '...' : 'Save'}</Text>
          </TouchableOpacity>
        )}
        {!canEditSettings && <View style={{ width: 50 }} />}
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Permission Warning */}
        {!canEditSettings && (
          <View style={styles.warningCard}>
            <Text style={styles.warningIcon}>🔒</Text>
            <Text style={styles.warningText}>
              Only family heads can edit these settings.
            </Text>
          </View>
        )}

        {/* Basic Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>BASIC INFORMATION</Text>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Family Name *</Text>
            <TextInput
              style={[styles.input, !canEditSettings && styles.inputDisabled]}
              value={familyName}
              onChangeText={setFamilyName}
              placeholder="Enter family name"
              editable={canEditSettings}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Avatar URL (optional)</Text>
            <TextInput
              style={[styles.input, !canEditSettings && styles.inputDisabled]}
              value={avatarUrl}
              onChangeText={setAvatarUrl}
              placeholder="https://example.com/avatar.jpg"
              editable={canEditSettings}
              autoCapitalize="none"
            />
          </View>
        </View>

        {/* Theme Color */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>THEME COLOR</Text>
          <View style={styles.colorGrid}>
            {THEME_COLORS.map((color) => (
              <TouchableOpacity
                key={color.value}
                style={[
                  styles.colorOption,
                  { backgroundColor: color.value },
                  themeColor === color.value && styles.colorOptionSelected,
                ]}
                onPress={() => canEditSettings && setThemeColor(color.value)}
                disabled={!canEditSettings}
              >
                {themeColor === color.value && (
                  <Text style={styles.colorCheckmark}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Location & Privacy */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>LOCATION & PRIVACY</Text>
          
          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => router.push(`/geofencing?familyId=${familyId}` as any)}
          >
            <View style={styles.settingIcon}>
              <Text style={styles.iconEmoji}>🗺️</Text>
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>Geofencing</Text>
              <Text style={styles.settingSubtitle}>Manage location-based alerts</Text>
            </View>
            <Text style={styles.settingArrow}>›</Text>
          </TouchableOpacity>

          <View style={styles.settingItem}>
            <View style={styles.settingIcon}>
              <Text style={styles.iconEmoji}>👻</Text>
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>Ghost Mode</Text>
              <Text style={styles.settingSubtitle}>
                {ghostMode ? 'Location hidden from all families' : 'Location visible to families'}
              </Text>
            </View>
            <Switch
              value={ghostMode}
              onValueChange={handleGhostModeToggle}
              trackColor={{ false: '#D1D5DB', true: '#86EFAC' }}
              thumbColor={ghostMode ? '#059669' : '#F3F4F6'}
              ios_backgroundColor="#D1D5DB"
            />
          </View>
        </View>

        {/* Danger Zone */}
        {canEditSettings && (
          <View style={styles.dangerZone}>
            <Text style={styles.dangerZoneTitle}>⚠️ DANGER ZONE</Text>
            <Text style={styles.dangerZoneText}>
              Once you delete a family, there is no going back. All members will be removed and all data will be permanently deleted.
            </Text>
            <TouchableOpacity
              style={styles.deleteFamilyButton}
              onPress={handleDeleteFamily}
            >
              <Text style={styles.deleteFamilyButtonText}>Delete "{selectedFamily?.name}"</Text>
            </TouchableOpacity>
          </View>
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
    saveText: {
      fontSize: 16,
      color: '#053326',
      fontWeight: '600',
    },

    // Content
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: theme.spacing.lg,
    },

    // Warning
    warningCard: {
      backgroundColor: '#FEF3C7',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#FCD34D',
      padding: theme.spacing.md,
      marginBottom: theme.spacing.lg,
      flexDirection: 'row',
      gap: theme.spacing.sm,
    },
    warningIcon: {
      fontSize: 24,
    },
    warningText: {
      flex: 1,
      fontSize: 14,
      color: '#92400E',
      lineHeight: 20,
    },

    // Sections
    section: {
      marginBottom: theme.spacing.xl,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: '600',
      color: '#666666',
      marginBottom: theme.spacing.md,
      letterSpacing: 1,
    },

    // Form
    formGroup: {
      marginBottom: theme.spacing.md,
    },
    label: {
      fontSize: 14,
      fontWeight: '500',
      color: '#000000',
      marginBottom: theme.spacing.sm,
    },
    input: {
      backgroundColor: '#F5F5F5',
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#E5E5E5',
      padding: theme.spacing.md,
      fontSize: 16,
      color: '#000000',
    },
    inputDisabled: {
      backgroundColor: '#F9FAFB',
      color: '#9CA3AF',
    },

    // Color Picker
    colorGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.md,
    },
    colorOption: {
      width: 60,
      height: 60,
      borderRadius: 30,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 3,
      borderColor: 'transparent',
    },
    colorOptionSelected: {
      borderColor: '#053326',
    },
    colorCheckmark: {
      fontSize: 24,
      color: '#FFFFFF',
      fontWeight: '700',
    },

    // Settings Items
    settingItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#FFFFFF',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#E5E5E5',
      padding: theme.spacing.md,
      marginBottom: theme.spacing.sm,
    },
    settingIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: '#F5F5F5',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: theme.spacing.md,
    },
    iconEmoji: {
      fontSize: 20,
    },
    settingContent: {
      flex: 1,
    },
    settingTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: '#000000',
      marginBottom: 2,
    },
    settingSubtitle: {
      fontSize: 13,
      color: '#666666',
    },
    settingArrow: {
      fontSize: 24,
      color: '#999999',
    },

    // Danger Zone
    dangerZone: {
      marginTop: theme.spacing.xl * 2,
      backgroundColor: '#FEF2F2',
      borderRadius: 12,
      borderWidth: 2,
      borderColor: '#FCA5A5',
      padding: theme.spacing.lg,
    },
    dangerZoneTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: '#DC2626',
      marginBottom: theme.spacing.sm,
      letterSpacing: 1,
    },
    dangerZoneText: {
      fontSize: 14,
      color: '#7F1D1D',
      lineHeight: 20,
      marginBottom: theme.spacing.lg,
    },
    deleteFamilyButton: {
      backgroundColor: '#DC2626',
      borderRadius: 8,
      paddingVertical: theme.spacing.md,
      alignItems: 'center',
    },
    deleteFamilyButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
  });

