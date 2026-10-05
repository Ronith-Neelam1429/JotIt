import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.brand}>JotIt</Text>
        <Text accessibilityRole="header" style={styles.heading}>
          Remember it.{'\n'}Together.
        </Text>
        <Text style={styles.description}>
          A shared place for the little things that matter. Quickly jot down
          groceries, plans, and everyday notes with friends and family.
        </Text>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>One list. Everyone in the loop.</Text>
          <Text style={styles.cardDescription}>
            From remembering the milk to planning the weekend, keep it all in
            one place.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F8F6F0' },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 28,
    gap: 24,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  brand: { fontSize: 24, fontWeight: '800', color: '#25634D' },
  heading: { fontSize: 48, fontWeight: '700', color: '#182B24' },
  description: { fontSize: 18, lineHeight: 28, color: '#53635B' },
  card: { padding: 24, borderRadius: 20, backgroundColor: '#E7EDE2', gap: 12 },
  cardTitle: { fontSize: 20, fontWeight: '600', color: '#182B24' },
  cardDescription: { fontSize: 16, lineHeight: 24, color: '#53635B' },
});
