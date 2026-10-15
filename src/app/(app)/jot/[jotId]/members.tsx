import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActionRow, Button, Sheet, ui } from '@/components/jot-controls';
import { collaborationAction, collaborationError } from '@/lib/firebase-collaboration';
import { displayName, type JotMember } from '@/lib/collaboration-model';
import { useAuth } from '@/providers/auth-provider';
import { useJots } from '@/providers/jots-provider';

export default function MembersScreen() {
  const { jotId } = useLocalSearchParams<{ jotId: string }>();
  const { jots, isLoading, isSaving } = useJots(), { user } = useAuth();
  const jot = jots.find((item) => item.id === jotId);
  const [selected, setSelected] = useState<string | null>(null), [nameOpen, setNameOpen] = useState(false);
  const [name, setName] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const owner = jot?.ownerId === user?.uid;
  const members: Record<string, JotMember> = jot?.collaboration?.members ?? (jot ? { [jot.ownerId]: { name: displayName(user?.displayName), role: 'owner', joinedAt: jot.createdAt } } : {});
  async function change(action: string, values: Record<string, unknown> = {}) {
    if (busy) return;
    setBusy(true); setError('');
    try { await collaborationAction(action, jotId, values); setSelected(null); setNameOpen(false); if (action === 'leave') router.replace('/'); }
    catch (e) { setError(collaborationError(e)); }
    finally { setBusy(false); }
  }
  function confirm(action: 'remove' | 'transfer', id: string) {
    const target = members[id]; if (!target) return;
    setSelected(null);
    setTimeout(() => Alert.alert(action === 'remove' ? `Remove ${target.name}?` : `Make ${target.name} the owner?`,
      action === 'remove' ? 'They will lose access. Existing invitation links will also stop working.' : 'You will become an editor. Only the new owner can manage members and invitations.', [
        { text: 'Cancel', style: 'cancel' }, { text: action === 'remove' ? 'Remove' : 'Transfer ownership', style: action === 'remove' ? 'destructive' : 'default', onPress: () => void change(action, { memberId: id }) },
      ]), 250);
  }
  return <SafeAreaView style={styles.screen}>
    <View style={styles.header}><Button label="‹ Back" onPress={() => router.back()} /><Text accessibilityRole="header" style={ui.heading}>People</Text><View style={{ width: 65 }} /></View>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {!jot ? <Text style={ui.description}>{isLoading ? 'Loading…' : 'This jot is no longer available.'}</Text> : <>
        <Text style={styles.title}>{jot.title}</Text>
        <Text style={ui.description}>{jot.collaboration ? `${jot.memberIds.length} ${jot.memberIds.length === 1 ? 'member' : 'members'} · Changes appear for everyone` : 'Invite someone to make this a shared jot.'}</Text>
        {Object.entries(members).sort(([a, x], [b, y]) => Number(y.role === 'owner') - Number(x.role === 'owner') || x.joinedAt - y.joinedAt || a.localeCompare(b)).map(([id, member]) =>
          <ActionRow key={id} icon={member.name.slice(0, 1).toUpperCase()} title={`${member.name}${id === user?.uid ? ' (you)' : ''}`}
            description={`${member.role[0].toUpperCase() + member.role.slice(1)}${id === user?.uid && jot.collaboration ? ' · Edit your group name' : ''}`}
            disabled={busy || !jot.collaboration || (id !== user?.uid && !owner)} onPress={() => {
              if (id === user?.uid) { setName(member.name); setNameOpen(true); } else setSelected(id);
            }} />)}
        <Text style={ui.description}>Owners manage access. Editors can change content. Viewers can read and follow activity.</Text>
        {jot.collaboration && !owner ? <Button label="Leave this jot" danger disabled={busy || isSaving} onPress={() => Alert.alert('Leave this jot?', 'You will need a new invitation to rejoin.', [
          { text: 'Cancel', style: 'cancel' }, { text: 'Leave', style: 'destructive', onPress: () => void change('leave') },
        ])} /> : jot.collaboration ? <Text style={ui.description}>To leave, transfer ownership to another member first.</Text> : null}
      </>}
      {busy ? <Text accessibilityLiveRegion="polite" style={ui.description}>Saving…</Text> : null}
      {error ? <Text accessibilityLiveRegion="polite" style={ui.danger}>{error}</Text> : null}
    </ScrollView>
    <Sheet title={selected ? members[selected]?.name ?? 'Member' : 'Member'} visible={Boolean(selected)} onClose={() => { if (!busy) setSelected(null); }}>
      {selected && members[selected] ? <>
        <Button label="Editor · can make changes" selected={members[selected].role === 'editor'} disabled={busy} onPress={() => void change('setRole', { memberId: selected, role: 'editor' })} />
        <Button label="Viewer · can read" selected={members[selected].role === 'viewer'} disabled={busy} onPress={() => void change('setRole', { memberId: selected, role: 'viewer' })} />
        <ActionRow icon="♕" title="Transfer ownership" disabled={busy || isSaving} onPress={() => confirm('transfer', selected)} />
        <ActionRow icon="−" title="Remove member" danger disabled={busy} onPress={() => confirm('remove', selected)} />
      </> : null}
      {error ? <Text style={ui.danger}>{error}</Text> : null}
    </Sheet>
    <Sheet title="Your name in this jot" visible={nameOpen} onClose={() => { if (!busy) setNameOpen(false); }} description="Choose a name this group knows you by. Your account name stays the same.">
      <TextInput accessibilityLabel="Group display name" value={name} onChangeText={setName} maxLength={40} style={ui.input} autoFocus />
      <Button label="Save name" selected disabled={busy || !name.trim()} onPress={() => void change('setName', { name: name.trim() })} />
      {error ? <Text style={ui.danger}>{error}</Text> : null}
    </Sheet>
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F6F5EF' }, header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 18, gap: 12 },
  content: { padding: 22, gap: 14, maxWidth: 600, alignSelf: 'center', width: '100%' }, title: { color: '#17231E', fontSize: 28, fontWeight: '700' },
});
