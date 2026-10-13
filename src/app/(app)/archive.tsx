import { router } from 'expo-router';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActionRow, Button, ui } from '@/components/jot-controls';
import { useJots } from '@/providers/jots-provider';

export default function ArchiveScreen() {
  const { jots, archiveJot, isLoading, syncError, retrySync } = useJots();
  const archived = jots.filter((jot) => jot.archivedAt && !jot.isTemplate).sort((a, b) => (b.archivedAt ?? 0) - (a.archivedAt ?? 0));
  return <SafeAreaView style={styles.screen}>
    <FlatList data={archived} keyExtractor={(jot) => jot.id} contentContainerStyle={styles.content}
      ListHeaderComponent={<View style={styles.header}>
        <View style={ui.row}><Button label="‹ Account" onPress={() => router.back()} /></View>
        <Text accessibilityRole="header" style={styles.title}>A little breathing room.</Text>
        <Text style={ui.description}>Your archive keeps jots for as long as you need. Open one to edit it, or bring it back home.</Text>
        {syncError ? <><Text style={ui.danger}>{syncError}</Text><Button label="Retry sync" onPress={retrySync} /></> : null}
      </View>}
      ListEmptyComponent={isLoading ? <ActivityIndicator color="#25634D" /> : <View style={styles.empty}>
        <Text style={styles.emptyIcon}>▣</Text><Text style={styles.emptyTitle}>Nothing tucked away yet</Text>
        <Text style={ui.description}>Choose Archive in a jot’s options. Archived jots never expire.</Text>
      </View>}
      ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
      renderItem={({ item }) => <View style={styles.card}>
        <ActionRow icon={item.emoji} title={item.title} description={item.kind === 'list' ? `${item.entries.length} items` : 'Free write'}
          onPress={() => router.push({ pathname: '/jot/[jotId]', params: { jotId: item.id } })} />
        <Button label="Move to your jots" onPress={() => archiveJot(item.id, false)} />
      </View>} />
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F6F5EF' }, content: { padding: 22, paddingBottom: 40, maxWidth: 640, width: '100%', alignSelf: 'center' },
  header: { gap: 16, marginBottom: 28 }, title: { fontSize: 34, lineHeight: 40, letterSpacing: -1, color: '#17231E', fontWeight: '700' },
  card: { gap: 8 }, empty: { backgroundColor: '#FFF', borderRadius: 24, padding: 28, gap: 12, alignItems: 'center' },
  emptyIcon: { fontSize: 40, color: '#25634D' }, emptyTitle: { color: '#17231E', fontSize: 20, fontWeight: '700' },
});
