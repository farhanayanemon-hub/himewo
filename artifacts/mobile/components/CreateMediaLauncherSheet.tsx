/**
 * CreateMediaLauncherSheet (Mobile)
 * ─────────────────────────────────────────────────────────────────────────────
 * Bottom-sheet popup with 3 options:
 *   📸 Camera   → launches device camera (ImagePicker) → navigates to editor
 *   🖼️ Gallery  → launches image/video picker           → navigates to editor
 *   ✍️ Text     → navigates to create-story in text mode (story only)
 *
 * Animated spring sheet, glassmorphic on dark background.
 */

import { useRef } from "react";
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { captureWithCamera, type PickedAsset } from "@/lib/upload";

interface CreateMediaLauncherSheetProps {
  visible: boolean;
  mode: "story" | "reel";
  onClose: () => void;
  /** Called after a file has been selected — navigation to editor happens inside */
  onAssetPicked?: (asset: PickedAsset, source: "camera" | "gallery") => void;
}

interface ChoiceItem {
  id: "camera" | "gallery" | "text";
  label: string;
  sublabel: string;
  icon: keyof typeof Ionicons.glyphMap;
  colors: [string, string, ...string[]];
}

const STORY_CHOICES: ChoiceItem[] = [
  { id: "camera",  label: "Camera",  sublabel: "Photo or video with filters", icon: "camera",        colors: ["#7c3aed", "#6d28d9"] },
  { id: "gallery", label: "Gallery", sublabel: "Pick from your device",        icon: "images",        colors: ["#be185d", "#db2777"] },
  { id: "text",    label: "Text",    sublabel: "Create a text story",          icon: "text",          colors: ["#d97706", "#f59e0b"] },
];

const REEL_CHOICES: ChoiceItem[] = [
  { id: "camera",  label: "Camera",  sublabel: "Record a video with filters", icon: "videocam",      colors: ["#7c3aed", "#6d28d9"] },
  { id: "gallery", label: "Gallery", sublabel: "Choose a video to edit",       icon: "images-outline", colors: ["#be185d", "#db2777"] },
];

export function CreateMediaLauncherSheet({
  visible,
  mode,
  onClose,
  onAssetPicked,
}: CreateMediaLauncherSheetProps) {
  const c = useColors();
  const choices = mode === "story" ? STORY_CHOICES : REEL_CHOICES;

  const handleCamera = async () => {
    onClose();
    const mediaTypes: ImagePicker.MediaType[] = mode === "reel" ? ["videos"] : ["images", "videos"];
    const asset = await captureWithCamera(mediaTypes);
    if (!asset) return;
    if (onAssetPicked) {
      onAssetPicked(asset, "camera");
    } else {
      if (mode === "reel") {
        router.push({ pathname: "/create-reel", params: { uri: asset.uri, source: "camera" } } as never);
      } else {
        router.push({ pathname: "/create-story", params: { uri: asset.uri, type: asset.type ?? "image", source: "camera" } } as never);
      }
    }
  };

  const handleGallery = async () => {
    onClose();
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: mode === "reel" ? ["videos"] : ["images", "videos"],
      quality: 0.9,
    });
    if (res.canceled || !res.assets[0]) return;
    const asset = res.assets[0];
    if (onAssetPicked) {
      onAssetPicked(asset, "gallery");
    } else {
      if (mode === "reel") {
        router.push({ pathname: "/create-reel", params: { uri: asset.uri, source: "gallery" } } as never);
      } else {
        router.push({ pathname: "/create-story", params: { uri: asset.uri, type: asset.type ?? "image", source: "gallery" } } as never);
      }
    }
  };

  const handleText = () => {
    onClose();
    router.push({ pathname: "/create-story", params: { mode: "text" } } as never);
  };

  const handleChoice = (id: ChoiceItem["id"]) => {
    switch (id) {
      case "camera":  return handleCamera();
      case "gallery": return handleGallery();
      case "text":    return handleText();
    }
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
            <View style={[styles.sheet, { backgroundColor: c.card }]}>
              {/* Drag handle */}
              <View style={[styles.handle, { backgroundColor: c.secondary }]} />

              {/* Title */}
              <View style={styles.header}>
                <Text style={[styles.title, { color: c.foreground }]}>
                  Create {mode === "story" ? "Story" : "Reel"}
                </Text>
                <Text style={[styles.subtitle, { color: c.mutedForeground }]}>
                  Choose how you want to start
                </Text>
              </View>

              {/* Choice cards */}
              <View style={styles.grid}>
                {choices.map((item) => (
                  <Pressable
                    key={item.id}
                    onPress={() => handleChoice(item.id)}
                    style={({ pressed }) => [styles.card, { opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.96 : 1 }] }]}
                  >
                    <LinearGradient
                      colors={item.colors}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.cardGradient}
                    >
                      <View style={styles.cardIconWrap}>
                        <Ionicons name={item.icon} size={28} color="#fff" />
                      </View>
                      <Text style={styles.cardLabel}>{item.label}</Text>
                      <Text style={styles.cardSublabel}>{item.sublabel}</Text>
                    </LinearGradient>
                  </Pressable>
                ))}
              </View>

              {/* Cancel */}
              <Pressable
                onPress={onClose}
                style={[styles.cancelBtn, { backgroundColor: c.secondary }]}
              >
                <Text style={[styles.cancelText, { color: c.mutedForeground }]}>Cancel</Text>
              </Pressable>
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
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingBottom: 40,
    paddingTop: 12,
    paddingHorizontal: 16,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  header: {
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  title: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 14,
    justifyContent: "space-between",
  },
  card: {
    width: "30%",
    borderRadius: 18,
    overflow: "hidden",
  },
  cardGradient: {
    paddingVertical: 18,
    paddingHorizontal: 10,
    alignItems: "center",
    gap: 8,
  },
  cardIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  cardLabel: {
    color: "#fff",
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  cardSublabel: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 14,
  },
  cancelBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  cancelText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
});
