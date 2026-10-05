import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/providers/auth-provider';
import { signOutCurrentUser } from '@/lib/firebase-auth';

export default function HomeScreen() {
  const { user } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleSignOut() {
    setIsSigningOut(true);

    try {
      await signOutCurrentUser();
    } finally {
      setIsSigningOut(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.topRow}>
          <Text style={styles.brand}>JotIt</Text>
          <Pressable
            accessibilityRole="button"
            disabled={isSigningOut}
            onPress={handleSignOut}
            style={({ pressed }) => [styles.signOutButton, pressed && styles.pressed]}>
            {isSigningOut ? (
              <ActivityIndicator color="#25634D" size="small" />
            ) : (
              <Text style={styles.signOutLabel}>Sign out</Text>
            )}
          </Pressable>
        </View>
        <Text accessibilityRole="header" style={styles.heading}>
          Remember it.{`\n`}Together.
        </Text>
        <Text style={styles.description}>
          Signed in as {user?.email}. Your shared lists will appear here next.
        </Text>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>You’re all set</Text>
          <Text style={styles.cardDescription}>
            Your account is connected to Firebase and will stay signed in when
            you reopen the app.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F8F6F0' },
  content: {
    alignSelf: 'center',
    flexGrow: 1,
    gap: 24,
    justifyContent: 'center',
    maxWidth: 560,
    padding: 28,
    width: '100%',
  },
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  brand: { color: '#25634D', fontSize: 24, fontWeight: '800' },
  signOutButton: {
    alignItems: 'center',
    borderColor: '#AFC3B9',
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 42,
    minWidth: 84,
    paddingHorizontal: 14,
  },
  pressed: { opacity: 0.65 },
  signOutLabel: { color: '#25634D', fontSize: 14, fontWeight: '700' },
  heading: { color: '#182B24', fontSize: 48, fontWeight: '700' },
  description: { color: '#53635B', fontSize: 18, lineHeight: 28 },
  card: { backgroundColor: '#E7EDE2', borderRadius: 20, gap: 12, padding: 24 },
  cardTitle: { color: '#182B24', fontSize: 20, fontWeight: '600' },
  cardDescription: { color: '#53635B', fontSize: 16, lineHeight: 24 },
});
