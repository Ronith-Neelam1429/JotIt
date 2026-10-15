import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useJotPresence } from '@/hooks/use-jot-presence';
import { useAuth } from '@/providers/auth-provider';
import { memberName } from '@/lib/collaboration-model';
import { relativeDate, type Jot } from '@/lib/jot-model';

export function CollaboratorBar({ jot }: { jot: Jot }) {
  const shared = jot.collaboration;
  const { user } = useAuth();
  const present = useJotPresence(jot.id, user?.uid, Boolean(shared)).filter((id) => jot.memberIds.includes(id));
  const liveNames = present.slice(0, 2).map((id) => memberName(jot, id)).join(', ');
  return <View><View style={styles.bar}>
    <Pressable accessibilityRole="button" accessibilityLabel={shared ? `View ${jot.memberIds.length} members` : 'Invite someone to this jot'}
      onPress={() => router.push({ pathname: '/jot/[jotId]/members', params: { jotId: jot.id } })} style={styles.people}>
      <Text style={styles.label}>{shared ? `♧ ${jot.memberIds.length} ${jot.memberIds.length === 1 ? 'member' : 'members'}` : '♧ Invite someone'}</Text>
    </Pressable>
    {shared ? <Pressable accessibilityRole="button" accessibilityLabel="View collaboration activity" style={styles.edited}
      onPress={() => router.push({ pathname: '/jot/[jotId]/activity', params: { jotId: jot.id } })}>
      <Text numberOfLines={2} style={styles.meta}>Last edit by {memberName(jot, shared.lastEditedBy)} · {relativeDate(shared.lastEditedAt)}</Text>
    </Pressable> : null}
  </View>
    {present.length ? <Text accessibilityLiveRegion="polite" style={styles.live}>● {liveNames}{present.length > 2 ? ` +${present.length - 2}` : ''} {present.length === 1 ? 'is' : 'are'} here</Text> : null}
  </View>;
}
const styles = StyleSheet.create({
  live: { color: '#25634D', fontSize: 12, paddingHorizontal: 24, paddingBottom: 6 },
  bar: { paddingHorizontal: 22, flexDirection: 'row', alignItems: 'center', gap: 12 }, people: { minHeight: 44, justifyContent: 'center' },
  label: { color: '#25634D', fontSize: 13, fontWeight: '600' }, edited: { flex: 1, minHeight: 44, justifyContent: 'center' }, meta: { color: '#758179', fontSize: 11, textAlign: 'right', lineHeight: 16 },
});
