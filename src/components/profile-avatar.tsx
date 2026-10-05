import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

type ProfileAvatarProps = {
  displayName?: string | null;
  email?: string | null;
  photoURL?: string | null;
  size?: number;
};

export function ProfileAvatar({
  displayName,
  email,
  photoURL,
  size = 48,
}: ProfileAvatarProps) {
  const initial = (displayName || email || '?').trim().charAt(0).toUpperCase();

  if (photoURL) {
    return (
      <Image
        accessibilityLabel={`${displayName || 'User'} profile picture`}
        contentFit="cover"
        source={photoURL}
        style={{ borderRadius: size / 2, height: size, width: size }}
        transition={150}
      />
    );
  }

  return (
    <View
      style={[
        styles.fallback,
        { borderRadius: size / 2, height: size, width: size },
      ]}>
      <Text style={[styles.initial, { fontSize: size * 0.42 }]}>{initial}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    alignItems: 'center',
    backgroundColor: '#DDE9E2',
    justifyContent: 'center',
  },
  initial: { color: '#25634D', fontWeight: '800' },
});
