import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AuthProvider, useAuth } from '@/providers/auth-provider';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </GestureHandlerRootView>
  );
}

function RootNavigator() {
  const { isLoading, user } = useAuth();

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
