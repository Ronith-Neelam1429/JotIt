import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ActionRow, Sheet, ui } from '@/components/jot-controls';
import { ACCENTS, JOT_ICONS, type Jot } from '@/lib/jot-model';
import { useJots } from '@/providers/jots-provider';

export function JotTools({ jot, visible, onClose, onRename, onChangeKind, onTrash }: {
  jot: Jot; visible: boolean; onClose: () => void; onRename: () => void; onChangeKind: () => void; onTrash: () => void;
}) {
  const { updateAppearance } = useJots();
  const [panel, setPanel] = useState<string | null>(null);
  function open(panelName: string) { onClose(); setTimeout(() => setPanel(panelName), 250); }
  return <>
    <Sheet title="Make it yours" visible={visible} onClose={onClose}>
      <ActionRow icon="✎" title="Rename" onPress={onRename} />
      <ActionRow icon="◉" title="Color & icon" description="A little personality for your jot" onPress={() => open('appearance')} />
      <ActionRow icon={jot.kind === 'list' ? 'Aa' : '☷'} title={`Switch to ${jot.kind === 'list' ? 'free write' : 'list'}`} onPress={onChangeKind} />
      <ActionRow icon="♲" title="Move to Trash" description="Recoverable for 30 days" danger onPress={onTrash} />
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
