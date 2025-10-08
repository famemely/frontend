/**
 * Error handling utility functions
 */

import { Alert } from "react-native";

export interface AppError {
  message: string;
  code?: string;
  statusCode?: number;
  context?: string;
}

/**
 * Handle authentication errors with user-friendly messages
 */
export function handleAuthError(error: any): AppError {
  // Default error message
  let message = "An unexpected error occurred";
  let code = "UNKNOWN_ERROR";

  // Check for specific error types
  if (error instanceof Error) {
    message = error.message;
  }

  // Handle specific error codes
  if (error?.code) {
    code = error.code;

    switch (error.code) {
      case "INVALID_CREDENTIALS":
        message = "Invalid email or password";
        break;
      case "USER_NOT_FOUND":
        message = "No account found with this email";
        break;
      case "EMAIL_ALREADY_EXISTS":
        message = "An account with this email already exists";
        break;
      case "WEAK_PASSWORD":
        message = "Password is too weak";
        break;
      case "NETWORK_ERROR":
        message = "Network connection error. Please try again";
        break;
      case "SESSION_EXPIRED":
        message = "Your session has expired. Please sign in again";
        break;
    }
  }

  return {
    message,
    code,
    statusCode: error?.statusCode,
    context: error?.context,
  };
}

/**
 * Show error alert to user
 */
export function showErrorAlert(
  title: string,
  message: string,
  onDismiss?: () => void
) {
  Alert.alert(title, message, [{ text: "OK", onPress: onDismiss }]);
}

/**
 * Show success alert to user
 */
export function showSuccessAlert(
  title: string,
  message: string,
  onDismiss?: () => void
) {
  Alert.alert(title, message, [{ text: "OK", onPress: onDismiss }]);
}

/**
 * Show confirmation dialog
 */
export function showConfirmDialog(
  title: string,
  message: string,
  onConfirm: () => void,
  onCancel?: () => void,
  confirmText: string = "Confirm",
  cancelText: string = "Cancel"
) {
  Alert.alert(title, message, [
    { text: cancelText, style: "cancel", onPress: onCancel },
    { text: confirmText, style: "destructive", onPress: onConfirm },
  ]);
}

/**
 * Log error (in production, this would send to error tracking service)
 */
export function logError(error: AppError, context?: string) {
  if (__DEV__) {
    console.error("[Error]", context || "", error);
  }

  // TODO: In production, send to error tracking service (e.g., Sentry)
}
