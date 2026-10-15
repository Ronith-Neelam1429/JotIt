import { collection, doc, limit, onSnapshot, orderBy, query } from '@react-native-firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import { Share, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { create } from 'qrcode';
import { Button, ui } from '@/components/jot-controls';
import { getFirestoreDb } from '@/lib/firebase';
import { collaborationAction, collaborationError, createInvitation } from '@/lib/firebase-collaboration';
import type { Jot } from '@/lib/jot-model';

function InvitationQR({ value }: { value: string }) {
  const qr = useMemo(() => {
    const matrix = create(value, { errorCorrectionLevel: 'M' }).modules;
    let path = '';
    for (let y = 0; y < matrix.size; y++) for (let x = 0; x < matrix.size; x++) {
      if (matrix.get(y, x)) path += `M${x + 4} ${y + 4}h1v1h-1z`;
    }
    return { path, size: matrix.size + 8 };
  }, [value]);
  return <View accessible accessibilityLabel="Invitation QR code. Scan with the camera on another phone to join." style={styles.qr}>
    <Svg width={240} height={240} viewBox={`0 0 ${qr.size} ${qr.size}`}><Path d={qr.path} fill="#17231E" /></Svg>
  </View>;
}
export function InvitationPanel({ jot, disabled }: { jot: Jot; disabled: boolean }) {
  const [role, setRole] = useState<'editor' | 'viewer'>('editor'), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [link, setLink] = useState<{ url: string; expiresAt: number; epoch: number } | null>(null);
  const [epoch, setEpoch] = useState(-1), [latest, setLatest] = useState<{ epoch: number; expiresAt: number } | null>(null);
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const parent = onSnapshot(doc(getFirestoreDb(), 'jots', jot.id), (snap) => setEpoch(snap.data()?.linkEpoch ?? -1), (e) => setError(collaborationError(e)));
    const invites = onSnapshot(query(collection(getFirestoreDb(), 'jots', jot.id, 'invitations'), orderBy('createdAt', 'desc'), limit(1)), (snap) => {
      const data = snap.docs[0]?.data(); setLatest(data ? { epoch: data.epoch, expiresAt: data.expiresAt } : null);
    }, (e) => setError(collaborationError(e)));
    const timer = setInterval(() => setNow(Date.now()), 15000);
    return () => { parent(); invites(); clearInterval(timer); };
  }, [jot.id]);
  const active = latest && latest.epoch === epoch && latest.expiresAt > now;
  const visibleLink = link && link.epoch === epoch && link.expiresAt > now ? link : null;
  async function createLink() {
    if (busy || disabled) return;
    setBusy(true); setError('');
    try { setLink(await createInvitation(jot, role)); }
    catch (e) { setError(collaborationError(e)); }
    finally { setBusy(false); }
  }
  async function disableLink() {
    setBusy(true); setError('');
    try { await collaborationAction('disableInvite', jot.id); setLink(null); }
    catch (e) { setError(collaborationError(e)); }
    finally { setBusy(false); }
  }
  return <View style={styles.panel}>
    <Text style={ui.label}>INVITE TO THIS JOT</Text>
    <Text style={ui.description}>Anyone with the link can sign in and join. Send it only to people you trust. Links expire after 7 days.</Text>
    <View style={ui.row}><Button label="Editor" selected={role === 'editor'} disabled={busy} onPress={() => setRole('editor')} />
      <Button label="Viewer" selected={role === 'viewer'} disabled={busy} onPress={() => setRole('viewer')} /></View>
    <Button label={busy ? 'Please wait…' : active ? 'Create replacement link' : 'Create invitation link'} selected disabled={busy || disabled || jot.memberIds.length >= 30} onPress={() => void createLink()} />
    {disabled ? <Text style={ui.description}>Wait for your changes to finish syncing before inviting someone.</Text> : null}
    {active ? <Text style={ui.description}>Link active until {new Date(latest.expiresAt).toLocaleDateString()}. A replacement disables the previous link.</Text> : null}
    {visibleLink ? <>
      <InvitationQR value={visibleLink.url} />
      <Button label="Share invitation" disabled={busy} onPress={() => { void Share.share({ message: `Join “${jot.title}” on JotIt:\n${visibleLink.url}` }).catch((e) => setError(collaborationError(e))); }} />
      <Text style={ui.description}>Scan with your phone camera. JotIt must be installed.</Text>
    </> : null}
    {active ? <Button label="Disable invitation link" danger disabled={busy} onPress={() => void disableLink()} /> : null}
    {error ? <Text accessibilityLiveRegion="polite" style={ui.danger}>{error}</Text> : null}
  </View>;
}
const styles = StyleSheet.create({ panel: { gap: 12, paddingVertical: 10 }, qr: { backgroundColor: '#FFF', padding: 8, borderRadius: 18, alignSelf: 'center' } });
