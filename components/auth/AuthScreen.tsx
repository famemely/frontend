import { AUTH_CONFIG } from '@/constants/auth.config';
import { useTheme } from '@/contexts/ThemeContext';
import { authService } from '@/services/auth.service';
import { configureGoogleSignIn, signInWithGoogleNative } from '@/services/google-native.service';
import { EmailLoginData, EmailSignupData } from '@/types/auth.types';
import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

interface AuthScreenProps {
  onAuthSuccess: () => void;
}

export default function AuthScreen({ onAuthSuccess }: AuthScreenProps) {
  const { theme } = useTheme();
  
  const [isLogin, setIsLogin] = useState(true);
  // children/under-13 flows removed — always use standard signup with date of birth
  const [loading, setLoading] = useState(false);
  const [showMFAModal, setShowMFAModal] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  
  // Form data
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [age, setAge] = useState(''); // kept for compatibility but no separate kids flow
  const [dateOfBirth, setDateOfBirth] = useState<Date | undefined>(undefined);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Validation errors
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [fullNameError, setFullNameError] = useState('');
  const [dateOfBirthError, setDateOfBirthError] = useState('');

  // Focus states for inputs
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [fullNameFocused, setFullNameFocused] = useState(false);
  const [mfaFocused, setMfaFocused] = useState(false);

  const styles = createStyles(theme);

  useEffect(() => {
    // Configure Google Sign-In when component mounts
    const setupGoogleSignIn = async () => {
      try {
        await configureGoogleSignIn();
      } catch (error) {
        console.log('Failed to configure Google Sign-In:', error);
        // Don't crash the app if configuration fails
      }
    };
    
    setupGoogleSignIn();
  }, []);

  const validateFields = () => {
    let isValid = true;
    
    // Clear previous errors
    setEmailError('');
    setPasswordError('');
    setFullNameError('');
    setDateOfBirthError('');

    // Email validation
    if (!email.trim()) {
      setEmailError('Email is required');
      isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError('Please enter a valid email address');
      isValid = false;
    }

    // Password validation
    if (!password.trim()) {
      setPasswordError('Password is required');
      isValid = false;
    } else if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      isValid = false;
    }

    // Signup-specific validation
    if (!isLogin) {
      if (!fullName.trim()) {
        setFullNameError('Full name is required');
        isValid = false;
      }
      
      if (!dateOfBirth) {
        setDateOfBirthError('Date of birth is required');
        isValid = false;
      }
    }

    return isValid;
  };

  const handleEmailAuth = async () => {
    if (!validateFields()) {
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
          dateOfBirth: dateOfBirth ? dateOfBirth.toISOString().split('T')[0] : undefined,
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
    try {
      // Use native Google Sign-In with Supabase
      const session = await signInWithGoogleNative();
      
      if (session) {
        // Session is already established, get the auth callback
        const authResult = await authService.handleOAuthCallback();
        if (authResult) {
          setLoading(false);
          Alert.alert('Success', 'Successfully signed in with Google');
          onAuthSuccess();
          return;
        }
      }
      
      setLoading(false);
      Alert.alert('Error', 'Failed to complete Google sign-in');
    } catch (error: any) {
      setLoading(false);
      
      // Provide user-friendly error messages
      let errorMessage = 'Failed to sign in with Google';
      
      if (error.message?.includes('SIGN_IN_CANCELLED')) {
        errorMessage = 'Sign-in was cancelled';
      } else if (error.message?.includes('IN_PROGRESS')) {
        errorMessage = 'Sign-in already in progress';
      } else if (error.message?.includes('PLAY_SERVICES_NOT_AVAILABLE')) {
        errorMessage = 'Google Play Services not available';
      } else if (error.message?.includes('No ID token')) {
        errorMessage = 'Failed to get authentication token from Google';
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      Alert.alert('Google Sign-In Error', errorMessage);
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setFullName('');
    setUsername('');
    setAge('');
    setDateOfBirth(undefined);
    setShowDatePicker(false);
    
    // Clear errors
    setEmailError('');
    setPasswordError('');
    setFullNameError('');
    setDateOfBirthError('');
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
          <Text style={styles.logo}>Famemely</Text>
          <Text style={styles.subtitle}>
            {isLogin ? 'Sign in to your family account' : 'Join your family network'}
          </Text>
        </View>

        <View style={styles.form}>
          {/* Standard form (adults) */}
          <>
              <View style={styles.inputWrapper}>
                {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
                <TextInput
                  style={[
                    styles.input,
                    emailFocused && styles.inputFocused,
                    emailError && styles.inputError,
                  ]}
                  placeholder="Email"
                  placeholderTextColor={theme.colors.placeholder}
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    if (emailError) setEmailError('');
                  }}
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputWrapper}>
                {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
                <TextInput
                  style={[
                    styles.input,
                    passwordFocused && styles.inputFocused,
                    passwordError && styles.inputError,
                  ]}
                  placeholder="Password"
                  placeholderTextColor={theme.colors.placeholder}
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (passwordError) setPasswordError('');
                  }}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  secureTextEntry
                />
              </View>
              {!isLogin && (
                <>
                  <View style={styles.inputWrapper}>
                    {fullNameError ? <Text style={styles.errorText}>{fullNameError}</Text> : null}
                    <TextInput
                      style={[
                        styles.input,
                        fullNameFocused && styles.inputFocused,
                        fullNameError && styles.inputError,
                      ]}
                      placeholder="Full Name"
                      placeholderTextColor={theme.colors.placeholder}
                      value={fullName}
                      onChangeText={(text) => {
                        setFullName(text);
                        if (fullNameError) setFullNameError('');
                      }}
                      onFocus={() => setFullNameFocused(true)}
                      onBlur={() => setFullNameFocused(false)}
                    />
                  </View>
                  
                  <View style={styles.inputWrapper}>
                    {dateOfBirthError ? <Text style={styles.errorText}>{dateOfBirthError}</Text> : null}
                    <TouchableOpacity
                      style={[
                        styles.input, 
                        styles.datePickerButton,
                        dateOfBirthError && styles.inputError,
                      ]}
                      onPress={() => {
                        setShowDatePicker(true);
                        if (dateOfBirthError) setDateOfBirthError('');
                      }}
                    >
                      <Text style={[
                        styles.datePickerText,
                        !dateOfBirth && styles.datePickerPlaceholder
                      ]}>
                        {dateOfBirth 
                          ? dateOfBirth.toLocaleDateString('en-US', { 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric' 
                            })
                          : 'Date of Birth'
                        }
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {showDatePicker && (
                    <DateTimePicker
                      value={dateOfBirth || new Date()}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={(event, selectedDate) => {
                        setShowDatePicker(Platform.OS === 'ios');
                        if (selectedDate) {
                          setDateOfBirth(selectedDate);
                        }
                      }}
                      maximumDate={new Date()}
                      minimumDate={new Date(1900, 0, 1)}
                    />
                  )}
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
              {isLogin ? (
                <>
                  <Text style={styles.linkTextNormal}>New to Famemely? </Text>
                  <Text style={styles.linkTextEmphasis}>Sign Up</Text>
                </>
              ) : (
                <>
                  <Text style={styles.linkTextNormal}>Already have an account? </Text>
                  <Text style={styles.linkTextEmphasis}>Sign In</Text>
                </>
              )}
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
              style={[
                styles.input, 
                styles.mfaInput,
                mfaFocused && styles.inputFocused,
              ]}
              placeholder="000000"
              placeholderTextColor={theme.colors.placeholder}
              value={mfaCode}
              onChangeText={setMfaCode}
              onFocus={() => setMfaFocused(true)}
              onBlur={() => setMfaFocused(false)}
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
      minHeight: 140,
      justifyContent: 'center',
    },
    logo: {
      fontSize: 64,
      fontFamily: Platform.select({
        ios: 'Zapfino',
        android: 'cursive',
      }),
      color: theme.colors.text,
      marginBottom: theme.spacing.xl,
      letterSpacing: 3,
      textAlign: 'center',
      width: '100%',
    },
    subtitle: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      opacity: 0.7,
      fontWeight: '400',
      minHeight: 22,
    },
    form: {
      marginBottom: theme.spacing.xl,
    },
    inputWrapper: {
      marginBottom: theme.spacing.md,
    },
    input: {
      backgroundColor: '#FFFFFF',
      borderColor: '#053326',
      borderWidth: 1,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.md,
      fontSize: 16,
      color: theme.colors.text,
      marginBottom: 0,
      fontWeight: '400',
      opacity: 0.7,
    },
    inputFocused: {
      opacity: 1,
      borderWidth: 1.5,
    },
    inputError: {
      borderColor: theme.colors.error,
      backgroundColor: '#FEE2E2',
      opacity: 1,
      borderWidth: 1.5,
    },
    errorText: {
      color: theme.colors.error,
      fontSize: 12,
      marginBottom: theme.spacing.xs,
      paddingHorizontal: theme.spacing.xs,
      opacity: 0.9,
      fontWeight: '500',
      textAlign: 'right',
    },
    button: {
      backgroundColor: '#053326',
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.md + 2,
      alignItems: 'center',
      marginBottom: theme.spacing.md,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    buttonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '500',
      letterSpacing: 0.3,
    },
    secondaryButton: {
      backgroundColor: 'transparent',
      borderColor: '#053326',
      borderWidth: 1,
    },
    secondaryButtonText: {
      color: theme.colors.text,
    },
    googleButton: {
      backgroundColor: '#FFFFFF',
      borderColor: '#053326',
      borderWidth: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: theme.spacing.md + 2,
      paddingHorizontal: theme.spacing.lg,
      borderRadius: theme.borderRadius.md,
    },
    buttonPressed: {
      opacity: 0.9,
      transform: [{ scale: 0.995 }],
    },
    googleSpinner: {
      marginRight: theme.spacing.sm,
    },
    googleIconContainer: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: theme.spacing.sm,
    },
    googleG: {
      color: '#4285F4',
      fontWeight: '500',
      fontSize: 16,
    },
    googleButtonText: {
      color: '#053326',
      fontWeight: '400',
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
      opacity: 0.6,
      fontWeight: '400',
    },
    footer: {
      alignItems: 'center',
    },
    linkText: {
      fontSize: 16,
      fontWeight: '400',
    },
    linkTextNormal: {
      color: '#000000',
      opacity: 0.7,
    },
    linkTextEmphasis: {
      color: '#053326',
      opacity: 1,
    },
    datePickerButton: {
      justifyContent: 'center',
    },
    datePickerText: {
      fontSize: 16,
      color: theme.colors.text,
      fontWeight: '400',
    },
    datePickerPlaceholder: {
      color: theme.colors.placeholder,
      opacity: 0.7,
    },
    marginTop: {
      marginTop: theme.spacing.md,
    },
    mfaInput: {
      fontSize: 32,
      fontWeight: '400',
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
      fontWeight: '500',
      marginBottom: theme.spacing.sm,
      textAlign: 'center',
    },
    mfaModalSubtitle: {
      fontSize: 14,
      marginBottom: theme.spacing.lg,
      textAlign: 'center',
      opacity: 0.7,
      fontWeight: '400',
    },
  });