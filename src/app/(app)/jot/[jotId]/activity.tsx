import { collection, limit, onSnapshot, orderBy, query } from '@react-native-firebase/firestore';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, ui } from '@/components/jot-controls';
import { getFirestoreDb } from '@/lib/firebase';
import { collaborationError } from '@/lib/firebase-collaboration';
import type { Activity } from '@/lib/collaboration-model';
import { useJots } from '@/providers/jots-provider';

export default function ActivityScreen() {
  const { jotId } = useLocalSearchParams<{ jotId: string }>(), { jots, isLoading } = useJots();
  const jot = jots.find((item) => item.id === jotId);
  const [events, setEvents] = useState<Activity[]>([]), [error, setError] = useState('');
  const shared = Boolean(jot?.collaboration);
  useEffect(() => {
    if (!shared) return;
    return onSnapshot(query(collection(getFirestoreDb(), 'jots', jotId, 'events'), orderBy('at', 'desc'), limit(60)),
      (snap) => setEvents(snap.docs.map((item) => ({ ...item.data(), id: item.id } as Activity))), (e) => setError(collaborationError(e)));
  }, [jotId, shared]);
  const activities = shared ? [...events, ...(jot?.activity ?? [])].sort((a, b) => b.at - a.at || a.id.localeCompare(b.id)).slice(0, 100) : [];
  return <SafeAreaView style={styles.screen}>
    <View style={styles.header}><Button label="‹ Back" onPress={() => router.back()} /><Text accessibilityRole="header" style={ui.heading}>Activity</Text><View style={{ width: 65 }} /></View>
    <FlatList data={activities} keyExtractor={(item) => item.id} contentContainerStyle={styles.content}
      ListHeaderComponent={<View style={styles.intro}><Text style={styles.title}>{jot?.title ?? 'Shared jot'}</Text><Text style={ui.description}>Recent changes made together.</Text>
        {error ? <Text style={ui.danger}>{error}</Text> : null}</View>}
      ListEmptyComponent={<Text style={ui.description}>{isLoading ? 'Loading…' : !jot ? 'This jot is no longer available.' : 'When someone adds an item, edits the jot, or joins, you’ll see it here.'}</Text>}
      renderItem={({ item }) => <View style={styles.event}>
        <View style={styles.avatar}><Text style={styles.initial}>{item.actorName.slice(0, 1).toUpperCase()}</Text></View>
        <View style={styles.copy}><Text style={styles.eventText}><Text style={styles.name}>{item.actorName}</Text> {item.description}</Text><Text style={styles.date}>{new Date(item.at).toLocaleString()}</Text></View>
      </View>} />
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F6F5EF' }, header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 18, gap: 12 },
  content: { padding: 22, gap: 8, maxWidth: 600, alignSelf: 'center', width: '100%' }, intro: { gap: 6, marginBottom: 20 },
  title: { color: '#17231E', fontSize: 28, fontWeight: '700' }, event: { flexDirection: 'row', gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#E7E4DC' },
  avatar: { backgroundColor: '#E2EBE4', height: 36, width: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }, initial: { color: '#25634D', fontWeight: '700' },
  copy: { flex: 1, gap: 4 }, eventText: { fontSize: 16, lineHeight: 23, color: '#26332D' }, name: { fontWeight: '700' }, date: { color: '#758179', fontSize: 12 },
});
