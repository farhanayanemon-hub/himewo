import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
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
import { useQueryClient } from "@tanstack/react-query";
import {
  useListStories,
  useViewStory,
  useSetStoryReaction,
  useRemoveStoryReaction,
  useReplyToStory,
  useDeleteStory,
  getListStoriesQueryKey,
  ReactionType,
  type Story,
  type StoryGroup,
} from "@workspace/api-client-react";
import { Avatar } from "@/components/Avatar";
import { MentionText } from "@/components/Mention";
import { useAuth } from "@/lib/auth";
import { useActingPage } from "@/lib/acting-page";
import { reactionConfig, reactionOrder } from "@/constants/reactions";
import { useColors } from "@/hooks/useColors";
import { timeAgo } from "@/lib/format";
import { storyBackground } from "@/lib/storyBackgrounds";

// Facebook-style per-media durations: photos/text show for 15s, videos up to 30s
// (a shorter clip advances early when it finishes playing).
const IMAGE_DURATION = 15000;
const VIDEO_MAX_DURATION = 30000;
const { width } = Dimensions.get("window");

// Where to start inside an author's tray: the first UNSEEN story, so reopening
// a person who added a new story jumps straight to the new one. Tapping left
// still walks back through the already-seen ones. Falls back to the start.
function firstUnseenIndex(stories: { viewerHasViewed?: boolean }[]): number {
  const i = stories.findIndex((s) => !s.viewerHasViewed);
  return i >= 0 ? i : 0;
}

const QUICK_CHIPS: { key: string; label: string; text: string }[] = [
  { key: "toocute", label: "too cute", text: "too cute 🥺" },
  { key: "clap", label: "👏", text: "👏" },
  { key: "fire", label: "🔥🔥", text: "🔥🔥" },
];

// Haptics reject on web; keep them best-effort and non-fatal everywhere.
function tapHaptic() {
  if (Platform.OS === "web") return;
  Haptics.selectionAsync().catch(() => {});
}

