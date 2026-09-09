import { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  CURATED_STICKER_PACKS,
  SMART_STICKER_PRESETS,
  type MobileOverlayItem,
  type SmartStickerOption,
} from "@/lib/smartStickers";

interface SmartStickerSheetProps {
  visible: boolean;
  onClose: () => void;
  onSelectSticker: (item: MobileOverlayItem) => void;
  currentMusicTitle?: string;
}

export function SmartStickerSheet({
  visible,
  onClose,
  onSelectSticker,
  currentMusicTitle,
}: SmartStickerSheetProps) {
  const [tab, setTab] = useState<"widgets" | "stickers">("widgets");
  const [activePack, setActivePack] = useState<keyof typeof CURATED_STICKER_PACKS>("trending");

  const handlePickWidget = (widget: SmartStickerOption) => {
    let content = widget.defaultContent;
    let subContent = widget.defaultSubContent;

    if (widget.type === "smart_time") {
      content = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } else if (widget.type === "smart_music" && currentMusicTitle) {
      content = currentMusicTitle;
    }

    const item: MobileOverlayItem = {
      id: "stk_" + Date.now(),
      type: widget.type,
      content,
      subContent,
      x: 50,
      y: 40,
      bgStyle: "glass",
    };

    onSelectSticker(item);
    onClose();
  };

  const handlePickEmoji = (emoji: string) => {
    const item: MobileOverlayItem = {
      id: "emj_" + Date.now(),
      type: "emoji",
      content: emoji,
      x: 50,
      y: 45,
      fontSize: 48,
    };
    onSelectSticker(item);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View style={styles.sheet}>
              <View style={styles.handle} />

              {/* Tabs */}
              <View style={styles.tabRow}>
                <Pressable
                  style={[styles.tabBtn, tab === "widgets" && styles.tabBtnActive]}
                  onPress={() => setTab("widgets")}
                >
                  <Ionicons
                    name="sparkles"
                    size={16}
                    color={tab === "widgets" ? "#fff" : "#a1a1aa"}
                  />
                  <Text style={[styles.tabText, tab === "widgets" && styles.tabTextActive]}>
                    Smart Widgets
                  </Text>
                </Pressable>

                <Pressable
                  style={[styles.tabBtn, tab === "stickers" && styles.tabBtnActive]}
                  onPress={() => setTab("stickers")}
                >
                  <Ionicons
                    name="happy"
                    size={16}
                    color={tab === "stickers" ? "#fff" : "#a1a1aa"}
                  />
                  <Text style={[styles.tabText, tab === "stickers" && styles.tabTextActive]}>
                    Stickers & Emojis
                  </Text>
                </Pressable>
              </View>

              {tab === "widgets" ? (
                <ScrollView
                  contentContainerStyle={styles.widgetsGrid}
                  showsVerticalScrollIndicator={false}
                >
                  {SMART_STICKER_PRESETS.map((w) => (
                    <Pressable
                      key={w.id}
                      style={styles.widgetCard}
                      onPress={() => handlePickWidget(w)}
                    >
                      <View style={[styles.widgetIconWrap, { backgroundColor: `${w.previewColor}33` }]}>
                        <Ionicons name={w.icon as never} size={22} color={w.previewColor} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.widgetTitle}>{w.title}</Text>
                        <Text style={styles.widgetSub}>{w.subtitle}</Text>
                      </View>
                      <Ionicons name="add-circle" size={20} color="#71717a" />
                    </Pressable>
                  ))}
                </ScrollView>
              ) : (
                <View style={{ flex: 1 }}>
                  {/* Category selector */}
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.packPills}
                  >
                    {Object.entries(CURATED_STICKER_PACKS).map(([key, pack]) => (
                      <Pressable
                        key={key}
                        style={[styles.packPill, activePack === key && styles.packPillActive]}
                        onPress={() => setActivePack(key as keyof typeof CURATED_STICKER_PACKS)}
                      >
                        <Text
                          style={[
                            styles.packPillText,
                            activePack === key && styles.packPillTextActive,
                          ]}
                        >
                          {pack.label}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>

                  {/* Emoji grid */}
                  <ScrollView
                    contentContainerStyle={styles.emojiGrid}
                    showsVerticalScrollIndicator={false}
                  >
                    {CURATED_STICKER_PACKS[activePack].emojis.map((emoji, index) => (
                      <Pressable
                        key={index}
                        style={styles.emojiButton}
                        onPress={() => handlePickEmoji(emoji)}
                      >
                        <Text style={styles.emojiText}>{emoji}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.65)",
  },
  sheet: {
    backgroundColor: "#18181b",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 36,
    height: 480,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#3f3f46",
    alignSelf: "center",
    marginBottom: 14,
  },
  tabRow: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: "#27272a",
    borderRadius: 14,
    padding: 4,
    marginBottom: 14,
  },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderRadius: 10,
  },
  tabBtnActive: {
    backgroundColor: "#7c3aed",
  },
  tabText: {
    color: "#a1a1aa",
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
  tabTextActive: {
    color: "#fff",
  },
  widgetsGrid: {
    gap: 10,
    paddingBottom: 20,
  },
  widgetCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#27272a",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#3f3f46",
  },
  widgetIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  widgetTitle: {
    color: "#fff",
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  widgetSub: {
    color: "#a1a1aa",
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    marginTop: 1,
  },
  packPills: {
    gap: 8,
    paddingBottom: 12,
  },
  packPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#27272a",
  },
  packPillActive: {
    backgroundColor: "#7c3aed",
  },
  packPillText: {
    color: "#a1a1aa",
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },
  packPillTextActive: {
    color: "#fff",
  },
  emojiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "space-around",
    paddingBottom: 20,
  },
  emojiButton: {
    width: 54,
    height: 54,
    borderRadius: 14,
    backgroundColor: "#27272a",
    alignItems: "center",
    justifyContent: "center",
  },
  emojiText: {
    fontSize: 28,
  },
});
