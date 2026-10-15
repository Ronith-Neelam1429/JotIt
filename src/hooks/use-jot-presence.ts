import { collection, doc, onSnapshot, serverTimestamp, setDoc } from '@react-native-firebase/firestore';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { AppState } from 'react-native';
import { PRESENCE_TTL_MS } from '@/lib/collaboration-model';
import { getFirestoreDb } from '@/lib/firebase';

export function useJotPresence(jotId: string, userId: string | undefined, enabled: boolean) {
  const [people, setPeople] = useState<{ id: string; seenAt: number }[]>([]);
  const [online, setOnline] = useState(false), [now, setNow] = useState(Date.now);
  useFocusEffect(useCallback(() => {
    if (!enabled || !userId) return;
    let focused = true;
    const ref = doc(getFirestoreDb(), 'jots', jotId, 'presence', userId);
    function heartbeat(active: boolean) {
      void setDoc(ref, { active, seenAt: serverTimestamp() }).catch(() => { if (focused) setOnline(false); });
    }
    const unsubscribe = onSnapshot(collection(getFirestoreDb(), 'jots', jotId, 'presence'), { includeMetadataChanges: true }, (snap) => {
      setOnline(!snap.metadata.fromCache);
      setPeople(snap.docs.flatMap((person) => {
        const data = person.data();
        return data.active && typeof data.seenAt?.toMillis === 'function' ? [{ id: person.id, seenAt: data.seenAt.toMillis() }] : [];
      }));
    }, () => { setOnline(false); setPeople([]); });
    heartbeat(AppState.currentState === 'active');
    const timer = setInterval(() => { setNow(Date.now()); if (AppState.currentState === 'active') heartbeat(true); }, 30000);
    const state = AppState.addEventListener('change', (value) => { heartbeat(value === 'active'); if (value !== 'active') setOnline(false); });
    return () => { focused = false; clearInterval(timer); state.remove(); unsubscribe(); heartbeat(false); };
  }, [jotId, userId, enabled]));
  return enabled && online ? people.filter((person) => person.id !== userId && now - person.seenAt < PRESENCE_TTL_MS && person.seenAt <= now + PRESENCE_TTL_MS).map((person) => person.id) : [];
}
