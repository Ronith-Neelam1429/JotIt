import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ProfileAvatar } from '@/components/profile-avatar';
import { getAuthErrorMessage } from '@/lib/auth-errors';
import {
  sendPasswordReset,
  signOutCurrentUser,
  updateCurrentUserProfile,
} from '@/lib/firebase-auth';
import { uploadProfilePhoto } from '@/lib/firebase-storage';
import { useAuth } from '@/providers/auth-provider';

export default function AccountScreen() {
  const { refreshUser, user } = useAuth();
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [photoPreviewUri, setPhotoPreviewUri] = useState<string | null>(null);

  const hasPassword = user?.providerData.some(
    ({ providerId }) => providerId === 'password',
  );

  function beginAction() {
    setError('');
    setMessage('');
  }

  async function handleChoosePhoto() {
    beginAction();
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      setError('Allow photo access in Settings to choose a profile picture.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      mediaTypes: ['images'],
      quality: 0.8,
    });

    const asset = result.assets?.[0];
    if (result.canceled || !asset || !user) {
      return;
    }

    setPhotoPreviewUri(asset.uri);
    setIsUploadingPhoto(true);

    try {
      const photoURL = await uploadProfilePhoto(
        user.uid,
        asset.uri,
        asset.mimeType ?? 'image/jpeg',
      );
      await updateCurrentUserProfile({ photoURL });
      await refreshUser();
      setPhotoPreviewUri(photoURL);
      setMessage('Profile picture updated.');
    } catch (caughtError) {
      setPhotoPreviewUri(null);
      setError(getAuthErrorMessage(caughtError));
    } finally {
      setIsUploadingPhoto(false);
    }
  }

  async function handleSaveName() {
    const trimmedName = displayName.trim();

    if (!trimmedName) {
      setError('Enter the name you want people to see.');
      return;
    }

    beginAction();
    setIsSavingName(true);

    try {
      await updateCurrentUserProfile({ displayName: trimmedName });
      await refreshUser();
      setDisplayName(trimmedName);
      setMessage('Name saved.');
    } catch (caughtError) {
      setError(getAuthErrorMessage(caughtError));
    } finally {
      setIsSavingName(false);
    }
  }

  async function handlePasswordReset() {
    if (!user?.email) {
      setError('This account does not have an email address.');
      return;
    }

    beginAction();
    setIsSendingReset(true);

    try {
      await sendPasswordReset(user.email);
      setMessage(`Password reset instructions were sent to ${user.email}.`);
    } catch (caughtError) {
      setError(getAuthErrorMessage(caughtError));
    } finally {
      setIsSendingReset(false);
    }
  }

  async function handleSignOut() {
    beginAction();
    setIsSigningOut(true);

    try {
      await signOutCurrentUser();
    } catch (caughtError) {
      setError(getAuthErrorMessage(caughtError));
      setIsSigningOut(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.pressed,
            ]}>
            <Text style={styles.backLabel}>‹ Back</Text>
          </Pressable>
          <Text accessibilityRole="header" style={styles.title}>
            Account
          </Text>
        </View>

        <View style={styles.photoSection}>
          <ProfileAvatar
            displayName={user?.displayName}
            email={user?.email}
            photoURL={photoPreviewUri ?? user?.photoURL}
            size={104}
          />
          <Pressable
            accessibilityRole="button"
            disabled={isUploadingPhoto}
            onPress={handleChoosePhoto}
            style={({ pressed }) => [
              styles.photoButton,
              pressed && styles.pressed,
            ]}>
            {isUploadingPhoto ? (
              <ActivityIndicator color="#25634D" />
            ) : (
              <Text style={styles.photoButtonLabel}>Change photo</Text>
            )}
          </Pressable>
        </View>

        {error ? (
          <View accessibilityLiveRegion="polite" style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}
        {message ? (
          <View accessibilityLiveRegion="polite" style={styles.successBox}>
            <Text style={styles.successText}>{message}</Text>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile</Text>
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Name</Text>
            <TextInput
              accessibilityLabel="Name"
              autoCapitalize="words"
              autoComplete="name"
              onChangeText={setDisplayName}
              placeholder="Your display name"
              placeholderTextColor="#89938D"
              selectionColor="#25634D"
              style={styles.input}
              textContentType="name"
              value={displayName}
            />
          </View>
          <Pressable
            accessibilityRole="button"
            disabled={isSavingName}
            onPress={handleSaveName}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.pressed,
            ]}>
            {isSavingName ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonLabel}>Save name</Text>
            )}
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sign-in details</Text>
          <View style={styles.detailRow}>
            <View style={styles.detailText}>
              <Text style={styles.label}>Email</Text>
              <Text selectable style={styles.detailValue}>
                {user?.email ?? 'No email address'}
              </Text>
            </View>
          </View>
          <View style={styles.separator} />
          <View style={styles.detailRow}>
            <View style={styles.detailText}>
              <Text style={styles.label}>Password</Text>
              <Text style={styles.detailValue}>
                {hasPassword ? '••••••••' : 'Managed by Google'}
              </Text>
            </View>
            {hasPassword ? (
              <Pressable
                accessibilityRole="button"
                disabled={isSendingReset}
                onPress={handlePasswordReset}
                style={({ pressed }) => [
                  styles.inlineButton,
                  pressed && styles.pressed,
                ]}>
                {isSendingReset ? (
                  <ActivityIndicator color="#25634D" size="small" />
                ) : (
                  <Text style={styles.inlineButtonLabel}>Reset</Text>
                )}
              </Pressable>
            ) : null}
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          disabled={isSigningOut}
          onPress={handleSignOut}
          style={({ pressed }) => [
            styles.logoutButton,
            pressed && styles.pressed,
          ]}>
          {isSigningOut ? (
            <ActivityIndicator color="#A7372F" />
          ) : (
            <Text style={styles.logoutLabel}>Log out</Text>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: '#F8F6F0', flex: 1 },
  content: {
    alignSelf: 'center',
    gap: 20,
    maxWidth: 560,
    padding: 24,
    paddingBottom: 48,
    width: '100%',
  },
  header: { gap: 14 },
  backButton: { alignSelf: 'flex-start', paddingVertical: 4 },
  backLabel: { color: '#25634D', fontSize: 17, fontWeight: '600' },
  title: { color: '#182B24', fontSize: 38, fontWeight: '700' },
  photoSection: { alignItems: 'center', gap: 12, paddingVertical: 8 },
  photoButton: { minHeight: 32, minWidth: 120 },
  photoButtonLabel: {
    color: '#25634D',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E2D9',
    borderRadius: 20,
    borderWidth: 1,
    gap: 16,
    padding: 20,
  },
  sectionTitle: { color: '#182B24', fontSize: 19, fontWeight: '700' },
  fieldGroup: { gap: 8 },
  label: { color: '#53635B', fontSize: 14, fontWeight: '600' },
  input: {
    backgroundColor: '#F8F6F0',
    borderColor: '#DAD7CE',
    borderRadius: 14,
    borderWidth: 1,
    color: '#182B24',
    fontSize: 16,
    minHeight: 52,
    paddingHorizontal: 16,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#25634D',
    borderRadius: 14,
    justifyContent: 'center',
    minHeight: 50,
  },
  primaryButtonLabel: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  detailRow: { alignItems: 'center', flexDirection: 'row', gap: 16 },
  detailText: { flex: 1, gap: 6 },
  detailValue: { color: '#182B24', fontSize: 16 },
  separator: { backgroundColor: '#ECE9E2', height: 1 },
  inlineButton: {
    alignItems: 'center',
    borderColor: '#AFC3B9',
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 38,
    minWidth: 68,
    paddingHorizontal: 12,
  },
  inlineButtonLabel: { color: '#25634D', fontSize: 14, fontWeight: '700' },
  logoutButton: {
    alignItems: 'center',
    backgroundColor: '#FDECEA',
    borderColor: '#F1C7C2',
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 52,
  },
  logoutLabel: { color: '#A7372F', fontSize: 16, fontWeight: '700' },
  pressed: { opacity: 0.65 },
  errorBox: { backgroundColor: '#FDECEA', borderRadius: 12, padding: 12 },
  errorText: { color: '#9B2C25', fontSize: 14, lineHeight: 20 },
  successBox: { backgroundColor: '#E7F3EC', borderRadius: 12, padding: 12 },
  successText: { color: '#25634D', fontSize: 14, lineHeight: 20 },
});
