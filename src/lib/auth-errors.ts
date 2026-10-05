type FirebaseErrorLike = {
  code?: string;
};

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  'auth/email-already-in-use': 'An account already exists for that email.',
  'auth/account-exists-with-different-credential':
    'An account already exists with this email. Sign in with its original method first.',
  'auth/invalid-credential': 'The email or password is incorrect.',
  'auth/invalid-email': 'Enter a valid email address.',
  'auth/missing-password': 'Enter your password.',
  'auth/network-request-failed':
    'We could not connect. Check your internet connection and try again.',
  'auth/operation-not-allowed':
    'Email sign-in has not been enabled for this Firebase project yet.',
  'auth/too-many-requests':
    'Too many attempts. Wait a moment before trying again.',
  'auth/user-disabled': 'This account has been disabled.',
  'auth/user-not-found': 'The email or password is incorrect.',
  'auth/weak-password': 'Choose a stronger password with at least 6 characters.',
  'auth/wrong-password': 'The email or password is incorrect.',
  DEVELOPER_ERROR:
    'Google Sign-In is not configured correctly for this app build.',
  IN_PROGRESS: 'Google Sign-In is already in progress.',
  ONE_TAP_START_FAILED: 'Google Sign-In could not start. Please try again.',
  PLAY_SERVICES_NOT_AVAILABLE:
    'Google Play Services is unavailable or needs to be updated.',
  SIGN_IN_REQUIRED: 'Choose a Google account to continue.',
};

export function getAuthErrorMessage(error: unknown) {
  if (typeof error === 'object' && error !== null) {
    const code = (error as FirebaseErrorLike).code;
    if (code && AUTH_ERROR_MESSAGES[code]) {
      return AUTH_ERROR_MESSAGES[code];
    }
  }

  return 'Something went wrong. Please try again.';
}
