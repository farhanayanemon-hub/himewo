import { useState } from "react";
import {
  Dimensions,
  Pressable,
  Text,
  View,
  StyleSheet,
} from "react-native";
import { Image } from "expo-image";
import { useVideoPlayer, VideoView } from "expo-video";
import { Ionicons } from "@expo/vector-icons";
import type { MediaItem } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";

function VideoTile({ uri, height }: { uri: string; height: number }) {
  const c = useColors();
  const [playing, setPlaying] = useState(false);
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
  });

  return (
    <View style={{ width: "100%", height, backgroundColor: "#000" }}>
      <VideoView
        player={player}
        style={{ width: "100%", height }}
        contentFit="contain"
        nativeControls={playing}
      />
      {!playing && (
        <Pressable
          style={styles.playOverlay}
          onPress={() => {
            setPlaying(true);
            player.play();
          }}
        >
          <View style={[styles.playBtn, { backgroundColor: c.primary }]}>
            <Ionicons name="play" size={26} color="#fff" />
          </View>
        </Pressable>
      )}
    </View>
  );
}

export function MediaGrid({ media }: { media: MediaItem[] }) {
  const c = useColors();
  const width = Dimensions.get("window").width;
  if (!media || media.length === 0) return null;

  if (media.length === 1) {
    const m = media[0];
    const h = m.type === "video" ? 240 : 320;
    if (m.type === "video") return <VideoTile uri={m.url} height={h} />;
    return (
      <Image
        source={{ uri: m.url }}
        style={{ width: "100%", height: h }}
        contentFit="cover"
        transition={150}
      />
    );
  }

  const tileSize = (width - 2) / 2;
  const shown = media.slice(0, 4);
  const extra = media.length - 4;

  return (
    <View style={styles.grid}>
      {shown.map((m, i) => (
        <View key={m.id ?? i} style={{ width: tileSize, height: tileSize, margin: 0.5 }}>
          {m.type === "video" ? (
            <VideoTile uri={m.url} height={tileSize} />
          ) : (
            <Image
              source={{ uri: m.url }}
              style={{ width: "100%", height: "100%" }}
              contentFit="cover"
              transition={150}
            />
          )}
          {i === 3 && extra > 0 && (
            <View style={styles.moreOverlay}>
              <Text style={{ color: "#fff", fontSize: 26, fontFamily: "Inter_700Bold" }}>
                +{extra}
              </Text>
            </View>
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap" },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  playBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    opacity: 0.92,
  },
  moreOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#0008",
    alignItems: "center",
    justifyContent: "center",
  },
});
