import { Stack } from 'expo-router';

import { JotsProvider } from '@/providers/jots-provider';

export default function AppLayout() {
  return (
    <JotsProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </JotsProvider>
  );
}
