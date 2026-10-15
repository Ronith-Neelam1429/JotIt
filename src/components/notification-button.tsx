import { router } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useNotifications } from '@/providers/notifications-provider';
export function NotificationButton() {
  const { notifications } = useNotifications();
  const unread = notifications.filter((item) => !item.read).length;
  return <Pressable accessibilityRole="button" accessibilityLabel={`Notifications${unread ? `, ${unread} unread` : ''}`} onPress={() => router.push('/notifications')} style={styles.button}>
    <Text style={styles.icon}>♧</Text>{unread ? <Text style={styles.badge}>{unread > 9 ? '9+' : unread}</Text> : null}
  </Pressable>;
}
const styles = StyleSheet.create({ button: { height: 44, width: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22, backgroundColor: '#E8F0EC' }, icon: { color: '#25634D', fontSize: 26 }, badge: { position: 'absolute', top: -2, right: -2, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 3, backgroundColor: '#25634D', color: 'white', textAlign: 'center', fontSize: 11, lineHeight: 18, fontWeight: '700' } });
