import { forwardRef, type ComponentProps } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

type FieldProps = ComponentProps<typeof TextInput> & {
  label: string;
};

export const Field = forwardRef<TextInput, FieldProps>(function Field(
  { label, ...inputProps },
  ref,
) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor="#89938D"
        ref={ref}
        selectionColor="#25634D"
        style={styles.input}
        {...inputProps}
      />
    </View>
  );
});

type PrimaryButtonProps = {
  isLoading?: boolean;
  label: string;
  onPress: () => void;
};

export function PrimaryButton({
  isLoading = false,
  label,
  onPress,
}: PrimaryButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={isLoading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        pressed && styles.buttonPressed,
        isLoading && styles.buttonDisabled,
      ]}>
      {isLoading ? (
        <ActivityIndicator color="#FFFFFF" />
      ) : (
        <Text style={styles.buttonLabel}>{label}</Text>
      )}
    </Pressable>
  );
}

export function FormError({ message }: { message: string }) {
  return (
    <View accessibilityLiveRegion="polite" style={styles.errorBox}>
      <Text style={styles.errorText}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fieldGroup: { gap: 8 },
  label: { color: '#263B33', fontSize: 15, fontWeight: '600' },
  input: {
    backgroundColor: '#F8F6F0',
    borderColor: '#DAD7CE',
    borderRadius: 14,
    borderWidth: 1,
    color: '#182B24',
    fontSize: 16,
    minHeight: 52,
    paddingHorizontal: 16,
  },
  button: {
    alignItems: 'center',
    backgroundColor: '#25634D',
    borderRadius: 14,
    justifyContent: 'center',
    minHeight: 54,
    paddingHorizontal: 20,
  },
  buttonPressed: { opacity: 0.85 },
  buttonDisabled: { opacity: 0.65 },
  buttonLabel: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
  errorBox: {
    backgroundColor: '#FDECEA',
    borderRadius: 12,
    padding: 12,
  },
  errorText: { color: '#9B2C25', fontSize: 14, lineHeight: 20 },
});
