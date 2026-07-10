import { Touchable } from "@/components/Touchable";
import { fs } from "@/constants/typography";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  ScrollView,
  Text,
  View,
  StyleSheet,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
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
import { useColors } from "@/hooks/useColors";
import { timeAgo } from "@/lib/format";
import { storyBackground } from "@/lib/storyBackgrounds";

const STORY_DURATION = 5000;
const { width, height } = Dimensions.get("window");

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
  const [ready, setReady] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;
  const scrollX = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef<ScrollView>(null);
  const animRef = useRef<Animated.CompositeAnimation | null>(null);
  const viewedRef = useRef<Set<number>>(new Set());
  const indexRef = useRef(0);

  useEffect(() => {
    indexRef.current = index;
  }, [index]);

  // Position on the tapped story once the list loads.
  useEffect(() => {
    if (stories.length === 0) return;
    const start = stories.findIndex((s) => s.id === storyId);
    const startIdx = start >= 0 ? start : 0;
    setIndex(startIdx);
    indexRef.current = startIdx;
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ x: startIdx * width, animated: false });
      setReady(true);
    });
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

  // Navigate with a cube fold by animating the pager to the target page.
  const goTo = (target: number) => {
    if (target < 0) return;
    if (target > stories.length - 1) {
      router.back();
      return;
    }
    scrollRef.current?.scrollTo({ x: target * width, animated: true });
    setIndex(target);
    indexRef.current = target;
  };

  const goNext = () => goTo(indexRef.current + 1);
  const goPrev = () => goTo(indexRef.current - 1);

  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    if (i !== indexRef.current) {
      setIndex(i);
      indexRef.current = i;
    }
  };

  const startProgress = () => {
    const anim = Animated.timing(progress, {
      toValue: 1,
      duration: STORY_DURATION,
      useNativeDriver: false,
    });
    animRef.current = anim;
    anim.start(({ finished }) => {
      if (finished) goNext();
    });
  };

  useEffect(() => {
    if (!current || paused || !ready) return;
    progress.setValue(0);
    startProgress();
    return () => animRef.current?.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, current?.id, ready]);

  useEffect(() => {
    if (!ready) return;
    if (paused) {
      animRef.current?.stop();
    } else if (current) {
      startProgress();
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
        <Touchable style={styles.backLink} onPress={() => router.back()}>
          <Text style={{ color: c.primary, fontFamily: "Inter_600SemiBold" }}>Go back</Text>
        </Touchable>
      </SafeAreaView>
    );
  }

  return (
    <View style={[styles.fill, { backgroundColor: "#000" }]}>
      <Animated.ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: true },
        )}
        onMomentumScrollEnd={onMomentumEnd}
      >
        {stories.map((s, i) => (
          <CubePage key={s.id} index={i} scrollX={scrollX}>
            <StoryMedia story={s} active={i === index && !paused} />
          </CubePage>
        ))}
      </Animated.ScrollView>

      <Touchable
        style={styles.tapLeft}
        onPress={goPrev}
        onLongPress={() => setPaused(true)}
        onPressOut={() => setPaused(false)}
        delayLongPress={200}
      />
      <Touchable
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
          <View style={styles.authorRow}>
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
          </View>
          <Touchable onPress={() => router.back()} hitSlop={10}>
            <Ionicons name="close" size={28} color="#fff" />
          </Touchable>
        </View>
      </SafeAreaView>

      {current.storyType !== "text" && !!current.caption && (
        <SafeAreaView style={styles.captionWrap} pointerEvents="none">
          <Text style={styles.captionText}>{current.caption}</Text>
        </SafeAreaView>
      )}
    </View>
  );
}

function CubePage({
  index,
  scrollX,
  children,
}: {
  index: number;
  scrollX: Animated.Value;
  children: ReactNode;
}) {
  const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
  const rotateY = scrollX.interpolate({
    inputRange,
    outputRange: ["50deg", "0deg", "-50deg"],
    extrapolate: "clamp",
  });
  const translateX = scrollX.interpolate({
    inputRange,
    outputRange: [width * 0.5, 0, -width * 0.5],
    extrapolate: "clamp",
  });
  const opacity = scrollX.interpolate({
    inputRange,
    outputRange: [0.5, 1, 0.5],
    extrapolate: "clamp",
  });

  return (
    <Animated.View
      style={[
        styles.page,
        { opacity, transform: [{ perspective: 1000 }, { translateX }, { rotateY }] },
      ]}
    >
      {children}
    </Animated.View>
  );
}

function StoryMedia({ story, active }: { story: Story; active: boolean }) {
  if (story.storyType === "text") {
    return (
      <LinearGradient
        colors={storyBackground(story.backgroundStyle)}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[StyleSheet.absoluteFill, styles.center, { padding: 28 }]}
      >
        <Text style={styles.textStoryText}>{story.textContent ?? ""}</Text>
      </LinearGradient>
    );
  }
  if (story.mediaType === "video") {
    return <StoryVideo uri={story.mediaUrl ?? ""} paused={!active} />;
  }
  return (
    <Image
      source={{ uri: story.mediaUrl ?? undefined }}
      style={StyleSheet.absoluteFill}
      contentFit="contain"
      transition={150}
    />
  );
}

function StoryVideo({ uri, paused }: { uri: string; paused: boolean }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.muted = false;
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
  page: { width, height, backgroundColor: "#000" },
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
    fontSize: fs(14),
    textShadowColor: "#0008",
    textShadowRadius: 4,
  },
  timeText: {
    color: "#ffffffcc",
    fontFamily: "Inter_400Regular",
    fontSize: fs(12),
    textShadowColor: "#0008",
    textShadowRadius: 4,
  },
  textStoryText: {
    color: "#fff",
    fontFamily: "Inter_700Bold",
    fontSize: fs(26),
    textAlign: "center",
    textShadowColor: "#0008",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  captionWrap: { position: "absolute", left: 0, right: 0, bottom: 0, padding: 24 },
  captionText: {
    color: "#fff",
    fontFamily: "Inter_600SemiBold",
    fontSize: fs(18),
    textAlign: "center",
    textShadowColor: "#000",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
});
