import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  Text,
  TextInput,
  View,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import {
  useCreateStory,
  getListStoriesQueryKey,
  StoryInputMediaType,
} from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { uploadMedia, UploadUnavailableError, type PickedAsset } from "@/lib/upload";

export default function CreateStoryScreen() {
  const c = useColors();
  const qc = useQueryClient();
  const createStory = useCreateStory();

  const [asset, setAsset] = useState<PickedAsset | null>(null);
  const [caption, setCaption] = useState("");
  const [posting, setPosting] = useState(false);

  const isVideo = asset?.type === "video";

  const pick = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      quality: 0.8,
    });
    if (!res.canceled && res.assets[0]) {
      setAsset(res.assets[0]);
    }
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
            "Storage isn't configured in this environment, so this story can't be posted right now.",
          );
          return;
        }
        throw err;
      }

      await createStory.mutateAsync({
        data: {
          mediaUrl: uploaded.url,
          mediaType:
            uploaded.type === "video"
              ? StoryInputMediaType.video
              : StoryInputMediaType.image,
          caption: caption.trim() || undefined,
        },
      });
      qc.invalidateQueries({ queryKey: getListStoriesQueryKey() });
      router.back();
    } catch {
      Alert.alert("Error", "Could not share your story. Please try again.");
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
          Create story
        </Text>
        <Pressable
          style={[styles.shareBtn, { backgroundColor: asset ? c.primary : "#333" }]}
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
          <Image
            source={{ uri: asset.uri }}
            style={StyleSheet.absoluteFill}
            contentFit="contain"
          />
          {isVideo && (
            <View style={styles.videoBadge}>
              <Ionicons name="videocam" size={16} color="#fff" />
              <Text style={{ color: "#fff", fontSize: 12, fontFamily: "Inter_500Medium" }}>
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
            <Pressable style={styles.changeBtn} onPress={pick}>
              <Ionicons name="image" size={18} color="#fff" />
              <Text style={{ color: "#fff", fontFamily: "Inter_500Medium", fontSize: 13 }}>
                Change
              </Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={styles.empty}>
          <Pressable
            style={[styles.pickBtn, { backgroundColor: c.primary }]}
            onPress={pick}
          >
            <Ionicons name="images" size={28} color="#fff" />
            <Text style={{ color: "#fff", fontFamily: "Inter_700Bold", fontSize: 16 }}>
              Choose photo or video
            </Text>
          </Pressable>
          <Text style={{ color: "#ffffff99", fontFamily: "Inter_400Regular", fontSize: 13 }}>
            Share a moment that disappears after 24 hours
          </Text>
        </View>
      )}
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
  preview: { flex: 1, position: "relative" },
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
    fontSize: 24,
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
    fontSize: 16,
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
