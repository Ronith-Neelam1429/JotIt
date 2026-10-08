import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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

import { useJots } from '@/providers/jots-provider';

const JOT_TITLE_MAX_LENGTH = 100;

type JotHeaderProps = {
  onMore: () => void;
  onRename: () => void;
  title: string;
};

function JotHeader({ onMore, onRename, title }: JotHeaderProps) {
  return (
    <View style={styles.header}>
      <Pressable
        accessibilityLabel="Go back"
        accessibilityRole="button"
        hitSlop={10}
        onPress={() => router.back()}
        style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
        <Text style={styles.backIcon}>‹</Text>
      </Pressable>
      <Pressable
        accessibilityHint="Opens the rename form"
        accessibilityLabel={`${title}. Rename jot`}
        accessibilityRole="button"
        onPress={onRename}
        style={({ pressed }) => [styles.headerTitleButton, pressed && styles.pressed]}>
        <Text numberOfLines={1} style={styles.headerTitle}>{title}</Text>
      </Pressable>
      <Pressable
        accessibilityLabel="Jot options"
        accessibilityRole="button"
        hitSlop={10}
        onPress={onMore}
        style={({ pressed }) => [styles.moreButton, pressed && styles.pressed]}>
        <Text style={styles.moreIcon}>•••</Text>
      </Pressable>
    </View>
  );
}

type RenameJotModalProps = {
  error: string;
  isSaving: boolean;
  onCancel: () => void;
  onChangeTitle: (title: string) => void;
  onSave: () => void;
  title: string;
  visible: boolean;
};

