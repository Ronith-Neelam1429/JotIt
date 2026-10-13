import { Stack } from 'expo-router';

import { useAuth } from '@/providers/auth-provider';
import { JotsProvider } from '@/providers/jots-provider';

export default function AppLayout() {
  const { user } = useAuth();
  return (
    <JotsProvider key={user?.uid}>
      <Stack screenOptions={{ headerShown: false }} />
    </JotsProvider>
  );
}
