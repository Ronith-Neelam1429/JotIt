import { useRef, useState } from 'react';
import { Swipeable } from 'react-native-gesture-handler';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';

import { type JotEntry } from '@/providers/jots-provider';

const ENTRY_TEXT_MAX_LENGTH = 500;
const MENU_HEIGHT = 112;
const MENU_WIDTH = 176;
const SCREEN_EDGE_PADDING = 12;

type JotEntryRowProps = {
  readOnly?: boolean;
  entry: JotEntry;
  isActive: boolean;
  onDelete: () => void;
  onDrag: () => void;
  onRename: (text: string, quantity: string, note: string) => void;
  onToggle: () => void;
};

export function JotEntryRow({
  readOnly = false,
  entry,
  isActive,
  onDelete,
  onDrag,
  onRename,
  onToggle,
}: JotEntryRowProps) {
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const menuButtonRef = useRef<View>(null);
  const dragStartedRef = useRef(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ left: 0, top: 0 });
  const [quantityDraft, setQuantityDraft] = useState(entry.quantity ?? '');
  const [noteDraft, setNoteDraft] = useState(entry.note ?? '');
  const [renameDraft, setRenameDraft] = useState(entry.text);

  function openMenu() {
    menuButtonRef.current?.measureInWindow((x, y, width, height) => {
      const left = Math.min(
        Math.max(x + width - MENU_WIDTH, SCREEN_EDGE_PADDING),
        windowWidth - MENU_WIDTH - SCREEN_EDGE_PADDING,
      );
      const spaceBelow = windowHeight - (y + height + SCREEN_EDGE_PADDING);
      const top = spaceBelow >= MENU_HEIGHT
        ? y + height + 6
        : Math.max(SCREEN_EDGE_PADDING, y - MENU_HEIGHT - 6);

      setMenuPosition({ left, top });
      setIsMenuOpen(true);
    });
  }

  function openRename() {
    setIsMenuOpen(false);
    setRenameDraft(entry.text);
    setQuantityDraft(entry.quantity ?? '');
    setNoteDraft(entry.note ?? '');
    setTimeout(() => setIsRenameOpen(true), 100);
  }

  function requestDelete() {
    setIsMenuOpen(false);
    setTimeout(onDelete, 100);
  }

  function saveRename() {
    const trimmedText = renameDraft.trim();
    if (!trimmedText) return;

    onRename(trimmedText, quantityDraft, noteDraft);
    setIsRenameOpen(false);
  }

  if (readOnly) return <View style={styles.entryCard}>
    <View style={styles.entryContent}><Text accessibilityLabel={entry.completed ? 'Completed' : 'Incomplete'} style={{ color: '#25634D', fontSize: 22 }}>{entry.completed ? '☑' : '☐'}</Text>
      <View style={styles.entryCopy}><Text selectable style={[styles.entryText, entry.completed && styles.entryTextCompleted]}>{entry.text}</Text>
        {entry.quantity ? <Text style={styles.quantity}>Qty · {entry.quantity}</Text> : null}
        {entry.note ? <Text selectable style={styles.note}>{entry.note}</Text> : null}
      </View>
    </View>
  </View>;
  return (
    <>
      <Swipeable
        containerStyle={[styles.swipeable, isActive && styles.swipeableActive]}
        enabled={!isActive && !isMenuOpen && !isRenameOpen}
        overshootRight={false}
        renderRightActions={() => (
          <Pressable
            accessibilityLabel={`Delete ${entry.text}`}
            accessibilityRole="button"
            onPress={onDelete}
            style={({ pressed }) => [styles.deleteAction, pressed && styles.deleteActionPressed]}>
            <Text style={styles.deleteActionLabel}>Delete</Text>
          </Pressable>
        )}>
        <View style={styles.entryCard}>
          <Pressable
            accessibilityHint="Touch and hold to reorder"
            accessibilityLabel={`${entry.completed ? 'Mark incomplete' : 'Mark complete'}: ${entry.text}`}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: entry.completed }}
            delayLongPress={350}
            disabled={isActive}
            onLongPress={() => {
              dragStartedRef.current = true;
              onDrag();
            }}
            onPress={() => {
              if (dragStartedRef.current) {
                dragStartedRef.current = false;
                return;
              }
              onToggle();
            }}
            onPressOut={() => {
              if (!dragStartedRef.current) return;
              setTimeout(() => {
                dragStartedRef.current = false;
              }, 250);
            }}
            style={({ pressed }) => [styles.entryContent, pressed && styles.pressed]}>
            <View style={[styles.checkbox, entry.completed && styles.checkboxCompleted]}>
              {entry.completed ? <Text style={styles.checkmark}>✓</Text> : null}
            </View>
            <View style={styles.entryCopy}>
              <Text style={[styles.entryText, entry.completed && styles.entryTextCompleted]}>{entry.text}</Text>
              {entry.quantity ? <Text style={styles.quantity}>Qty · {entry.quantity}</Text> : null}
              {entry.note ? <Text numberOfLines={2} style={styles.note}>{entry.note}</Text> : null}
            </View>
          </Pressable>
          <Pressable
            accessibilityLabel={`Options for ${entry.text}`}
            accessibilityRole="button"
            hitSlop={8}
            onPress={openMenu}
            ref={menuButtonRef}
            style={({ pressed }) => [styles.menuButton, pressed && styles.pressed]}>
            <Text style={styles.menuIcon}>•••</Text>
          </Pressable>
        </View>
      </Swipeable>

      <Modal
        animationType="fade"
        onRequestClose={() => setIsMenuOpen(false)}
        presentationStyle="overFullScreen"
        statusBarTranslucent
        transparent
        visible={isMenuOpen}>
        <View style={styles.menuOverlay}>
          <Pressable
            accessibilityLabel="Close item options"
            accessibilityRole="button"
            onPress={() => setIsMenuOpen(false)}
            style={StyleSheet.absoluteFill}
          />
          <View
            accessibilityViewIsModal
            style={[styles.menu, { left: menuPosition.left, top: menuPosition.top }]}>
            <Pressable
              accessibilityRole="button"
              onPress={openRename}
              style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}>
              <Text style={styles.menuItemIcon}>✎</Text>
              <Text style={styles.menuItemLabel}>Edit details</Text>
            </Pressable>
            <View style={styles.menuDivider} />
            <Pressable
              accessibilityRole="button"
              onPress={requestDelete}
              style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}>
              <Text style={styles.deleteMenuItemIcon}>×</Text>
              <Text style={styles.deleteMenuItemLabel}>Delete</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="fade"
        onRequestClose={() => setIsRenameOpen(false)}
        presentationStyle="overFullScreen"
        transparent
        visible={isRenameOpen}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.renameBackdrop}>
          <ScrollView keyboardShouldPersistTaps="handled" accessibilityViewIsModal style={styles.renameCard} contentContainerStyle={{ paddingBottom: 22 }}>
            <Text accessibilityRole="header" style={styles.renameHeading}>Edit item</Text>
            <TextInput
              accessibilityLabel="List item name"
              autoFocus
              enterKeyHint="done"
              maxLength={ENTRY_TEXT_MAX_LENGTH}
              onChangeText={setRenameDraft}
              onSubmitEditing={saveRename}
              placeholder="List item"
              placeholderTextColor="#909A95"
              returnKeyType="done"
              selectTextOnFocus
              selectionColor="#25634D"
              style={styles.renameInput}
              value={renameDraft}
            />
            <Text style={styles.characterCount}>
              {renameDraft.length}/{ENTRY_TEXT_MAX_LENGTH}
            </Text>
            <Text style={styles.fieldLabel}>Quantity (optional)</Text>
            <TextInput accessibilityLabel="Item quantity" value={quantityDraft} onChangeText={setQuantityDraft}
              maxLength={40} placeholder="e.g. 2, 500 g, 1 pack" placeholderTextColor="#909A95" style={styles.detailsInput} />
            <Text style={styles.fieldLabel}>Note (optional)</Text>
            <TextInput accessibilityLabel="Item note" value={noteDraft} onChangeText={setNoteDraft}
              maxLength={1000} multiline placeholder="Brand, size, or a little reminder…" placeholderTextColor="#909A95"
              style={[styles.detailsInput, { minHeight: 84, textAlignVertical: 'top' }]} />
            <View style={styles.renameActions}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setIsRenameOpen(false)}
                style={({ pressed }) => [styles.cancelButton, pressed && styles.pressed]}>
                <Text style={styles.cancelLabel}>Cancel</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={!renameDraft.trim()}
                onPress={saveRename}
                style={({ pressed }) => [
                  styles.saveButton,
                  !renameDraft.trim() && styles.saveButtonDisabled,
                  pressed && Boolean(renameDraft.trim()) && styles.pressed,
                ]}>
                <Text style={styles.saveLabel}>Save</Text>
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  swipeable: { borderRadius: 17, overflow: 'hidden' },
  swipeableActive: {
    shadowColor: '#17231E',
    shadowOffset: { height: 8, width: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
  },
  entryCard: {
    alignItems: 'stretch',
    backgroundColor: '#FFFFFF',
    borderColor: '#E8E5DD',
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 58,
  },
  entryContent: {
    alignItems: 'flex-start',
    flex: 1,
    flexDirection: 'row',
    gap: 13,
    paddingBottom: 16,
    paddingLeft: 16,
    paddingTop: 16,
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
  entryCopy: { flex: 1, gap: 5 },
  quantity: { color: '#25634D', fontSize: 12, fontWeight: '700' },
  note: { color: '#718078', fontSize: 13, lineHeight: 19 },
  fieldLabel: { color: '#52625A', fontSize: 13, fontWeight: '600', marginTop: 14, marginBottom: 6 },
  detailsInput: { borderColor: '#CBD2CE', borderWidth: 1, borderRadius: 10, padding: 12, minHeight: 48, color: '#1D2B25', backgroundColor: '#FFF', fontSize: 16 },
  entryText: { color: '#24332C', flex: 1, fontSize: 16, lineHeight: 23 },
  entryTextCompleted: { color: '#8A958F', textDecorationLine: 'line-through' },
  menuButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
    width: 48,
  },
  menuIcon: { color: '#66736C', fontSize: 16, fontWeight: '800', letterSpacing: 0 },
  pressed: { opacity: 0.62 },
  deleteAction: {
    alignItems: 'center',
    backgroundColor: '#B83C36',
    justifyContent: 'center',
    minWidth: 88,
    paddingHorizontal: 16,
  },
  deleteActionPressed: { backgroundColor: '#982D28' },
  deleteActionLabel: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  menuOverlay: { backgroundColor: 'rgba(23, 35, 30, 0.08)', flex: 1 },
  menu: {
    backgroundColor: '#FFFFFF',
    borderColor: '#DDDAD2',
    borderRadius: 10,
    borderWidth: 1,
    position: 'absolute',
    shadowColor: '#17231E',
    shadowOffset: { height: 5, width: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    width: MENU_WIDTH,
  },
  menuItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    height: 55,
    paddingHorizontal: 16,
  },
  menuItemPressed: { backgroundColor: '#F0F2EE' },
  menuItemIcon: { color: '#41564C', fontSize: 19, textAlign: 'center', width: 20 },
  menuItemLabel: { color: '#24332C', fontSize: 16, fontWeight: '600' },
  deleteMenuItemIcon: { color: '#B83C36', fontSize: 25, lineHeight: 25, textAlign: 'center', width: 20 },
  deleteMenuItemLabel: { color: '#B83C36', fontSize: 16, fontWeight: '600' },
  menuDivider: { backgroundColor: '#ECE9E2', height: 1, marginLeft: 48 },
  renameBackdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(20, 29, 25, 0.46)',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  renameCard: {
    backgroundColor: '#FBFAF6',
    borderRadius: 16,
    maxWidth: 440,
    maxHeight: '90%',
    flexGrow: 0,
    padding: 22,
    width: '100%',
  },
  renameHeading: { color: '#17231E', fontSize: 22, fontWeight: '700' },
  renameInput: {
    backgroundColor: '#FFFFFF',
    borderColor: '#CBD2CE',
    borderRadius: 10,
    borderWidth: 1,
    color: '#1D2B25',
    fontSize: 16,
    marginTop: 18,
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  characterCount: { color: '#7A867F', fontSize: 12, marginTop: 6, textAlign: 'right' },
  renameActions: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end', marginTop: 18 },
  cancelButton: { justifyContent: 'center', minHeight: 44, paddingHorizontal: 16 },
  cancelLabel: { color: '#52625A', fontSize: 15, fontWeight: '600' },
  saveButton: {
    alignItems: 'center',
    backgroundColor: '#25634D',
    borderRadius: 10,
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 86,
    paddingHorizontal: 18,
  },
  saveButtonDisabled: { backgroundColor: '#B9C4BE' },
  saveLabel: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});
