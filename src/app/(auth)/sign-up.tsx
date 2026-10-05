import { Link } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { GoogleSignInButton } from 'react-native-nitro-google-signin';

import { AuthLayout } from '@/components/auth/auth-layout';
import {
  Field,
  FormError,
  PrimaryButton,
} from '@/components/auth/form-controls';
import { getAuthErrorMessage } from '@/lib/auth-errors';
import { createAccount, signInWithGoogle } from '@/lib/firebase-auth';

export default function SignUpScreen() {
  const passwordInput = useRef<TextInput>(null);
  const confirmPasswordInput = useRef<TextInput>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);

  async function handleCreateAccount() {
    if (!email.trim() || !password || !confirmPassword) {
      setError('Complete all fields to create your account.');
      return;
    }

    if (password.length < 6) {
      setError('Your password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('The passwords do not match.');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      await createAccount(email, password);
    } catch (caughtError) {
      setError(getAuthErrorMessage(caughtError));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGoogleSignUp() {
    setError('');
    setIsGoogleSubmitting(true);

    try {
      await signInWithGoogle();
    } catch (caughtError) {
      setError(getAuthErrorMessage(caughtError));
    } finally {
      setIsGoogleSubmitting(false);
    }
  }

  return (
    <AuthLayout
      footer={
        <Text style={styles.footerText}>
          Already have an account?{' '}
          <Link href="/" style={styles.linkStrong}>
            Sign in
          </Link>
        </Text>
      }
      subtitle="Create an account so your shared jots stay synced across every device."
      title="Start jotting together">
      <Field
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        label="Email"
        onChangeText={setEmail}
        onSubmitEditing={() => passwordInput.current?.focus()}
        placeholder="you@example.com"
        returnKeyType="next"
        textContentType="emailAddress"
        value={email}
      />
      <Field
        autoCapitalize="none"
        autoComplete="new-password"
        label="Password"
        onChangeText={setPassword}
        onSubmitEditing={() => confirmPasswordInput.current?.focus()}
        placeholder="At least 6 characters"
        ref={passwordInput}
        returnKeyType="next"
        secureTextEntry
        textContentType="newPassword"
        value={password}
      />
      <Field
        autoCapitalize="none"
        autoComplete="new-password"
        label="Confirm password"
        onChangeText={setConfirmPassword}
        onSubmitEditing={handleCreateAccount}
        placeholder="Enter it again"
        ref={confirmPasswordInput}
        returnKeyType="done"
        secureTextEntry
        textContentType="newPassword"
        value={confirmPassword}
      />
      {error ? <FormError message={error} /> : null}
      <PrimaryButton
        isLoading={isSubmitting}
        label="Create account"
        onPress={handleCreateAccount}
      />
      <View accessibilityRole="none" style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or</Text>
        <View style={styles.dividerLine} />
      </View>
      <View style={styles.googleButtonContainer}>
        <GoogleSignInButton
          accessibilityLabel="Sign up with Google"
          colorScheme="light"
          disabled={isSubmitting || isGoogleSubmitting}
          loading={isGoogleSubmitting}
          onPress={handleGoogleSignUp}
          signInBehavior="none"
          size="wide"
        />
      </View>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  linkStrong: { color: '#25634D', fontWeight: '700' },
  footerText: { color: '#53635B', fontSize: 15, textAlign: 'center' },
  dividerRow: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  dividerLine: { backgroundColor: '#E0DDD5', flex: 1, height: 1 },
  dividerText: { color: '#78847D', fontSize: 14 },
  googleButtonContainer: { alignItems: 'center' },
});
