/**
 * Ghost Mode Configuration Screen
 * Supports both global and per-family ghost mode
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Platform,
  Alert,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useFamily } from '@/hooks/useFamily';
import backgroundLocationService from '@/services/background-location.service';
import websocketService from '@/services/websocket.service';

export default function GhostModeScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { families } = useFamily();
  
  const [globalEnabled, setGlobalEnabled] = useState(false);
  const [perFamilyMode, setPerFamilyMode] = useState(false);
  const [familyGhostStates, setFamilyGhostStates] = useState<Record<string, boolean>>({});
  const [autoEnableAtNight, setAutoEnableAtNight] = useState(false);
  const [loading, setLoading] = useState(false);

  const styles = createStyles(theme);

  useEffect(() => {
    loadGhostModeStatus();
  }, []);

  const loadGhostModeStatus = async () => {
    try {
      const status = await backgroundLocationService.getGhostMode();
      setGlobalEnabled(status);
      
      // Load per-family settings from local storage if needed
      // TODO: Integrate with backend for persistent per-family ghost mode
    } catch (error) {
      console.error('Failed to load ghost mode status:', error);
    }
  };

  const handleToggleGlobal = async (value: boolean) => {
    setLoading(true);
    try {
      await backgroundLocationService.setGhostMode(value);
      setGlobalEnabled(value);
      
      // Notify backend via WebSocket
      if (websocketService.isConnected()) {
        await websocketService.setGhostMode({
          enabled: value,
          scope: 'global',
        });
      }
      
      if (value) {
        Alert.alert(
          'Global Ghost Mode Enabled',
          'Your location is now hidden from ALL family members across all families.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Global Ghost Mode Disabled',
          perFamilyMode
            ? 'Global ghost mode is off. Per-family settings still apply.'
            : 'Your location is now visible to all family members.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update ghost mode setting');
      console.error('Ghost mode toggle error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePerFamily = async (familyId: string, value: boolean) => {
    setFamilyGhostStates(prev => ({
      ...prev,
      [familyId]: value,
    }));
    
    // Notify backend via WebSocket
    if (websocketService.isConnected()) {
      try {
        await websocketService.setGhostMode({
          enabled: value,
          scope: 'family',
          family_id: familyId,
        });
      } catch (error) {
        console.error('Failed to update family ghost mode:', error);
      }
    }
    
    const familyName = families?.find(f => f.id === familyId)?.name || 'this family';
    if (value) {
      Alert.alert('Hidden', `Your location is now hidden from ${familyName}`);
    } else {
      Alert.alert('Visible', `Your location is now visible to ${familyName}`);
    }
  };

  const isHiddenFromFamily = (familyId: string) => {
    if (globalEnabled) return true; // Global overrides
    return familyGhostStates[familyId] || false;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ghost Mode</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Info Section */}
        <View style={styles.infoSection}>
          <Text style={styles.infoIcon}>👻</Text>
          <Text style={styles.infoTitle}>Hide Your Location</Text>
          <Text style={styles.infoText}>
            Ghost Mode hides your real-time location from family members while still allowing you
            to see theirs. Use this when you need privacy.
          </Text>
        </View>

        {/* Global Enable Toggle */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Global Settings</Text>
          <View style={styles.sectionContent}>
            <View style={styles.item}>
              <View style={styles.itemLeft}>
                <Text style={styles.itemLabel}>Hide from All Families</Text>
                <Text style={styles.itemDescription}>Override all per-family settings</Text>
              </View>
              <Switch
                value={globalEnabled}
                onValueChange={handleToggleGlobal}
                disabled={loading}
                trackColor={{ false: '#E5E5E5', true: '#053326' }}
                thumbColor="#FFFFFF"
                ios_backgroundColor="#E5E5E5"
              />
            </View>
          </View>
        </View>

        {/* Per-Family Settings */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Per-Family Ghost Mode</Text>
            <Switch
              value={perFamilyMode}
              onValueChange={setPerFamilyMode}
              disabled={globalEnabled}
              trackColor={{ false: '#E5E5E5', true: '#053326' }}
              thumbColor="#FFFFFF"
              ios_backgroundColor="#E5E5E5"
            />
          </View>
          
          {perFamilyMode && !globalEnabled && (
            <View style={styles.sectionContent}>
              {families && families.length > 0 ? (
                families.map((family, index) => (
                  <View
                    key={family.id}
                    style={[
                      styles.item,
                      index < families.length - 1 && styles.itemBorder,
                    ]}
                  >
                    <View style={styles.itemLeft}>
                      <Text style={styles.itemLabel}>{family.name}</Text>
                      <Text style={styles.itemDescription}>
                        {family.member_count || family.members?.length || 0} members
                      </Text>
                    </View>
                    <Switch
                      value={isHiddenFromFamily(family.id)}
                      onValueChange={(value) => handleTogglePerFamily(family.id, value)}
                      trackColor={{ false: '#E5E5E5', true: '#053326' }}
                      thumbColor="#FFFFFF"
                      ios_backgroundColor="#E5E5E5"
                    />
                  </View>
                ))
              ) : (
                <Text style={styles.emptyText}>No families to configure</Text>
              )}
            </View>
          )}
          
          {globalEnabled && (
            <Text style={styles.helperText}>
              💡 Global ghost mode is enabled. Disable it to configure per-family settings.
            </Text>
          )}
        </View>

        {/* Advanced Options */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Advanced Options</Text>
          <View style={styles.sectionContent}>
            <View style={styles.item}>
              <View style={styles.itemLeft}>
                <Text style={styles.itemLabel}>Auto-enable at Night</Text>
                <Text style={styles.itemDescription}>
                  Automatically enable between 10 PM - 7 AM
                </Text>
              </View>
              <Switch
                value={autoEnableAtNight}
                onValueChange={setAutoEnableAtNight}
                trackColor={{ false: '#E5E5E5', true: '#053326' }}
                thumbColor="#FFFFFF"
                ios_backgroundColor="#E5E5E5"
              />
            </View>
          </View>
        </View>

        {/* Status Summary */}
        <View style={styles.statusSection}>
          <Text style={styles.statusTitle}>Current Status</Text>
          <View style={styles.statusItem}>
            <Text style={styles.statusLabel}>Global Ghost Mode:</Text>
            <Text style={[styles.statusValue, globalEnabled && styles.statusActive]}>
              {globalEnabled ? '🔒 Hidden from All' : '📍 Not Active'}
            </Text>
          </View>
          {perFamilyMode && !globalEnabled && (
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>Per-Family Mode:</Text>
              <Text style={styles.statusValue}>
                {Object.values(familyGhostStates).filter(Boolean).length} of {families?.length || 0} families hidden
              </Text>
            </View>
          )}
          <Text style={styles.statusDescription}>
            {globalEnabled
              ? 'Your location is hidden from ALL family members.'
              : perFamilyMode
              ? 'Your visibility varies by family.'
              : 'Your location is visible to all family members.'}
          </Text>
        </View>

        {/* Warning */}
        <View style={styles.warningSection}>
          <Text style={styles.warningText}>
            ⚠️ Note: Family members will see a 👻 indicator when you've enabled Ghost Mode. This feature is for privacy, not deception.
          </Text>
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
    headerTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: '#000000',
    },
    placeholder: {
      width: 40,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: 40,
    },

    // Info Section
    infoSection: {
      alignItems: 'center',
      paddingVertical: theme.spacing.xl,
      paddingHorizontal: theme.spacing.lg,
      backgroundColor: '#FFFFFF',
      borderBottomWidth: 1,
      borderBottomColor: '#E5E5E5',
    },
    infoIcon: {
      fontSize: 64,
      marginBottom: theme.spacing.md,
    },
    infoTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: '#000000',
      marginBottom: theme.spacing.sm,
    },
    infoText: {
      fontSize: 14,
      color: '#666666',
      textAlign: 'center',
      lineHeight: 20,
    },

    // Sections
    section: {
      marginTop: theme.spacing.lg,
      paddingHorizontal: theme.spacing.lg,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.sm,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: '600',
      color: '#666666',
      marginBottom: theme.spacing.sm,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    sectionContent: {
      backgroundColor: '#FFFFFF',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#E5E5E5',
      overflow: 'hidden',
    },
    item: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.md,
    },
    itemBorder: {
      borderBottomWidth: 1,
      borderBottomColor: '#F5F5F5',
    },
    itemLeft: {
      flex: 1,
      marginRight: theme.spacing.md,
    },
    itemLabel: {
      fontSize: 16,
      color: '#000000',
      fontWeight: '500',
      marginBottom: 4,
    },
    itemDescription: {
      fontSize: 13,
      color: '#666666',
    },
    disabledText: {
      opacity: 0.4,
    },
    emptyText: {
      fontSize: 14,
      color: '#999999',
      textAlign: 'center',
      padding: theme.spacing.lg,
    },
    helperText: {
      fontSize: 12,
      color: '#666666',
      marginTop: theme.spacing.sm,
      fontStyle: 'italic',
    },

    // Status Section
    statusSection: {
      marginTop: theme.spacing.lg,
      paddingHorizontal: theme.spacing.lg,
    },
    statusTitle: {
      fontSize: 13,
      fontWeight: '600',
      color: '#666666',
      marginBottom: theme.spacing.md,
      letterSpacing: 0.5,
    },
    statusItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: theme.spacing.sm,
    },
    statusCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#E5E5E5',
      padding: theme.spacing.lg,
      alignItems: 'center',
    },
    statusLabel: {
      fontSize: 13,
      color: '#666666',
      marginBottom: theme.spacing.sm,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      fontWeight: '600',
    },
    statusValue: {
      fontSize: 18,
      color: '#666666',
      fontWeight: '600',
    },
    statusActive: {
      color: '#053326',
    },
    statusDescription: {
      fontSize: 13,
      color: '#666666',
      textAlign: 'center',
      marginTop: theme.spacing.sm,
    },

    // Warning
    warningSection: {
      marginTop: theme.spacing.lg,
      paddingHorizontal: theme.spacing.lg,
    },
    warningText: {
      fontSize: 13,
      color: '#DC2626',
      textAlign: 'center',
      lineHeight: 18,
      padding: theme.spacing.md,
      backgroundColor: '#FEE2E2',
      borderRadius: 8,
    },
  });
