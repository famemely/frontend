/**
 * JoinFamilyModal - Modal for joining a family using an invite code
 * Redesigned to match auth screen aesthetic
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TextInput,
  Platform,
} from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useFamily } from '@/hooks/useFamily';

interface JoinFamilyModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function JoinFamilyModal({
  visible,
  onClose,
  onSuccess,
}: JoinFamilyModalProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  const { joinFamily } = useFamily();

  const [loading, setLoading] = useState(false);
  const [inviteCode, setInviteCode] = useState('');

  const handleJoin = async () => {
    if (!inviteCode.trim()) {
      Alert.alert('Error', 'Please enter an invitation code');
      return;
    }

    setLoading(true);
    try {
      const family = await joinFamily(inviteCode.trim());
      Alert.alert(
        'Success!',
        `You've successfully joined "${family.name}"`,
        [
          {
            text: 'OK',
            onPress: () => {
              setInviteCode('');
              onSuccess?.();
              onClose();
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to join family');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setInviteCode('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={handleClose}>
      <View style={styles.backdrop}>
        <View style={styles.container}>
          {/* Close Button */}
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Text style={styles.closeIcon}>×</Text>
          </TouchableOpacity>

          {/* Icon */}
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>🔗</Text>
          </View>

          {/* Title */}
          <Text style={styles.title}>Join a Family</Text>
          <Text style={styles.subtitle}>
            Enter the invitation code you received from a family member
          </Text>

          {/* Input */}
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="INVITATION CODE"
              placeholderTextColor={theme.colors.placeholder}
              value={inviteCode}
              onChangeText={setInviteCode}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={20}
            />
          </View>

          <Text style={styles.hint}>
            💡 The code is case-sensitive and looks like: ABC123XYZ
          </Text>

          {/* Join Button */}
          <TouchableOpacity
            style={[styles.joinButton, loading && styles.joinButtonDisabled]}
            onPress={handleJoin}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.joinButtonText}>Join Family</Text>
            )}
          </TouchableOpacity>

          {/* Cancel Button */}
          <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: theme.spacing.lg,
    },
    container: {
      backgroundColor: '#FFFFFF',
      borderRadius: 16,
      width: '100%',
      maxWidth: 400,
      padding: theme.spacing.xl,
      position: 'relative',
    },
    closeButton: {
      position: 'absolute',
      top: theme.spacing.md,
      right: theme.spacing.md,
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 10,
    },
    closeIcon: {
      fontSize: 32,
      color: '#053326',
      fontWeight: '300',
    },
    iconContainer: {
      alignItems: 'center',
      marginTop: theme.spacing.lg,
      marginBottom: theme.spacing.md,
    },
    icon: {
      fontSize: 72,
    },
    title: {
      fontSize: 28,
      fontWeight: '600',
      color: '#000000',
      textAlign: 'center',
      marginBottom: theme.spacing.sm,
      letterSpacing: 0.3,
    },
    subtitle: {
      fontSize: 14,
      color: '#666666',
      textAlign: 'center',
      marginBottom: theme.spacing.xl,
      lineHeight: 20,
      opacity: 0.8,
      fontWeight: '400',
    },
    inputWrapper: {
      marginBottom: theme.spacing.md,
    },
    input: {
      backgroundColor: '#FFFFFF',
      borderColor: '#053326',
      borderWidth: 1,
      borderRadius: 6,
      padding: theme.spacing.md,
      fontSize: 18,
      color: '#000000',
      textAlign: 'center',
      fontWeight: '600',
      letterSpacing: 2,
      textTransform: 'uppercase',
    },
    hint: {
      fontSize: 12,
      color: '#666666',
      textAlign: 'center',
      marginBottom: theme.spacing.xl,
      opacity: 0.7,
      fontWeight: '400',
    },
    joinButton: {
      backgroundColor: '#053326',
      borderRadius: 8,
      padding: theme.spacing.md + 2,
      alignItems: 'center',
      marginBottom: theme.spacing.md,
    },
    joinButtonDisabled: {
      opacity: 0.6,
    },
    joinButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '500',
      letterSpacing: 0.3,
    },
    cancelButton: {
      backgroundColor: 'transparent',
      borderColor: '#053326',
      borderWidth: 1,
      borderRadius: 8,
      padding: theme.spacing.md,
      alignItems: 'center',
    },
    cancelButtonText: {
      color: '#053326',
      fontSize: 16,
      fontWeight: '500',
    },
  });
