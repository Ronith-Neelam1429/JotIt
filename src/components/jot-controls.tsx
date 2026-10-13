import { type PropsWithChildren } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export function Sheet({ children, title, description, visible, onClose }: PropsWithChildren<{
  title: string; description?: string; visible: boolean; onClose: () => void;
}>) {
  return <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={ui.overlay}>
      <Pressable accessibilityLabel="Close sheet" accessibilityRole="button" onPress={onClose} style={StyleSheet.absoluteFill} />
      <SafeAreaView edges={['bottom']} style={ui.sheet} accessibilityViewIsModal>
        <View style={ui.handle} />
        <View style={ui.headingRow}>
          <Text accessibilityRole="header" style={ui.heading}>{title}</Text>
          <Button label="Done" onPress={onClose} />
        </View>
        {description ? <Text style={ui.description}>{description}</Text> : null}
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={ui.sheetContent}>{children}</ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  </Modal>;
}
export function Button({ label, onPress, disabled, selected, danger }: {
  label: string; onPress: () => void; disabled?: boolean; selected?: boolean; danger?: boolean;
}) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled, selected }} disabled={disabled}
    onPress={onPress} style={({ pressed }) => [ui.button, selected && ui.buttonSelected, disabled && ui.disabled, pressed && ui.pressed]}>
    <Text style={[ui.buttonLabel, selected && ui.selectedLabel, danger && ui.danger]}>{label}</Text>
  </Pressable>;
}
export function ActionRow({ icon, title, description, onPress, danger, disabled }: {
  icon: string; title: string; description?: string; onPress: () => void; danger?: boolean; disabled?: boolean;
}) {
  return <Pressable accessibilityRole="button" disabled={disabled} accessibilityState={{ disabled }} onPress={onPress}
    style={({ pressed }) => [ui.action, disabled && ui.disabled, pressed && ui.pressed]}>
    <Text style={[ui.actionIcon, danger && ui.danger]}>{icon}</Text>
    <View style={ui.copy}><Text style={[ui.actionTitle, danger && ui.danger]}>{title}</Text>
      {description ? <Text style={ui.description}>{description}</Text> : null}</View>
    <Text style={ui.chevron}>›</Text>
  </Pressable>;
}
export const ui = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(20,29,25,0.42)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#FBFAF6', borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '90%', paddingHorizontal: 20, paddingTop: 10 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#C8CCC8', alignSelf: 'center', marginBottom: 8 },
  headingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 8 },
  heading: { color: '#17231E', fontSize: 23, fontWeight: '700', flexShrink: 1 },
  sheetContent: { gap: 10, paddingBottom: 24, paddingTop: 12 },
  description: { color: '#65746C', fontSize: 13, lineHeight: 19 },
  button: { paddingHorizontal: 14, paddingVertical: 12, minHeight: 44, borderRadius: 14, backgroundColor: '#E8F0EC', alignItems: 'center', justifyContent: 'center' },
  buttonSelected: { backgroundColor: '#25634D' },
  buttonLabel: { color: '#25634D', fontSize: 14, fontWeight: '700' },
  selectedLabel: { color: '#FFFFFF' },
  danger: { color: '#A7372F' },
  disabled: { opacity: 0.4 }, pressed: { opacity: 0.6 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, minHeight: 64, borderRadius: 17, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E7E4DC' },
  actionIcon: { color: '#25634D', fontSize: 22, width: 32, textAlign: 'center' },
  copy: { flex: 1, gap: 3 }, actionTitle: { color: '#203029', fontSize: 16, fontWeight: '600' },
  chevron: { color: '#8A958F', fontSize: 22 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  label: { color: '#52625A', fontSize: 13, fontWeight: '700', marginTop: 10 },
  input: { backgroundColor: '#FFF', color: '#1D2B25', borderColor: '#CBD2CE', borderWidth: 1, borderRadius: 14, padding: 14, minHeight: 50, fontSize: 16 },
  divider: { height: 1, backgroundColor: '#E7E4DC', marginVertical: 8 },
});