export default function StoryViewerScreen() {
  const c = useColors();
  const { user } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const storyId = Number(id);
  const { data, isLoading } = useListStories();
  const viewStory = useViewStory();
  const queryClient = useQueryClient();

  const groups = (data ?? []) as StoryGroup[];

  // Position across ALL story groups so navigation can move person-to-person.
  // Lazy-initialise from cache (StoryBar preloads the list) to avoid a flash,
  // and position exactly once so background refetches never snap the viewer back.
  const [pos, setPos] = useState(() => {
    for (let g = 0; g < groups.length; g++) {
      if (groups[g].stories.some((st) => st.id === storyId)) {
        return { g, s: firstUnseenIndex(groups[g].stories) };
      }
    }
    return { g: 0, s: 0 };
  });
  const positionedRef = useRef(false);
  useEffect(() => {
    if (positionedRef.current || groups.length === 0) return;
    for (let g = 0; g < groups.length; g++) {
      if (groups[g].stories.some((st) => st.id === storyId)) {
        setPos({ g, s: firstUnseenIndex(groups[g].stories) });
        positionedRef.current = true;
        return;
      }
    }
    positionedRef.current = true;
  }, [groups, storyId]);

  const currentGroup = groups[pos.g];
  const stories = currentGroup?.stories ?? [];
  const current = stories[pos.s];

  const [paused, setPaused] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;
  const animRef = useRef<Animated.CompositeAnimation | null>(null);
  const viewedRef = useRef<Set<number>>(new Set());

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
  const deleteStory = useDeleteStory();

  const isOwn = !!current && !!user && current.author?.id === user.id;

  const [reaction, setReaction] = useState<ReactionType | null>(null);
  const [reactionCount, setReactionCount] = useState(0);
  const [replyText, setReplyText] = useState("");
  const [composing, setComposing] = useState(false);
  const [trayOpen, setTrayOpen] = useState(false);
  const [sentNote, setSentNote] = useState<string | null>(null);
  const sentTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync the local reaction state whenever the visible story changes.
  useEffect(() => {
    setReaction(current?.viewerReaction ?? null);
    setReactionCount(current?.reactionCount ?? 0);
    setTrayOpen(false);
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
    tapHaptic();
    setTrayOpen(false);
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
        onError: () => showSent("Couldn't send — try again"),
      },
    );
  };

  const confirmDelete = () => {
    if (!current) return;
    Alert.alert("Delete story", "This story will be permanently removed.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () =>
          deleteStory.mutate(
            { id: current.id },
            {
              onSuccess: () => {
                queryClient.invalidateQueries({
                  queryKey: getListStoriesQueryKey(),
                });
                router.back();
              },
              onError: () =>
                Alert.alert("Could not delete", "Please try again."),
            },
          ),
      },
    ]);
  };

  const goNext = () => {
    if (pos.s < stories.length - 1) {
      setPos((p) => ({ ...p, s: p.s + 1 }));
    } else if (pos.g < groups.length - 1) {
      setPos((p) => ({ g: p.g + 1, s: 0 }));
    } else {
      router.back();
    }
  };

  const goPrev = () => {
    if (pos.s > 0) {
      setPos((p) => ({ ...p, s: p.s - 1 }));
    } else if (pos.g > 0) {
      const prevLen = groups[pos.g - 1]?.stories.length ?? 1;
      setPos((p) => ({ g: p.g - 1, s: Math.max(0, prevLen - 1) }));
    }
  };

  // Swiping horizontally jumps to a DIFFERENT person's stories (whereas tapping
  // moves within the current person). Each jump lands on that person's first
  // unseen story, mirroring Facebook.
  const nextAuthor = () => {
    if (pos.g < groups.length - 1) {
      const ng = pos.g + 1;
      setPos({ g: ng, s: firstUnseenIndex(groups[ng].stories) });
    } else {
      router.back();
    }
  };
  const prevAuthor = () => {
    if (pos.g > 0) {
      const pg = pos.g - 1;
      setPos({ g: pg, s: firstUnseenIndex(groups[pg].stories) });
    }
  };

  // Keep the latest navigation closures in a ref so the PanResponder (created
  // once) always calls the current handlers without re-subscribing.
  const navRef = useRef({ nextAuthor, prevAuthor });
  navRef.current.nextAuthor = nextAuthor;
  navRef.current.prevAuthor = prevAuthor;
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        // Only claim the gesture on a clear horizontal drag, so vertical taps
        // still reach the tap zones and the reply box below.
        onMoveShouldSetPanResponder: (_e, g) =>
          Math.abs(g.dx) > 24 && Math.abs(g.dx) > Math.abs(g.dy) * 1.6,
        onPanResponderRelease: (_e, g) => {
          if (g.dx < -50) navRef.current.nextAuthor();
          else if (g.dx > 50) navRef.current.prevAuthor();
        },
      }),
    [],
  );

  // Freeze auto-advance while long-pressing or composing a reply.
  const frozen = paused || composing;

  // Facebook-style timing: photos/text 15s, video up to 30s.
  const storyDuration =
    current?.mediaType === "video" ? VIDEO_MAX_DURATION : IMAGE_DURATION;

  // Single source of truth for the auto-advance timer so we never run two
  // competing animations (which caused stories to skip / double-advance).
  useEffect(() => {
    animRef.current?.stop();
    if (!current || frozen) return;
    progress.setValue(0);
    const anim = Animated.timing(progress, {
      toValue: 1,
      duration: storyDuration,
      useNativeDriver: false,
    });
    animRef.current = anim;
    anim.start(({ finished }) => {
      if (finished) goNext();
    });
    return () => anim.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pos.g, pos.s, current?.id, frozen, storyDuration]);

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
        <StoryVideo uri={current.mediaUrl ?? ""} paused={frozen} onEnded={goNext} />
      ) : (
        <Image
          source={{ uri: current.mediaUrl ?? undefined }}
          style={StyleSheet.absoluteFill}
          contentFit="contain"
          transition={150}
        />
      )}

      {/* Tap zones sit above the media but stop short of the bottom bar so they
          never swallow reaction / reply taps. The wrapper owns the horizontal
          swipe gesture (change person) while the Pressables handle taps. */}
      <View style={styles.navArea} {...panResponder.panHandlers}>
        <Pressable
          style={styles.tapHalfLeft}
          onPress={goPrev}
          onLongPress={() => setPaused(true)}
          onPressOut={() => setPaused(false)}
          delayLongPress={200}
        />
        <Pressable
          style={styles.tapHalfRight}
          onPress={goNext}
          onLongPress={() => setPaused(true)}
          onPressOut={() => setPaused(false)}
          delayLongPress={200}
        />
      </View>

      <SafeAreaView style={styles.topOverlay} pointerEvents="box-none">
        <View style={styles.progressRow}>
          {stories.map((s, i) => (
            <View key={s.id} style={styles.progressTrack}>
              <Animated.View
                style={[
                  styles.progressFill,
                  {
                    width:
                      i < pos.s
                        ? "100%"
                        : i === pos.s
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
          <View style={styles.headerActions}>
            {isOwn && (
              <Pressable onPress={confirmDelete} hitSlop={10} disabled={deleteStory.isPending}>
                <Ionicons name="trash-outline" size={24} color="#fff" />
              </Pressable>
            )}
            <Pressable onPress={() => router.back()} hitSlop={10}>
              <Ionicons name="close" size={28} color="#fff" />
            </Pressable>
          </View>
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

          {isOwn ? (
            <View style={styles.ownRow}>
              <Text style={styles.ownText}>This is your story.</Text>
              <Pressable
                style={styles.deleteBtn}
                onPress={confirmDelete}
                disabled={deleteStory.isPending}
              >
                <Ionicons name="trash-outline" size={18} color="#fff" />
                <Text style={styles.deleteText}>Delete story</Text>
              </Pressable>
            </View>
          ) : (
            <>
              {/* Full reaction tray (all seven) — opens above the reply row. */}
              {trayOpen && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.trayRow}
                  keyboardShouldPersistTaps="handled"
                >
                  {reactionOrder.map((t) => (
                    <Pressable
                      key={t}
                      onPress={() => react(t)}
                      style={[styles.trayBtn, reaction === t && styles.reactBtnActive]}
                      hitSlop={4}
                    >
                      <Text style={styles.trayEmoji}>{reactionConfig[t].emoji}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
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

                <Pressable
                  onPress={() => setTrayOpen((o) => !o)}
                  style={[styles.reactBtn, (reaction || trayOpen) && styles.reactBtnActive]}
                  hitSlop={4}
                >
                  <Text style={styles.reactEmoji}>
                    {reaction ? reactionConfig[reaction].emoji : "😍"}
                  </Text>
                </Pressable>
              </View>
            </>
          )}
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
}

function StoryVideo({
  uri,
  paused,
  onEnded,
}: {
  uri: string;
  paused: boolean;
  onEnded: () => void;
}) {
  const player = useVideoPlayer(uri, (p) => {
    // Play once, don't loop — a clip shorter than the 30s cap should advance
    // to the next story as soon as it finishes.
    p.loop = false;
    p.muted = false;
    p.play();
  });

  // Keep the latest onEnded in a ref so we only subscribe once.
  const onEndedRef = useRef(onEnded);
  onEndedRef.current = onEnded;
  useEffect(() => {
    const sub = player.addListener("playToEnd", () => onEndedRef.current());
    return () => sub.remove();
  }, [player]);

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
  navArea: { position: "absolute", left: 0, right: 0, top: 0, bottom: 190, flexDirection: "row" },
  tapHalfLeft: { width: width * 0.35, height: "100%" },
  tapHalfRight: { flex: 1, height: "100%" },
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
  headerActions: { flexDirection: "row", alignItems: "center", gap: 16 },
  authorRow: { flexDirection: "row", alignItems: "center", gap: 10, flexShrink: 1 },
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
  trayRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  trayBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#00000088",
  },
  trayEmoji: { fontSize: 26 },
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
  ownRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    backgroundColor: "#00000066",
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  ownText: { color: "#ffffffdd", fontFamily: "Inter_500Medium", fontSize: 14 },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#e5484d",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  deleteText: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 13 },
});
