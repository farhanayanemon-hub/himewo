import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  StyleSheet,
  PanResponder,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useVideoPlayer, VideoView } from "expo-video";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { useCreateReel, getListReelsQueryKey } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { uploadMedia, UploadUnavailableError, captureWithCamera, type PickedAsset } from "@/lib/upload";
import { MusicPickerModal, type SelectedMusic } from "@/components/MusicPicker";
import { EmojiPickerSheet } from "@/components/EmojiPickerSheet";

export interface MobileReelOverlay {
  id: string;
  type: "text" | "emoji";
  content: string;
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  color?: string;
  bgStyle?: "none" | "pill" | "glass" | "neon";
  fontSize?: number;
}

export function serializeReelCaption(caption: string, overlays: MobileReelOverlay[]): string {
  const trimmed = caption.trim();
  if (!overlays || overlays.length === 0) return trimmed;
  return `${trimmed}\n\n<!--REEL_OVERLAYS:${JSON.stringify(overlays)}-->`;
}

export function parseReelOverlays(rawCaption: string | null | undefined): {
  cleanCaption: string;
  overlays: MobileReelOverlay[];
} {
  if (!rawCaption) return { cleanCaption: "", overlays: [] };
  const match = /<!--REEL_OVERLAYS:(.*?)-->/s.exec(rawCaption);
  if (!match) return { cleanCaption: rawCaption, overlays: [] };
  try {
    const overlays = JSON.parse(match[1]) as MobileReelOverlay[];
    const cleanCaption = rawCaption.replace(/<!--REEL_OVERLAYS:.*?-->/s, "").trim();
    return { cleanCaption, overlays: Array.isArray(overlays) ? overlays : [] };
  } catch {
    return { cleanCaption: rawCaption, overlays: [] };
  }
}

const COLOR_PALETTE = [
  "#ffffff",
  "#000000",
  "#facc15",
  "#ef4444",
  "#06b6d4",
  "#10b981",
  "#ec4899",
  "#a855f7",
  "#f97316",
];

