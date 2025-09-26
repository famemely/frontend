import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, Session } from '@supabase/supabase-js';
import {
  User,
  AuthResponse,
  EmailSignupData,
  EmailLoginData,
  ChildAccountData,
  GoogleAuthData,
} from '../types/auth.types';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_KEY;
const API_BASE_URL = 'http://localhost:3001';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

class AuthService {
  private session: Session | null = null;
  private user: User | null = null;
  private appToken: string | null = null;

  async initialize() {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Session retrieval error:', error);
        return false;
      }

      if (session) {
        this.session = session;
        const appAuth = await this.exchangeTokenForAppJWT(session.access_token);
        if (appAuth) {
          this.appToken = appAuth.appToken;
          this.user = appAuth.user;
          return true;
        }
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
    }
    return false;
  }

  private async exchangeTokenForAppJWT(supabaseToken: string): Promise<{ user: User; appToken: string } | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/exchange-token`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) throw new Error('Token exchange failed');

      const result = await response.json();
      await AsyncStorage.setItem('@app_token', result.appToken);
      await AsyncStorage.setItem('@user_data', JSON.stringify(result.user));
      
      return result;
    } catch (error) {
      console.error('Token exchange error:', error);
      return null;
    }
  }

  getCurrentUser(): User | null {
    return this.user;
  }

  getSession(): Session | null {
    return this.session;
  }

  getAppToken(): string | null {
    return this.appToken;
  }

  isAuthenticated(): boolean {
    return this.session !== null && this.user !== null && this.appToken !== null;
  }

  async callAPI(endpoint: string, options: RequestInit = {}): Promise<Response> {
    if (!this.appToken) {
      throw new Error('Not authenticated - no app token');
    }

    return fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.appToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
  }

  onAuthStateChange(callback: (session: Session | null) => void) {
    return supabase.auth.onAuthStateChange(async (event, session) => {
      this.session = session;
      if (session) {
        const appAuth = await this.exchangeTokenForAppJWT(session.access_token);
        if (appAuth) {
          this.appToken = appAuth.appToken;
          this.user = appAuth.user;
        }
      } else {
        this.user = null;
        this.appToken = null;
        await AsyncStorage.multiRemove(['@app_token', '@user_data']);
      }
      callback(session);
    });
  }

  // Authentication Methods
  async signupWithEmail(data: EmailSignupData): Promise<AuthResponse> {
    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          full_name: data.fullName,
          phone: data.phoneNumber,
        },
      },
    });

    if (error) throw error;
    if (!authData.session) throw new Error('Signup successful but no session returned');

    this.session = authData.session;
    const appAuth = await this.exchangeTokenForAppJWT(authData.session.access_token);
    if (!appAuth) throw new Error('Failed to exchange token');

    this.appToken = appAuth.appToken;
    this.user = appAuth.user;

    return {
      user: appAuth.user,
      session: authData.session,
      appToken: appAuth.appToken,
    };
  }

  async loginWithEmail(data: EmailLoginData): Promise<AuthResponse> {
    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (error) throw error;
    if (!authData.session) throw new Error('Login successful but no session returned');

    this.session = authData.session;
    const appAuth = await this.exchangeTokenForAppJWT(authData.session.access_token);
    if (!appAuth) throw new Error('Failed to exchange token');

    this.appToken = appAuth.appToken;
    this.user = appAuth.user;

    return {
      user: appAuth.user,
      session: authData.session,
      appToken: appAuth.appToken,
    };
  }

  async loginWithGoogle(data: GoogleAuthData): Promise<AuthResponse> {
    // For Google OAuth in Expo, you'll use expo-auth-session
    // This is a placeholder showing the flow
    const { data: authData, error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: data.idToken,
    });

    if (error) throw error;
    if (!authData.session) throw new Error('Google login successful but no session returned');

    this.session = authData.session;
    const appAuth = await this.exchangeTokenForAppJWT(authData.session.access_token);
    if (!appAuth) throw new Error('Failed to exchange token');

    this.appToken = appAuth.appToken;
    this.user = appAuth.user;

    return {
      user: appAuth.user,
      session: authData.session,
      appToken: appAuth.appToken,
    };
  }

  /**
   * Initiate Google OAuth flow using Supabase
   * Returns the OAuth URL to open in browser
   */
  async loginWithGoogleOAuth(): Promise<{ url: string; provider: string }> {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: 'exp://localhost:8081', // Will be updated for production
        skipBrowserRedirect: false,
      },
    });

    if (error) throw error;
    if (!data.url) throw new Error('No OAuth URL returned');

    return {
      url: data.url,
      provider: data.provider,
    };
  }

  /**
   * Handle OAuth callback after user authenticates
   * Call this after the OAuth redirect completes
   */
  async handleOAuthCallback(): Promise<AuthResponse | null> {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) throw error;
    if (!session) return null;

    this.session = session;
    const appAuth = await this.exchangeTokenForAppJWT(session.access_token);
    if (!appAuth) throw new Error('Failed to exchange token');

    this.appToken = appAuth.appToken;
    this.user = appAuth.user;

    return {
      user: appAuth.user,
      session: session,
      appToken: appAuth.appToken,
    };
  }

  async logout(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;

    this.session = null;
    this.user = null;
    this.appToken = null;
    await AsyncStorage.multiRemove(['@app_token', '@user_data']);
  }

  async signupUnder13(data: {
    username: string;
    fullName: string;
    age: number;
    password: string;
    parentEmail: string;
  }): Promise<{ success: boolean; message: string }> {
    // For under-13 accounts, we create a special account that requires parent approval
    // The email will be generated as username@kids.famemely.internal
    const childEmail = `${data.username}@kids.famemely.internal`;

    const { data: authData, error } = await supabase.auth.signUp({
      email: childEmail,
      password: data.password,
      options: {
        data: {
          username: data.username,
          full_name: data.fullName,
          age: data.age,
          is_under_13: true,
          parent_email: data.parentEmail,
          approval_status: 'pending',
        },
      },
    });

    if (error) throw error;

    // Send notification to parent for approval (implement via backend)
    // await this.callAPI('/auth/notify-parent-approval', {
    //   method: 'POST',
    //   body: JSON.stringify({ parentEmail: data.parentEmail, childId: authData.user?.id }),
    // });

    return {
      success: true,
      message: 'Account created! Waiting for parent approval.',
    };
  }
}

export const authService = new AuthService();
export { supabase };

// Re-export types for convenience
export type {
  User,
  AuthResponse,
  EmailSignupData,
  EmailLoginData,
  ChildAccountData,
  GoogleAuthData,
} from '../types/auth.types';
