import { Pressable, ScrollView, Text, View, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useListStories, type StoryGroup } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { useColors } from "@/hooks/useColors";

export function StoryBar() {
  const c = useColors();
  const { user } = useAuth();
  const { data } = useListStories();
  const groups = (data ?? []) as StoryGroup[];

  return (
    <View style={[styles.wrap, { backgroundColor: c.card }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        <Pressable
          style={[styles.tile, { backgroundColor: c.secondary }]}
          onPress={() => router.push("/create-story")}
        >
          <View style={styles.createTop}>
            <Avatar uri={user?.avatarUrl} />
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
              key={group.author.id}
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
                <View
                  style={[
                    styles.storyRing,
                    { borderColor: group.hasUnseen ? c.primary : c.border },
                  ]}
                >
                  <Image
                    source={{ uri: group.author?.avatarUrl ?? undefined }}
                    style={styles.storyAvatar}
                    contentFit="cover"
                  />
                </View>
              </View>
              <Text numberOfLines={1} style={styles.storyName}>
                {group.author?.displayName ?? "Story"}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
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
  wrap: { paddingVertical: 10, marginBottom: 8 },
  row: { paddingHorizontal: 12, gap: 8 },
  tile: {
    width: 96,
    height: 150,
    borderRadius: 12,
    overflow: "hidden",
  },
  createTop: { height: 100, overflow: "hidden" },
  createBottom: { flex: 1, alignItems: "center", justifyContent: "flex-end", paddingBottom: 8 },
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
