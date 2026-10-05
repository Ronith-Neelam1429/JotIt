import { Link } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { AuthLayout } from '@/components/auth/auth-layout';
import {
  Field,
  FormError,
  PrimaryButton,
} from '@/components/auth/form-controls';
import { getAuthErrorMessage } from '@/lib/auth-errors';
import { sendPasswordReset } from '@/lib/firebase-auth';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);

  async function handleResetPassword() {
    if (!email.trim()) {
      setError('Enter the email address for your account.');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      await sendPasswordReset(email);
      setIsSent(true);
    } catch (caughtError) {
      setError(getAuthErrorMessage(caughtError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthLayout
      footer={
        <Text style={styles.footerText}>
          Remembered it?{' '}
          <Link href="/" style={styles.linkStrong}>
            Back to sign in
          </Link>
        </Text>
      }
      subtitle="We’ll email you a secure link to choose a new password."
      title="Reset your password">
      <Field
        autoCapitalize="none"
        autoComplete="email"
        editable={!isSent}
        keyboardType="email-address"
        label="Email"
        onChangeText={setEmail}
        onSubmitEditing={handleResetPassword}
        placeholder="you@example.com"
        returnKeyType="send"
        textContentType="emailAddress"
        value={email}
      />
      {error ? <FormError message={error} /> : null}
      {isSent ? (
        <Text accessibilityLiveRegion="polite" style={styles.successText}>
          Check your inbox. We sent a password reset link to {email.trim()}.
        </Text>
      ) : (
        <PrimaryButton
          isLoading={isSubmitting}
          label="Send reset link"
          onPress={handleResetPassword}
        />
      )}
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  linkStrong: { color: '#25634D', fontWeight: '700' },
  footerText: { color: '#53635B', fontSize: 15, textAlign: 'center' },
  successText: {
    backgroundColor: '#E7F3EC',
    borderRadius: 12,
    color: '#25634D',
    fontSize: 15,
    lineHeight: 22,
    padding: 14,
  },
});
