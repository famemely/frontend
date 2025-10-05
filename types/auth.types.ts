import { Session } from "@supabase/supabase-js";

/**
 * User interface with RBAC fields
 */
export interface User {
  id: string;
  email?: string;
  username?: string;
  fullName: string;
  age?: number;
  dateOfBirth?: string; // ISO date string e.g. 1990-01-31
  phone?: string;
  roles?: string[];
  permissions?: string[];
  familyIds?: string[];
  parentId?: string;
}

/**
 * Authentication response from login/signup
 */
export interface AuthResponse {
  user: User;
  session: Session;
  appToken: string;
}

/**
 * Email signup data
 */
export interface EmailSignupData {
  email: string;
  password: string;
  fullName: string;
  phoneNumber?: string;
  dateOfBirth?: string; // ISO date string (YYYY-MM-DD)
}

/**
 * Email login data
 */
export interface EmailLoginData {
  email: string;
  password: string;
}

// Child accounts removed

/**
 * Google OAuth data
 */
export interface GoogleAuthData {
  idToken: string;
}
