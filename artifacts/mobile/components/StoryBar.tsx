import { Touchable } from "@/components/Touchable";
import { fs } from "@/constants/typography";
import { shadow } from "@/constants/shadows";
import { Pressable, ScrollView, Text, View, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useListStories, type StoryGroup } from "@workspace/api-client-react";
import { Avatar } from "@/components/Avatar";
import { useAuth } from "@/lib/auth";
import { useColors } from "@/hooks/useColors";

export function StoryBar() {
  const c = useColors();
  const { user } = useAuth();
  const { data } = useListStories();
  const groups = (data ?? []) as StoryGroup[];

  return (
    <View style={[styles.wrap, { backgroundColor: c.background }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        <Touchable style={styles.item} onPress={() => router.push("/create-story")}>
          <View>
            <Avatar uri={user?.avatarUrl} name={user?.displayName} size={64} />
            <View style={[styles.plus, { backgroundColor: c.primary, borderColor: c.background }]}>
              <Ionicons name="add" size={16} color="#fff" />
            </View>
          </View>
          <Text numberOfLines={1} style={[styles.name, { color: c.foreground }]}>
            Your story
          </Text>
        </Touchable>

        {groups.map((group) => {
          const cover = group.stories[0];
          if (!cover) return null;
          return (
            <Touchable
              key={group.author.id}
              style={styles.item}
              onPress={() => router.push(`/story/${cover.id}`)}
            >
              <View
                style={[
                  styles.ring,
                  { borderColor: group.hasUnseen ? c.primary : c.border },
                ]}
              >
                <View style={[styles.ringInner, { borderColor: c.background }]}>
                  <Image
                    source={{ uri: group.author?.avatarUrl ?? undefined }}
                    style={styles.avatar}
                    contentFit="cover"
                  />
                </View>
              </View>
              <Text numberOfLines={1} style={[styles.name, { color: c.foreground }]}>
                {group.author?.displayName?.split(" ")[0] ?? "Story"}
              </Text>
            </Touchable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const RING = 70;
const INNER = 62;

const styles = StyleSheet.create({
  wrap: { paddingVertical: 12 },
  row: { paddingHorizontal: 12, gap: 14 },
  item: { width: 72, alignItems: "center", gap: 6 },
  ring: {
    width: RING,
    height: RING,
    borderRadius: RING / 2,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    ...shadow("md"),
  },
  ringInner: {
    width: INNER,
    height: INNER,
    borderRadius: INNER / 2,
    borderWidth: 2,
    overflow: "hidden",
  },
  avatar: { width: "100%", height: "100%", borderRadius: INNER / 2 },
  plus: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
    ...shadow("sm"),
  },
  name: { fontSize: fs(12), fontFamily: "Inter_500Medium", maxWidth: 72, textAlign: "center" },
});
