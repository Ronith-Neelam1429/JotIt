import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ActionRow, Button, Sheet, ui } from '@/components/jot-controls';
import { ACCENTS, JOT_ICONS, type Jot } from '@/lib/jot-model';
import { useJots } from '@/providers/jots-provider';

export function JotTools({ jot, visible, onClose, onRename, onChangeKind, onTrash }: {
  jot: Jot; visible: boolean; onClose: () => void; onRename: () => void; onChangeKind: () => void; onTrash: () => void;
}) {
  const { jots, organizeJot, updateAppearance, pinJot, archiveJot, duplicateJot, completeAll, clearCompleted, restoreEntry } = useJots();
  const [folderDraft, setFolderDraft] = useState('');
  const [tagsDraft, setTagsDraft] = useState('');
  const [panel, setPanel] = useState<string | null>(null);
  function open(panelName: string) { onClose(); setTimeout(() => setPanel(panelName), 250); }
  return <>
    <Sheet title="Make it yours" visible={visible} onClose={onClose}>
      <ActionRow icon="✎" title="Rename" onPress={onRename} />
      <ActionRow icon="◉" title="Color & icon" description="A little personality for your jot" onPress={() => open('appearance')} />
      <ActionRow icon="#" title="Tags & folder" description={[jot.folder, ...jot.tags.map((tag) => `#${tag}`)].filter(Boolean).join(' · ') || 'Give everything a place'} onPress={() => {
        setFolderDraft(jot.folder); setTagsDraft(jot.tags.join(', ')); open('organize');
      }} />
      <ActionRow icon="★" title={jot.pinned ? 'Unpin jot' : 'Pin jot'} description="Keep it at the top of your jots" onPress={() => { pinJot(jot.id, !jot.pinned); onClose(); }} />
      <ActionRow icon="▣" title={jot.archivedAt ? 'Move to your jots' : 'Archive jot'} description="Keep it safely, out of the way" onPress={() => {
        archiveJot(jot.id, !jot.archivedAt); onClose(); router.replace(jot.archivedAt ? '/' : '/archive');
      }} />
      <ActionRow icon="⧉" title="Duplicate jot" description="Make an independent copy" onPress={() => {
        const copy = duplicateJot(jot.id); onClose(); router.push({ pathname: '/jot/[jotId]', params: { jotId: copy.id } });
      }} />
      <ActionRow icon={jot.kind === 'list' ? 'Aa' : '☷'} title={`Switch to ${jot.kind === 'list' ? 'free write' : 'list'}`} onPress={onChangeKind} />
      {jot.kind === 'list' ? <>
        <View style={ui.divider} />
        <ActionRow icon="✓" title="Mark all complete" disabled={!jot.entries.some((entry) => !entry.completed)}
          onPress={() => { completeAll(jot.id); onClose(); }} />
        <ActionRow icon="⌫" title="Clear completed" description={`${jot.entries.filter((entry) => entry.completed).length} completed items`}
          disabled={!jot.entries.some((entry) => entry.completed)} onPress={() => {
            onClose(); setTimeout(() => Alert.alert('Clear completed items?', 'You can bring them back from Deleted items.', [
              { text: 'Cancel', style: 'cancel' }, { text: 'Clear completed', onPress: () => clearCompleted(jot.id) },
            ]), 250);
          }} />
        <ActionRow icon="↶" title="Deleted items" description={`${jot.deletedEntries.length} items available to restore`} onPress={() => open('deleted')} />
      </> : null}
      <ActionRow icon="♲" title="Move to Trash" description="Recoverable for 30 days" danger onPress={onTrash} />
    </Sheet>
    <Sheet title="Tags & folder" visible={panel === 'organize'} onClose={() => setPanel(null)} description="Choose an existing folder or type a new one. Tags can belong to many jots.">
      <Text style={ui.label}>FOLDER</Text>
      <TextInput accessibilityLabel="Folder name" value={folderDraft} onChangeText={setFolderDraft} maxLength={50}
        placeholder="No folder" placeholderTextColor="#89938D" style={ui.input} />
      <View style={ui.row}><Button label="No folder" selected={!folderDraft} onPress={() => setFolderDraft('')} />
        {[...new Set(jots.map((item) => item.folder).filter(Boolean))].sort().map((folder) => <Button key={folder} label={folder}
          selected={folderDraft === folder} onPress={() => setFolderDraft(folder)} />)}</View>
      <Text style={ui.label}>TAGS · SEPARATE WITH COMMAS</Text>
      <TextInput accessibilityLabel="Tags, separated by commas" value={tagsDraft} onChangeText={setTagsDraft} maxLength={400}
        autoCapitalize="none" placeholder="home, weekend, ideas" placeholderTextColor="#89938D" style={ui.input} />
      <Text style={ui.description}>Up to 12 tags, 30 characters each.</Text>
      <View style={ui.row}>{[...new Set(jots.flatMap((item) => item.tags))].sort().slice(0, 24).map((tag) => <Button key={tag} label={`#${tag}`}
        onPress={() => setTagsDraft((current) => [...new Set([...current.split(',').map((value) => value.trim()).filter(Boolean), tag])].join(', '))} />)}</View>
      <Button label="Save organization" selected onPress={() => { organizeJot(jot.id, folderDraft, tagsDraft.split(',')); setPanel(null); }} />
    </Sheet>
    <Sheet title="Deleted items" visible={panel === 'deleted'} onClose={() => setPanel(null)} description="Tap an item to restore it to the list.">
      {jot.deletedEntries.length ? [...jot.deletedEntries].reverse().map((entry) =>
        <ActionRow key={entry.id} icon="↶" title={entry.text} description={[entry.quantity, entry.note, 'Restore item'].filter(Boolean).join(' · ')}
          onPress={() => restoreEntry(jot.id, entry.id)} />) : <Text style={ui.description}>No deleted items. Anything you delete or clear will appear here.</Text>}
    </Sheet>
    <Sheet title="Color & icon" visible={panel === 'appearance'} onClose={() => setPanel(null)} description="Changes save as you choose.">
      <View style={[styles.preview, { backgroundColor: jot.accent }]}><Text style={styles.previewIcon}>{jot.emoji}</Text><Text style={styles.previewTitle}>{jot.title}</Text></View>
      <Text style={ui.label}>COLOR</Text>
      <View style={ui.row}>{ACCENTS.map(({ name, color }) => <Pressable key={color} accessibilityRole="radio" accessibilityLabel={name}
        accessibilityState={{ selected: jot.accent === color }} onPress={() => updateAppearance(jot.id, color, jot.emoji)}
        style={[styles.swatch, { backgroundColor: color }, jot.accent === color && styles.selected]}>
        {jot.accent === color ? <Text style={styles.check}>✓</Text> : null}
      </Pressable>)}</View>
      <Text style={ui.label}>ICON</Text>
      <View style={ui.row}>{JOT_ICONS.map((icon) => <Pressable key={icon} accessibilityLabel={`Icon ${icon}`} accessibilityRole="radio"
        accessibilityState={{ selected: jot.emoji === icon }} onPress={() => updateAppearance(jot.id, jot.accent, icon)}
        style={[styles.swatch, { backgroundColor: '#FFF' }, jot.emoji === icon && styles.selected]}><Text style={styles.icon}>{icon}</Text></Pressable>)}</View>
    </Sheet>
  </>;
}
const styles = StyleSheet.create({
  preview: { padding: 22, borderRadius: 22, flexDirection: 'row', gap: 18, alignItems: 'center' },
  previewIcon: { fontSize: 36 }, previewTitle: { flex: 1, color: '#17231E', fontSize: 24, fontWeight: '700' },
  swatch: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'transparent' },
  selected: { borderColor: '#25634D' }, check: { color: '#17231E', fontSize: 22, fontWeight: '700' }, icon: { fontSize: 23 },
});
