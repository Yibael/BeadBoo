import type { PropsWithChildren } from 'react';
import { KeyboardAvoidingView, Platform, Modal, Pressable, ScrollView, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Icon, type IconName } from './Icon';
import { Touch, useNativePreferences } from './NativeUI';
export const colors = { ink: '#252b34', secondary: '#626b77', background: '#f4f5f7', border: '#e3e6eb', accent: '#b85b36', accentSoft: '#faf0e9' };
export function Button({ label, onPress, icon, primary, disabled, compact, style }: { label: string; onPress: () => void; icon?: IconName; primary?: boolean; disabled?: boolean; compact?: boolean; style?: StyleProp<ViewStyle> }) {
  return <Touch accessibilityRole="button" accessibilityLabel={label} onPress={onPress} disabled={disabled}
    style={[ui.button, primary && ui.primary, compact && { minHeight: 40, paddingHorizontal: 12, paddingVertical: 8 }, style]}>
    {icon && <Icon name={icon} size={18} color={primary ? '#fff' : colors.secondary} />}
    <Text style={[ui.buttonText, primary && { color: '#fff' }]}>{label}</Text>
  </Touch>;
}
export function IconButton({ icon, label, onPress, active, disabled }: { icon: IconName; label: string; onPress: () => void; active?: boolean; disabled?: boolean }) {
  return <Touch accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress} style={[ui.iconButton, active && { backgroundColor: colors.accentSoft }]}>
    <Icon name={icon} size={21} color={active ? colors.accent : colors.ink} />
  </Touch>;
}
// Each native modal owns a separate view hierarchy and must measure its own safe area.
export function FullScreenModal({ children, onClose }: PropsWithChildren<{ onClose: () => void }>) {
  const { reduceMotion } = useNativePreferences();
  return <Modal presentationStyle="fullScreen" animationType={reduceMotion ? 'none' : 'slide'} onRequestClose={onClose}>
    <SafeAreaProvider style={{ backgroundColor: colors.background }}>{children}</SafeAreaProvider>
  </Modal>;
}
export function Sheet({ visible, title, onClose, onDismiss, footer, children }: PropsWithChildren<{ visible: boolean; title: string; onClose: () => void; onDismiss?: () => void; footer?: React.ReactNode }>) {
  const { reduceMotion } = useNativePreferences();
  return <Modal visible={visible} transparent animationType={reduceMotion ? 'none' : 'slide'} onRequestClose={onClose} onDismiss={onDismiss}>
    <SafeAreaProvider><KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><SafeAreaView edges={['top', 'left', 'right']} style={ui.backdrop}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" accessibilityLabel={`关闭${title}`} />
      <SafeAreaView edges={['bottom']} style={ui.sheet} accessibilityViewIsModal>
        <View style={ui.handle} /><View style={ui.sheetHeading}><Text style={ui.sheetTitle}>{title}</Text><IconButton icon="close" label={`关闭${title}`} onPress={onClose} /></View>
        <ScrollView style={{ flexShrink: 1 }} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator contentContainerStyle={{ paddingBottom: 12 }}>{children}</ScrollView>
        {footer && <View style={ui.sheetFooter}>{footer}</View>}
      </SafeAreaView>
    </SafeAreaView></KeyboardAvoidingView></SafeAreaProvider>
  </Modal>;
}
export function Notice({ text }: { text: string }) { return <Text style={ui.notice}>{text}</Text>; }
export const ui = StyleSheet.create({
  title: { fontSize: 29, fontWeight: '700', color: colors.ink, lineHeight: 39 },
  subtitle: { fontSize: 14, lineHeight: 22, color: colors.secondary, marginTop: 7, marginBottom: 22 },
  text: { fontSize: 14, lineHeight: 23, color: colors.ink }, note: { fontSize: 12, lineHeight: 19, color: colors.secondary },
  card: { backgroundColor: '#fff', borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, padding: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  label: { fontSize: 14, fontWeight: '600', color: colors.ink, marginBottom: 12 },
  button: { minHeight: 48, paddingHorizontal: 17, paddingVertical: 13, borderRadius: 15, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, backgroundColor: '#fff', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 7 },
  primary: { backgroundColor: colors.accent, borderColor: colors.accent }, buttonText: { fontSize: 14, fontWeight: '600', color: colors.ink },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22 },
  backdrop: { flex: 1, backgroundColor: '#161e2d66', alignItems: 'center', justifyContent: 'flex-end' },
  sheet: { width: '100%', maxWidth: 600, maxHeight: '88%', backgroundColor: '#fff', padding: 20, borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  handle: { width: 34, height: 4, backgroundColor: '#d9dce1', borderRadius: 3, alignSelf: 'center', marginBottom: 7, marginTop: -9 },
  sheetHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sheetTitle: { fontSize: 21, fontWeight: '600', color: colors.ink, flex: 1, flexShrink: 1 },
  sheetFooter: { paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.border, gap: 10 },
  notice: { backgroundColor: '#edf0f4', borderRadius: 12, padding: 13, fontSize: 12, lineHeight: 20, color: colors.secondary, marginVertical: 12 },
  choice: { minHeight: 44, padding: 11, borderWidth: 1, borderColor: colors.border, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  selected: { borderColor: '#c78465', backgroundColor: colors.accentSoft },
});
