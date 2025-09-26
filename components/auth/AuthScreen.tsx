import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { signInWithGoogleNative, configureGoogleSignIn } from '@/services/googleNativeAuth';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { lightTheme, darkTheme } from '@/constants/theme';
import { authService } from '@/services/auth.service';
import { EmailLoginData, EmailSignupData } from '@/types/auth.types';

// This is required for OAuth to work properly in Expo
WebBrowser.maybeCompleteAuthSession();

interface AuthScreenProps {
  onAuthSuccess: () => void;
}

export default function AuthScreen({ onAuthSuccess }: AuthScreenProps) {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;
  
  const [isLogin, setIsLogin] = useState(true);
  const [isUnder13, setIsUnder13] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showTwoFactor, setShowTwoFactor] = useState(false);
  const [tempToken, setTempToken] = useState('');
  
  // Form data
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [username, setUsername] = useState('');
  const [age, setAge] = useState('');
  const [parentEmail, setParentEmail] = useState('');
  const [totpCode, setTotpCode] = useState('');

  const styles = createStyles(theme);

  useEffect(() => {
    configureGoogleSignIn();
  }, []);

  const handleEmailAuth = async () => {
    if (!email.trim() || !password.trim() || (!isLogin && !fullName.trim())) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        const loginData: EmailLoginData = { email, password };
        const result = await authService.loginWithEmail(loginData);
        onAuthSuccess();
      } else {
        const signupData: EmailSignupData = {
          email,
          password,
          fullName,
          phoneNumber: phoneNumber || undefined,
        };
        await authService.signupWithEmail(signupData);
        onAuthSuccess();
      }
    } catch (error) {
      Alert.alert('Authentication Error', error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleTwoFactorVerification = async () => {
    // Note: This is now handled by Supabase MFA directly
    // Remove this function or redirect to MFA setup
    Alert.alert('Info', 'MFA verification is now handled by Supabase during login');
  };

  const handleUnder13Signup = async () => {
    if (!username.trim() || !password.trim() || !fullName.trim() || !age.trim() || !parentEmail.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    const ageNum = parseInt(age);
    if (isNaN(ageNum) || ageNum < 1 || ageNum > 12) {
      Alert.alert('Error', 'Age must be between 1 and 12');
      return;
    }

    setLoading(true);
    try {
      await authService.signupUnder13({
        username,
        fullName,
        age: ageNum,
        password,
        parentEmail,
      });
      onAuthSuccess();
    } catch (error) {
      Alert.alert('Signup Error', error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

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
              Alert.alert('Success', 'Signed in with Google using native dialog');
              onAuthSuccess();
              return;
            }
          }
        } catch (error) {
          nativeError = error;
          if (__DEV__) {
            console.warn('Native Google Sign-In failed, falling back to browser flow.', error);
          }
        }
      }

      // Fallback to browser OAuth (runs when native is unavailable or fails)
      const { url } = await authService.loginWithGoogleOAuth();
      const result = await WebBrowser.openAuthSessionAsync(
        url,
        'exp://localhost:8081'
      );
      if (result.type === 'success') {
        const authResult = await authService.handleOAuthCallback();
        if (authResult) {
          Alert.alert('Success', 'Signed in with Google via browser');
          onAuthSuccess();
        } else {
          Alert.alert('Error', 'Failed to complete Google sign-in');
        }
      } else if (result.type === 'cancel') {
        const message = nativeError
          ? 'Native sign-in failed and browser sign-in was cancelled.'
          : 'Google sign-in was cancelled';
        Alert.alert('Cancelled', message);
      }
    } catch (error) {
      console.error('Google login error:', error);
      Alert.alert(
        'Google Sign-In Error',
        error instanceof Error ? error.message : 'Failed to sign in with Google'
      );
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setFullName('');
    setPhoneNumber('');
    setUsername('');
    setAge('');
    setParentEmail('');
    setTotpCode('');
    setShowTwoFactor(false);
    setTempToken('');
  };

  const switchMode = (newIsLogin: boolean, newIsUnder13: boolean = false) => {
    resetForm();
    setIsLogin(newIsLogin);
    setIsUnder13(newIsUnder13);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>
            {showTwoFactor 
              ? 'Two-Factor Authentication'
              : isUnder13 
              ? 'Kids Account' 
              : isLogin 
              ? 'Welcome Back' 
              : 'Create Account'}
          </Text>
          <Text style={styles.subtitle}>
            {showTwoFactor
              ? 'Enter the verification code from your authenticator app'
              : isUnder13
              ? 'Create an account for under 13'
              : isLogin
              ? 'Sign in to your family account'
              : 'Join your family network'}
          </Text>
        </View>

        <View style={styles.form}>
          {showTwoFactor ? (
            // Two-Factor Authentication form
            <>
              <TextInput
                style={styles.input}
                placeholder="Enter 6-digit code"
                placeholderTextColor={theme.colors.placeholder}
                value={totpCode}
                onChangeText={setTotpCode}
                keyboardType="numeric"
                maxLength={6}
              />
              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleTwoFactorVerification}
                disabled={loading}
              >
                <Text style={styles.buttonText}>
                  {loading ? 'Verifying...' : 'Verify'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowTwoFactor(false)}>
                <Text style={styles.linkText}>Back to login</Text>
              </TouchableOpacity>
            </>
          ) : isUnder13 ? (
            // Under 13 form
            <>
              <TextInput
                style={styles.input}
                placeholder="Username"
                placeholderTextColor={theme.colors.placeholder}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
              />
              <TextInput
                style={styles.input}
                placeholder="Full Name"
                placeholderTextColor={theme.colors.placeholder}
                value={fullName}
                onChangeText={setFullName}
              />
              <TextInput
                style={styles.input}
                placeholder="Age (1-12)"
                placeholderTextColor={theme.colors.placeholder}
                value={age}
                onChangeText={setAge}
                keyboardType="numeric"
              />
              <TextInput
                style={styles.input}
                placeholder="Parent's Email"
                placeholderTextColor={theme.colors.placeholder}
                value={parentEmail}
                onChangeText={setParentEmail}
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
              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleUnder13Signup}
                disabled={loading}
              >
                <Text style={styles.buttonText}>
                  {loading ? 'Creating Account...' : 'Create Kids Account'}
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            // Adult form
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

              <TouchableOpacity
                style={[styles.button, styles.googleButton]}
                onPress={handleGoogleLogin}
              >
                <Text style={[styles.buttonText, styles.googleButtonText]}>
                  Continue with Google
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <View style={styles.footer}>
          {!isUnder13 && (
            <TouchableOpacity onPress={() => switchMode(!isLogin)}>
              <Text style={styles.linkText}>
                {isLogin ? "Don't have an account? Sign Up" : 'Already have an account? Sign In'}
              </Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            onPress={() => switchMode(false, !isUnder13)}
            style={styles.marginTop}
          >
            <Text style={styles.linkText}>
              {isUnder13 ? 'Create Adult Account' : 'Create Kids Account (Under 13)'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    googleButton: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderWidth: 1,
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
  });