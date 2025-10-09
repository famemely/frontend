/**
 * JoinFamilyModal - Modal for joining a family using an invite code
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
} from 'react-native';
import { useColorScheme } from 'react-native';
import { lightTheme, darkTheme } from '@/constants/theme';
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
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;
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
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={styles.backdrop}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Join a Family</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View style={styles.content}>
            <View style={styles.iconContainer}>
              <Text style={styles.icon}>🎟️</Text>
            </View>

            <Text style={styles.description}>
              Enter the invitation code you received to join a family
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Enter invitation code"
              placeholderTextColor={theme.colors.placeholder}
              value={inviteCode}
              onChangeText={setInviteCode}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={20}
            />

            <Text style={styles.hint}>
              💡 Tip: The code was shared with you by a family member
            </Text>

            {/* Join Button */}
            <TouchableOpacity
              style={[
                styles.joinButton,
                { backgroundColor: theme.colors.primary },
                loading && styles.joinButtonDisabled,
              ]}
              onPress={handleJoin}
              disabled={loading}
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
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.xl,
      width: '100%',
      maxWidth: 400,
      overflow: 'hidden',
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
      fontSize: 20,
      fontWeight: '600',
      color: theme.colors.text,
    },
    closeButton: {
      padding: theme.spacing.sm,
    },
    closeButtonText: {
      fontSize: 24,
      color: theme.colors.textSecondary,
    },
    content: {
      padding: theme.spacing.xl,
    },
    iconContainer: {
      alignItems: 'center',
      marginBottom: theme.spacing.md,
    },
    icon: {
      fontSize: 64,
    },
    description: {
      fontSize: 16,
      color: theme.colors.text,
      textAlign: 'center',
      marginBottom: theme.spacing.xl,
      lineHeight: 24,
    },
    input: {
      backgroundColor: theme.colors.background,
      borderWidth: 2,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.md,
      fontSize: 18,
      color: theme.colors.text,
      textAlign: 'center',
      fontWeight: '600',
      letterSpacing: 2,
      textTransform: 'uppercase',
    },
    hint: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginTop: theme.spacing.md,
      marginBottom: theme.spacing.xl,
      fontStyle: 'italic',
    },
    joinButton: {
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.xl,
      borderRadius: theme.borderRadius.md,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: theme.spacing.md,
    },
    joinButtonDisabled: {
      opacity: 0.6,
    },
    joinButtonText: {
      color: '#FFFFFF',
      fontSize: 18,
      fontWeight: '600',
    },
    cancelButton: {
      paddingVertical: theme.spacing.sm,
      alignItems: 'center',
    },
    cancelButtonText: {
      fontSize: 16,
      color: theme.colors.textSecondary,
    },
  });
