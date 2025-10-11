/**
 * Location Settings Screen
 * Configure accuracy, update frequency, and battery optimization
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
import backgroundLocationService, { TrackingMode } from '@/services/background-location.service';

type AccuracyLevel = 'high' | 'balanced' | 'low';
type UpdateFrequency = 'realtime' | 'balanced' | 'power_saver';

export default function LocationSettingsScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  
  const [accuracy, setAccuracy] = useState<AccuracyLevel>('balanced');
  const [frequency, setFrequency] = useState<UpdateFrequency>('balanced');
  const [batteryOptimization, setBatteryOptimization] = useState(true);
  const [pauseWhenStationary, setPauseWhenStationary] = useState(true);
  const [loading, setLoading] = useState(false);

  const styles = createStyles(theme);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      // TODO: Load actual settings from backgroundLocationService
    } catch (error) {
      console.error('Failed to load location settings:', error);
    }
  };

  const handleAccuracyChange = (level: AccuracyLevel) => {
    setAccuracy(level);
    // TODO: Update location service
  };

  const handleFrequencyChange = (freq: UpdateFrequency) => {
    setFrequency(freq);
    // TODO: Update location service
  };

  const handleBatteryOptimization = async (value: boolean) => {
    setBatteryOptimization(value);
    Alert.alert(
      'Battery Optimization',
      value
        ? 'Location tracking will reduce frequency when battery is low'
        : 'Location tracking will continue normally regardless of battery level',
      [{ text: 'OK' }]
    );
    // TODO: Update location service
  };

  const handleSaveSettings = async () => {
    setLoading(true);
    try {
      // Convert settings to tracking mode
      let mode: TrackingMode = 'balanced';
      if (accuracy === 'high' && frequency === 'realtime') {
        mode = 'high';
      } else if (accuracy === 'low' || frequency === 'power_saver') {
        mode = 'power_saver';
      }

      // TODO: Save to location service
      Alert.alert('Success', 'Location settings updated');
      router.back();
    } catch (error) {
      Alert.alert('Error', 'Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const getAccuracyDescription = (level: AccuracyLevel) => {
    switch (level) {
      case 'high':
        return '±5 meters • Uses more battery';
      case 'balanced':
        return '±10-50 meters • Recommended';
      case 'low':
        return '±100+ meters • Saves battery';
    }
  };

  const getFrequencyDescription = (freq: UpdateFrequency) => {
    switch (freq) {
      case 'realtime':
        return 'Every 5 seconds • High battery usage';
      case 'balanced':
        return 'Every 30 seconds • Recommended';
      case 'power_saver':
        return 'Every 2 minutes • Low battery usage';
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Location Settings</Text>
        <TouchableOpacity style={styles.saveButton} onPress={handleSaveSettings} disabled={loading}>
          <Text style={styles.saveButtonText}>Save</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Info Section */}
        <View style={styles.infoSection}>
          <Text style={styles.infoIcon}>📍</Text>
          <Text style={styles.infoTitle}>Location Tracking</Text>
          <Text style={styles.infoText}>
            Configure how accurately and frequently your location is tracked and shared with family
            members.
          </Text>
        </View>

        {/* Accuracy Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location Accuracy</Text>
          <View style={styles.sectionContent}>
            <TouchableOpacity
              style={[styles.option, accuracy === 'high' && styles.optionSelected]}
              onPress={() => handleAccuracyChange('high')}
            >
              <View style={styles.optionLeft}>
                <View style={styles.radioOuter}>
                  {accuracy === 'high' && <View style={styles.radioInner} />}
                </View>
                <View style={styles.optionText}>
                  <Text style={styles.optionLabel}>High Precision</Text>
                  <Text style={styles.optionDescription}>{getAccuracyDescription('high')}</Text>
                </View>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.option, styles.optionBorder, accuracy === 'balanced' && styles.optionSelected]}
              onPress={() => handleAccuracyChange('balanced')}
            >
              <View style={styles.optionLeft}>
                <View style={styles.radioOuter}>
                  {accuracy === 'balanced' && <View style={styles.radioInner} />}
                </View>
                <View style={styles.optionText}>
                  <Text style={styles.optionLabel}>Balanced</Text>
                  <Text style={styles.optionDescription}>{getAccuracyDescription('balanced')}</Text>
                </View>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.option, styles.optionBorder, accuracy === 'low' && styles.optionSelected]}
              onPress={() => handleAccuracyChange('low')}
            >
              <View style={styles.optionLeft}>
                <View style={styles.radioOuter}>
                  {accuracy === 'low' && <View style={styles.radioInner} />}
                </View>
                <View style={styles.optionText}>
                  <Text style={styles.optionLabel}>Battery Saver</Text>
                  <Text style={styles.optionDescription}>{getAccuracyDescription('low')}</Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Update Frequency */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Update Frequency</Text>
          <View style={styles.sectionContent}>
            <TouchableOpacity
              style={[styles.option, frequency === 'realtime' && styles.optionSelected]}
              onPress={() => handleFrequencyChange('realtime')}
            >
              <View style={styles.optionLeft}>
                <View style={styles.radioOuter}>
                  {frequency === 'realtime' && <View style={styles.radioInner} />}
                </View>
                <View style={styles.optionText}>
                  <Text style={styles.optionLabel}>Real-time</Text>
                  <Text style={styles.optionDescription}>{getFrequencyDescription('realtime')}</Text>
                </View>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.option, styles.optionBorder, frequency === 'balanced' && styles.optionSelected]}
              onPress={() => handleFrequencyChange('balanced')}
            >
              <View style={styles.optionLeft}>
                <View style={styles.radioOuter}>
                  {frequency === 'balanced' && <View style={styles.radioInner} />}
                </View>
                <View style={styles.optionText}>
                  <Text style={styles.optionLabel}>Balanced</Text>
                  <Text style={styles.optionDescription}>{getFrequencyDescription('balanced')}</Text>
                </View>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.option, styles.optionBorder, frequency === 'power_saver' && styles.optionSelected]}
              onPress={() => handleFrequencyChange('power_saver')}
            >
              <View style={styles.optionLeft}>
                <View style={styles.radioOuter}>
                  {frequency === 'power_saver' && <View style={styles.radioInner} />}
                </View>
                <View style={styles.optionText}>
                  <Text style={styles.optionLabel}>Power Saver</Text>
                  <Text style={styles.optionDescription}>{getFrequencyDescription('power_saver')}</Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Battery Optimization */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Battery Management</Text>
          <View style={styles.sectionContent}>
            <View style={[styles.item, styles.itemBorder]}>
              <View style={styles.itemLeft}>
                <Text style={styles.itemLabel}>Smart Battery Optimization</Text>
                <Text style={styles.itemDescription}>
                  Reduce tracking frequency when battery is low
                </Text>
              </View>
              <Switch
                value={batteryOptimization}
                onValueChange={handleBatteryOptimization}
                trackColor={{ false: '#E5E5E5', true: '#053326' }}
                thumbColor="#FFFFFF"
                ios_backgroundColor="#E5E5E5"
              />
            </View>

            <View style={styles.item}>
              <View style={styles.itemLeft}>
                <Text style={styles.itemLabel}>Pause When Stationary</Text>
                <Text style={styles.itemDescription}>
                  Stop updates when you haven't moved for 5 minutes
                </Text>
              </View>
              <Switch
                value={pauseWhenStationary}
                onValueChange={setPauseWhenStationary}
                trackColor={{ false: '#E5E5E5', true: '#053326' }}
                thumbColor="#FFFFFF"
                ios_backgroundColor="#E5E5E5"
              />
            </View>
          </View>
        </View>

        {/* Battery Impact */}
        <View style={styles.section}>
          <View style={styles.impactCard}>
            <Text style={styles.impactLabel}>Estimated Battery Impact</Text>
            <Text style={styles.impactValue}>
              {accuracy === 'high' || frequency === 'realtime' ? 'High' : 
               accuracy === 'low' || frequency === 'power_saver' ? 'Low' : 'Medium'}
            </Text>
            <Text style={styles.impactDescription}>
              Based on your current settings
            </Text>
          </View>
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
    saveButton: {
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    saveButtonText: {
      fontSize: 16,
      color: '#053326',
      fontWeight: '600',
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

    // Radio Options
    option: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.md,
    },
    optionBorder: {
      borderTopWidth: 1,
      borderTopColor: '#F5F5F5',
    },
    optionSelected: {
      backgroundColor: '#F0FDF4',
    },
    optionLeft: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    radioOuter: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: '#053326',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: theme.spacing.md,
    },
    radioInner: {
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: '#053326',
    },
    optionText: {
      flex: 1,
    },
    optionLabel: {
      fontSize: 16,
      color: '#000000',
      fontWeight: '500',
      marginBottom: 4,
    },
    optionDescription: {
      fontSize: 13,
      color: '#666666',
    },

    // Switch Items
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

    // Impact Card
    impactCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#E5E5E5',
      padding: theme.spacing.lg,
      alignItems: 'center',
    },
    impactLabel: {
      fontSize: 13,
      color: '#666666',
      marginBottom: theme.spacing.sm,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      fontWeight: '600',
    },
    impactValue: {
      fontSize: 24,
      color: '#053326',
      fontWeight: '600',
      marginBottom: theme.spacing.sm,
    },
    impactDescription: {
      fontSize: 14,
      color: '#666666',
      textAlign: 'center',
    },
  });
