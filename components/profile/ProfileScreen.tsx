/**
 * Profile Screen
 * User profile management with elegant design
 */

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Platform,
  Alert,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/services/supabase.client';
import { userProfileService } from '@/services/user-profile.service';

export default function ProfileScreen() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();

  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [email, setEmail] = useState(user?.email || '');

  const styles = createStyles(theme);

  const handleSave = () => {
    Alert.alert('Success', 'Profile updated successfully');
    setEditing(false);
  };

  const profileSections = [
    {
      title: 'Account Information',
      items: [
        { label: 'Email', value: email, editable: false, type: 'text' as const },
        { label: 'Full Name', value: fullName, editable: true, type: 'text' as const },
      ],
    },
  ];

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // could refetch profile here if wired
    setTimeout(() => setRefreshing(false), 600);
  }, []);

  const handlePickAvatar = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Not supported on web', 'Avatar picking requires a native device/emulator.');
      return;
    }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== 'granted') {
      Alert.alert('Permission required', 'Please allow photo library access.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
    if (res.canceled || !res.assets?.length) return;
    const asset = res.assets[0];
    try {
      const uri = asset.uri;
      const name = `${user?.id}-${Date.now()}.jpg`;
      const file = await fetch(uri).then(r => r.blob());
      const { data, error } = await supabase.storage.from('avatars').upload(name, file, {
        contentType: 'image/jpeg',
        upsert: true,
      });
      if (error) throw error;
      const { data: pub } = supabase.storage.from('avatars').getPublicUrl(name);
      // Persist avatar_url to profile
      if (user?.id && pub?.publicUrl) {
        await userProfileService.updateUserProfile(user.id, { avatar_url: pub.publicUrl });
      }
      Alert.alert('Success', 'Avatar updated');
    } catch (e: any) {
      Alert.alert('Upload failed', e.message || 'Could not upload avatar');
    }
  };

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
        
        <Text style={styles.headerTitle}>My Profile</Text>
        
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => editing ? handleSave() : setEditing(true)}
        >
          <Text style={styles.editText}>{editing ? 'Save' : 'Edit'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Profile Avatar */}
        <View style={styles.avatarSection}>
          <TouchableOpacity style={styles.avatar} onPress={handlePickAvatar} activeOpacity={0.8}>
            <Text style={styles.avatarText}>
              {(user?.fullName || user?.email || 'U')[0].toUpperCase()}
            </Text>
          </TouchableOpacity>
          <Text style={styles.userName}>{user?.fullName || 'User'}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
        </View>

        {/* Profile Sections */}
        {profileSections.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionContent}>
              {section.items.map((item, itemIndex) => (
                <TouchableOpacity
                  key={itemIndex}
                  style={[
                    styles.item,
                    itemIndex === section.items.length - 1 && styles.itemLast,
                  ]}
                  onPress={undefined}
                  disabled={true}
                  activeOpacity={1}
                >
                  <Text style={styles.itemLabel}>{item.label}</Text>
                  
                  {editing && item.editable && item.type === 'text' ? (
                    <TextInput
                      style={styles.itemInput}
                      value={item.label === 'Full Name' ? fullName : String(item.value)}
                      onChangeText={item.label === 'Full Name' ? setFullName : undefined}
                      placeholder={item.label}
                    />
                  ) : (
                    <View style={styles.itemRight}>
                      <Text style={styles.itemValue}>{item.value}</Text>
                      {/* No navigate arrow for plain text items */}
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* Danger Zone */}
        <View style={styles.dangerZone}>
          <Text style={styles.sectionTitle}>Danger Zone</Text>
          <TouchableOpacity
            style={styles.dangerButton}
            onPress={() => router.push('/settings/delete-account' as any)}
          >
            <Text style={styles.dangerButtonText}>Delete Account</Text>
          </TouchableOpacity>
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
    editButton: {
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    editText: {
      fontSize: 16,
      color: '#053326',
      fontWeight: '500',
    },

    // Content
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: 40,
    },

    // Avatar Section
    avatarSection: {
      alignItems: 'center',
      paddingVertical: theme.spacing.xl,
      backgroundColor: '#FFFFFF',
      borderBottomWidth: 1,
      borderBottomColor: '#E5E5E5',
    },
    avatar: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: '#053326',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: theme.spacing.md,
    },
    avatarText: {
      fontSize: 40,
      color: '#FFFFFF',
      fontWeight: '600',
    },
    userName: {
      fontSize: 24,
      fontWeight: '600',
      color: '#000000',
      marginBottom: 4,
    },
    userEmail: {
      fontSize: 14,
      color: '#666666',
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
    item: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: '#F5F5F5',
      gap: theme.spacing.md,
    },
    itemLast: {
      borderBottomWidth: 0,
    },
    itemLabel: {
      fontSize: 16,
      color: '#000000',
      fontWeight: '400',
      flex: 1,
      flexShrink: 1,
    },
    itemRight: {
      flexDirection: 'row',
      alignItems: 'center',
      flexShrink: 0,
      maxWidth: '60%',
    },
    itemValue: {
      fontSize: 16,
      color: '#666666',
      fontWeight: '400',
      textAlign: 'right',
      flexShrink: 1,
    },
    itemArrow: {
      fontSize: 24,
      color: '#999999',
      marginLeft: 8,
    },
    itemInput: {
      flex: 1,
      textAlign: 'right',
      fontSize: 16,
      color: '#000000',
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 8,
      backgroundColor: '#FAFAFA',
      borderRadius: 6,
      borderWidth: 1,
      borderColor: '#E5E5E5',
      marginLeft: theme.spacing.md,
    },

    // Danger Zone
    dangerZone: {
      marginTop: theme.spacing.xl,
      paddingHorizontal: theme.spacing.lg,
    },
    dangerButton: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: '#DC2626',
      borderRadius: 8,
      padding: theme.spacing.md,
      alignItems: 'center',
    },
    dangerButtonText: {
      color: '#DC2626',
      fontSize: 16,
      fontWeight: '500',
    },
  });
