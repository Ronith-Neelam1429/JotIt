import { Link, router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ProfileAvatar } from '@/components/profile-avatar';
import { useAuth } from '@/providers/auth-provider';
import { type Jot, type JotKind, useJots } from '@/providers/jots-provider';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function getJotPreview(jot: Jot) {
  if (jot.kind === 'list') {
    return jot.entries.at(-1)?.text ?? 'No entries yet';
  }

  return jot.documentContent.trim().replace(/\s+/g, ' ') || 'Blank document';
}

function getJotMeta(jot: Jot) {
  if (jot.kind === 'list') {
    return `${jot.entries.length} ${jot.entries.length === 1 ? 'item' : 'items'}`;
  }

  const wordCount = jot.documentContent.trim()
    ? jot.documentContent.trim().split(/\s+/).length
    : 0;
  return `${wordCount} ${wordCount === 1 ? 'word' : 'words'}`;
}

export default function HomeScreen() {
  const { user } = useAuth();
  const { createJot: createStoredJot, isLoading, jots, syncError } = useJots();
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [jotTitle, setJotTitle] = useState('');
  const [selectedKind, setSelectedKind] = useState<JotKind | null>(null);

  const firstName = useMemo(
    () => user?.displayName?.trim().split(/\s+/)[0] || 'there',
    [user?.displayName],
  );

  function closeComposer() {
    setIsComposerOpen(false);
    setJotTitle('');
    setSelectedKind(null);
  }

  function createAndOpenJot(kind: JotKind, title = jotTitle.trim() || 'Untitled') {
    const jot = createStoredJot(title, kind);
    closeComposer();
    router.push({ pathname: '/jot/[jotId]', params: { jotId: jot.id } });
  }

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <View style={styles.topRow}>
          <View style={styles.brandButton}>
            <Text style={styles.brandGridIcon}>▦</Text>
          </View>
          <Text style={styles.brand}>JotIt</Text>
          <Link href="/account" asChild>
            <Pressable
              accessibilityLabel="Open account settings"
              accessibilityRole="button"
              hitSlop={8}
              style={({ pressed }) => [styles.profileButton, pressed && styles.pressed]}>
              <ProfileAvatar
                displayName={user?.displayName}
                email={user?.email}
                photoURL={user?.photoURL}
                size={44}
              />
            </Pressable>
          </Link>
        </View>

        <View style={styles.hero}>
          <Text style={styles.eyebrow}>
            {getGreeting()}, {firstName}
          </Text>
          <Text accessibilityRole="header" style={styles.heading}>
            Let’s remember it.{`\n`}Together.
          </Text>
          <Text style={styles.description}>
            Quick lists and little reminders, shared with the people who matter.
          </Text>
        </View>

        {syncError ? (
          <View style={styles.syncError}>
            <Text style={styles.syncErrorTitle}>Couldn’t sync your jots</Text>
            <Text style={styles.syncErrorDescription}>{syncError}</Text>
          </View>
        ) : null}

        {isLoading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator color="#25634D" size="large" />
            <Text style={styles.loadingLabel}>Loading your jots…</Text>
          </View>
        ) : jots.length ? (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Your jots</Text>
              <Text style={styles.sectionCount}>{jots.length}</Text>
            </View>

            <View style={styles.jotList}>
              {jots.map((jot) => (
                <Pressable
                  accessibilityLabel={`Open ${jot.title}`}
                  accessibilityRole="button"
                  key={jot.id}
                  onPress={() =>
                    router.push({ pathname: '/jot/[jotId]', params: { jotId: jot.id } })
                  }
                  style={({ pressed }) => [styles.jotCard, pressed && styles.jotCardPressed]}>
                  <View style={[styles.jotIcon, { backgroundColor: jot.accent }]}>
                    <Text style={styles.jotEmoji}>{jot.emoji}</Text>
                  </View>
                  <View style={styles.jotCopy}>
                    <View style={styles.jotTitleRow}>
                      <Text numberOfLines={1} style={styles.jotTitle}>{jot.title}</Text>
                      <Text style={styles.updatedAt}>Just now</Text>
                    </View>
                    <Text numberOfLines={1} style={styles.jotPreview}>
                      {getJotPreview(jot)}
                    </Text>
                    <View style={styles.jotMetaRow}>
                      <Text style={styles.jotType}>
                        {jot.kind === 'list' ? 'List' : 'Free write'}
                      </Text>
                      <Text style={styles.itemCount}>{getJotMeta(jot)}</Text>
                    </View>
                  </View>
                  <Text style={styles.chevron}>›</Text>
                </Pressable>
              ))}
            </View>
          </>
        ) : (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Text style={styles.emptyIconText}>✎</Text>
            </View>
            <Text style={styles.emptyTitle}>Your first jot starts here</Text>
            <Text style={styles.emptyDescription}>
              Create a jot for anything you want to remember or share.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => setIsComposerOpen(true)}
              style={({ pressed }) => [styles.emptyButton, pressed && styles.pressed]}>
              <Text style={styles.emptyButtonLabel}>Create your first jot</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      <View style={styles.bottomDock}>
        <View style={styles.navItem}>
          <Text style={styles.homeIcon}>⌂</Text>
          <Text style={styles.navLabelActive}>Home</Text>
        </View>

        <Pressable
          accessibilityLabel="Create a new jot"
          accessibilityRole="button"
          disabled={isLoading}
          onPress={() => setIsComposerOpen(true)}
          style={({ pressed }) => [
            styles.createButton,
            isLoading && styles.createButtonDisabled,
            pressed && styles.createButtonPressed,
          ]}>
          <Text style={styles.plusIcon}>+</Text>
        </Pressable>

        <Link href="/account" asChild>
          <Pressable
            accessibilityLabel="Open account settings"
            accessibilityRole="button"
            style={({ pressed }) => [styles.navItem, pressed && styles.pressed]}>
            <ProfileAvatar
              displayName={user?.displayName}
              email={user?.email}
              photoURL={user?.photoURL}
              size={23}
            />
            <Text style={styles.navLabel}>Account</Text>
          </Pressable>
        </Link>
      </View>

      <Modal
        animationType="slide"
        onRequestClose={closeComposer}
        presentationStyle="pageSheet"
        visible={isComposerOpen}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.composerScreen}>
          <SafeAreaView style={styles.composerSafeArea}>
            <View style={styles.composerHeader}>
              <Pressable
                accessibilityRole="button"
                onPress={closeComposer}
                style={({ pressed }) => pressed && styles.pressed}>
                <Text style={styles.cancelLabel}>Cancel</Text>
              </Pressable>
              <Text style={styles.composerTitle}>New jot</Text>
              <View style={styles.composerHeaderSpacer} />
            </View>
            <ScrollView
              contentContainerStyle={styles.composerContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}>
              <Text style={styles.composerPrompt}>Create a new jot</Text>
              <Text style={styles.composerHint}>
                Give it a name if you want, then choose how you’ll use it.
              </Text>

              <Text style={styles.fieldLabel}>Name (optional)</Text>
              <TextInput
                autoFocus
                maxLength={50}
                onChangeText={setJotTitle}
                placeholder="Groceries, trip ideas, meeting notes…"
                placeholderTextColor="#89938D"
                returnKeyType="done"
                selectionColor="#25634D"
                style={styles.composerInput}
                value={jotTitle}
              />

              <Text style={styles.fieldLabel}>Format</Text>
              <View style={styles.formatList}>
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ selected: selectedKind === 'list' }}
                  onPress={() => setSelectedKind('list')}
                  style={({ pressed }) => [
                    styles.formatCard,
                    selectedKind === 'list' && styles.formatCardSelected,
                    pressed && styles.formatCardPressed,
                  ]}>
                  <View style={[styles.formatIcon, styles.listFormatIcon]}>
                    <Text style={styles.listFormatMark}>☷</Text>
                  </View>
                  <View style={styles.formatCopy}>
                    <Text style={styles.formatTitle}>List</Text>
                    <Text style={styles.formatDescription}>
                      Add quick items and check them off as you go.
                    </Text>
                  </View>
                  <View style={[styles.radio, selectedKind === 'list' && styles.radioSelected]}>
                    {selectedKind === 'list' ? <View style={styles.radioDot} /> : null}
                  </View>
                </Pressable>

                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ selected: selectedKind === 'document' }}
                  onPress={() => setSelectedKind('document')}
                  style={({ pressed }) => [
                    styles.formatCard,
                    selectedKind === 'document' && styles.formatCardSelected,
                    pressed && styles.formatCardPressed,
                  ]}>
                  <View style={[styles.formatIcon, styles.documentFormatIcon]}>
                    <Text style={styles.documentFormatMark}>Aa</Text>
                  </View>
                  <View style={styles.formatCopy}>
                    <Text style={styles.formatTitle}>Free write</Text>
                    <Text style={styles.formatDescription}>
                      Write freely in a flexible document style space.
                    </Text>
                  </View>
                  <View style={[styles.radio, selectedKind === 'document' && styles.radioSelected]}>
                    {selectedKind === 'document' ? <View style={styles.radioDot} /> : null}
                  </View>
                </Pressable>
              </View>

              <Pressable
                accessibilityRole="button"
                disabled={!selectedKind}
                onPress={() => selectedKind && createAndOpenJot(selectedKind)}
                style={({ pressed }) => [
                  styles.composerButton,
                  !selectedKind && styles.composerButtonDisabled,
                  pressed && selectedKind && styles.pressed,
                ]}>
                <Text style={styles.composerButtonLabel}>Continue</Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                onPress={() => createAndOpenJot('document')}
                style={({ pressed }) => [styles.skipButton, pressed && styles.pressed]}>
                <Text style={styles.skipButtonLabel}>Skip</Text>
              </Pressable>
              <Text style={styles.skipHint}>Skip opens a blank Free write jot.</Text>
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: '#F6F5EF', flex: 1 },
  content: {
    alignSelf: 'center',
    maxWidth: 560,
    paddingBottom: 132,
    paddingHorizontal: 22,
    width: '100%',
  },
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 10,
  },
  brandButton: {
    alignItems: 'center',
    backgroundColor: '#E7E6DF',
    borderRadius: 14,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  brandGridIcon: { color: '#1D2B25', fontSize: 24, fontWeight: '600', lineHeight: 25 },
  brand: { color: '#1D2B25', fontSize: 18, fontWeight: '800', letterSpacing: -0.4 },
  profileButton: { borderRadius: 22 },
  pressed: { opacity: 0.62 },
  hero: { gap: 10, paddingBottom: 24, paddingTop: 28 },
  eyebrow: {
    color: '#567064',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  heading: {
    color: '#17231E',
    fontSize: 43,
    fontWeight: '700',
    letterSpacing: -1.7,
    lineHeight: 47,
  },
  description: { color: '#66746D', fontSize: 15, lineHeight: 22, maxWidth: 360 },
  syncError: {
    backgroundColor: '#FBECE9',
    borderColor: '#F1C7C0',
    borderRadius: 16,
    borderWidth: 1,
    gap: 4,
    marginBottom: 10,
    padding: 14,
  },
  syncErrorTitle: { color: '#9B352D', fontSize: 14, fontWeight: '700' },
  syncErrorDescription: { color: '#874942', fontSize: 12, lineHeight: 18 },
  loadingState: { alignItems: 'center', gap: 12, paddingVertical: 52 },
  loadingLabel: { color: '#6F7C75', fontSize: 14 },
  emptyState: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E8E5DC',
    borderRadius: 24,
    borderWidth: 1,
    gap: 10,
    marginTop: 16,
    paddingHorizontal: 28,
    paddingVertical: 36,
  },
  emptyIcon: {
    alignItems: 'center',
    backgroundColor: '#E4EEE8',
    borderRadius: 28,
    height: 56,
    justifyContent: 'center',
    marginBottom: 4,
    width: 56,
  },
  emptyIconText: { color: '#25634D', fontSize: 28, lineHeight: 31 },
  emptyTitle: { color: '#1D2B25', fontSize: 20, fontWeight: '700', textAlign: 'center' },
  emptyDescription: {
    color: '#6F7C75',
    fontSize: 14,
    lineHeight: 21,
    maxWidth: 280,
    textAlign: 'center',
  },
  emptyButton: {
    alignItems: 'center',
    backgroundColor: '#25634D',
    borderRadius: 14,
    justifyContent: 'center',
    marginTop: 8,
    minHeight: 48,
    paddingHorizontal: 20,
  },
  emptyButtonLabel: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
    marginTop: 28,
  },
  sectionTitle: { color: '#1D2B25', fontSize: 21, fontWeight: '700', letterSpacing: -0.5 },
  sectionCount: {
    backgroundColor: '#E2E5DD',
    borderRadius: 10,
    color: '#657169',
    fontSize: 12,
    fontWeight: '700',
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  jotList: { gap: 10 },
  jotCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#EBE9E1',
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 13,
    padding: 13,
  },
  jotCardPressed: { opacity: 0.68, transform: [{ scale: 0.99 }] },
  jotIcon: {
    alignItems: 'center',
    borderRadius: 14,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  jotEmoji: { fontSize: 23 },
  jotCopy: { flex: 1, gap: 5 },
  jotTitleRow: { alignItems: 'baseline', flexDirection: 'row', gap: 8, justifyContent: 'space-between' },
  jotTitle: { color: '#213129', flex: 1, fontSize: 16, fontWeight: '700' },
  updatedAt: { color: '#929A95', fontSize: 10 },
  jotPreview: { color: '#78847D', fontSize: 12 },
  jotMetaRow: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  jotType: {
    backgroundColor: '#EDF1EE',
    borderRadius: 7,
    color: '#587064',
    fontSize: 10,
    fontWeight: '700',
    overflow: 'hidden',
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  itemCount: { color: '#78847D', fontSize: 11 },
  chevron: { color: '#839087', fontSize: 28, fontWeight: '300', lineHeight: 30 },
  bottomDock: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E8E6DE',
    borderRadius: 27,
    borderWidth: 1,
    bottom: 22,
    flexDirection: 'row',
    height: 72,
    justifyContent: 'space-around',
    left: 28,
    paddingHorizontal: 26,
    position: 'absolute',
    right: 28,
    shadowColor: '#24352D',
    shadowOffset: { height: 8, width: 0 },
    shadowOpacity: 0.11,
    shadowRadius: 20,
  },
  navItem: { alignItems: 'center', gap: 3, minWidth: 58, paddingVertical: 7 },
  homeIcon: { color: '#1F6B52', fontSize: 27, fontWeight: '700', lineHeight: 25 },
  navLabel: { color: '#7E8983', fontSize: 10, fontWeight: '600' },
  navLabelActive: { color: '#1F6B52', fontSize: 10, fontWeight: '700' },
  createButton: {
    alignItems: 'center',
    backgroundColor: '#17231E',
    borderColor: '#F6F5EF',
    borderRadius: 31,
    borderWidth: 5,
    height: 62,
    justifyContent: 'center',
    marginTop: -42,
    shadowColor: '#17231E',
    shadowOffset: { height: 6, width: 0 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    width: 62,
  },
  createButtonPressed: { opacity: 0.78, transform: [{ scale: 0.96 }] },
  createButtonDisabled: { backgroundColor: '#7C8882' },
  plusIcon: { color: '#FFFFFF', fontSize: 36, fontWeight: '300', lineHeight: 38 },
  composerScreen: { backgroundColor: '#F6F5EF', flex: 1 },
  composerSafeArea: { flex: 1 },
  composerHeader: {
    alignItems: 'center',
    borderBottomColor: '#E4E2DA',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingVertical: 16,
  },
  cancelLabel: { color: '#25634D', fontSize: 16, fontWeight: '600' },
  composerTitle: { color: '#1D2B25', fontSize: 17, fontWeight: '700' },
  composerHeaderSpacer: { width: 53 },
  composerContent: { gap: 14, padding: 24, paddingBottom: 40, paddingTop: 30 },
  composerPrompt: { color: '#17231E', fontSize: 31, fontWeight: '700', letterSpacing: -1 },
  composerHint: { color: '#68766F', fontSize: 15, lineHeight: 22 },
  fieldLabel: { color: '#52625A', fontSize: 13, fontWeight: '700', marginTop: 4 },
  composerInput: {
    backgroundColor: '#FFFFFF',
    borderColor: '#DBD9D1',
    borderRadius: 16,
    borderWidth: 1,
    color: '#17231E',
    fontSize: 17,
    minHeight: 58,
    paddingHorizontal: 17,
  },
  composerButton: {
    alignItems: 'center',
    backgroundColor: '#25634D',
    borderRadius: 16,
    justifyContent: 'center',
    minHeight: 56,
  },
  composerButtonDisabled: { backgroundColor: '#B7C1BB' },
  composerButtonLabel: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  formatList: { gap: 12, marginTop: 12 },
  formatCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E1DED6',
    borderRadius: 19,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 14,
    padding: 15,
  },
  formatCardSelected: { borderColor: '#25634D', borderWidth: 2, padding: 14 },
  formatCardPressed: { opacity: 0.68, transform: [{ scale: 0.99 }] },
  formatIcon: {
    alignItems: 'center',
    borderRadius: 15,
    height: 54,
    justifyContent: 'center',
    width: 54,
  },
  listFormatIcon: { backgroundColor: '#D7E7DF' },
  documentFormatIcon: { backgroundColor: '#D9D0E8' },
  listFormatMark: { color: '#315D4A', fontSize: 28, lineHeight: 31 },
  documentFormatMark: { color: '#57496A', fontSize: 19, fontWeight: '800' },
  formatCopy: { flex: 1, gap: 4 },
  formatTitle: { color: '#203129', fontSize: 17, fontWeight: '700' },
  formatDescription: { color: '#758179', fontSize: 13, lineHeight: 18 },
  radio: {
    alignItems: 'center',
    borderColor: '#AAB4AE',
    borderRadius: 11,
    borderWidth: 1.5,
    height: 22,
    justifyContent: 'center',
    width: 22,
  },
  radioSelected: { borderColor: '#25634D' },
  radioDot: { backgroundColor: '#25634D', borderRadius: 6, height: 12, width: 12 },
  skipButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#B9C6BF',
    borderRadius: 16,
    borderWidth: 1.5,
    justifyContent: 'center',
    minHeight: 56,
  },
  skipButtonLabel: { color: '#25634D', fontSize: 16, fontWeight: '700' },
  skipHint: { color: '#758179', fontSize: 12, marginTop: -4, textAlign: 'center' },
});
