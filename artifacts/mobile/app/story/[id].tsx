import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { useVideoPlayer, VideoView } from "expo-video";
import { LinearGradient } from "expo-linear-gradient";
import { createAudioPlayer, type AudioPlayer } from "expo-audio";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  useListStories,
  useViewStory,
  useSetStoryReaction,
  useRemoveStoryReaction,
  useReplyToStory,
  ReactionType,
  type Story,
  type StoryGroup,
} from "@workspace/api-client-react";
import { Avatar } from "@/components/Avatar";
import { MentionText } from "@/components/Mention";
import { useActingPage } from "@/lib/acting-page";
import { reactionConfig } from "@/constants/reactions";
import { useColors } from "@/hooks/useColors";
import { timeAgo } from "@/lib/format";
import { storyBackground } from "@/lib/storyBackgrounds";

const STORY_DURATION = 5000;
const { width } = Dimensions.get("window");

const QUICK_CHIPS: { key: string; label: string; text: string }[] = [
  { key: "toocute", label: "too cute", text: "too cute 🥺" },
  { key: "clap", label: "👏", text: "👏" },
  { key: "fire", label: "🔥🔥", text: "🔥🔥" },
];

// Reaction buttons shown FB-style at the bottom-right of the viewer.
const QUICK_REACTIONS: ReactionType[] = [
  ReactionType.love,
  ReactionType.like,
  ReactionType.haha,
];

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

  // --- Reactions + reply (Facebook-style) ---
  const { actingPage } = useActingPage();
  const setStoryReaction = useSetStoryReaction();
  const removeStoryReaction = useRemoveStoryReaction();
  const replyToStory = useReplyToStory();

  const [reaction, setReaction] = useState<ReactionType | null>(null);
  const [reactionCount, setReactionCount] = useState(0);
  const [replyText, setReplyText] = useState("");
  const [composing, setComposing] = useState(false);
  const [sentNote, setSentNote] = useState<string | null>(null);
  const sentTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync the local reaction state whenever the visible story changes.
  useEffect(() => {
    setReaction(current?.viewerReaction ?? null);
    setReactionCount(current?.reactionCount ?? 0);
  }, [current?.id, current?.viewerReaction, current?.reactionCount]);

  useEffect(
    () => () => {
      if (sentTimer.current) clearTimeout(sentTimer.current);
    },
    [],
  );

  const syncReaction = (updated: Story) => {
    setReaction(updated.viewerReaction ?? null);
    setReactionCount(updated.reactionCount);
  };

  const react = (t: ReactionType) => {
    if (!current) return;
    Haptics.selectionAsync();
    const prev = { reaction, reactionCount };
    const rollback = () => {
      setReaction(prev.reaction);
      setReactionCount(prev.reactionCount);
    };
    if (reaction === t) {
      setReaction(null);
      setReactionCount((n) => Math.max(0, n - 1));
      removeStoryReaction.mutate(
        { id: current.id },
        { onSuccess: (d) => syncReaction(d as Story), onError: rollback },
      );
    } else {
      if (!reaction) setReactionCount((n) => n + 1);
      setReaction(t);
      setStoryReaction.mutate(
        {
          id: current.id,
          data: { type: t, ...(actingPage ? { pageId: actingPage.id } : {}) },
        },
        { onSuccess: (d) => syncReaction(d as Story), onError: rollback },
      );
    }
  };

  const showSent = (msg: string) => {
    setSentNote(msg);
    if (sentTimer.current) clearTimeout(sentTimer.current);
    sentTimer.current = setTimeout(() => setSentNote(null), 1800);
  };

  const sendReply = (text: string) => {
    const t = text.trim();
    if (!t || !current || replyToStory.isPending) return;
    replyToStory.mutate(
      { id: current.id, data: { text: t } },
      {
        onSuccess: () => {
          setReplyText("");
          showSent("Sent");
        },
      },
    );
  };

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

  // Freeze auto-advance while long-pressing or composing a reply.
  const frozen = paused || composing;

  useEffect(() => {
    if (!current || frozen) return;
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
    if (frozen) {
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
  }, [frozen]);

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
        <StoryVideo uri={current.mediaUrl ?? ""} paused={frozen} />
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
            onPress={() =>
              current.authorPage
                ? router.push(`/pages/${current.authorPage.id}`)
                : current.author?.id && router.push(`/profile/${current.author.id}`)
            }
          >
            <Avatar
              uri={current.authorPage?.avatarUrl ?? current.author?.avatarUrl}
              name={current.authorPage?.name ?? current.author?.displayName}
              size={36}
            />
            <View style={{ flexShrink: 1 }}>
              <Text style={styles.authorName}>
                {current.authorPage?.name ?? current.author?.displayName}
              </Text>
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

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.interactionWrap}
        pointerEvents="box-none"
      >
        <SafeAreaView edges={["bottom"]} pointerEvents="box-none">
          {sentNote && (
            <View style={styles.sentPill}>
              <Ionicons name="checkmark-circle" size={16} color="#fff" />
              <Text style={styles.sentText}>{sentNote}</Text>
            </View>
          )}

          {reactionCount > 0 && (
            <Text style={styles.reactionCountText}>
              {reactionCount} {reactionCount === 1 ? "reaction" : "reactions"}
            </Text>
          )}

          <View style={styles.chipsRow}>
            {QUICK_CHIPS.map((chip) => (
              <Pressable
                key={chip.key}
                style={styles.chip}
                onPress={() => sendReply(chip.text)}
                disabled={replyToStory.isPending}
              >
                <Text style={styles.chipText}>{chip.label}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.replyRow}>
            <View style={styles.replyInputWrap}>
              <TextInput
                value={replyText}
                onChangeText={setReplyText}
                placeholder="Send message…"
                placeholderTextColor="#ffffffaa"
                style={styles.replyInput}
                onFocus={() => setComposing(true)}
                onBlur={() => setComposing(false)}
                returnKeyType="send"
                onSubmitEditing={() => sendReply(replyText)}
              />
              {replyText.trim().length > 0 && (
                <Pressable
                  onPress={() => sendReply(replyText)}
                  hitSlop={8}
                  disabled={replyToStory.isPending}
                >
                  <Ionicons name="send" size={20} color="#fff" />
                </Pressable>
              )}
            </View>

            {QUICK_REACTIONS.map((t) => {
              const active = reaction === t;
              return (
                <Pressable
                  key={t}
                  onPress={() => react(t)}
                  style={[styles.reactBtn, active && styles.reactBtnActive]}
                  hitSlop={4}
                >
                  <Text style={styles.reactEmoji}>{reactionConfig[t].emoji}</Text>
                </Pressable>
              );
            })}
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
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
  captionWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 150,
    paddingHorizontal: 24,
  },
  captionText: {
    color: "#fff",
    fontFamily: "Inter_600SemiBold",
    fontSize: 18,
    textAlign: "center",
    textShadowColor: "#000",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  interactionWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  sentPill: {
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#000000aa",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 8,
  },
  sentText: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 13 },
  reactionCountText: {
    color: "#ffffffdd",
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    marginBottom: 6,
    marginLeft: 4,
    textShadowColor: "#0008",
    textShadowRadius: 4,
  },
  chipsRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  chip: {
    backgroundColor: "#00000066",
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  chipText: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 14 },
  replyRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  replyInputWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1.5,
    borderColor: "#ffffff88",
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === "ios" ? 10 : 4,
  },
  replyInput: {
    flex: 1,
    color: "#fff",
    fontFamily: "Inter_500Medium",
    fontSize: 15,
    padding: 0,
  },
  reactBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#00000066",
  },
  reactBtnActive: { backgroundColor: "#ffffff33" },
  reactEmoji: { fontSize: 22 },
});
