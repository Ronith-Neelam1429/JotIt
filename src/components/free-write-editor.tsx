import { useMemo, useRef, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button, Sheet, ui } from '@/components/jot-controls';
import { documentBlocks, formatSelection, safeLink, toggleDocumentCheckbox, type FormatAction, type Selection } from '@/lib/jot-format';

export function FormattedDocument({ content, onChange }: { content: string; onChange?: (value: string) => void }) {
  const blocks = useMemo(() => documentBlocks(content), [content]);
  return <View style={styles.preview}>
    {blocks.length ? blocks.map((block, index) => <View key={index} style={[styles.block, { paddingLeft: (block.indent ?? 0) * 16 }]}>
      {block.checked !== undefined ? <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: block.checked, disabled: !onChange }}
        accessibilityLabel={block.runs.map((run) => run.text).join('')} disabled={!onChange}
        onPress={() => onChange?.(toggleDocumentCheckbox(content, block.checkboxIndex!))} style={styles.checkbox}>
        <Text style={styles.check}>{block.checked ? '☑' : '☐'}</Text>
      </Pressable> : block.prefix ? <Text style={styles.prefix}>{block.prefix}</Text> : null}
      <Text selectable style={[styles.paragraph, block.level === 1 && styles.h1, block.level === 2 && styles.h2, block.level === 3 && styles.h3]}>
        {block.runs.map((run, runIndex) => <Text key={runIndex} accessibilityRole={run.href ? 'link' : undefined}
          onPress={run.href ? () => { void Linking.openURL(run.href!).catch(() => Alert.alert('Couldn’t open link', 'Try opening this address in your browser.')); } : undefined}
          style={[run.bold && styles.bold, run.italic && styles.italic, run.underline && styles.underline, run.highlight && styles.highlight, run.href ? styles.link : null]}>{run.text}</Text>)}
      </Text>
    </View>) : <Text style={ui.description}>Your writing will appear here.</Text>}
  </View>;
}
const FORMATS: { action: FormatAction; label: string; name: string }[] = [
  { action: 'heading', label: 'H1', name: 'Heading' }, { action: 'subheading', label: 'H2', name: 'Subheading' },
  { action: 'bold', label: 'B', name: 'Bold' }, { action: 'italic', label: 'I', name: 'Italic' },
  { action: 'underline', label: 'U', name: 'Underline' }, { action: 'bullet', label: '• List', name: 'Bulleted list' },
  { action: 'number', label: '1. List', name: 'Numbered list' }, { action: 'checkbox', label: '☐', name: 'Checkbox' },
  { action: 'link', label: '↗', name: 'Link' }, { action: 'highlight', label: 'Highlight', name: 'Highlight' },
];
export function FreeWriteEditor({ content, onChange, readOnly = false }: { content: string; onChange: (value: string) => void; readOnly?: boolean }) {
  const [preview, setPreview] = useState(false);
  const [selection, setSelection] = useState<Selection>({ start: 0, end: 0 });
  const [linkOpen, setLinkOpen] = useState(false);
  const [url, setUrl] = useState('https://');
  const input = useRef<TextInput>(null);
  function apply(action: FormatAction, href?: string) {
    const result = formatSelection(content, selection, action, href);
    onChange(result.text);
    setSelection(result.selection);
    requestAnimationFrame(() => input.current?.focus());
  }
  if (readOnly) return <ScrollView style={styles.previewScroll}><FormattedDocument content={content} /></ScrollView>;
  return <View style={styles.editor}>
    <View style={styles.modeRow}><Button label="Write" selected={!preview} onPress={() => setPreview(false)} />
      <Button label="Preview" selected={preview} onPress={() => setPreview(true)} />
      <Text style={styles.count}>{content.length.toLocaleString()} / 50,000</Text></View>
    {!preview ? <>
      <ScrollView horizontal keyboardShouldPersistTaps="always" showsHorizontalScrollIndicator={false} style={styles.toolbar} contentContainerStyle={styles.tools}>
        {FORMATS.map(({ action, label, name }) => <Pressable key={action} accessibilityRole="button" accessibilityLabel={name}
          onPress={() => { if (action === 'link') { setUrl('https://'); setLinkOpen(true); } else apply(action); }}
          style={({ pressed }) => [styles.tool, pressed && ui.pressed]}><Text style={[styles.toolLabel, action === 'italic' && styles.italic, action === 'underline' && styles.underline]}>{label}</Text></Pressable>)}
      </ScrollView>
      <Text style={styles.hint}>Select text to format. Preview shows the finished jot.</Text>
      <TextInput ref={input} accessibilityLabel="Free write jot" multiline maxLength={50000} value={content}
        onChangeText={onChange} onSelectionChange={(event) => setSelection(event.nativeEvent.selection)} selection={selection}
        placeholder="Start writing…" placeholderTextColor="#9AA39E" selectionColor="#25634D" textAlignVertical="top" style={styles.input} />
    </> : <ScrollView keyboardShouldPersistTaps="handled" style={styles.previewScroll}><FormattedDocument content={content} onChange={onChange} /></ScrollView>}
    <Sheet title="Add a link" visible={linkOpen} onClose={() => setLinkOpen(false)} description="Select the words to link, then enter a web or email address.">
      <TextInput accessibilityLabel="Link address" autoCapitalize="none" autoCorrect={false} keyboardType="url" value={url} onChangeText={setUrl} style={ui.input} />
      {url !== 'https://' && !safeLink(url) ? <Text style={ui.danger}>Use a full https://, http://, or mailto: address.</Text> : null}
      <Button label="Add link" selected disabled={!safeLink(url)} onPress={() => { setLinkOpen(false); apply('link', safeLink(url)!); }} />
    </Sheet>
  </View>;
}
const styles = StyleSheet.create({
  editor: { flex: 1, marginTop: 16 }, modeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  count: { color: '#758179', fontSize: 10, marginLeft: 'auto' }, toolbar: { flexGrow: 0, marginTop: 12 },
  tools: { gap: 6, paddingVertical: 4 }, tool: { paddingHorizontal: 14, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E0E3DB' },
  toolLabel: { fontSize: 15, color: '#26332D', fontWeight: '700' }, hint: { color: '#7A867F', fontSize: 11, marginVertical: 8 },
  input: { flex: 1, color: '#26332D', fontSize: 17, lineHeight: 27, padding: 0, paddingBottom: 24 },
  previewScroll: { flex: 1, marginTop: 16 }, preview: { gap: 14, paddingBottom: 28 },
  block: { flexDirection: 'row', alignItems: 'flex-start' }, paragraph: { flex: 1, color: '#26332D', fontSize: 17, lineHeight: 27 },
  h1: { fontSize: 28, lineHeight: 35, fontWeight: '700' }, h2: { fontSize: 23, lineHeight: 30, fontWeight: '700' }, h3: { fontSize: 19, lineHeight: 27, fontWeight: '700' },
  prefix: { width: 30, color: '#25634D', fontSize: 17, lineHeight: 27 }, checkbox: { minWidth: 44, minHeight: 44, marginTop: -6, justifyContent: 'center' },
  check: { color: '#25634D', fontSize: 24 }, bold: { fontWeight: '700' }, italic: { fontStyle: 'italic' }, underline: { textDecorationLine: 'underline' },
  highlight: { backgroundColor: '#F7DE81', color: '#17231E' }, link: { color: '#25634D', textDecorationLine: 'underline' },
});
