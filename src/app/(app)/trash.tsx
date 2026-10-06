import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/providers/auth-provider';
import { type Jot, useJots } from '@/providers/jots-provider';

const DAY_MS = 24 * 60 * 60 * 1000;
const RETENTION_DAYS = 30;

function daysRemaining(jot: Jot) {
  if (!jot.trashedAt) return RETENTION_DAYS;
  const expiresAt = jot.trashedAt + RETENTION_DAYS * DAY_MS;
  return Math.max(0, Math.ceil((expiresAt - Date.now()) / DAY_MS));
}

export default function TrashScreen() {
  const { user } = useAuth();
  const { deleteJotPermanently, isLoading, restoreJot, syncError, trashedJots } = useJots();
  const [busyJotId, setBusyJotId] = useState<string | null>(null);

  async function handleRestore(jotId: string) {
    setBusyJotId(jotId);
    try {
      await restoreJot(jotId);
    } catch {
      // The provider exposes the Firestore error below.
    } finally {
      setBusyJotId(null);
    }
  }

  function confirmPermanentDelete(jot: Jot) {
    Alert.alert(
      'Delete permanently?',
      `“${jot.title}” will be deleted immediately and cannot be recovered.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          onPress: () => {
            setBusyJotId(jot.id);
            void deleteJotPermanently(jot.id)
              .catch(() => undefined)
              .finally(() => setBusyJotId(null));
          },
          style: 'destructive',
          text: 'Delete permanently',
        },
      ],
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
            <Text style={styles.backLabel}>‹ Back</Text>
          </Pressable>
          <Text accessibilityRole="header" style={styles.title}>Trash</Text>
          <Text style={styles.description}>
            Jots in Trash are automatically deleted permanently after 30 days.
          </Text>
        </View>

        {syncError ? <Text style={styles.errorBanner}>{syncError}</Text> : null}

        {isLoading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator color="#25634D" size="large" />
          </View>
        ) : trashedJots.length ? (
          <View style={styles.jotList}>
            {trashedJots.map((jot) => {
              const isBusy = busyJotId === jot.id;
              const canPermanentlyDelete = jot.ownerId === user?.uid;
              const remainingDays = daysRemaining(jot);

              return (
                <View key={jot.id} style={styles.jotCard}>
                  <View style={styles.jotHeader}>
                    <View style={[styles.jotIcon, { backgroundColor: jot.accent }]}>
                      <Text style={styles.jotEmoji}>{jot.emoji}</Text>
                    </View>
                    <View style={styles.jotCopy}>
                      <Text numberOfLines={1} style={styles.jotTitle}>{jot.title}</Text>
                      <Text style={styles.expiryText}>
                        {remainingDays
                          ? `${remainingDays} ${remainingDays === 1 ? 'day' : 'days'} remaining`
                          : 'Deleting soon'}
                      </Text>
                    </View>
                    {isBusy ? <ActivityIndicator color="#25634D" size="small" /> : null}
                  </View>

                  <View style={styles.actions}>
                    <Pressable
                      accessibilityRole="button"
                      disabled={isBusy}
                      onPress={() => void handleRestore(jot.id)}
                      style={({ pressed }) => [styles.restoreButton, pressed && styles.pressed]}>
                      <Text style={styles.restoreLabel}>Restore</Text>
                    </Pressable>
                    {canPermanentlyDelete ? (
                      <Pressable
                        accessibilityRole="button"
                        disabled={isBusy}
                        onPress={() => confirmPermanentDelete(jot)}
                        style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed]}>
                        <Text style={styles.deleteLabel}>Delete permanently</Text>
                      </Pressable>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>♲</Text>
            <Text style={styles.emptyTitle}>Trash is empty</Text>
            <Text style={styles.emptyDescription}>
              Jots you move to Trash will appear here for 30 days.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: '#F8F6F0', flex: 1 },
  content: {
    alignSelf: 'center',
    gap: 24,
    maxWidth: 560,
    padding: 24,
    paddingBottom: 48,
    width: '100%',
  },
  header: { gap: 10 },
  backButton: { alignSelf: 'flex-start', paddingVertical: 4 },
  backLabel: { color: '#25634D', fontSize: 17, fontWeight: '600' },
  title: { color: '#182B24', fontSize: 38, fontWeight: '700' },
  description: { color: '#68766F', fontSize: 15, lineHeight: 22 },
  errorBanner: {
    backgroundColor: '#FDECEA',
    borderColor: '#F1C7C2',
    borderRadius: 12,
    borderWidth: 1,
    color: '#A7372F',
    fontSize: 13,
    lineHeight: 18,
    padding: 12,
  },
  loadingState: { alignItems: 'center', paddingVertical: 70 },
  jotList: { gap: 12 },
  jotCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E2D9',
    borderRadius: 20,
    borderWidth: 1,
    gap: 15,
    padding: 15,
  },
  jotHeader: { alignItems: 'center', flexDirection: 'row', gap: 13 },
  jotIcon: {
    alignItems: 'center',
    borderRadius: 14,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  jotEmoji: { color: '#264B3C', fontSize: 23 },
  jotCopy: { flex: 1, gap: 5 },
  jotTitle: { color: '#213129', fontSize: 17, fontWeight: '700' },
  expiryText: { color: '#7A867F', fontSize: 12 },
  actions: { flexDirection: 'row', gap: 10 },
  restoreButton: {
    alignItems: 'center',
    backgroundColor: '#E7F1EC',
    borderRadius: 12,
    flex: 1,
    justifyContent: 'center',
    minHeight: 44,
  },
  restoreLabel: { color: '#25634D', fontSize: 14, fontWeight: '700' },
  deleteButton: {
    alignItems: 'center',
    backgroundColor: '#FDECEA',
    borderColor: '#F1C7C2',
    borderRadius: 12,
    borderWidth: 1,
    flex: 1.35,
    justifyContent: 'center',
    minHeight: 44,
  },
  deleteLabel: { color: '#A7372F', fontSize: 13, fontWeight: '700' },
  emptyState: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E2D9',
    borderRadius: 22,
    borderWidth: 1,
    gap: 9,
    paddingHorizontal: 28,
    paddingVertical: 48,
  },
  emptyIcon: { color: '#60756A', fontSize: 34 },
  emptyTitle: { color: '#26362E', fontSize: 20, fontWeight: '700' },
  emptyDescription: { color: '#7A867F', fontSize: 14, lineHeight: 20, textAlign: 'center' },
  pressed: { opacity: 0.62 },
});
