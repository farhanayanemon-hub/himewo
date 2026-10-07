import { useState } from "react";
import { Pressable, ScrollView, Text, View, StyleSheet, Platform } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useListStories, type StoryGroup } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { useActingPage } from "@/lib/acting-page";
import { useColors } from "@/hooks/useColors";

export function StoryBar({ onCreatePress }: { onCreatePress?: () => void } = {}) {
  const c = useColors();
  const { user } = useAuth();
  const { actingPage } = useActingPage();
  const { data } = useListStories();
  const groups = (data ?? []) as StoryGroup[];

  const triggerHaptic = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
  };

  const myId = actingPage ? `p${actingPage.id}` : user?.id;
  const sortedGroups = groups
    ? [
        ...groups.filter((g) => (g.authorPage ? `p${g.authorPage.id}` : g.author.id) === myId),
        ...groups.filter((g) => (g.authorPage ? `p${g.authorPage.id}` : g.author.id) !== myId),
      ]
    : [];

  if (sortedGroups.length === 0) {
    return null;
  }

  return (
    <>
      <View style={styles.wrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.row}
        >
          {/* Active Story Cards only (User's own active story appears first) */}
          {sortedGroups.map((group) => {
            const cover = group.stories[0];
            if (!cover) return null;
            const isOwn = (group.authorPage ? `p${group.authorPage.id}` : group.author.id) === myId;
            const authorAvatar = (group.authorPage?.avatarUrl ?? group.author?.avatarUrl) || undefined;
            const authorName = isOwn
              ? "Your story"
              : (group.authorPage?.name ?? group.author?.displayName ?? "Friend").split(" ")[0];

            return (
              <Pressable
                key={group.authorPage ? `p${group.authorPage.id}` : group.author.id}
                style={({ pressed }) => [
                  styles.storyTile,
                  isOwn && styles.ownActiveStoryTile,
                  { transform: [{ scale: pressed ? 0.95 : 1 }] },
                ]}
                onPress={() => {
                  triggerHaptic();
                  router.push(`/story/${cover.id}`);
                }}
              >
                {cover.mediaUrl ? (
                  <Image
                    source={{ uri: cover.mediaUrl }}
                    style={StyleSheet.absoluteFill}
                    contentFit="cover"
                  />
                ) : (
                  <View style={[StyleSheet.absoluteFill, { backgroundColor: c.secondary }]} />
                )}

                {/* Dark Gradient Overlay for legible author name */}
                <View style={styles.storyGradientOverlay} />

                {/* Mini Author Avatar in Top-Left Corner */}
                <View style={[styles.miniAvatarWrap, isOwn && styles.ownMiniAvatarRing]}>
                  <Image
                    source={{ uri: authorAvatar }}
                    style={styles.miniAvatar}
                    contentFit="cover"
                  />
                </View>

                {/* Author First Name in Bottom-Left */}
                <Text numberOfLines={1} style={styles.storyAuthorName}>
                  {authorName}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingVertical: 12,
  },
  row: {
    paddingHorizontal: 16,
    gap: 10,
  },
  storyTile: {
    width: 88,
    height: 132,
    borderRadius: 22,
    overflow: "hidden",
    position: "relative",
    ...Platform.select({
      web: {
        boxShadow: "0 3px 10px rgba(0,0,0,0.04)",
      } as object,
      default: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 1,
      },
    }),
  },
  yourStoryTile: {
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 10,
  },
  ownActiveStoryTile: {
    borderWidth: 2,
    borderColor: "#8b5cf6",
  },
  ownMiniAvatarRing: {
    borderColor: "#8b5cf6",
  },
  miniAvatarWrap: {
    position: "absolute",
    top: 8,
    left: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    overflow: "hidden",
    backgroundColor: "#cbd5e1",
    zIndex: 10,
  },
  miniAvatar: {
    width: "100%",
    height: "100%",
  },
  storyGradientOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.18)",
  },
  storyAuthorName: {
    position: "absolute",
    bottom: 8,
    left: 8,
    right: 8,
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: -0.2,
    ...Platform.select({
      web: {
        textShadow: "0 1px 4px rgba(0,0,0,0.8)",
      } as object,
      default: {
        textShadowColor: "rgba(0, 0, 0, 0.75)",
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
      },
    }),
  },
});
