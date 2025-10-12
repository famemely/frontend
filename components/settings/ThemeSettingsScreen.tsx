/**
 * Theme Settings Screen
 * Control app theme (Light, Dark, Auto)
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_OPTIONS = [
  { value: 'light', label: 'Light', icon: '☀️', description: 'Always use light theme' },
  { value: 'dark', label: 'Dark', icon: '🌙', description: 'Always use dark theme' },
  { value: 'auto', label: 'Auto', icon: '🔄', description: 'Follow system theme' },
] as const;

type ThemeMode = typeof THEME_OPTIONS[number]['value'];

export default function ThemeSettingsScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  
  const [selectedTheme, setSelectedTheme] = useState<ThemeMode>('auto');

  const styles = createStyles(theme);

  useEffect(() => {
    loadThemePreference();
  }, []);

  const loadThemePreference = async () => {
    try {
      const saved = await AsyncStorage.getItem('@theme_preference');
      if (saved && (saved === 'light' || saved === 'dark' || saved === 'auto')) {
        setSelectedTheme(saved);
      }
    } catch (error) {
      console.error('Failed to load theme preference:', error);
    }
  };

  const handleThemeChange = async (themeMode: ThemeMode) => {
    try {
      await AsyncStorage.setItem('@theme_preference', themeMode);
      setSelectedTheme(themeMode);
      
      // TODO: Actually switch the theme via ThemeContext
      // This requires updating ThemeContext to support theme switching
    } catch (error) {
      console.error('Failed to save theme preference:', error);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Theme Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Info Card */}
        <View style={styles.infoCard}>
          <Text style={styles.infoText}>
            Choose how Famemely looks. Auto mode will automatically switch between light and dark themes based on your device settings.
          </Text>
        </View>

        {/* Theme Options */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>APPEARANCE</Text>
          
          {THEME_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.themeOption,
                selectedTheme === option.value && styles.themeOptionActive,
              ]}
              onPress={() => handleThemeChange(option.value)}
            >
              <View style={styles.themeOptionContent}>
                <Text style={styles.themeIcon}>{option.icon}</Text>
                <View style={styles.themeTextContainer}>
                  <Text style={styles.themeLabel}>{option.label}</Text>
                  <Text style={styles.themeDescription}>{option.description}</Text>
                </View>
              </View>
              {selectedTheme === option.value && (
                <View style={styles.checkmark}>
                  <Text style={styles.checkmarkText}>✓</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Preview Card */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PREVIEW</Text>
          <View style={styles.previewCard}>
            <Text style={styles.previewTitle}>Current Theme</Text>
            <Text style={styles.previewText}>
              You have selected <Text style={styles.previewHighlight}>{selectedTheme}</Text> mode.
              {selectedTheme === 'auto' && ' The app will automatically adjust based on your system settings.'}
            </Text>
            
            <View style={styles.previewDemo}>
              <View style={styles.previewDemoHeader}>
                <Text style={styles.previewDemoTitle}>Sample Card</Text>
              </View>
              <Text style={styles.previewDemoText}>
                This is how your app will look with the selected theme.
              </Text>
            </View>
          </View>
        </View>

        {/* Note */}
        <View style={styles.noteCard}>
          <Text style={styles.noteIcon}>💡</Text>
          <Text style={styles.noteText}>
            Theme changes will take effect immediately. If you're using Auto mode, the theme will update when your device's appearance changes.
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

    // Section
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

    // Theme Options
    themeOption: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: '#FFFFFF',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#E5E5E5',
      padding: theme.spacing.md,
      marginBottom: theme.spacing.sm,
    },
    themeOptionActive: {
      borderColor: '#053326',
      borderWidth: 2,
      backgroundColor: '#F0FDF4',
    },
    themeOptionContent: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    themeIcon: {
      fontSize: 32,
      marginRight: theme.spacing.md,
    },
    themeTextContainer: {
      flex: 1,
    },
    themeLabel: {
      fontSize: 16,
      fontWeight: '600',
      color: '#000000',
      marginBottom: 2,
    },
    themeDescription: {
      fontSize: 13,
      color: '#666666',
    },
    checkmark: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: '#053326',
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: theme.spacing.sm,
    },
    checkmarkText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '700',
    },

    // Preview
    previewCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#E5E5E5',
      padding: theme.spacing.lg,
    },
    previewTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: '#000000',
      marginBottom: theme.spacing.sm,
    },
    previewText: {
      fontSize: 14,
      color: '#666666',
      lineHeight: 20,
      marginBottom: theme.spacing.md,
    },
    previewHighlight: {
      fontWeight: '600',
      color: '#053326',
    },
    previewDemo: {
      backgroundColor: '#F5F5F5',
      borderRadius: 8,
      padding: theme.spacing.md,
      borderWidth: 1,
      borderColor: '#E5E5E5',
    },
    previewDemoHeader: {
      marginBottom: theme.spacing.sm,
    },
    previewDemoTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: '#000000',
    },
    previewDemoText: {
      fontSize: 13,
      color: '#666666',
      lineHeight: 18,
    },

    // Note
    noteCard: {
      flexDirection: 'row',
      backgroundColor: '#FEF3C7',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#FCD34D',
      padding: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    noteIcon: {
      fontSize: 20,
    },
    noteText: {
      flex: 1,
      fontSize: 13,
      color: '#92400E',
      lineHeight: 18,
    },
  });
