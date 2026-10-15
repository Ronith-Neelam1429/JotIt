import { collection, doc, limit, onSnapshot, orderBy, query, updateDoc } from '@react-native-firebase/firestore';
import { createContext, type PropsWithChildren, useContext, useEffect, useState } from 'react';
import { getFirestoreDb } from '@/lib/firebase';
import { useAuth } from '@/providers/auth-provider';
export type JotNotification = { id: string; jotId: string; description: string; createdAt: number; read: boolean };
const Context = createContext<{ notifications: JotNotification[]; error: string; markRead: (id: string) => Promise<void> } | null>(null);
export function NotificationsProvider({ children }: PropsWithChildren) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<JotNotification[]>([]), [error, setError] = useState('');
  useEffect(() => {
    if (!user) return;
    return onSnapshot(query(collection(getFirestoreDb(), 'users', user.uid, 'notifications'), orderBy('createdAt', 'desc'), limit(50)),
      (snapshot) => { setNotifications(snapshot.docs.map((item) => ({ ...item.data(), id: item.id } as JotNotification))); setError(''); },
      () => setError('Notifications could not be loaded. Check your connection.'));
  }, [user]);
  async function markRead(id: string) {
    if (!user) return;
    await updateDoc(doc(getFirestoreDb(), 'users', user.uid, 'notifications', id), { read: true });
  }
  return <Context.Provider value={{ notifications, error, markRead }}>{children}</Context.Provider>;
}
export function useNotifications() {
  const value = useContext(Context);
  if (!value) throw new Error('NotificationsProvider is missing.');
  return value;
}
