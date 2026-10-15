import { exportJot, shareJotCopy } from '@/lib/jot-sharing';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { FormattedDocument } from '@/components/free-write-editor';
import { ActionRow, Button, Sheet, ui } from '@/components/jot-controls';
import { ACCENTS, JOT_ICONS, type Jot, type JotVersion } from '@/lib/jot-model';
import { useJots } from '@/providers/jots-provider';

export function JotTools({ jot, visible, onClose, onRename, onChangeKind, onTrash }: {
  jot: Jot; visible: boolean; onClose: () => void; onRename: () => void; onChangeKind: () => void; onTrash: () => void;
}) {
  const { jots, restoreVersion, organizeJot, updateAppearance, pinJot, archiveJot, duplicateJot, completeAll, clearCompleted, restoreEntry } = useJots();
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const [selectedVersion, setSelectedVersion] = useState<JotVersion | null>(null);
  const [folderDraft, setFolderDraft] = useState('');
  const [tagsDraft, setTagsDraft] = useState('');
  const [panel, setPanel] = useState<string | null>(null);
  function open(panelName: string) { onClose(); setTimeout(() => setPanel(panelName), 250); }
  async function handleExport(format: 'txt' | 'md' | 'pdf' | 'share') {
    if (exporting) return;
    setExporting(true); setExportError('');
    try { if (format === 'share') await shareJotCopy(jot); else await exportJot(jot, format); }
    catch (error) { setExportError(error instanceof Error ? error.message : 'Could not prepare the copy. Try again.'); }
    finally { setExporting(false); }
  }
  return <>
    <Sheet title="Jot options" visible={visible} onClose={onClose}>
      <ActionRow icon="♧" title={jot.collaboration ? 'People & invitations' : 'Collaborate'} description={jot.collaboration ? `${jot.memberIds.length} members` : 'Invite someone to this jot'} onPress={() => { onClose(); router.push({ pathname: '/jot/[jotId]/members', params: { jotId: jot.id } }); }} />
      <ActionRow icon="✎" title="Rename" onPress={onRename} />
      <ActionRow icon="◉" title="Color & icon" description="A little personality for your jot" onPress={() => open('appearance')} />
      <ActionRow icon="#" title="Tags & folder" description={[jot.folder, ...jot.tags.map((tag) => `#${tag}`)].filter(Boolean).join(' · ') || 'Give everything a place'} onPress={() => {
        setFolderDraft(jot.folder); setTagsDraft(jot.tags.join(', ')); open('organize');
      }} />
      {!jot.isTemplate ? <ActionRow icon="▤" title="Save as template" description="Reuse this structure with a fresh checklist" onPress={() => {
        duplicateJot(jot.id, true); onClose(); router.push('/templates');
      }} /> : null}
      <ActionRow icon="★" title={jot.pinned ? 'Unpin jot' : 'Pin jot'} description="Keep it at the top of your jots" onPress={() => { pinJot(jot.id, !jot.pinned); onClose(); }} />
      {!jot.isTemplate ? <ActionRow icon="▣" title={jot.archivedAt ? 'Move to your jots' : 'Archive jot'} description="Keep it safely, out of the way" onPress={() => {
        archiveJot(jot.id, !jot.archivedAt); onClose(); router.replace(jot.archivedAt ? '/' : '/archive');
      }} /> : null}
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
      {jot.collaboration ? <ActionRow icon="◷" title="Activity" description="See what changed and who helped" onPress={() => { onClose(); router.push({ pathname: '/jot/[jotId]/activity', params: { jotId: jot.id } }); }} /> : null}
      <ActionRow icon="↗" title="Share & export" description="Send a copy or save a file" onPress={() => { setExportError(''); open('export'); }} />
      <ActionRow icon="◷" title="Version history" description={`${jot.versions.length} saved versions`} onPress={() => { setSelectedVersion(null); open('history'); }} />
      <ActionRow icon="♲" title="Move to Trash" description="Recoverable for 30 days" danger onPress={onTrash} />
    </Sheet>
    <Sheet title="Share & export" visible={panel === 'export'} onClose={() => { if (!exporting) setPanel(null); }} description="Share a snapshot of this jot. Recipients can read the copy without access to your original or its history.">
      <ActionRow icon="↗" title="Share a copy" description="Open the system share sheet" disabled={exporting} onPress={() => void handleExport('share')} />
      <ActionRow icon="Aa" title="Text file" description="A simple, readable .txt file" disabled={exporting} onPress={() => void handleExport('txt')} />
      <ActionRow icon="#" title="Markdown file" description="Keep headings, lists, and formatting" disabled={exporting} onPress={() => void handleExport('md')} />
      <ActionRow icon="▤" title="PDF document" description="A polished copy, ready to save or print" disabled={exporting} onPress={() => void handleExport('pdf')} />
      {exporting ? <Text accessibilityLiveRegion="polite" style={ui.description}>Preparing your copy…</Text> : null}
      {exportError ? <Text accessibilityLiveRegion="polite" style={ui.danger}>{exportError}</Text> : null}
    </Sheet>
    <Sheet title="Version history" visible={panel === 'history'} onClose={() => setPanel(null)} description="Preview your jot before a change. Up to 30 recent versions are kept; larger jots keep fewer.">
      {selectedVersion ? <>
        <Button label="‹ All versions" onPress={() => setSelectedVersion(null)} />
        <Text style={ui.heading}>{selectedVersion.content.title}</Text>
        <Text style={ui.description}>{new Date(selectedVersion.savedAt).toLocaleString()} · Before: {selectedVersion.label.toLocaleLowerCase()}</Text>
        {selectedVersion.content.kind === 'document' ? <FormattedDocument content={selectedVersion.content.documentContent} />
          : selectedVersion.content.entries.map((entry) => <View key={entry.id} style={styles.versionItem}>
            <Text style={styles.versionText}>{entry.completed ? '☑' : '☐'} {entry.text}{entry.quantity ? ` · ${entry.quantity}` : ''}</Text>
            {entry.note ? <Text style={ui.description}>{entry.note}</Text> : null}
          </View>)}
        <Button label="Restore this version" selected onPress={() => {
          setPanel(null); setTimeout(() => Alert.alert('Restore this version?', 'Your current version will stay in history, so you can return to it.', [
            { text: 'Cancel', style: 'cancel' }, { text: 'Restore', onPress: () => restoreVersion(jot.id, selectedVersion.id) },
          ]), 250);
        }} />
      </> : jot.versions.length ? [...jot.versions].reverse().map((version) => <ActionRow key={version.id} icon="◷"
        title={new Date(version.savedAt).toLocaleString()} description={`Before: ${version.label.toLocaleLowerCase()}`} onPress={() => setSelectedVersion(version)} />)
        : <Text style={ui.description}>Versions appear automatically as you make changes. Your first edit will preserve this starting point.</Text>}
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
  versionText: { fontSize: 16, lineHeight: 25, color: '#26332D' },
  versionItem: { gap: 4, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#E7E4DC' },
  preview: { padding: 22, borderRadius: 22, flexDirection: 'row', gap: 18, alignItems: 'center' },
  previewIcon: { fontSize: 36 }, previewTitle: { flex: 1, color: '#17231E', fontSize: 24, fontWeight: '700' },
  swatch: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'transparent' },
  selected: { borderColor: '#25634D' }, check: { color: '#17231E', fontSize: 22, fontWeight: '700' }, icon: { fontSize: 23 },
});
