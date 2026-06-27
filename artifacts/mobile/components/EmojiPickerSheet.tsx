import { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
  StyleSheet,
} from "react-native";
import { emojiCategories } from "@/constants/reactions";
import { useColors } from "@/hooks/useColors";

interface EmojiPickerSheetProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (emoji: string) => void;
}

export function EmojiPickerSheet({
  visible,
  onClose,
  onSelect,
}: EmojiPickerSheetProps) {
  const c = useColors();
  const [cat, setCat] = useState(0);

  return (
    <Modal visible={visible} transparent animationType="slide">
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: c.card }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={[styles.handle, { backgroundColor: c.border }]} />
          <View style={styles.tabs}>
            {emojiCategories.map((category, i) => (
              <Pressable
                key={category.name}
                onPress={() => setCat(i)}
                style={[
                  styles.tab,
                  cat === i && { backgroundColor: c.secondary },
                ]}
              >
                <Text
                  style={{
                    color: cat === i ? c.foreground : c.mutedForeground,
                    fontFamily: "Inter_600SemiBold",
                    fontSize: 13,
                  }}
                >
                  {category.name}
                </Text>
              </Pressable>
            ))}
          </View>
          <ScrollView contentContainerStyle={styles.grid}>
            {emojiCategories[cat].emojis.map((emoji) => (
              <Pressable
                key={emoji}
                style={styles.emojiBtn}
                onPress={() => {
                  onSelect(emoji);
                }}
              >
                <Text style={{ fontSize: 30 }}>{emoji}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "#0006" },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 32,
    maxHeight: "60%",
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginVertical: 10,
  },
  tabs: { flexDirection: "row", paddingHorizontal: 12, gap: 8 },
  tab: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 12,
    gap: 4,
  },
  emojiBtn: {
    width: "12.5%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