export default function CreateReelScreen() {
  const c = useColors();
  const qc = useQueryClient();
  const createReel = useCreateReel();

  const [asset, setAsset] = useState<PickedAsset | null>(null);
  const [caption, setCaption] = useState("");
  const [music, setMusic] = useState<SelectedMusic | null>(null);
  const [musicOpen, setMusicOpen] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [posting, setPosting] = useState(false);

  // Overlay state
  const [overlays, setOverlays] = useState<MobileReelOverlay[]>([]);
  const [selectedOverlayId, setSelectedOverlayId] = useState<string | null>(null);

  // Text modal state
  const [textModalOpen, setTextModalOpen] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [textColor, setTextColor] = useState("#ffffff");
  const [textBgStyle, setTextBgStyle] = useState<"none" | "pill" | "glass" | "neon">("pill");

  // Facebook-style: opening the reel creator jumps straight to the gallery.
  const autoOpened = useRef(false);
  useEffect(() => {
    if (autoOpened.current) return;
    autoOpened.current = true;
    (async () => {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["videos"],
        quality: 0.8,
      });
      if (!res.canceled && res.assets[0]) {
        setAsset(res.assets[0]);
      } else {
        router.back();
      }
    })();
  }, []);

  const pick = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["videos"],
      quality: 0.8,
    });
    if (!res.canceled && res.assets[0]) {
      setAsset(res.assets[0]);
    }
  };

  const capture = async () => {
    const captured = await captureWithCamera(["videos"]);
    if (captured) {
      setAsset(captured);
    }
  };

  const handleAddText = () => {
    if (!textInput.trim()) return;
    const newOverlay: MobileReelOverlay = {
      id: "txt_" + Date.now(),
      type: "text",
      content: textInput.trim(),
      x: 50,
      y: 35,
      color: textColor,
      bgStyle: textBgStyle,
      fontSize: 18,
    };
    setOverlays((prev) => [...prev, newOverlay]);
    setSelectedOverlayId(newOverlay.id);
    setTextInput("");
    setTextModalOpen(false);
  };

  const handleAddEmoji = (emoji: string) => {
    const newOverlay: MobileReelOverlay = {
      id: "emj_" + Date.now(),
      type: "emoji",
      content: emoji,
      x: 50,
      y: 50,
      fontSize: 44,
    };
    setOverlays((prev) => [...prev, newOverlay]);
    setSelectedOverlayId(newOverlay.id);
    setEmojiOpen(false);
  };

  const deleteSelectedOverlay = () => {
    if (!selectedOverlayId) return;
    setOverlays((prev) => prev.filter((o) => o.id !== selectedOverlayId));
    setSelectedOverlayId(null);
  };

  const adjustSelectedSize = (delta: number) => {
    if (!selectedOverlayId) return;
    setOverlays((prev) =>
      prev.map((o) =>
        o.id === selectedOverlayId
          ? { ...o, fontSize: Math.max(12, Math.min(64, (o.fontSize ?? (o.type === "emoji" ? 44 : 18)) + delta)) }
          : o,
      ),
    );
  };

  const moveOverlay = (id: string, deltaX: number, deltaY: number) => {
    setOverlays((prev) =>
      prev.map((o) =>
        o.id === id
          ? {
              ...o,
              x: Math.max(5, Math.min(95, o.x + deltaX)),
              y: Math.max(5, Math.min(95, o.y + deltaY)),
            }
          : o,
      ),
    );
  };

  const submit = async () => {
    if (!asset) return;
    setPosting(true);
    try {
      let uploaded;
      try {
        uploaded = await uploadMedia(asset);
      } catch (err) {
        if (err instanceof UploadUnavailableError) {
          Alert.alert(
            "Media upload unavailable",
            "Storage isn't configured in this environment, so this reel can't be posted right now.",
          );
          return;
        }
        throw err;
      }

      const finalCaption = serializeReelCaption(caption, overlays);

      await createReel.mutateAsync({
        data: {
          videoUrl: uploaded.url,
          caption: finalCaption || undefined,
          ...(music
            ? {
                musicUrl: music.url,
                musicTitle: music.title,
                musicArtist: music.artist ?? undefined,
              }
            : {}),
        },
      });
      qc.invalidateQueries({ queryKey: getListReelsQueryKey() });
      router.back();
    } catch {
      Alert.alert("Error", "Could not share your reel. Please try again.");
    } finally {
      setPosting(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#000" }}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="close" size={28} color="#fff" />
        </Pressable>
        <Text style={{ color: "#fff", fontFamily: "Inter_700Bold", fontSize: 18 }}>
          Reel Studio
        </Text>
        <Pressable
          style={[styles.shareBtn, { backgroundColor: asset ? "#9333ea" : "#333" }]}
          onPress={submit}
          disabled={!asset || posting}
        >
          {posting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={{ color: "#fff", fontFamily: "Inter_700Bold" }}>Share</Text>
          )}
        </Pressable>
      </View>

      {asset ? (
        <View style={styles.preview}>
          <ReelPreview uri={asset.uri} />

          {/* Render Overlays on Screen */}
          {overlays.map((ov) => {
            const isSelected = selectedOverlayId === ov.id;
            return (
              <DraggableOverlayItem
                key={ov.id}
                overlay={ov}
                isSelected={isSelected}
                onSelect={() => setSelectedOverlayId(ov.id)}
                onMove={(dx, dy) => moveOverlay(ov.id, dx, dy)}
              />
            );
          })}

          {/* Floating Top Reel Tools (Text, Stickers, Music) */}
          <View style={styles.sideToolbar}>
            <Pressable
              style={styles.toolBtn}
              onPress={() => setTextModalOpen(true)}
            >
              <Ionicons name="text" size={20} color="#fff" />
              <Text style={styles.toolBtnText}>Text</Text>
            </Pressable>
            <Pressable
              style={styles.toolBtn}
              onPress={() => setEmojiOpen(true)}
            >
              <Ionicons name="happy" size={20} color="#facc15" />
              <Text style={styles.toolBtnText}>Stickers</Text>
            </Pressable>
            <Pressable
              style={styles.toolBtn}
              onPress={() => setMusicOpen(true)}
            >
              <Ionicons name="musical-notes" size={20} color="#a855f7" />
              <Text style={styles.toolBtnText}>Music</Text>
            </Pressable>
            {overlays.length > 0 && (
              <Pressable
                style={[styles.toolBtn, { backgroundColor: "#ef444433" }]}
                onPress={() => {
                  setOverlays([]);
                  setSelectedOverlayId(null);
                }}
              >
                <Ionicons name="trash-outline" size={18} color="#ef4444" />
                <Text style={[styles.toolBtnText, { color: "#ef4444" }]}>Clear</Text>
              </Pressable>
            )}
          </View>

          {/* Selected Overlay Controls (Size + Delete) */}
          {selectedOverlayId && (
            <View style={styles.selectedControlsBar}>
              <Text style={styles.ctrlLabel}>Size:</Text>
              <Pressable
                style={styles.ctrlBtn}
                onPress={() => adjustSelectedSize(-3)}
              >
                <Text style={styles.ctrlBtnText}>-</Text>
              </Pressable>
              <Pressable
                style={styles.ctrlBtn}
                onPress={() => adjustSelectedSize(3)}
              >
                <Text style={styles.ctrlBtnText}>+</Text>
              </Pressable>
              <Pressable
                style={[styles.ctrlBtn, { backgroundColor: "#ef444433", marginLeft: 8 }]}
                onPress={deleteSelectedOverlay}
              >
                <Ionicons name="trash" size={14} color="#ef4444" />
                <Text style={[styles.ctrlBtnText, { color: "#ef4444", fontSize: 12, marginLeft: 4 }]}>
                  Delete
                </Text>
              </Pressable>
            </View>
          )}

          {music && (
            <View style={styles.musicChip}>
              <Ionicons name="musical-notes" size={14} color="#a855f7" />
              <Text style={styles.musicChipText} numberOfLines={1}>
                {music.title}
                {music.artist ? ` · ${music.artist}` : ""}
              </Text>
              <Pressable onPress={() => setMusic(null)} hitSlop={8}>
                <Ionicons name="close" size={16} color="#fff" />
              </Pressable>
            </View>
          )}

          <View style={styles.bottomBar}>
            <TextInput
              value={caption}
              onChangeText={setCaption}
              placeholder="Add caption & #hashtags (@ for friends)..."
              placeholderTextColor="#ffffffaa"
              underlineColorAndroid="transparent"
              style={styles.captionInput}
              multiline
            />
            <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
              <Pressable style={styles.changeBtn} onPress={pick}>
                <Ionicons name="film" size={18} color="#fff" />
                <Text style={{ color: "#fff", fontFamily: "Inter_500Medium", fontSize: 13 }}>
                  Gallery
                </Text>
              </Pressable>
              <Pressable style={styles.changeBtn} onPress={capture}>
                <Ionicons name="videocam" size={18} color="#fff" />
                <Text style={{ color: "#fff", fontFamily: "Inter_500Medium", fontSize: 13 }}>
                  Record
                </Text>
              </Pressable>
              <Pressable style={styles.changeBtn} onPress={() => setMusicOpen(true)}>
                <Ionicons name="musical-notes" size={18} color="#a855f7" />
                <Text style={{ color: "#fff", fontFamily: "Inter_500Medium", fontSize: 13 }}>
                  Music
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.empty}>
          <Pressable
            style={[styles.pickBtn, { backgroundColor: "#9333ea" }]}
            onPress={pick}
          >
            <Ionicons name="film" size={28} color="#fff" />
            <Text style={{ color: "#fff", fontFamily: "Inter_700Bold", fontSize: 16 }}>
              Choose a video
            </Text>
          </Pressable>
          <Pressable
            style={[styles.pickBtn, { backgroundColor: "#ffffff22" }]}
            onPress={capture}
          >
            <Ionicons name="videocam" size={28} color="#fff" />
            <Text style={{ color: "#fff", fontFamily: "Inter_700Bold", fontSize: 16 }}>
              Record a video
            </Text>
          </Pressable>
          <Pressable
            style={[styles.pickBtn, { backgroundColor: "#ffffff22" }]}
            onPress={() => setMusicOpen(true)}
          >
            <Ionicons name="musical-notes" size={28} color="#a855f7" />
            <Text style={{ color: "#fff", fontFamily: "Inter_700Bold", fontSize: 16 }}>
              {music ? `Music: ${music.title}` : "Add music"}
            </Text>
          </Pressable>
          <Text style={{ color: "#ffffff99", fontFamily: "Inter_400Regular", fontSize: 13 }}>
            Share a video with on-screen texts, emoji stickers & Bangla/Hindi songs
          </Text>
        </View>
      )}

      {/* Text Overlay Modal */}
      <Modal visible={textModalOpen} transparent animationType="fade">
        <View style={styles.textModalBackdrop}>
          <View style={styles.textModalCard}>
            <View style={styles.textModalHeader}>
              <Text style={styles.textModalTitle}>Add Text on Screen</Text>
              <Pressable onPress={() => setTextModalOpen(false)}>
                <Ionicons name="close" size={22} color="#fff" />
              </Pressable>
            </View>
            <TextInput
              value={textInput}
              onChangeText={setTextInput}
              placeholder="Type your text..."
              placeholderTextColor="#ffffff66"
              style={styles.textModalInput}
              autoFocus
            />

            {/* Colors */}
            <Text style={styles.sectionHeading}>Color</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingBottom: 10 }}>
              {COLOR_PALETTE.map((color) => (
                <Pressable
                  key={color}
                  onPress={() => setTextColor(color)}
                  style={[
                    styles.colorCircle,
                    { backgroundColor: color },
                    textColor === color && styles.colorCircleActive,
                  ]}
                />
              ))}
            </ScrollView>

            {/* Badges */}
            <Text style={styles.sectionHeading}>Style</Text>
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 14 }}>
              {(["none", "pill", "glass", "neon"] as const).map((st) => (
                <Pressable
                  key={st}
                  onPress={() => setTextBgStyle(st)}
                  style={[
                    styles.styleChip,
                    textBgStyle === st && styles.styleChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.styleChipText,
                      textBgStyle === st && styles.styleChipTextActive,
                    ]}
                  >
                    {st}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Pressable
              style={styles.placeTextBtn}
              onPress={handleAddText}
            >
              <Text style={{ color: "#fff", fontFamily: "Inter_700Bold", fontSize: 15 }}>
                Place on Reel
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <MusicPickerModal
        visible={musicOpen}
        onClose={() => setMusicOpen(false)}
        onSelect={setMusic}
      />

      <EmojiPickerSheet
        visible={emojiOpen}
        onClose={() => setEmojiOpen(false)}
        onSelect={handleAddEmoji}
      />
    </SafeAreaView>
  );
}

function DraggableOverlayItem({
  overlay,
  isSelected,
  onSelect,
  onMove,
}: {
  overlay: MobileReelOverlay;
  isSelected: boolean;
  onSelect: () => void;
  onMove: (dx: number, dy: number) => void;
}) {
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        onSelect();
      },
      onPanResponderMove: (_, gestureState) => {
        const dxPercent = gestureState.dx / 4;
        const dyPercent = gestureState.dy / 6;
        onMove(dxPercent, dyPercent);
      },
    }),
  ).current;

  const bgStyle = overlay.bgStyle ?? "pill";

  return (
    <View
      {...panResponder.panHandlers}
      style={[
        styles.overlayItemContainer,
        { left: `${overlay.x}%`, top: `${overlay.y}%` },
        isSelected && styles.overlaySelectedRing,
      ]}
    >
      {overlay.type === "emoji" ? (
        <Text style={{ fontSize: overlay.fontSize ?? 44 }}>{overlay.content}</Text>
      ) : (
        <View
          style={[
            styles.textBadgeCommon,
            bgStyle === "pill" && styles.textBadgePill,
            bgStyle === "glass" && styles.textBadgeGlass,
            bgStyle === "neon" && styles.textBadgeNeon,
          ]}
        >
          <Text
            style={[
              styles.textBadgeContent,
              {
                color: overlay.color || "#ffffff",
                fontSize: overlay.fontSize ?? 18,
              },
            ]}
          >
            {overlay.content}
          </Text>
        </View>
      )}
    </View>
  );
}

