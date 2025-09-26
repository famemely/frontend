import { Session } from '@supabase/supabase-js';

/**
 * User interface with RBAC fields
 */
export interface User {
  id: string;
  email?: string;
  username?: string;
  fullName: string;
  isUnder13: boolean;
  age?: number;
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
}

/**
 * Email login data
 */
export interface EmailLoginData {
  email: string;
  password: string;
}

/**
 * Child account (under 13) signup data
 */
export interface ChildAccountData {
  username: string;
  fullName: string;
  age: number;
  password: string;
  parentEmail: string;
}

/**
 * Google OAuth data
 */
export interface GoogleAuthData {
  idToken: string;
}
