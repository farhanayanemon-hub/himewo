import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { createAudioPlayer, type AudioPlayer } from "expo-audio";
import {
  useListMusicTracks,
  getListMusicTracksQueryKey,
  type MusicTrack,
} from "@workspace/api-client-react";

export type SelectedMusic = Pick<MusicTrack, "title" | "artist" | "url">;

export function MusicPickerModal({
  visible,
  onClose,
  onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (track: SelectedMusic) => void;
}) {
  const [query, setQuery] = useState("");
  const [playingUrl, setPlayingUrl] = useState<string | null>(null);
  const playerRef = useRef<AudioPlayer | null>(null);

  const { data: tracks, isLoading } = useListMusicTracks(
    { q: query || undefined },
    {
      query: {
        enabled: visible,
        queryKey: getListMusicTracksQueryKey({ q: query || undefined }),
      },
    },
  );

  const stopPreview = () => {
    try {
      playerRef.current?.pause();
      playerRef.current?.release();
    } catch {
      // already released
    }
    playerRef.current = null;
    setPlayingUrl(null);
  };

  useEffect(() => {
    if (!visible) stopPreview();
    return stopPreview;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const togglePreview = (url: string) => {
    if (playingUrl === url) {
      stopPreview();
      return;
    }
    stopPreview();
    try {
      const p = createAudioPlayer({ uri: url });
      p.loop = true;
      p.play();
      playerRef.current = p;
      setPlayingUrl(url);
    } catch {
      setPlayingUrl(null);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: "#111" }}>
        <View style={styles.header}>
          <Pressable
            onPress={() => {
              stopPreview();
              onClose();
            }}
            hitSlop={8}
          >
            <Ionicons name="close" size={26} color="#fff" />
          </Pressable>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search songs, artists, moods..."
            placeholderTextColor="#ffffff88"
            underlineColorAndroid="transparent"
            style={styles.search}
          />
        </View>
        <Text style={styles.note}>
          Royalty-free music library. Upload your own audio from the website.
        </Text>
        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color="#fff" />
          </View>
        ) : (
          <FlatList
            data={tracks ?? []}
            keyExtractor={(t) => String(t.id)}
            contentContainerStyle={{ paddingVertical: 6 }}
            ListEmptyComponent={
              <View style={styles.center}>
                <Text style={{ color: "#ffffff99", fontFamily: "Inter_500Medium" }}>
                  No tracks found.
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <View style={styles.row}>
                <Pressable
                  style={styles.playBtn}
                  onPress={() => togglePreview(item.url)}
                >
                  <Ionicons
                    name={playingUrl === item.url ? "pause" : "play"}
                    size={18}
                    color="#fff"
                  />
                </Pressable>
                <Pressable
                  style={{ flex: 1 }}
                  onPress={() => {
                    stopPreview();
                    onSelect({ title: item.title, artist: item.artist, url: item.url });
                    onClose();
                  }}
                >
                  <Text style={styles.title} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.subtitle} numberOfLines={1}>
                    {item.artist ?? "Unknown artist"}
                    {item.mood ? ` · ${item.mood}` : ""}
                    {item.source === "upload" ? " · your upload" : ""}
                  </Text>
                </Pressable>
              </View>
            )}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  search: {
    flex: 1,
    color: "#fff",
    fontFamily: "Inter_500Medium",
    fontSize: 16,
    backgroundColor: "#ffffff1a",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  note: {
    color: "#ffffff77",
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    paddingHorizontal: 16,
    paddingBottom: 6,
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 40 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  playBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#ffffff22",
    alignItems: "center",
    justifyContent: "center",
  },
  title: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 14 },
  subtitle: { color: "#ffffff99", fontFamily: "Inter_400Regular", fontSize: 12 },
});
