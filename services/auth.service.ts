import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, Session } from "@supabase/supabase-js";
import { Alert, Platform } from "react-native";
import {
  User,
  AuthResponse,
  EmailSignupData,
  EmailLoginData,
  GoogleAuthData,
} from "../types/auth.types";
import {
  AUTH_CONFIG,
  buildOtpAuthUri,
  resolveApiBaseUrl,
} from "../constants/auth.config";

const SUPABASE_URL = AUTH_CONFIG.SUPABASE.URL;
const SUPABASE_KEY = AUTH_CONFIG.SUPABASE.ANON_KEY;
const API_BASE_URL = resolveApiBaseUrl(AUTH_CONFIG.API.BASE_URL, Platform.OS);
const OAUTH_REDIRECT = AUTH_CONFIG.OAUTH.REDIRECT_URI;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error(AUTH_CONFIG.ERRORS.MISSING_SUPABASE_ENV);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

class AuthService {
  private session: Session | null = null;
  private user: User | null = null;
  private appToken: string | null = null;
  private lastError: {
    context: string;
    message: string;
    status?: number;
    body?: string;
  } | null = null;
  private recordError(
    context: string,
    message: string,
    extra?: Partial<{ status: number; body: string }>
  ) {
    this.lastError = { context, message, ...extra };
  }

  async initialize() {
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();
      if (error) {
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
      return false;
    }
    return false;
  }

