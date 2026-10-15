import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActionRow, Button, ui } from '@/components/jot-controls';
import { useNotifications } from '@/providers/notifications-provider';
import { useJots } from '@/providers/jots-provider';
export default function NotificationsScreen() {
  const { notifications, error, markRead } = useNotifications(), { jots } = useJots();
  const [actionError, setActionError] = useState('');
  return <SafeAreaView style={styles.screen}>
    <View style={styles.header}><Button label="‹ Back" onPress={() => router.back()} /><Text accessibilityRole="header" style={ui.heading}>Notifications</Text></View>
    <FlatList data={notifications} keyExtractor={(item) => item.id} contentContainerStyle={styles.content}
      ListHeaderComponent={error || actionError ? <Text style={ui.danger}>{error || actionError}</Text> : null}
      ListEmptyComponent={<Text style={ui.description}>When someone adds or removes you, or changes your role, you’ll see it here.</Text>}
      renderItem={({ item }) => {
        const jot = jots.find((candidate) => candidate.id === item.jotId);
        return <ActionRow icon={item.read ? '○' : '●'} title={item.description}
          description={`${new Date(item.createdAt).toLocaleString()}${jot ? ` · ${jot.title}` : ' · Jot unavailable'}`}
          onPress={() => { setActionError(''); void markRead(item.id).catch(() => setActionError('Couldn’t mark this notification as read. Try again.')); if (jot) router.push({ pathname: '/jot/[jotId]', params: { jotId: jot.id } }); }} />;
      }} />
  </SafeAreaView>;
}
const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: '#F6F5EF' }, header: { flexDirection: 'row', alignItems: 'center', padding: 18, gap: 20 }, content: { padding: 22, gap: 12, maxWidth: 600, alignSelf: 'center', width: '100%' } });
