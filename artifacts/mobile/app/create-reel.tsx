import { useEffect, useRef, useState } from "react";
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
import { uploadMedia, UploadUnavailableError, captureWithCamera, type PickedAsset } from "@/lib/upload";
import { MusicPickerModal, type SelectedMusic } from "@/components/MusicPicker";

export default function CreateReelScreen() {
  const c = useColors();
  const qc = useQueryClient();
  const createReel = useCreateReel();

  const [asset, setAsset] = useState<PickedAsset | null>(null);
  const [caption, setCaption] = useState("");
  const [music, setMusic] = useState<SelectedMusic | null>(null);
  const [musicOpen, setMusicOpen] = useState(false);
  const [posting, setPosting] = useState(false);

  // Facebook-style: opening the reel creator jumps straight to the gallery.
  // If the user backs out of the picker without choosing, leave the screen.
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

          {music && (
            <View style={styles.musicChip}>
              <Ionicons name="musical-notes" size={14} color="#fff" />
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
              placeholder="Add a caption..."
              placeholderTextColor="#ffffffaa"
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
                <Ionicons name="musical-notes" size={18} color="#fff" />
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
            style={[styles.pickBtn, { backgroundColor: c.primary }]}
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
            <Ionicons name="musical-notes" size={28} color="#fff" />
            <Text style={{ color: "#fff", fontFamily: "Inter_700Bold", fontSize: 16 }}>
              {music ? `Music: ${music.title}` : "Add music"}
            </Text>
          </Pressable>
          <Text style={{ color: "#ffffff99", fontFamily: "Inter_400Regular", fontSize: 13 }}>
            Share a short looping video with your friends
          </Text>
        </View>
      )}

      <MusicPickerModal
        visible={musicOpen}
        onClose={() => setMusicOpen(false)}
        onSelect={setMusic}
      />
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
    maxWidth: "80%",
  },
  musicChipText: {
    color: "#fff",
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    flexShrink: 1,
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
