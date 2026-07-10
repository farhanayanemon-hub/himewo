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
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";

// Tenor v1 public demo key — same one the web app uses.
const TENOR_KEY = "LIVDSRZULELA";

type TenorGif = {
  id: string;
  media: Array<{
    tinygif?: { url: string };
    gif?: { url: string };
  }>;
};

async function searchGifs(query: string): Promise<TenorGif[]> {
  const url = query.trim()
    ? `https://g.tenor.com/v1/search?q=${encodeURIComponent(query)}&key=${TENOR_KEY}&limit=24&media_filter=minimal`
    : `https://g.tenor.com/v1/trending?key=${TENOR_KEY}&limit=24&media_filter=minimal`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("GIF search failed");
  const data = await res.json();
  return data.results ?? [];
}

export function GifPickerModal({
  visible,
  onClose,
  onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [gifs, setGifs] = useState<TenorGif[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    setError(false);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      searchGifs(query)
        .then(setGifs)
        .catch(() => setError(true))
        .finally(() => setLoading(false));
    }, query ? 350 : 0);
    return () => clearTimeout(debounceRef.current);
  }, [visible, query]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: "#111" }}>
        <View style={styles.header}>
          <Pressable onPress={onClose} hitSlop={8}>
            <Ionicons name="close" size={26} color="#fff" />
          </Pressable>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search GIFs..."
            placeholderTextColor="#ffffff88"
            style={styles.search}
            autoFocus
          />
        </View>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color="#fff" />
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Text style={{ color: "#ffffff99", fontFamily: "Inter_500Medium" }}>
              Could not load GIFs. Try again.
            </Text>
          </View>
        ) : (
          <FlatList
            data={gifs}
            numColumns={2}
            keyExtractor={(g) => g.id}
            contentContainerStyle={{ padding: 6 }}
            renderItem={({ item }) => {
              const url = item.media[0]?.gif?.url ?? item.media[0]?.tinygif?.url;
              const preview = item.media[0]?.tinygif?.url ?? url;
              if (!url) return null;
              return (
                <Pressable
                  style={styles.cell}
                  onPress={() => {
                    onSelect(url);
                    onClose();
                  }}
                >
                  <Image source={{ uri: preview }} style={styles.gif} contentFit="cover" />
                </Pressable>
              );
            }}
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
    fontSize: 15,
    backgroundColor: "#ffffff1a",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  cell: { flex: 1, aspectRatio: 1, margin: 4, borderRadius: 10, overflow: "hidden" },
  gif: { width: "100%", height: "100%" },
});
