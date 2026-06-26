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
import { useVideoPlayer, VideoView } from "expo-video";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { useCreateReel, getListReelsQueryKey } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { uploadMedia, UploadUnavailableError, type PickedAsset } from "@/lib/upload";

export default function CreateReelScreen() {
  const c = useColors();
  const qc = useQueryClient();
  const createReel = useCreateReel();

  const [asset, setAsset] = useState<PickedAsset | null>(null);
  const [caption, setCaption] = useState("");
  const [posting, setPosting] = useState(false);

  const pick = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["videos"],
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
            "Storage isn't configured in this environment, so this reel can't be posted right now.",
          );
          return;
        }
        throw err;
      }

      await createReel.mutateAsync({
        data: {
          videoUrl: uploaded.url,
          caption: caption.trim() || undefined,
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
          New reel
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
          <ReelPreview uri={asset.uri} />

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
              <Ionicons name="film" size={18} color="#fff" />
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
            <Ionicons name="videocam" size={28} color="#fff" />
            <Text style={{ color: "#fff", fontFamily: "Inter_700Bold", fontSize: 16 }}>
              Choose a video
            </Text>
          </Pressable>
          <Text style={{ color: "#ffffff99", fontFamily: "Inter_400Regular", fontSize: 13 }}>
            Share a short looping video with your friends
          </Text>
        </View>
      )}
    </SafeAreaView>
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
  preview: { flex: 1, position: "relative" },
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
