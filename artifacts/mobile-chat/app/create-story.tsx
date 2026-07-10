import { Touchable } from "@/components/Touchable";
import { fs } from "@/constants/typography";
import { glow } from "@/constants/shadows";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TextInput,
  View,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import {
  useCreateStory,
  getListStoriesQueryKey,
  StoryInputMediaType,
} from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { uploadMedia, UploadUnavailableError, captureWithCamera, type PickedAsset } from "@/lib/upload";
import { GifPickerModal } from "@/components/GifPicker";
import { MusicPickerModal, type SelectedMusic } from "@/components/MusicPicker";
import { STORY_BACKGROUNDS, DEFAULT_STORY_BG, storyBackground } from "@/lib/storyBackgrounds";

export default function CreateStoryScreen() {
  const c = useColors();
  const qc = useQueryClient();
  const createStory = useCreateStory();

  const [mode, setMode] = useState<"media" | "text">("media");
  const [asset, setAsset] = useState<PickedAsset | null>(null);
  const [gifUrl, setGifUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [textContent, setTextContent] = useState("");
  const [background, setBackground] = useState(DEFAULT_STORY_BG);
  const [music, setMusic] = useState<SelectedMusic | null>(null);
  const [gifOpen, setGifOpen] = useState(false);
  const [musicOpen, setMusicOpen] = useState(false);
  const [posting, setPosting] = useState(false);

  const isVideo = asset?.type === "video";

  const pick = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      quality: 0.8,
    });
    if (!res.canceled && res.assets[0]) {
      setGifUrl(null);
      setAsset(res.assets[0]);
    }
  };

  const capture = async () => {
    const captured = await captureWithCamera(["images", "videos"]);
    if (captured) {
      setGifUrl(null);
      setAsset(captured);
    }
  };

  const canSubmit =
    mode === "media" ? asset != null || gifUrl != null : textContent.trim().length > 0;

  const submit = async () => {
    if (!canSubmit) return;
    setPosting(true);
    try {
      const musicFields = music
        ? {
            musicUrl: music.url,
            musicTitle: music.title,
            musicArtist: music.artist ?? undefined,
          }
        : {};
      if (mode === "text") {
        await createStory.mutateAsync({
          data: {
            storyType: "text",
            textContent: textContent.trim(),
            backgroundStyle: background,
            ...musicFields,
          },
        });
      } else if (gifUrl) {
        await createStory.mutateAsync({
          data: {
            storyType: "media",
            mediaUrl: gifUrl,
            mediaType: StoryInputMediaType.image,
            caption: caption.trim() || undefined,
            ...musicFields,
          },
        });
      } else {
        let uploaded;
        try {
          uploaded = await uploadMedia(asset!);
        } catch (err) {
          if (err instanceof UploadUnavailableError) {
            Alert.alert(
              "Media upload unavailable",
              "Storage isn't configured in this environment, so this story can't be posted right now.",
            );
            return;
          }
          throw err;
        }
        await createStory.mutateAsync({
          data: {
            storyType: "media",
            mediaUrl: uploaded.url,
            mediaType:
              uploaded.type === "video"
                ? StoryInputMediaType.video
                : StoryInputMediaType.image,
            caption: caption.trim() || undefined,
            ...musicFields,
          },
        });
      }
      qc.invalidateQueries({ queryKey: getListStoriesQueryKey() });
      router.back();
    } catch {
      Alert.alert("Error", "Could not share your story. Please try again.");
    } finally {
      setPosting(false);
    }
  };

  const previewUri = gifUrl ?? asset?.uri ?? null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#000" }}>
      <View style={styles.header}>
        <Touchable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="close" size={28} color="#fff" />
        </Touchable>
        <Text style={{ color: "#fff", fontFamily: "Inter_700Bold", fontSize: fs(18) }}>
          Create story
        </Text>
        <Touchable
          style={[styles.shareBtn, { backgroundColor: canSubmit ? c.primary : "#333" }, canSubmit ? glow(c.primary) : null]}
          onPress={submit}
          disabled={!canSubmit || posting}
        >
          {posting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={{ color: "#fff", fontFamily: "Inter_700Bold" }}>Share</Text>
          )}
        </Touchable>
      </View>

      <View style={styles.tabs}>
        <Touchable
          style={[styles.tab, mode === "media" && { backgroundColor: c.primary }]}
          onPress={() => setMode("media")}
        >
          <Ionicons name="image" size={16} color="#fff" />
          <Text style={styles.tabText}>Photo / Video / GIF</Text>
        </Touchable>
        <Touchable
          style={[styles.tab, mode === "text" && { backgroundColor: c.primary }]}
          onPress={() => setMode("text")}
        >
          <Ionicons name="text" size={16} color="#fff" />
          <Text style={styles.tabText}>Text</Text>
        </Touchable>
      </View>

      {music && (
        <View style={styles.musicChip}>
          <Ionicons name="musical-notes" size={14} color="#fff" />
          <Text style={styles.musicChipText} numberOfLines={1}>
            {music.title}
            {music.artist ? ` · ${music.artist}` : ""}
          </Text>
          <Touchable onPress={() => setMusic(null)} hitSlop={8}>
            <Ionicons name="close" size={16} color="#fff" />
          </Touchable>
        </View>
      )}

      {mode === "text" ? (
        <View style={{ flex: 1 }}>
          <LinearGradient
            colors={storyBackground(background)}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.textPreview}
          >
            <TextInput
              value={textContent}
              onChangeText={setTextContent}
              placeholder="Start typing..."
              placeholderTextColor="#ffffffaa"
              style={styles.textStoryInput}
              multiline
              maxLength={700}
            />
          </LinearGradient>
          <View style={styles.bgRow}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: 16 }}>
              {Object.entries(STORY_BACKGROUNDS).map(([key, colors]) => (
                <Touchable key={key} onPress={() => setBackground(key)}>
                  <LinearGradient
                    colors={colors}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[
                      styles.bgSwatch,
                      background === key && { borderColor: "#fff", borderWidth: 2 },
                    ]}
                  />
                </Touchable>
              ))}
            </ScrollView>
            <Touchable style={styles.musicBtn} onPress={() => setMusicOpen(true)}>
              <Ionicons name="musical-notes" size={18} color="#fff" />
              <Text style={styles.musicBtnText}>Music</Text>
            </Touchable>
          </View>
        </View>
      ) : previewUri ? (
        <View style={styles.preview}>
          <Image
            source={{ uri: previewUri }}
            style={StyleSheet.absoluteFill}
            contentFit="contain"
          />
          {isVideo && !gifUrl && (
            <View style={styles.videoBadge}>
              <Ionicons name="videocam" size={16} color="#fff" />
              <Text style={{ color: "#fff", fontSize: fs(12), fontFamily: "Inter_500Medium" }}>
                Video
              </Text>
            </View>
          )}

          {caption.trim().length > 0 && (
            <View style={styles.captionOverlay} pointerEvents="none">
              <Text style={styles.captionText}>{caption}</Text>
            </View>
          )}

          <View style={styles.bottomBar}>
            <TextInput
              value={caption}
              onChangeText={setCaption}
              placeholder="Add a caption..."
              placeholderTextColor="#ffffffaa"
              style={styles.captionInput}
              multiline
            />
            <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
              <Touchable style={styles.changeBtn} onPress={pick}>
                <Ionicons name="image" size={18} color="#fff" />
                <Text style={styles.changeBtnText}>Gallery</Text>
              </Touchable>
              <Touchable style={styles.changeBtn} onPress={capture}>
                <Ionicons name="camera" size={18} color="#fff" />
                <Text style={styles.changeBtnText}>Camera</Text>
              </Touchable>
              <Touchable style={styles.changeBtn} onPress={() => setGifOpen(true)}>
                <Ionicons name="happy" size={18} color="#fff" />
                <Text style={styles.changeBtnText}>GIF</Text>
              </Touchable>
              <Touchable style={styles.changeBtn} onPress={() => setMusicOpen(true)}>
                <Ionicons name="musical-notes" size={18} color="#fff" />
                <Text style={styles.changeBtnText}>Music</Text>
              </Touchable>
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.empty}>
          <Touchable
            style={[styles.pickBtn, { backgroundColor: c.primary }, glow(c.primary)]}
            onPress={pick}
          >
            <Ionicons name="images" size={28} color="#fff" />
            <Text style={{ color: "#fff", fontFamily: "Inter_700Bold", fontSize: fs(16) }}>
              Choose photo or video
            </Text>
          </Touchable>
          <Touchable
            style={[styles.pickBtn, { backgroundColor: "#ffffff22" }]}
            onPress={capture}
          >
            <Ionicons name="camera" size={28} color="#fff" />
            <Text style={{ color: "#fff", fontFamily: "Inter_700Bold", fontSize: fs(16) }}>
              Take photo or video
            </Text>
          </Touchable>
          <Touchable
            style={[styles.pickBtn, { backgroundColor: "#ffffff22" }]}
            onPress={() => setGifOpen(true)}
          >
            <Ionicons name="happy" size={28} color="#fff" />
            <Text style={{ color: "#fff", fontFamily: "Inter_700Bold", fontSize: fs(16) }}>
              Pick a GIF
            </Text>
          </Touchable>
          <Text style={{ color: "#ffffff99", fontFamily: "Inter_400Regular", fontSize: fs(13) }}>
            Share a moment that disappears after 24 hours
          </Text>
        </View>
      )}

      <GifPickerModal
        visible={gifOpen}
        onClose={() => setGifOpen(false)}
        onSelect={(url) => {
          setAsset(null);
          setGifUrl(url);
        }}
      />
      <MusicPickerModal
        visible={musicOpen}
        onClose={() => setMusicOpen(false)}
        onSelect={setMusic}
      />
    </SafeAreaView>
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
  tabs: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#ffffff22",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  tabText: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: fs(13) },
  musicChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    backgroundColor: "#ffffff22",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginHorizontal: 16,
    marginBottom: 8,
    maxWidth: "80%",
  },
  musicChipText: {
    color: "#fff",
    fontFamily: "Inter_500Medium",
    fontSize: fs(12),
    flexShrink: 1,
  },
  preview: { flex: 1, position: "relative" },
  textPreview: {
    flex: 1,
    marginHorizontal: 16,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  textStoryInput: {
    color: "#fff",
    fontFamily: "Inter_700Bold",
    fontSize: fs(24),
    textAlign: "center",
    width: "100%",
  },
  bgRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
  },
  bgSwatch: { width: 34, height: 34, borderRadius: 17 },
  musicBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#ffffff22",
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 16,
  },
  musicBtnText: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: fs(13) },
  videoBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#0009",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  captionOverlay: {
    position: "absolute",
    top: "45%",
    left: 0,
    right: 0,
    alignItems: "center",
    paddingHorizontal: 24,
  },
  captionText: {
    color: "#fff",
    fontFamily: "Inter_700Bold",
    fontSize: fs(24),
    textAlign: "center",
    textShadowColor: "#000",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    gap: 12,
    backgroundColor: "#00000066",
  },
  captionInput: {
    color: "#fff",
    fontFamily: "Inter_500Medium",
    fontSize: fs(16),
    maxHeight: 100,
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
  changeBtnText: { color: "#fff", fontFamily: "Inter_500Medium", fontSize: fs(13) },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16, padding: 32 },
  pickBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    paddingHorizontal: 24,
    paddingVertical: 18,
  },
});
