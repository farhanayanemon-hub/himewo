import { useState } from "react";
import { Pressable, ScrollView, Text, View, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useListStories, type StoryGroup } from "@workspace/api-client-react";
import colorTokens from "@/constants/colors";
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

  const handleOpenCreate = () => {
    if (onCreatePress) {
      onCreatePress();
    } else {
      setShowCreatePicker(true);
    }
  };

  return (
    <>
      {/* Full Facebook-Style Create Action Sheet */}
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
          {/* Single + Create Card */}
          <Pressable
            style={[styles.tile, { backgroundColor: c.secondary }]}
            onPress={handleOpenCreate}
          >
            <View style={styles.createTop}>
              <Avatar uri={actingPage ? actingPage.avatarUrl : user?.avatarUrl} />
            </View>
            <View style={[styles.createBottom, { backgroundColor: c.card }]}>
              <View style={[styles.plus, { backgroundColor: c.primary, borderColor: c.card }]}>
                <Ionicons name="add" size={16} color="#fff" />
              </View>
              <Text
                numberOfLines={1}
                style={{ color: c.foreground, fontSize: 11, fontFamily: "Inter_600SemiBold" }}
              >
                Create
              </Text>
            </View>
          </Pressable>

          {groups.map((group) => {
            const cover = group.stories[0];
            if (!cover) return null;
            return (
              <Pressable
                key={group.authorPage ? `p${group.authorPage.id}` : group.author.id}
                style={styles.tile}
                onPress={() => router.push(`/story/${cover.id}`)}
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
                <View style={styles.storyTop}>
                  {group.hasUnseen ? (
                    <LinearGradient
                      colors={colorTokens.auroraGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={[styles.storyRing, { borderWidth: 0 }]}
                    >
                      <Image
                        source={{ uri: group.authorPage?.avatarUrl ?? group.author?.avatarUrl ?? undefined }}
                        style={[styles.storyAvatar, { borderColor: c.background, borderWidth: 2 }]}
                        contentFit="cover"
                      />
                    </LinearGradient>
                  ) : (
                    <View style={[styles.storyRing, { borderColor: c.border }]}>
                      <Image
                        source={{ uri: group.authorPage?.avatarUrl ?? group.author?.avatarUrl ?? undefined }}
                        style={styles.storyAvatar}
                        contentFit="cover"
                      />
                    </View>
                  )}
                </View>
                <Text numberOfLines={1} style={styles.storyName}>
                  {group.authorPage?.name ?? group.author?.displayName ?? "Story"}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </>
  );
}

function Avatar({ uri }: { uri?: string | null }) {
  return (
    <Image
      source={{ uri: uri ?? undefined }}
      style={{ width: "100%", height: "100%" }}
      contentFit="cover"
    />
  );
}

const styles = StyleSheet.create({
  wrap: { paddingVertical: 10 },
  row: { paddingHorizontal: 12, gap: 8 },
  tile: {
    width: 96,
    height: 150,
    borderRadius: 12,
    overflow: "hidden",
  },
  createTop: { height: 100, overflow: "hidden" },
  createBottom: { flex: 1, alignItems: "center", justifyContent: "flex-end", paddingBottom: 8 },
  createReelTile: { alignItems: "center", justifyContent: "center" },
  reelIconWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  reelIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#ffffff33",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#ffffffcc",
  },
  reelLabel: {
    position: "absolute",
    bottom: 8,
    left: 8,
    right: 8,
    textAlign: "center",
    color: "#fff",
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  plus: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -14,
    marginBottom: 4,
  },
  storyTop: { padding: 8 },
  storyRing: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    padding: 2,
  },
  storyAvatar: { width: "100%", height: "100%", borderRadius: 19 },
  storyName: {
    position: "absolute",
    bottom: 8,
    left: 8,
    right: 8,
    color: "#fff",
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
});

