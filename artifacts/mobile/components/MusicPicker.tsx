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
            placeholder="Search Bangla, Hindi, moods..."
            placeholderTextColor="#ffffff88"
            underlineColorAndroid="transparent"
            style={styles.search}
          />
        </View>

        {/* Quick Category Chips */}
        <View style={styles.chipRow}>
          {[
            { id: "", label: "All" },
            { id: "Bangla", label: "🇧🇩 Bangla" },
            { id: "Hindi", label: "🇮🇳 Hindi" },
            { id: "Lo-Fi", label: "🎧 Lo-Fi" },
            { id: "Folk", label: "🪕 Folk" },
            { id: "Trending", label: "🔥 Trending" },
          ].map((cat) => (
            <Pressable
              key={cat.id}
              style={[
                styles.chip,
                (query === cat.id || (!query && !cat.id)) && styles.chipActive,
              ]}
              onPress={() => setQuery(cat.id)}
            >
              <Text
                style={[
                  styles.chipText,
                  (query === cat.id || (!query && !cat.id)) && styles.chipTextActive,
                ]}
              >
                {cat.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.note}>
          Curated Bangla, Hindi & Lo-Fi tracks. Tap to preview or select.
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
  chipRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 14,
    paddingBottom: 8,
    flexWrap: "wrap",
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: "#ffffff18",
  },
  chipActive: {
    backgroundColor: "#a855f7",
  },
  chipText: {
    color: "#ffffffaa",
    fontFamily: "Inter_500Medium",
    fontSize: 12,
  },
  chipTextActive: {
    color: "#fff",
    fontFamily: "Inter_700Bold",
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
