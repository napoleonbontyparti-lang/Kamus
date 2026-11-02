/** Меню снизу (как в VoCat): заголовок, пункты, «Отменить»; из-за края выглядывает канчиль. */
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Kancil, Text } from "./ui";
import { useTheme } from "../lib/theme";

export type SheetItem = { label: string; icon?: React.ReactNode; color?: string; onPress: () => void };

export function Sheet({ visible, title, items, onClose }: {
  visible: boolean; title?: string; items: SheetItem[]; onClose: () => void;
}) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      <Pressable style={[StyleSheet.absoluteFill, styles.backdrop]} onPress={onClose} />
      <View style={[styles.wrap, { paddingBottom: insets.bottom + 12 }]} pointerEvents="box-none">
        <Kancil mood="hello" size={64} style={styles.peek} />
        <View style={[styles.box, { backgroundColor: t.card, borderColor: t.faint }]}>
          {title ? <Text style={[styles.title, { color: t.text, borderBottomColor: t.faint }]}>{title}</Text> : null}
          {items.map((it, i) => (
            <Pressable key={i} onPress={() => { onClose(); it.onPress(); }}
              style={({ pressed }) => [styles.item, { borderTopColor: t.faint, borderTopWidth: i || title ? StyleSheet.hairlineWidth : 0,
                backgroundColor: pressed ? t.accentSoft : "transparent" }]}>
              <View style={styles.icon}>{it.icon}</View>
              <Text style={[styles.label, { color: it.color ?? t.text }]}>{it.label}</Text>
              <View style={styles.icon} />
            </Pressable>
          ))}
        </View>
        <Pressable onPress={onClose} style={[styles.cancel, { backgroundColor: t.card, borderColor: t.faint }]}>
          <Text style={[styles.label, { color: t.text, fontWeight: "700" }]}>Отменить</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: "rgba(0,0,0,0.45)" },
  wrap: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 14 },
  peek: { marginLeft: 18, marginBottom: -26, zIndex: 0 },
  box: { borderRadius: 20, borderWidth: 1, overflow: "hidden", zIndex: 1 },
  title: { textAlign: "center", paddingVertical: 12, fontSize: 15, fontWeight: "700", borderBottomWidth: StyleSheet.hairlineWidth },
  item: { flexDirection: "row", alignItems: "center", paddingVertical: 15, paddingHorizontal: 14 },
  icon: { width: 28, alignItems: "center" },
  label: { flex: 1, textAlign: "center", fontSize: 17 },
  cancel: { marginTop: 10, borderRadius: 20, borderWidth: 1, paddingVertical: 15, alignItems: "center" },
});
