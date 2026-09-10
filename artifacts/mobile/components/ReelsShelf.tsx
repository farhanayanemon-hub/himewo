import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  DeviceEventEmitter,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useVideoPlayer, VideoView } from "expo-video";
import { useListReels, type Reel } from "@workspace/api-client-react";
import { Avatar } from "@/components/Avatar";
import { useColors } from "@/hooks/useColors";
import { parseReelOverlays } from "@/app/create-reel";

function MobileReelCard({ reel }: { reel: Reel }) {
  const c = useColors();
  const player = useVideoPlayer(reel.videoUrl, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });

  const { cleanCaption } = parseReelOverlays(reel.caption);

  return (
    <Pressable
      onPress={() => router.push({ pathname: "/reels", params: { id: String(reel.id) } } as any)}
      style={[
        styles.reelCard,
        { backgroundColor: "#000", borderColor: c.border },
      ]}
    >
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        nativeControls={false}
      />

      {/* Top Left Badge */}
      <View style={styles.badge}>
        <Ionicons name="play" size={13} color="#fff" style={{ marginLeft: 1 }} />
      </View>

      {/* Bottom Info Overlay */}
      <View style={styles.overlay}>
        <View style={styles.authorRow}>
          <Avatar uri={reel.author.avatarUrl} name={reel.author.displayName} size={22} />
          <Text style={styles.authorName} numberOfLines={1}>
            {reel.author.displayName}
          </Text>
        </View>
        {cleanCaption.length > 0 && (
          <Text style={styles.caption} numberOfLines={2}>
            {cleanCaption}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

export function ReelsShelf() {
  const c = useColors();
  const { data: reels, isLoading, refetch } = useListReels({ limit: 12 });

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener("himewo:reel-created", () => {
      refetch();
    });
    return () => sub.remove();
  }, [refetch]);

  // Randomize reels order
  const randomReels = useMemo(() => {
    if (!reels || reels.length === 0) return [];
    return [...reels].sort(() => Math.random() - 0.5);
  }, [reels]);

  if (isLoading || randomReels.length === 0) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: c.card, borderColor: c.border }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <View style={[styles.iconWrap, { backgroundColor: "rgba(168, 85, 247, 0.12)" }]}>
            <Ionicons name="film" size={18} color="#a855f7" />
          </View>
          <View>
            <Text style={[styles.title, { color: c.foreground }]}>Reels and short videos</Text>
            <Text style={{ color: c.mutedForeground, fontSize: 11 }}>
              Watch & discover trending reels
            </Text>
          </View>
        </View>
        <Pressable onPress={() => router.push("/reels")}>
          <Text style={[styles.seeMore, { color: c.primary }]}>See more</Text>
        </Pressable>
      </View>

      {/* Horizontal Carousel */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {randomReels.map((reel) => (
          <MobileReelCard key={reel.id} reel={reel} />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 6,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    lineHeight: 18,
  },
  seeMore: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  scrollContent: {
    paddingHorizontal: 12,
    gap: 10,
  },
  reelCard: {
    width: 140,
    height: 230,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: 8,
    left: 8,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  overlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 8,
    backgroundColor: "rgba(0,0,0,0.6)",
    zIndex: 2,
  },
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  authorName: {
    color: "#fff",
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    flex: 1,
  },
  caption: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 10,
    lineHeight: 13,
  },
});
