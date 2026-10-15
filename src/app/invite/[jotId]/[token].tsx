import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, ui } from '@/components/jot-controls';
import { acceptInvitation, collaborationAction, collaborationError, previewInvitation } from '@/lib/firebase-collaboration';
import { validInvitationParts } from '@/lib/collaboration-model';
import { useAuth } from '@/providers/auth-provider';
import { usePendingInvitation } from '@/providers/invitation-provider';

export default function InvitationScreen() {
  const invitation = useLocalSearchParams<{ jotId: string; token: string; key: string }>();
  return <InvitationContent key={`${invitation.jotId}:${invitation.token}:${invitation.key}`} invitation={invitation} />;
}
function InvitationContent({ invitation }: { invitation: { jotId: string; token: string; key: string } }) {
  const { jotId, token, key } = invitation;
  const { user } = useAuth(), { setPending } = usePendingInvitation();
  const [preview, setPreview] = useState<Awaited<ReturnType<typeof previewInvitation>> | null>(null);
  const [name, setName] = useState(user?.displayName ?? '');
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [attempt, setAttempt] = useState(0);
  const [declined, setDeclined] = useState(false);
  const valid = validInvitationParts(jotId, token, key);
  useEffect(() => {
    let active = true;
    if (valid && user) void previewInvitation(jotId, token, key)
      .then((value) => { if (active) setPreview(value); }).catch((e) => { if (active) setError(collaborationError(e)); });
    return () => { active = false; };
  }, [jotId, token, key, user, valid, attempt]);
  async function respond(accept: boolean) {
    if (busy) return;
    setBusy(true); setError('');
    try {
      if (accept) { await acceptInvitation(jotId, token, key, name || user?.displayName || 'Member'); router.replace({ pathname: '/jot/[jotId]', params: { jotId } }); }
      else { await collaborationAction('declineInvite', jotId, { token }); setPending(null); setDeclined(true); }
    } catch (e) { setError(collaborationError(e)); }
    finally { setBusy(false); }
  }
  return <SafeAreaView style={styles.screen}><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <Text style={styles.brand}>JotIt</Text>
    <View style={styles.card}>
      <Text style={styles.icon}>☷</Text>
      <Text accessibilityRole="header" style={ui.heading}>{declined ? 'Invitation declined' : 'A jot to share'}</Text>
      {!valid ? <Text style={ui.description}>This link is incomplete. Ask the owner to send the full invitation again.</Text>
        : declined ? <><Text style={ui.description}>You haven’t joined this jot.</Text><Button label="Back to your jots" onPress={() => router.replace('/')} /></>
        : !user ? <>
          <Text style={ui.description}>Sign in to see the invitation and choose whether to join.</Text>
          <Button label="Sign in or create an account" selected onPress={() => { setPending({ jotId, token, key }); router.push('/(auth)'); }} />
        </> : preview ? <>
          <Text style={styles.title}>{preview.title}</Text>
          <Text style={ui.description}>{preview.alreadyMember ? 'You already belong to this jot.' : `You’re invited as ${preview.role === 'editor' ? 'an editor. You can add and change content.' : 'a viewer. You can read the jot and see activity.'}`}</Text>
          {!preview.alreadyMember ? <>
            <Text style={ui.label}>YOUR NAME IN THIS JOT</Text>
            <TextInput accessibilityLabel="Your name in this jot" value={name} onChangeText={setName} maxLength={40} placeholder={user.displayName || 'Your name'} style={ui.input} />
            <Text style={ui.description}>This name is only shown to this group.</Text>
          </> : null}
          <Button label={busy ? 'Please wait…' : preview.alreadyMember ? 'Open jot' : 'Accept invitation'} disabled={busy} selected onPress={() => void respond(true)} />
          {!preview.alreadyMember ? <Button label="Decline" disabled={busy} onPress={() => void respond(false)} /> : null}
        </> : !error ? <ActivityIndicator color="#25634D" /> : null}
      {error ? <><Text accessibilityLiveRegion="polite" style={ui.danger}>{error}</Text><Button label="Try again" disabled={busy} onPress={() => { setError(''); setPreview(null); setAttempt(attempt + 1); }} /></> : null}
      {!declined ? <Button label="Not now" disabled={busy} onPress={() => { setPending(null); router.replace('/'); }} /> : null}
    </View>
  </ScrollView></SafeAreaView>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F6F5EF' }, content: { flexGrow: 1, justifyContent: 'center', padding: 24, gap: 32 },
  brand: { color: '#25634D', fontSize: 26, fontWeight: '700', textAlign: 'center' },
  card: { backgroundColor: '#FFF', borderRadius: 24, padding: 24, gap: 16, maxWidth: 480, width: '100%', alignSelf: 'center' },
  icon: { color: '#25634D', fontSize: 40 }, title: { color: '#17231E', fontSize: 28, fontWeight: '700' },
});
