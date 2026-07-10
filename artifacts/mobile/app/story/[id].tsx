import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Pressable,
  Text,
  View,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { useVideoPlayer, VideoView } from "expo-video";
import { LinearGradient } from "expo-linear-gradient";
import { createAudioPlayer, type AudioPlayer } from "expo-audio";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  useListStories,
  useViewStory,
  type Story,
  type StoryGroup,
} from "@workspace/api-client-react";
import { Avatar } from "@/components/Avatar";
import { MentionText } from "@/components/Mention";
import { useColors } from "@/hooks/useColors";
import { timeAgo } from "@/lib/format";
import { storyBackground } from "@/lib/storyBackgrounds";

const STORY_DURATION = 5000;
const { width } = Dimensions.get("window");

export default function StoryViewerScreen() {
  const c = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const storyId = Number(id);
  const { data, isLoading } = useListStories();
  const viewStory = useViewStory();

  const groups = (data ?? []) as StoryGroup[];

  const stories = useMemo<Story[]>(() => {
    for (const g of groups) {
      if (g.stories.some((s) => s.id === storyId)) return g.stories;
    }
    return [];
  }, [groups, storyId]);

  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;
  const animRef = useRef<Animated.CompositeAnimation | null>(null);
  const viewedRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (stories.length === 0) return;
    const start = stories.findIndex((s) => s.id === storyId);
    setIndex(start >= 0 ? start : 0);
  }, [stories, storyId]);

  const current = stories[index];

  // Story music: play while its story is on screen, pause with long-press.
  const musicRef = useRef<AudioPlayer | null>(null);
  useEffect(() => {
    try {
      musicRef.current?.pause();
      musicRef.current?.release();
    } catch {
      // already released
    }
    musicRef.current = null;
    if (current?.musicUrl) {
      try {
        const p = createAudioPlayer({ uri: current.musicUrl });
        p.loop = true;
        p.play();
        musicRef.current = p;
      } catch {
        musicRef.current = null;
      }
    }
    return () => {
      try {
        musicRef.current?.pause();
        musicRef.current?.release();
      } catch {
        // already released
      }
      musicRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id, current?.musicUrl]);

  useEffect(() => {
    if (paused) {
      musicRef.current?.pause();
    } else {
      try {
        musicRef.current?.play();
      } catch {
        // released
      }
    }
  }, [paused]);

  useEffect(() => {
    if (!current) return;
    if (!viewedRef.current.has(current.id)) {
      viewedRef.current.add(current.id);
      viewStory.mutate({ id: current.id });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);

  const goNext = () => {
    if (index < stories.length - 1) {
      setIndex((i) => i + 1);
    } else {
      router.back();
    }
  };

  const goPrev = () => {
    if (index > 0) {
      setIndex((i) => i - 1);
    }
  };

  useEffect(() => {
    if (!current || paused) return;
    progress.setValue(0);
    const anim = Animated.timing(progress, {
      toValue: 1,
      duration: STORY_DURATION,
      useNativeDriver: false,
    });
    animRef.current = anim;
    anim.start(({ finished }) => {
      if (finished) goNext();
    });
    return () => anim.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, current?.id]);

  useEffect(() => {
    if (paused) {
      animRef.current?.stop();
    } else if (current) {
      const anim = Animated.timing(progress, {
        toValue: 1,
        duration: STORY_DURATION,
        useNativeDriver: false,
      });
      animRef.current = anim;
      anim.start(({ finished }) => {
        if (finished) goNext();
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused]);

  if (isLoading) {
    return (
      <View style={[styles.fill, styles.center, { backgroundColor: "#000" }]}>
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  if (!current) {
    return (
      <SafeAreaView style={[styles.fill, styles.center, { backgroundColor: "#000" }]}>
        <Ionicons name="alert-circle-outline" size={48} color="#fff" />
        <Text style={{ color: "#fff", fontFamily: "Inter_500Medium", marginTop: 12 }}>
          Story not available
        </Text>
        <Pressable style={styles.backLink} onPress={() => router.back()}>
          <Text style={{ color: c.primary, fontFamily: "Inter_600SemiBold" }}>Go back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const isVideo = current.mediaType === "video";

  return (
    <View style={[styles.fill, { backgroundColor: "#000" }]}>
      {current.storyType === "text" ? (
        <LinearGradient
          colors={storyBackground(current.backgroundStyle)}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, styles.center, { padding: 28 }]}
        >
          <MentionText
            content={current.textContent ?? ""}
            style={styles.textStoryText}
          />
        </LinearGradient>
      ) : isVideo ? (
        <StoryVideo uri={current.mediaUrl ?? ""} paused={paused} />
      ) : (
        <Image
          source={{ uri: current.mediaUrl ?? undefined }}
          style={StyleSheet.absoluteFill}
          contentFit="contain"
          transition={150}
        />
      )}

      <Pressable
        style={styles.tapLeft}
        onPress={goPrev}
        onLongPress={() => setPaused(true)}
        onPressOut={() => setPaused(false)}
        delayLongPress={200}
      />
      <Pressable
        style={styles.tapRight}
        onPress={goNext}
        onLongPress={() => setPaused(true)}
        onPressOut={() => setPaused(false)}
        delayLongPress={200}
      />

      <SafeAreaView style={styles.topOverlay} pointerEvents="box-none">
        <View style={styles.progressRow}>
          {stories.map((s, i) => (
            <View key={s.id} style={styles.progressTrack}>
              <Animated.View
                style={[
                  styles.progressFill,
                  {
                    width:
                      i < index
                        ? "100%"
                        : i === index
                          ? progress.interpolate({
                              inputRange: [0, 1],
                              outputRange: ["0%", "100%"],
                            })
                          : "0%",
                  },
                ]}
              />
            </View>
          ))}
        </View>

        <View style={styles.headerRow}>
          <Pressable
            style={styles.authorRow}
            onPress={() => current.author?.id && router.push(`/profile/${current.author.id}`)}
          >
            <Avatar uri={current.author?.avatarUrl} name={current.author?.displayName} size={36} />
            <View style={{ flexShrink: 1 }}>
              <Text style={styles.authorName}>{current.author?.displayName}</Text>
              <Text style={styles.timeText}>{timeAgo(current.createdAt)}</Text>
              {!!current.musicUrl && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <Ionicons name="musical-notes" size={11} color="#fff" />
                  <Text style={styles.timeText} numberOfLines={1}>
                    {current.musicTitle ?? "Music"}
                    {current.musicArtist ? ` · ${current.musicArtist}` : ""}
                  </Text>
                </View>
              )}
            </View>
          </Pressable>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Ionicons name="close" size={28} color="#fff" />
          </Pressable>
        </View>
      </SafeAreaView>

      {current.storyType !== "text" && !!current.caption && (
        <SafeAreaView style={styles.captionWrap} pointerEvents="none">
          <MentionText content={current.caption} style={styles.captionText} />
        </SafeAreaView>
      )}
    </View>
  );
}

function StoryVideo({ uri, paused }: { uri: string; paused: boolean }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.muted = false;
    p.play();
  });

  useEffect(() => {
    if (paused) {
      player.pause();
    } else {
      player.play();
    }
  }, [paused, player]);

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
  fill: { flex: 1 },
  center: { alignItems: "center", justifyContent: "center" },
  backLink: { marginTop: 16 },
  tapLeft: { position: "absolute", left: 0, top: 0, bottom: 0, width: width * 0.35 },
  tapRight: { position: "absolute", right: 0, top: 0, bottom: 0, width: width * 0.65 },
  topOverlay: { position: "absolute", top: 0, left: 0, right: 0, paddingHorizontal: 8 },
  progressRow: { flexDirection: "row", gap: 4, paddingHorizontal: 4, paddingTop: 8 },
  progressTrack: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: "#ffffff55",
    overflow: "hidden",
  },
  progressFill: { height: "100%", backgroundColor: "#fff", borderRadius: 2 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingTop: 12,
  },
  authorRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  authorName: {
    color: "#fff",
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    textShadowColor: "#0008",
    textShadowRadius: 4,
  },
  timeText: {
    color: "#ffffffcc",
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    textShadowColor: "#0008",
    textShadowRadius: 4,
  },
  textStoryText: {
    color: "#fff",
    fontFamily: "Inter_700Bold",
    fontSize: 26,
    textAlign: "center",
    textShadowColor: "#0008",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  captionWrap: { position: "absolute", left: 0, right: 0, bottom: 0, padding: 24 },
  captionText: {
    color: "#fff",
    fontFamily: "Inter_600SemiBold",
    fontSize: 18,
    textAlign: "center",
    textShadowColor: "#000",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
});
