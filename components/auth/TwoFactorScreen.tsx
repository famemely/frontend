import React, { useState, useEffect } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native'
import { useTheme } from '../../contexts/ThemeContext'
import { authService } from '../../services/auth.service'
import QRCode from 'react-native-qrcode-svg'

interface TwoFactorScreenProps {
  onComplete: () => void
  onCancel: () => void
}

export default function TwoFactorScreen({ onComplete, onCancel }: TwoFactorScreenProps) {
  const { theme } = useTheme()
  const colors = theme.colors
  
  const [step, setStep] = useState<'setup' | 'verify' | 'complete'>('setup')
  const [token, setToken] = useState('')
  const [secret, setSecret] = useState('')
  const [qrCode, setQrCode] = useState('')
  const [factorId, setFactorId] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    enableMFA()
  }, [])

  const enableMFA = async () => {
    try {
      setLoading(true)
      const response = await authService.enableMFA()
      
      setSecret(response.secret)
      setQrCode(response.qr_code)
      setFactorId(response.factorId)
    } catch (error) {
      // MFA setup error (suppressed)
      Alert.alert('Error', 'Failed to setup MFA')
      onCancel()
    } finally {
      setLoading(false)
    }
  }

  const verifyToken = async () => {
    if (!token || token.length !== 6) {
      Alert.alert('Error', 'Please enter a 6-digit token')
      return
    }

    try {
      setLoading(true)
      await authService.verifyMFA(factorId, token)
      setStep('complete')
    } catch (error) {
      // MFA verification error (suppressed)
      Alert.alert('Error', 'Invalid token. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const completeSetup = () => {
    Alert.alert(
      'Success',
      'Multi-Factor Authentication has been enabled for your account!',
      [{ text: 'OK', onPress: onComplete }]
    )
  }

  const renderSetupStep = () => (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>
        Set Up Multi-Factor Authentication
      </Text>
      
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Step 1: Scan QR Code
      </Text>
      
      <Text style={[styles.instruction, { color: colors.text }]}>
        Open your authenticator app (Google Authenticator, Authy, etc.) and scan this QR code:
      </Text>

      {qrCode ? (
        <View style={styles.qrContainer}>
          <QRCode
            value={qrCode}
            size={200}
            color={colors.text}
            backgroundColor={colors.background}
            ecl="M"
          />
        </View>
      ) : (
        <View style={[styles.qrContainer, styles.qrPlaceholder, { backgroundColor: colors.surface }]}>
          <Text style={{ color: colors.textSecondary }}>Generating QR Code...</Text>
        </View>
      )}

      <Text style={[styles.instruction, { color: colors.text }]}>
        Or manually enter this key in your authenticator app:
      </Text>
      
      <View style={[styles.secretContainer, { backgroundColor: colors.surface }]}>
        <Text style={[styles.secretText, { color: colors.text }]} selectable>
          {secret}
        </Text>
      </View>

      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Step 2: Enter Verification Code
      </Text>

      <TextInput
        style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
        placeholder="Enter 6-digit code"
        placeholderTextColor={colors.textSecondary}
        value={token}
        onChangeText={setToken}
        keyboardType="numeric"
        maxLength={6}
        autoCapitalize="none"
      />

      <TouchableOpacity
        style={[styles.button, { backgroundColor: colors.primary }]}
        onPress={verifyToken}
        disabled={loading || !token}
      >
        <Text style={[styles.buttonText, { color: colors.background }]}>
          {loading ? 'Verifying...' : 'Verify & Enable MFA'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.cancelButton]}
        onPress={onCancel}
        disabled={loading}
      >
        <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>
          Cancel
        </Text>
      </TouchableOpacity>
    </ScrollView>
  )

  const renderCompleteStep = () => (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>
        MFA Setup Complete! 🎉
      </Text>
      
      <Text style={[styles.instruction, { color: colors.text }]}>
        Your account is now protected with Multi-Factor Authentication using Supabase's secure MFA system.
      </Text>

      <View style={[styles.successContainer, { backgroundColor: colors.surface }]}>
        <Text style={[styles.successText, { color: colors.primary }]}>
          ✓ MFA Successfully Enabled
        </Text>
        <Text style={[styles.successSubtext, { color: colors.textSecondary }]}>
          Your authenticator app will now generate codes for login.
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: colors.primary }]}
        onPress={completeSetup}
      >
        <Text style={[styles.buttonText, { color: colors.background }]}>
          Continue to App
        </Text>
      </TouchableOpacity>
    </ScrollView>
  )

  if (step === 'setup') {
    return renderSetupStep()
  } else if (step === 'complete') {
    return renderCompleteStep()
  }

  return null
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    marginVertical: 15,
  },
  instruction: {
    fontSize: 16,
    marginBottom: 15,
    lineHeight: 22,
  },
  qrContainer: {
    alignItems: 'center',
    marginVertical: 20,
    padding: 20,
  },
  qrPlaceholder: {
    height: 240,
    justifyContent: 'center',
    borderRadius: 10,
  },
  secretContainer: {
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  secretText: {
    fontSize: 14,
    fontFamily: 'monospace',
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
    fontSize: 16,
    textAlign: 'center',
  },
  button: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 15,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    padding: 15,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
  },
  successContainer: {
    padding: 20,
    borderRadius: 8,
    marginVertical: 20,
    alignItems: 'center',
  },
  successText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  successSubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
})