function ReelPreview({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.play();
  });
  return (
    <VideoView
      player={player}
      style={StyleSheet.absoluteFill}
      contentFit="contain"
      nativeControls={false}
    />
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  shareBtn: {
    borderRadius: 8,
    paddingHorizontal: 18,
    paddingVertical: 8,
    minWidth: 72,
    alignItems: "center",
  },
  preview: { flex: 1, position: "relative", backgroundColor: "#000" },
  musicChip: {
    position: "absolute",
    top: 12,
    left: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#0009",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    maxWidth: "70%",
    zIndex: 40,
  },
  musicChipText: {
    color: "#fff",
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    flexShrink: 1,
  },
  sideToolbar: {
    position: "absolute",
    top: 12,
    right: 12,
    flexDirection: "column",
    gap: 10,
    zIndex: 40,
  },
  toolBtn: {
    backgroundColor: "#00000088",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "#ffffff22",
  },
  toolBtnText: {
    color: "#fff",
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },
  selectedControlsBar: {
    position: "absolute",
    top: 64,
    left: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#000000bb",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    zIndex: 45,
    borderWidth: 1,
    borderColor: "#a855f766",
  },
  ctrlLabel: {
    color: "#ffffffaa",
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    marginRight: 6,
  },
  ctrlBtn: {
    backgroundColor: "#ffffff22",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginHorizontal: 2,
    flexDirection: "row",
    alignItems: "center",
  },
  ctrlBtnText: {
    color: "#fff",
    fontFamily: "Inter_700Bold",
    fontSize: 13,
  },
  overlayItemContainer: {
    position: "absolute",
    transform: [{ translateX: -50 }, { translateY: -50 }],
    zIndex: 30,
    padding: 4,
  },
  overlaySelectedRing: {
    borderWidth: 1.5,
    borderColor: "#a855f7",
    borderRadius: 8,
    borderStyle: "dashed",
  },
  textBadgeCommon: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
  },
  textBadgePill: {
    backgroundColor: "#000000cc",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#ffffff33",
  },
  textBadgeGlass: {
    backgroundColor: "#ffffff33",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#ffffff66",
  },
  textBadgeNeon: {
    backgroundColor: "#000000ee",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#a855f7",
  },
  textBadgeContent: {
    fontFamily: "Inter_700Bold",
  },
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    gap: 12,
    backgroundColor: "#00000088",
    zIndex: 40,
  },
  captionInput: {
    color: "#fff",
    fontFamily: "Inter_500Medium",
    fontSize: 15,
    maxHeight: 90,
  },
  changeBtn: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    backgroundColor: "#ffffff22",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16, padding: 32 },
  pickBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    paddingHorizontal: 24,
    paddingVertical: 18,
  },
  textModalBackdrop: {
    flex: 1,
    backgroundColor: "#000000cc",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  textModalCard: {
    width: "100%",
    backgroundColor: "#18181b",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#27272a",
  },
  textModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  textModalTitle: {
    color: "#fff",
    fontFamily: "Inter_700Bold",
    fontSize: 16,
  },
  textModalInput: {
    backgroundColor: "#27272a",
    borderRadius: 12,
    color: "#fff",
    fontFamily: "Inter_500Medium",
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  sectionHeading: {
    color: "#ffffffaa",
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    marginBottom: 8,
  },
  colorCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#ffffff33",
  },
  colorCircleActive: {
    borderColor: "#a855f7",
    borderWidth: 3,
  },
  styleChip: {
    backgroundColor: "#27272a",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  styleChipActive: {
    backgroundColor: "#9333ea",
  },
  styleChipText: {
    color: "#ffffff88",
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    textTransform: "capitalize",
  },
  styleChipTextActive: {
    color: "#fff",
  },
  placeTextBtn: {
    backgroundColor: "#9333ea",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
});
