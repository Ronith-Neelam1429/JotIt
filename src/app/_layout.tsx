import { useEffect } from 'react';
import { InvitationProvider, usePendingInvitation } from '@/providers/invitation-provider';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AuthProvider, useAuth } from '@/providers/auth-provider';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <AuthProvider>
        <InvitationProvider><RootNavigator /></InvitationProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}

function RootNavigator() {
  const { isLoading, user } = useAuth();
  const { pending, setPending } = usePendingInvitation();
  useEffect(() => {
    if (user && pending) {
      setPending(null);
      router.replace({ pathname: '/invite/[jotId]/[token]', params: pending });
    }
  }, [user, pending, setPending]);

  if (isLoading) {
    return (
      <View style={styles.loadingScreen}>
        <StatusBar style="dark" />
        <ActivityIndicator color="#25634D" size="large" />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={Boolean(user)}>
          <Stack.Screen name="(app)" />
        </Stack.Protected>
        <Stack.Protected guard={!user}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
        <Stack.Screen name="invite/[jotId]/[token]" />
      </Stack>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  loadingScreen: {
    alignItems: 'center',
    backgroundColor: '#F8F6F0',
    flex: 1,
    justifyContent: 'center',
  },
});