  private async exchangeTokenForAppJWT(
    supabaseToken: string
  ): Promise<{ user: User; appToken: string } | null> {
    const url = `${API_BASE_URL}${AUTH_CONFIG.API.ENDPOINTS.EXCHANGE_TOKEN}`;
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${supabaseToken}`,
          "Content-Type": "application/json",
        },
      });

      const text = await response.text().catch(() => "");
      if (!response.ok) {
        this.recordError("exchange-token", `HTTP ${response.status}`, {
          status: response.status,
          body: text,
        });
        return null;
      }

      let result: any = {};
      try {
        result = text ? JSON.parse(text) : {};
      } catch (e) {
        this.recordError("exchange-token", "Invalid JSON in response", {
          body: text,
        });
        return null;
      }

      if (!result.appToken || !result.user) {
        this.recordError(
          "exchange-token",
          "Missing appToken or user in response",
          { body: text }
        );
        return null;
      }

      await AsyncStorage.setItem(
        AUTH_CONFIG.STORAGE_KEYS.APP_TOKEN,
        result.appToken
      );
      await AsyncStorage.setItem(
        AUTH_CONFIG.STORAGE_KEYS.USER_DATA,
        JSON.stringify(result.user)
      );
      return result;
    } catch (error: any) {
      this.recordError("exchange-token", error?.message || "Unknown error");
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
    return (
      this.session !== null && this.user !== null && this.appToken !== null
    );
  }

  async callAPI(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<Response> {
    if (!this.appToken) {
      throw new Error(AUTH_CONFIG.ERRORS.NOT_AUTHENTICATED);
    }

    const url = `${API_BASE_URL}${endpoint}`;
    return fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.appToken}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });
  }

  onAuthStateChange(callback: (session: Session | null) => void) {
    return supabase.auth.onAuthStateChange(async (event, session) => {
      this.session = session;

      if (session) {
        const { data: aalData } =
          await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (aalData?.currentLevel === "aal1" && aalData?.nextLevel === "aal2") {
          callback(session);
          return;
        }
        const appAuth = await this.exchangeTokenForAppJWT(session.access_token);
        if (appAuth) {
          this.appToken = appAuth.appToken;
          this.user = appAuth.user;
        }
      } else {
        this.user = null;
        this.appToken = null;
        await AsyncStorage.multiRemove(["@app_token", "@user_data"]);
      }
      callback(session);
    });
  }

  async signupWithEmail(data: EmailSignupData): Promise<AuthResponse> {
    const meta: any = { full_name: data.fullName };
    if (data.phoneNumber) meta.phone = data.phoneNumber;
    if ((data as any).dateOfBirth)
      meta.date_of_birth = (data as any).dateOfBirth;

    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: meta,
      },
    });

    if (error) throw error;
    if (!authData.session)
      throw new Error(AUTH_CONFIG.ERRORS.SIGNUP_NO_SESSION);

    this.session = authData.session;
    const appAuth = await this.exchangeTokenForAppJWT(
      authData.session.access_token
    );
    if (!appAuth) throw new Error(AUTH_CONFIG.ERRORS.FAILED_TO_EXCHANGE);

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
    if (!authData.session) throw new Error(AUTH_CONFIG.ERRORS.LOGIN_NO_SESSION);

    const { data: aalData, error: aalError } =
      await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

    if (!aalError && aalData) {
      if (aalData.currentLevel === "aal1" && aalData.nextLevel === "aal2") {
        this.session = authData.session;
        const mfaError: any = new Error(AUTH_CONFIG.ERRORS.MFA_REQUIRED);
        mfaError.isMFARequired = true;
        mfaError.session = authData.session;
        throw mfaError;
      }
    }

    this.session = authData.session;
    const appAuth = await this.exchangeTokenForAppJWT(
      authData.session.access_token
    );
    if (!appAuth) throw new Error(AUTH_CONFIG.ERRORS.FAILED_TO_EXCHANGE);

    this.appToken = appAuth.appToken;
    this.user = appAuth.user;

    return {
      user: appAuth.user,
      session: authData.session,
      appToken: appAuth.appToken,
    };
  }

  async loginWithGoogle(data: GoogleAuthData): Promise<AuthResponse> {
    const { data: authData, error } = await supabase.auth.signInWithIdToken({
      provider: "google",
      token: data.idToken,
    });

    if (error) throw error;
    if (!authData.session)
      throw new Error(AUTH_CONFIG.ERRORS.GOOGLE_LOGIN_NO_SESSION);

    this.session = authData.session;
    const appAuth = await this.exchangeTokenForAppJWT(
      authData.session.access_token
    );
    if (!appAuth) throw new Error(AUTH_CONFIG.ERRORS.FAILED_TO_EXCHANGE);

    this.appToken = appAuth.appToken;
    this.user = appAuth.user;

    return {
      user: appAuth.user,
      session: authData.session,
      appToken: appAuth.appToken,
    };
  }

  async loginWithGoogleOAuth(): Promise<{ url: string; provider: string }> {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: AUTH_CONFIG.OAUTH.GOOGLE_PROVIDER as "google",
      options: {
        redirectTo: OAUTH_REDIRECT,
        skipBrowserRedirect: false,
      },
    });

    if (error) throw error;
    if (!data.url) throw new Error(AUTH_CONFIG.ERRORS.NO_OAUTH_URL);

    return {
      url: data.url,
      provider: data.provider,
    };
  }

  async handleOAuthCallback(): Promise<AuthResponse | null> {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) throw error;
    if (!session) return null;

    this.session = session;
    const appAuth = await this.exchangeTokenForAppJWT(session.access_token);
    if (!appAuth) throw new Error(AUTH_CONFIG.ERRORS.FAILED_TO_EXCHANGE);

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
    await AsyncStorage.multiRemove(["@app_token", "@user_data"]);
  }

  // Child-specific signup removed. Use `signupWithEmail` with `dateOfBirth` instead.

  async enableMFA(): Promise<{
    secret: string;
    qr_code: string;
    factorId: string;
  }> {
    if (!this.isAuthenticated()) {
      throw new Error(AUTH_CONFIG.ERRORS.NOT_AUTHENTICATED);
    }

    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: AUTH_CONFIG.MFA.FACTOR_TYPE as "totp",
      friendlyName: AUTH_CONFIG.MFA.FRIENDLY_NAME,
    });

    if (error) {
      this.recordError("mfa-enroll", error.message);
      throw error;
    }
    if (!data) throw new Error(AUTH_CONFIG.ERRORS.MFA_ENROLL_FAILED);

    const user = this.getCurrentUser();
    const email = user?.email || "user";
    const qrCode = buildOtpAuthUri(email, data.totp.secret);

    return {
      secret: data.totp.secret,
      qr_code: qrCode,
      factorId: data.id,
    };
  }

  async verifyMFA(factorId: string, code: string): Promise<void> {
    const { data, error } = await supabase.auth.mfa.challengeAndVerify({
      factorId,
      code,
    });

    if (error) {
      this.recordError("mfa-verify", error.message);
      throw error;
    }
  }

  async verifyMFALogin(code: string): Promise<AuthResponse> {
    if (!this.session) {
      this.recordError(
        "verify-mfa-login",
        "No active session for MFA verification"
      );
      throw new Error("No active session for MFA verification");
    }

    try {
      const factors = await this.listMFAFactors();

      if (!factors || factors.length === 0) {
        this.recordError("verify-mfa-login", "No MFA factors available");
        throw new Error(AUTH_CONFIG.ERRORS.MFA_NO_FACTORS);
      }

      const factorId = factors[0].id;

      const challenge = await supabase.auth.mfa.challenge({ factorId });
      if (challenge.error) {
        this.recordError("mfa-challenge", challenge.error.message);
        throw challenge.error;
      }

      const verify = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.data.id,
        code,
      });

      if (verify.error) {
        this.recordError("mfa-verify", verify.error.message);
        const mfaError: any = new Error(AUTH_CONFIG.ERRORS.MFA_INVALID_CODE);
        mfaError.originalError = verify.error;
        throw mfaError;
      }

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();
      if (sessionError) {
        this.recordError("mfa-session", sessionError.message);
        throw sessionError;
      }
      if (!session) {
        this.recordError("mfa-session", "No session returned after MFA verify");
        throw new Error(AUTH_CONFIG.ERRORS.LOGIN_NO_SESSION);
      }

      this.session = session;

      const { data: aalData } =
        await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

      const appAuth = await this.exchangeTokenForAppJWT(session.access_token);
      if (!appAuth) {
        this.recordError(
          "exchange-token",
          "Failed to exchange token after MFA verify"
        );
        throw new Error(AUTH_CONFIG.ERRORS.FAILED_TO_EXCHANGE);
      }

      this.appToken = appAuth.appToken;
      this.user = appAuth.user;

      return {
        user: appAuth.user,
        session: session,
        appToken: appAuth.appToken,
      };
    } catch (err: any) {
      throw err;
    }
  }

  async disableMFA(factorId: string): Promise<void> {
    if (!this.isAuthenticated()) {
      throw new Error(AUTH_CONFIG.ERRORS.NOT_AUTHENTICATED);
    }

    try {
      const aal = await this.getAAL();
      if (aal.currentLevel !== "aal2") {
        const elevatedErr: any = new Error(
          "MFA code required to disable this factor"
        );
        elevatedErr.code = "AAL2_REQUIRED";
        elevatedErr.requiresAAL2 = true;
        throw elevatedErr;
      }
    } catch (e: any) {
      if (e?.code === "AAL2_REQUIRED" || e?.requiresAAL2) {
        throw e;
      }
    }

    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    if (error) {
      this.recordError("mfa-unenroll", error.message);
      throw error;
    }
  }

  async verifyAndDisableMFA(factorId: string, code: string): Promise<void> {
    if (!this.isAuthenticated()) {
      throw new Error(AUTH_CONFIG.ERRORS.NOT_AUTHENTICATED);
    }
    if (!code || code.length !== 6) {
      const err: any = new Error("Invalid MFA code");
      err.code = "INVALID_CODE";
      throw err;
    }

    const challenge = await supabase.auth.mfa.challenge({ factorId });
    if (challenge.error) {
      this.recordError("mfa-challenge", challenge.error.message);
      throw challenge.error;
    }

    const verify = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.data.id,
      code,
    });
    if (verify.error) {
      this.recordError("mfa-verify", verify.error.message);
      const vErr: any = new Error(AUTH_CONFIG.ERRORS.MFA_INVALID_CODE);
      vErr.originalError = verify.error;
      vErr.code = "INVALID_CODE";
      throw vErr;
    }

    try {
      const aal = await this.getAAL();
    } catch (_) {}

    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    if (error) {
      this.recordError("mfa-unenroll", error.message);
      throw error;
    }
  }

  async listMFAFactors(): Promise<any[]> {
    if (!this.session) {
      throw new Error("No active session");
    }

    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error) {
      this.recordError("mfa-list-factors", error.message);
      throw error;
    }

    const factors = data?.totp || [];
    return factors;
  }

  async getAAL(): Promise<{ currentLevel: string; nextLevel: string | null }> {
    if (!this.session) {
      throw new Error("No active session");
    }

    const { data, error } =
      await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (error) {
      this.recordError("aal-check", error.message);
      throw error;
    }

    const result = {
      currentLevel: data?.currentLevel || "aal1",
      nextLevel: data?.nextLevel || null,
    };

    return result;
  }

  async isMFAEnabled(): Promise<boolean> {
    try {
      const factors = await this.listMFAFactors();
      return factors.length > 0;
    } catch (error) {
      return false;
    }
  }

  async isMFARequired(): Promise<boolean> {
    try {
      const aal = await this.getAAL();
      return aal.currentLevel === "aal1" && aal.nextLevel === "aal2";
    } catch (error) {
      return false;
    }
  }
}

export const authService = new AuthService();
export { supabase };

export type {
  User,
  AuthResponse,
  EmailSignupData,
  EmailLoginData,
  GoogleAuthData,
} from "../types/auth.types";
