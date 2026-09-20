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
import { CreateMediaLauncherSheet } from "@/components/CreateMediaLauncherSheet";
import { CreateActionSheet } from "@/components/CreateActionSheet";

export function StoryBar({ onCreatePress }: { onCreatePress?: () => void } = {}) {
  const c = useColors();
  const { user } = useAuth();
  const { actingPage } = useActingPage();
  const { data } = useListStories();
  const groups = (data ?? []) as StoryGroup[];

  const [showCreatePicker, setShowCreatePicker] = useState(false);
  const [launcherMode, setLauncherMode] = useState<"story" | "reel" | null>(null);

  const triggerHaptic = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
  };

  const handleOpenCreate = () => {
    triggerHaptic();
    if (onCreatePress) {
      onCreatePress();
    } else {
      setShowCreatePicker(true);
    }
  };

  return (
    <>
      <CreateActionSheet
        visible={showCreatePicker}
        onClose={() => setShowCreatePicker(false)}
        onSelectStory={() => setLauncherMode("story")}
        onSelectReel={() => setLauncherMode("reel")}
      />

      <CreateMediaLauncherSheet
        visible={!!launcherMode}
        mode={launcherMode ?? "story"}
        onClose={() => setLauncherMode(null)}
      />

      <View style={[styles.wrap, { backgroundColor: c.card }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.row}
        >
          {/* "Your Story" Card with Cyan (+) Badge */}
          <Pressable
            style={({ pressed }) => [
              styles.storyTile,
              styles.yourStoryTile,
              {
                backgroundColor: c.secondary,
                borderColor: c.border,
                transform: [{ scale: pressed ? 0.94 : 1 }],
              },
            ]}
            onPress={handleOpenCreate}
            accessibilityLabel="Add to your story"
          >
            <View style={styles.yourStoryAvatarWrap}>
              <Image
                source={{ uri: (actingPage ? actingPage.avatarUrl : user?.avatarUrl) || undefined }}
                style={styles.yourStoryAvatar}
                contentFit="cover"
              />
            </View>

            <Text numberOfLines={1} style={[styles.yourStoryText, { color: c.foreground }]}>
              Your story
            </Text>

            {/* Cyan Plus Badge at Bottom Center */}
            <View style={styles.cyanPlusBadge}>
              <Ionicons name="add" size={15} color="#FFFFFF" />
            </View>
          </Pressable>

          {/* Friend Story Cards (Full bleed photo with top-left mini author avatar) */}
          {groups.map((group) => {
            const cover = group.stories[0];
            if (!cover) return null;
            const authorAvatar = (group.authorPage?.avatarUrl ?? group.author?.avatarUrl) || undefined;
            const authorName = (group.authorPage?.name ?? group.author?.displayName ?? "Friend").split(" ")[0];

            return (
              <Pressable
                key={group.authorPage ? `p${group.authorPage.id}` : group.author.id}
                style={({ pressed }) => [
                  styles.storyTile,
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
                <View style={styles.miniAvatarWrap}>
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
        boxShadow: "0 4px 14px rgba(0,0,0,0.06)",
      } as object,
      default: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 3,
      },
    }),
  },
  yourStoryTile: {
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 10,
  },
  yourStoryAvatarWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: "hidden",
    marginBottom: 8,
    backgroundColor: "#e2e8f0",
  },
  yourStoryAvatar: {
    width: "100%",
    height: "100%",
  },
  yourStoryText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  cyanPlusBadge: {
    position: "absolute",
    bottom: -1,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#00C2E8",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    ...Platform.select({
      web: {
        boxShadow: "0 0 8px rgba(0,194,232,0.6)",
      } as object,
      default: {
        shadowColor: "#00C2E8",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.5,
        shadowRadius: 4,
        elevation: 4,
      },
    }),
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
