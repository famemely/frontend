/**
 * Validation utility functions
 */

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 */
export function isStrongPassword(password: string): {
  isValid: boolean;
  message?: string;
} {
  if (password.length < 6) {
    return {
      isValid: false,
      message: "Password must be at least 6 characters",
    };
  }

  if (password.length < 8) {
    return { isValid: true }; // Meets minimum requirement
  }

  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  const criteriamet = [
    hasUpperCase,
    hasLowerCase,
    hasNumbers,
    hasSpecialChar,
  ].filter(Boolean).length;

  if (criteriamet < 2) {
    return {
      isValid: true,
      message:
        "Consider using a mix of uppercase, lowercase, numbers, and special characters",
    };
  }

  return { isValid: true };
}

/**
 * Validate MFA code format
 */
export function isValidMFACode(code: string): boolean {
  return /^\d{6}$/.test(code);
}

/**
 * Validate phone number (basic)
 */
export function isValidPhoneNumber(phone: string): boolean {
  const phoneRegex = /^\+?[\d\s-()]{10,}$/;
  return phoneRegex.test(phone);
}

/**
 * Sanitize input string
 */
export function sanitizeInput(input: string): string {
  return input.trim().replace(/[<>]/g, "");
}

/**
 * Validate date of birth (must be in the past, not too far back)
 */
export function isValidDateOfBirth(date: Date): {
  isValid: boolean;
  message?: string;
} {
  const today = new Date();
  const minDate = new Date(1900, 0, 1);

  if (date > today) {
    return { isValid: false, message: "Date of birth cannot be in the future" };
  }

  if (date < minDate) {
    return { isValid: false, message: "Invalid date of birth" };
  }

  // Check if user is at least 13 years old (basic check)
  const age = today.getFullYear() - date.getFullYear();
  const monthDiff = today.getMonth() - date.getMonth();

  if (age < 13 || (age === 13 && monthDiff < 0)) {
    return {
      isValid: false,
      message: "You must be at least 13 years old to sign up",
    };
  }

  return { isValid: true };
}
