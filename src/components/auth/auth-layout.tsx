import type { PropsWithChildren, ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type AuthLayoutProps = PropsWithChildren<{
  footer?: ReactNode;
  subtitle: string;
  title: string;
}>;

export function AuthLayout({ children, footer, subtitle, title }: AuthLayoutProps) {
  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled">
          <View style={styles.content}>
            <Text style={styles.brand}>JotIt</Text>
            <View style={styles.headingGroup}>
              <Text accessibilityRole="header" style={styles.title}>
                {title}
              </Text>
              <Text style={styles.subtitle}>{subtitle}</Text>
            </View>
            <View style={styles.card}>{children}</View>
            {footer}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F8F6F0' },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  content: {
    alignSelf: 'center',
    gap: 28,
    maxWidth: 480,
    width: '100%',
  },
  brand: { color: '#25634D', fontSize: 24, fontWeight: '800' },
  headingGroup: { gap: 10 },
  title: { color: '#182B24', fontSize: 36, fontWeight: '700' },
  subtitle: { color: '#53635B', fontSize: 17, lineHeight: 25 },
  card: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E2D9',
    borderRadius: 24,
    borderWidth: 1,
    gap: 18,
    padding: 22,
    shadowColor: '#182B24',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 2,
  },
});
