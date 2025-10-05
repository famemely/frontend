import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { signInWithGoogleNative, configureGoogleSignIn } from '@/services/google-native.service';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { lightTheme, darkTheme } from '@/constants/theme';
import { authService } from '@/services/auth.service';
import { EmailLoginData, EmailSignupData } from '@/types/auth.types';
import { AUTH_CONFIG } from '@/constants/auth.config';

// This is required for OAuth to work properly in Expo
WebBrowser.maybeCompleteAuthSession();

interface AuthScreenProps {
  onAuthSuccess: () => void;
}

export default function AuthScreen({ onAuthSuccess }: AuthScreenProps) {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;
  
  const [isLogin, setIsLogin] = useState(true);
  // children/under-13 flows removed — always use standard signup with date of birth
  const [loading, setLoading] = useState(false);
  const [showMFAModal, setShowMFAModal] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  
  // Form data
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [username, setUsername] = useState('');
  const [age, setAge] = useState(''); // kept for compatibility but no separate kids flow
  const [dateOfBirth, setDateOfBirth] = useState('');

  const styles = createStyles(theme);

  useEffect(() => {
    configureGoogleSignIn();
  }, []);

  const handleEmailAuth = async () => {
    if (!email.trim() || !password.trim() || (!isLogin && !fullName.trim())) {
      Alert.alert('Error', 'Please fill in all required fields');
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        const loginData: EmailLoginData = { email, password };
  // Attempting login
        const result = await authService.loginWithEmail(loginData);
  // Login successful, no MFA required
        setLoading(false);
        onAuthSuccess();
      } else {
        const signupData: EmailSignupData = {
          email,
          password,
          fullName,
          phoneNumber: phoneNumber || undefined,
          dateOfBirth: dateOfBirth || undefined,
        };
        await authService.signupWithEmail(signupData);
        setLoading(false);
        Alert.alert('Success', AUTH_CONFIG.SUCCESS.ACCOUNT_CREATED);
        resetForm();
        setIsLogin(true);
      }
    } catch (error: any) {
  // Auth error occurred (details suppressed)
      setLoading(false);
      
      // Check if MFA is required
      if (error.isMFARequired) {
        // Showing MFA verification modal
        setShowMFAModal(true);
        // Don't show alert, just show the modal
      } else {
        Alert.alert('Authentication Error', error instanceof Error ? error.message : 'An error occurred');
      }
    }
  };

  const handleMFAVerification = async () => {
    if (!mfaCode || mfaCode.length !== 6) {
      Alert.alert('Error', 'Please enter a 6-digit code');
      return;
    }

    setLoading(true);
    try {
      await authService.verifyMFALogin(mfaCode);
      setLoading(false);
      Alert.alert('Success', 'MFA verification successful');
      setShowMFAModal(false);
      setMfaCode('');
      onAuthSuccess();
    } catch (error) {
      setLoading(false);
      Alert.alert('Verification Error', error instanceof Error ? error.message : 'Invalid code. Please try again.');
    }
  };

  // Under-13 signup removed

  const handleGoogleLogin = async () => {
    setLoading(true);
    let nativeError: unknown;
    try {
      if (Platform.OS === 'android') {
        try {
          const session = await signInWithGoogleNative();
          if (session) {
            const authResult = await authService.handleOAuthCallback();
            if (authResult) {
              setLoading(false);
              Alert.alert('Success', AUTH_CONFIG.SUCCESS.GOOGLE_NATIVE_SIGNIN);
              onAuthSuccess();
              return;
            }
          }
        } catch (error) {
          nativeError = error;
          // Native Google Sign-In failed, falling back to browser flow
        }
      }

      // Fallback to browser OAuth (runs when native is unavailable or fails)
      const { url } = await authService.loginWithGoogleOAuth();
      const redirectUri = AUTH_CONFIG.OAUTH.REDIRECT_URI;
      const result = await WebBrowser.openAuthSessionAsync(
        url,
        redirectUri
      );
      if (result.type === 'success') {
        const authResult = await authService.handleOAuthCallback();
        if (authResult) {
          setLoading(false);
          Alert.alert('Success', AUTH_CONFIG.SUCCESS.GOOGLE_BROWSER_SIGNIN);
          onAuthSuccess();
        } else {
          setLoading(false);
          Alert.alert('Error', 'Failed to complete Google sign-in');
        }
      } else if (result.type === 'cancel') {
        setLoading(false);
        const message = nativeError
          ? 'Native sign-in failed and browser sign-in was cancelled.'
          : 'Google sign-in was cancelled';
        Alert.alert('Cancelled', message);
      }
    } catch (error) {
      setLoading(false);
  // Google login error (suppressed)
      Alert.alert(
        'Google Sign-In Error',
        error instanceof Error ? error.message : 'Failed to sign in with Google'
      );
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setFullName('');
    setPhoneNumber('');
    setUsername('');
    setAge('');
    setDateOfBirth('');
  };

  const switchMode = (newIsLogin: boolean) => {
    resetForm();
    setIsLogin(newIsLogin);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </Text>
          <Text style={styles.subtitle}>
            {isLogin ? 'Sign in to your family account' : 'Join your family network'}
          </Text>
        </View>

        <View style={styles.form}>
          {/* Standard form (adults) */}
          <>
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor={theme.colors.placeholder}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor={theme.colors.placeholder}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
              {!isLogin && (
                <>
                  <TextInput
                    style={styles.input}
                    placeholder="Full Name"
                    placeholderTextColor={theme.colors.placeholder}
                    value={fullName}
                    onChangeText={setFullName}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Date of Birth (YYYY-MM-DD)"
                    placeholderTextColor={theme.colors.placeholder}
                    value={dateOfBirth}
                    onChangeText={setDateOfBirth}
                    keyboardType="numeric"
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Phone Number (optional)"
                    placeholderTextColor={theme.colors.placeholder}
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                    keyboardType="phone-pad"
                  />
                </>
              )}
              
              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleEmailAuth}
                disabled={loading}
              >
                <Text style={styles.buttonText}>
                  {loading
                    ? (isLogin ? 'Signing In...' : 'Creating Account...')
                    : (isLogin ? 'Sign In' : 'Create Account')}
                </Text>
              </TouchableOpacity>

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>

              <Pressable
                style={({ pressed }) => [
                  styles.googleButton,
                  pressed && styles.buttonPressed,
                  loading && styles.buttonDisabled,
                ]}
                onPress={handleGoogleLogin}
                android_ripple={{ color: 'rgba(0,0,0,0.08)' }}
                disabled={loading}
                accessibilityLabel="Continue with Google"
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#4285F4" style={styles.googleSpinner} />
                ) : (
                  <View style={styles.googleIconContainer}>
                    <Text style={styles.googleG}>G</Text>
                  </View>
                )}
                <Text style={[styles.googleButtonText, loading && { marginLeft: 8 }]}>Continue with Google</Text>
              </Pressable>
            </>
        </View>

  {/* MFA modal below */}

        <View style={styles.footer}>
          <TouchableOpacity onPress={() => switchMode(!isLogin)}>
            <Text style={styles.linkText}>
              {isLogin ? "Don't have an account? Sign Up" : 'Already have an account? Sign In'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      <Modal
        visible={showMFAModal}
        animationType="slide"
        transparent
        onRequestClose={async () => {
          // User cancels MFA upgrade: logout
          try { await authService.logout(); } catch {}
          setShowMFAModal(false);
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.mfaModalContainer, { backgroundColor: theme.colors.surface }]}> 
            <Text style={[styles.mfaModalTitle, { color: theme.colors.text }]}>Two-Factor Verification</Text>
            <Text style={[styles.mfaModalSubtitle, { color: theme.colors.textSecondary }]}>Enter the 6-digit code from your authenticator app to finish signing in.</Text>
            <TextInput
              style={[styles.input, styles.mfaInput]}
              placeholder="000000"
              placeholderTextColor={theme.colors.placeholder}
              value={mfaCode}
              onChangeText={setMfaCode}
              keyboardType="numeric"
              maxLength={6}
              autoFocus
            />
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              disabled={loading || mfaCode.length !== 6}
              onPress={handleMFAVerification}
            >
              <Text style={styles.buttonText}>{loading ? 'Verifying...' : 'Verify Code'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={async () => {
                // Cancel -> logout and return to base auth screen
                try { await authService.logout(); } catch {}
                setMfaCode('');
                setShowMFAModal(false);
              }}
            >
              <Text style={[styles.buttonText, styles.secondaryButtonText]}>Cancel & Logout</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollContent: {
      flexGrow: 1,
      justifyContent: 'center',
      padding: theme.spacing.lg,
    },
    header: {
      alignItems: 'center',
      marginBottom: theme.spacing.xl,
    },
    title: {
      fontSize: 32,
      fontWeight: 'bold',
      color: theme.colors.text,
      marginBottom: theme.spacing.sm,
    },
    subtitle: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
    form: {
      marginBottom: theme.spacing.xl,
    },
    input: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderWidth: 1,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.md,
      fontSize: 16,
      color: theme.colors.text,
      marginBottom: theme.spacing.md,
    },
    button: {
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.md,
      alignItems: 'center',
      marginBottom: theme.spacing.md,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    buttonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
    secondaryButton: {
      backgroundColor: 'transparent',
      borderColor: theme.colors.border,
      borderWidth: 1,
    },
    secondaryButtonText: {
      color: theme.colors.text,
    },
    googleButton: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderWidth: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      borderRadius: theme.borderRadius.lg,
      elevation: 2,
    },
    buttonPressed: {
      opacity: 0.9,
      transform: [{ scale: 0.995 }],
    },
    googleSpinner: {
      marginRight: theme.spacing.sm,
    },
    googleIconContainer: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: theme.spacing.sm,
      elevation: 3,
    },
    googleG: {
      color: '#4285F4',
      fontWeight: '700',
    },
    googleButtonText: {
      color: theme.colors.text,
    },
    divider: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: theme.spacing.lg,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: theme.colors.border,
    },
    dividerText: {
      marginHorizontal: theme.spacing.md,
      color: theme.colors.textSecondary,
      fontSize: 14,
    },
    footer: {
      alignItems: 'center',
    },
    linkText: {
      color: theme.colors.primary,
      fontSize: 16,
      fontWeight: '500',
    },
    marginTop: {
      marginTop: theme.spacing.md,
    },
    mfaInput: {
      fontSize: 32,
      fontWeight: '600',
      textAlign: 'center',
      letterSpacing: 8,
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: theme.spacing.lg,
    },
    mfaModalContainer: {
      width: '100%',
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.lg,
    },
    mfaModalTitle: {
      fontSize: 24,
      fontWeight: '700',
      marginBottom: theme.spacing.sm,
      textAlign: 'center',
    },
    mfaModalSubtitle: {
      fontSize: 14,
      marginBottom: theme.spacing.lg,
      textAlign: 'center',
    },
  });