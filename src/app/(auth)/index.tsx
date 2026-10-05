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
import { signIn, signInWithGoogle } from '@/lib/firebase-auth';

export default function SignInScreen() {
  const passwordInput = useRef<TextInput>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);

  async function handleSignIn() {
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      await signIn(email, password);
    } catch (caughtError) {
      setError(getAuthErrorMessage(caughtError));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGoogleSignIn() {
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
          New to JotIt?{' '}
          <Link href="/sign-up" style={styles.linkStrong}>
            Create an account
          </Link>
        </Text>
      }
      subtitle="Sign in to get back to the lists you share with your favorite people."
      title="Welcome back">
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
        autoComplete="current-password"
        label="Password"
        onChangeText={setPassword}
        onSubmitEditing={handleSignIn}
        placeholder="Enter your password"
        ref={passwordInput}
        returnKeyType="done"
        secureTextEntry
        textContentType="password"
        value={password}
      />
      <View style={styles.forgotRow}>
        <Link href="/forgot-password" style={styles.link}>
          Forgot password?
        </Link>
      </View>
      {error ? <FormError message={error} /> : null}
      <PrimaryButton
        isLoading={isSubmitting}
        label="Sign in"
        onPress={handleSignIn}
      />
      <View accessibilityRole="none" style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or</Text>
        <View style={styles.dividerLine} />
      </View>
      <View style={styles.googleButtonContainer}>
        <GoogleSignInButton
          accessibilityLabel="Continue with Google"
          colorScheme="light"
          disabled={isSubmitting || isGoogleSubmitting}
          loading={isGoogleSubmitting}
          onPress={handleGoogleSignIn}
          signInBehavior="none"
          size="wide"
        />
      </View>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  forgotRow: { alignItems: 'flex-end' },
  link: { color: '#25634D', fontSize: 15, fontWeight: '600' },
  linkStrong: { color: '#25634D', fontWeight: '700' },
  footerText: { color: '#53635B', fontSize: 15, textAlign: 'center' },
  dividerRow: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  dividerLine: { backgroundColor: '#E0DDD5', flex: 1, height: 1 },
  dividerText: { color: '#78847D', fontSize: 14 },
  googleButtonContainer: { alignItems: 'center' },
});