function RenameJotModal({
  error,
  isSaving,
  onCancel,
  onChangeTitle,
  onSave,
  title,
  visible,
}: RenameJotModalProps) {
  const canSave = Boolean(title.trim()) && !isSaving;

  return (
    <Modal
      animationType="fade"
      onRequestClose={onCancel}
      presentationStyle="overFullScreen"
      transparent
      visible={visible}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.renameBackdrop}>
        <View accessibilityViewIsModal style={styles.renameCard}>
          <Text accessibilityRole="header" style={styles.renameHeading}>Rename jot</Text>
          <Text style={styles.renameDescription}>
            Choose a short name that is easy for everyone to recognize.
          </Text>
          <TextInput
            accessibilityLabel="Jot name"
            autoFocus
            enterKeyHint="done"
            maxLength={JOT_TITLE_MAX_LENGTH}
            onChangeText={onChangeTitle}
            onSubmitEditing={() => {
              if (canSave) onSave();
            }}
            placeholder="Jot name"
            placeholderTextColor="#909A95"
            returnKeyType="done"
            selectTextOnFocus
            selectionColor="#25634D"
            style={styles.renameInput}
            value={title}
          />
          <Text style={styles.renameCharacterCount}>
            {title.length}/{JOT_TITLE_MAX_LENGTH}
          </Text>
          {error ? <Text style={styles.renameError}>{error}</Text> : null}
          <View style={styles.renameActions}>
            <Pressable
              accessibilityRole="button"
              disabled={isSaving}
              onPress={onCancel}
              style={({ pressed }) => [styles.renameCancelButton, pressed && styles.pressed]}>
              <Text style={styles.renameCancelLabel}>Cancel</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={!canSave}
              onPress={onSave}
              style={({ pressed }) => [
                styles.renameSaveButton,
                !canSave && styles.renameSaveButtonDisabled,
                pressed && canSave && styles.pressed,
              ]}>
              {isSaving ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.renameSaveLabel}>Save</Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function JotScreen() {
  const { jotId } = useLocalSearchParams<{ jotId: string }>();
  const { addEntry, isLoading, jots, renameJot, toggleEntry, trashJots, updateDocument } = useJots();
  const [draft, setDraft] = useState('');
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameDraft, setRenameDraft] = useState('');
  const [renameError, setRenameError] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);
  const jot = jots.find((candidate) => candidate.id === jotId);

  function handleAddEntry() {
    if (!jot || !draft.trim()) return;
    addEntry(jot.id, draft);
    setDraft('');
  }

  function openRename() {
    if (!jot) return;
    setRenameDraft(jot.title);
    setRenameError('');
    setIsRenameOpen(true);
  }

  function closeRename() {
    if (isRenaming) return;
    setIsRenameOpen(false);
    setRenameError('');
  }

  async function handleRename() {
    if (!jot || !renameDraft.trim() || isRenaming) return;

    setIsRenaming(true);
    setRenameError('');
    try {
      await renameJot(jot.id, renameDraft);
      setIsRenameOpen(false);
    } catch {
      setRenameError('The name could not be saved. Check your connection and try again.');
    } finally {
      setIsRenaming(false);
    }
  }

  function showJotOptions() {
    if (!jot) return;

    Alert.alert(jot.title, undefined, [
      { onPress: openRename, text: 'Rename' },
      {
        onPress: () => {
          void trashJots([jot.id])
            .then(() => router.replace('/'))
            .catch(() => undefined);
        },
        style: 'destructive',
        text: 'Move to Trash',
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.loadingState}>
          <ActivityIndicator color="#25634D" size="large" />
          <Text style={styles.loadingLabel}>Loading jot…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!jot) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.missingState}>
          <Text style={styles.missingTitle}>This jot isn’t available</Text>
          <Text style={styles.missingDescription}>
            Return home and open one of your current jots.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.replace('/')}
            style={styles.missingButton}>
            <Text style={styles.missingButtonLabel}>Back to home</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const renameModal = (
    <RenameJotModal
      error={renameError}
      isSaving={isRenaming}
      onCancel={closeRename}
      onChangeTitle={setRenameDraft}
      onSave={() => void handleRename()}
      title={renameDraft}
      visible={isRenameOpen}
    />
  );

  if (jot.kind === 'document') {
    const wordCount = jot.documentContent.trim()
      ? jot.documentContent.trim().split(/\s+/).length
      : 0;

    return (
      <SafeAreaView edges={['top', 'bottom']} style={styles.screen}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardView}>
          <JotHeader onMore={showJotOptions} onRename={openRename} title={jot.title} />
          <View style={styles.documentContent}>
            <Pressable
              accessibilityHint="Opens the rename form"
              accessibilityLabel={`${jot.title}. Rename jot`}
              accessibilityRole="button"
              onPress={openRename}
              style={({ pressed }) => pressed && styles.titlePressed}>
              <Text accessibilityRole="header" style={styles.documentTitle}>{jot.title}</Text>
            </Pressable>
            <Text style={styles.documentMeta}>
              Free write · {wordCount} {wordCount === 1 ? 'word' : 'words'}
            </Text>
            <TextInput
              accessibilityLabel="Free write jot"
              autoFocus
              multiline
              onChangeText={(content) => updateDocument(jot.id, content)}
              placeholder="Start writing…"
              placeholderTextColor="#9AA39E"
              selectionColor="#25634D"
              style={styles.documentInput}
              textAlignVertical="top"
              value={jot.documentContent}
            />
          </View>
        </KeyboardAvoidingView>
        {renameModal}
      </SafeAreaView>
    );
  }

  const completedCount = jot.entries.filter((entry) => entry.completed).length;

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.screen}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}>
        <JotHeader onMore={showJotOptions} onRename={openRename} title={jot.title} />

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
          ref={scrollViewRef}
          showsVerticalScrollIndicator={false}>
          <View style={styles.titleSection}>
            <View style={[styles.jotIcon, { backgroundColor: jot.accent }]}>
              <Text style={styles.jotEmoji}>{jot.emoji}</Text>
            </View>
            <Pressable
              accessibilityHint="Opens the rename form"
              accessibilityLabel={`${jot.title}. Rename jot`}
              accessibilityRole="button"
              onPress={openRename}
              style={({ pressed }) => pressed && styles.titlePressed}>
              <Text accessibilityRole="header" style={styles.title}>{jot.title}</Text>
            </Pressable>
            <Text style={styles.summary}>
              {jot.entries.length
                ? `${completedCount} of ${jot.entries.length} completed`
                : 'Ready for your first entry'}
            </Text>
          </View>

          {jot.entries.length ? (
            <View style={styles.entryList}>
              {jot.entries.map((entry) => (
                <Pressable
                  accessibilityLabel={`${entry.completed ? 'Mark incomplete' : 'Mark complete'}: ${entry.text}`}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: entry.completed }}
                  key={entry.id}
                  onPress={() => toggleEntry(jot.id, entry.id)}
                  style={({ pressed }) => [styles.entryCard, pressed && styles.pressed]}>
                  <View style={[styles.checkbox, entry.completed && styles.checkboxCompleted]}>
                    {entry.completed ? <Text style={styles.checkmark}>✓</Text> : null}
                  </View>
                  <Text style={[styles.entryText, entry.completed && styles.entryTextCompleted]}>
                    {entry.text}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyMark}>✎</Text>
              <Text style={styles.emptyTitle}>Nothing here yet</Text>
              <Text style={styles.emptyDescription}>
                Add a thought, reminder, or list item below.
              </Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.composer}>
          <TextInput
            accessibilityLabel="New jot entry"
            maxLength={500}
            multiline
            onChangeText={setDraft}
            placeholder="Jot something down…"
            placeholderTextColor="#8A958F"
            selectionColor="#25634D"
            style={styles.input}
            value={draft}
          />
          <Pressable
            accessibilityLabel="Add entry"
            accessibilityRole="button"
            disabled={!draft.trim()}
            onPress={handleAddEntry}
            style={({ pressed }) => [
              styles.addButton,
              !draft.trim() && styles.addButtonDisabled,
              pressed && Boolean(draft.trim()) && styles.pressed,
            ]}>
            <Text style={styles.addButtonLabel}>↑</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
      {renameModal}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: '#F6F5EF', flex: 1 },
  keyboardView: { flex: 1 },
  header: {
    alignItems: 'center',
    borderBottomColor: '#E7E4DC',
    borderBottomWidth: 1,
    flexDirection: 'row',
    minHeight: 60,
    paddingHorizontal: 18,
  },
  backButton: {
    alignItems: 'center',
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  backIcon: { color: '#25634D', fontSize: 38, fontWeight: '300', lineHeight: 39 },
  headerTitleButton: { flex: 1 },
  headerTitle: {
    color: '#1D2B25',
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
  },
  moreButton: { alignItems: 'center', height: 42, justifyContent: 'center', width: 42 },
  moreIcon: { color: '#25634D', fontSize: 17, fontWeight: '800', letterSpacing: 1 },
  documentContent: {
    alignSelf: 'center',
    flex: 1,
    maxWidth: 700,
    paddingHorizontal: 24,
    paddingTop: 30,
    width: '100%',
  },
  documentTitle: {
    color: '#17231E',
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: -1,
    lineHeight: 40,
  },
  documentMeta: { color: '#7A867F', fontSize: 13, marginTop: 6 },
  documentInput: {
    color: '#26332D',
    flex: 1,
    fontSize: 17,
    lineHeight: 27,
    marginTop: 22,
    padding: 0,
  },
  content: {
    alignSelf: 'center',
    flexGrow: 1,
    maxWidth: 560,
    paddingBottom: 28,
    paddingHorizontal: 22,
    width: '100%',
  },
  titleSection: { gap: 8, paddingBottom: 28, paddingTop: 28 },
  jotIcon: {
    alignItems: 'center',
    borderRadius: 18,
    height: 58,
    justifyContent: 'center',
    marginBottom: 4,
    width: 58,
  },
  jotEmoji: { color: '#264B3C', fontSize: 29, lineHeight: 32 },
  title: {
    color: '#17231E',
    fontSize: 38,
    fontWeight: '700',
    letterSpacing: -1.3,
    lineHeight: 43,
  },
  titlePressed: { opacity: 0.58 },
  summary: { color: '#758179', fontSize: 14 },
  entryList: { gap: 10 },
  entryCard: {
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderColor: '#E8E5DD',
    borderRadius: 17,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 13,
    padding: 16,
  },
  checkbox: {
    alignItems: 'center',
    borderColor: '#A6B2AB',
    borderRadius: 11,
    borderWidth: 1.5,
    height: 22,
    justifyContent: 'center',
    marginTop: 1,
    width: 22,
  },
  checkboxCompleted: { backgroundColor: '#25634D', borderColor: '#25634D' },
  checkmark: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  entryText: { color: '#24332C', flex: 1, fontSize: 16, lineHeight: 23 },
  entryTextCompleted: { color: '#8A958F', textDecorationLine: 'line-through' },
  emptyState: {
    alignItems: 'center',
    borderColor: '#DEDBD2',
    borderRadius: 22,
    borderStyle: 'dashed',
    borderWidth: 1.5,
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 36,
  },
  emptyMark: { color: '#5A7769', fontSize: 30 },
  emptyTitle: { color: '#26362E', fontSize: 18, fontWeight: '700' },
  emptyDescription: { color: '#7A867F', fontSize: 14, textAlign: 'center' },
  composer: {
    alignItems: 'flex-end',
    backgroundColor: '#FFFFFF',
    borderColor: '#E3E0D8',
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    marginHorizontal: 18,
    marginTop: 8,
    padding: 8,
    shadowColor: '#24352D',
    shadowOffset: { height: 5, width: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
  },
  input: {
    color: '#1D2B25',
    flex: 1,
    fontSize: 16,
    lineHeight: 21,
    maxHeight: 112,
    minHeight: 44,
    paddingHorizontal: 10,
    paddingTop: 11,
  },
  addButton: {
    alignItems: 'center',
    backgroundColor: '#25634D',
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  addButtonDisabled: { backgroundColor: '#B9C4BE' },
  addButtonLabel: { color: '#FFFFFF', fontSize: 25, fontWeight: '700', lineHeight: 27 },
  renameBackdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(20, 29, 25, 0.46)',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  renameCard: {
    backgroundColor: '#FBFAF6',
    borderRadius: 24,
    maxWidth: 460,
    padding: 22,
    shadowColor: '#15221C',
    shadowOffset: { height: 12, width: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 28,
    width: '100%',
  },
  renameHeading: { color: '#17231E', fontSize: 25, fontWeight: '700' },
  renameDescription: { color: '#718078', fontSize: 14, lineHeight: 20, marginTop: 7 },
  renameInput: {
    backgroundColor: '#FFFFFF',
    borderColor: '#D9D8D0',
    borderRadius: 15,
    borderWidth: 1,
    color: '#1D2B25',
    fontSize: 17,
    marginTop: 20,
    minHeight: 52,
    paddingHorizontal: 15,
  },
  renameCharacterCount: {
    color: '#89938E',
    fontSize: 11,
    marginTop: 6,
    textAlign: 'right',
  },
  renameError: { color: '#A7372F', fontSize: 13, lineHeight: 18, marginTop: 8 },
  renameActions: { flexDirection: 'row', gap: 10, marginTop: 18 },
  renameCancelButton: {
    alignItems: 'center',
    borderColor: '#D9D8D0',
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 48,
  },
  renameCancelLabel: { color: '#52625A', fontSize: 15, fontWeight: '700' },
  renameSaveButton: {
    alignItems: 'center',
    backgroundColor: '#25634D',
    borderRadius: 14,
    flex: 1,
    justifyContent: 'center',
    minHeight: 48,
  },
  renameSaveButtonDisabled: { backgroundColor: '#AEBAB4' },
  renameSaveLabel: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  pressed: { opacity: 0.62 },
  loadingState: { alignItems: 'center', flex: 1, gap: 12, justifyContent: 'center' },
  loadingLabel: { color: '#6F7C75', fontSize: 14 },
  missingState: {
    alignItems: 'center',
    flex: 1,
    gap: 12,
    justifyContent: 'center',
    padding: 28,
  },
  missingTitle: { color: '#1D2B25', fontSize: 24, fontWeight: '700', textAlign: 'center' },
  missingDescription: { color: '#6F7C75', fontSize: 15, textAlign: 'center' },
  missingButton: {
    backgroundColor: '#25634D',
    borderRadius: 14,
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  missingButtonLabel: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});
