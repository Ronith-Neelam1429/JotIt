import { router } from 'expo-router';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActionRow, Button, ui } from '@/components/jot-controls';
import { createId } from '@/lib/jot-model';
import { STARTER_TEMPLATES, type StarterTemplate } from '@/lib/jot-templates';
import { useJots } from '@/providers/jots-provider';

export default function TemplatesScreen() {
  const { jots, createJot, duplicateJot, isLoading } = useJots();
  const templates = jots.filter((jot) => jot.isTemplate);
  function createFromStarter(template: StarterTemplate) {
    const jot = createJot(template.title, template.content.kind, { ...template.content,
      entries: (template.content.entries ?? []).map((entry) => ({ ...entry, id: createId(), createdAt: Date.now() })) });
    router.push({ pathname: '/jot/[jotId]', params: { jotId: jot.id } });
  }
  return <SafeAreaView style={styles.screen}>
    <FlatList data={templates} keyExtractor={(jot) => jot.id} contentContainerStyle={styles.content}
      ListHeaderComponent={<View style={styles.header}>
        <View style={ui.row}><Button label="‹ Your jots" onPress={() => router.replace('/')} /></View>
        <Text accessibilityRole="header" style={styles.title}>Skip the blank page.</Text>
        <Text style={ui.description}>Start with a fresh copy. Your templates stay ready for next time.</Text>
        <Text style={ui.label}>READY TO USE</Text>
        {STARTER_TEMPLATES.map((template) => <ActionRow key={template.id} icon={template.content.emoji}
          title={template.title} description={template.description} disabled={isLoading} onPress={() => createFromStarter(template)} />)}
        <Text style={ui.label}>YOUR TEMPLATES · {templates.length}</Text>
      </View>}
      ListEmptyComponent={<Text style={ui.description}>Make a jot you love, then choose “Save as template” in its options.</Text>}
      ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
      renderItem={({ item }) => <View style={styles.card}>
        <ActionRow icon={item.emoji} title={item.title} description={item.kind === 'list' ? `${item.entries.length} items` : 'Free write'}
          onPress={() => { const copy = duplicateJot(item.id); router.push({ pathname: '/jot/[jotId]', params: { jotId: copy.id } }); }} />
        <View style={ui.row}><Button label="Edit template" onPress={() => router.push({ pathname: '/jot/[jotId]', params: { jotId: item.id } })} /></View>
      </View>} />
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F6F5EF' }, content: { padding: 22, paddingBottom: 40, maxWidth: 640, width: '100%', alignSelf: 'center' },
  header: { gap: 12, marginBottom: 14 }, title: { fontSize: 34, lineHeight: 40, letterSpacing: -1, color: '#17231E', fontWeight: '700', marginTop: 10 },
  card: { gap: 8 },
});
