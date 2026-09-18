import { useState } from "react";
import { Modal, Pressable, ScrollView, Text, View, StyleSheet } from "react-native";
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

export function StoryBar() {
  const c = useColors();
  const { user } = useAuth();
  const { actingPage } = useActingPage();
  const { data } = useListStories();
  const groups = (data ?? []) as StoryGroup[];

  const [showCreatePicker, setShowCreatePicker] = useState(false);
  const [launcherMode, setLauncherMode] = useState<"story" | "reel" | null>(null);

  return (
    <>
      {/* 2-Option Create Picker Sheet (Story or Reel) */}
      <Modal
        visible={showCreatePicker}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setShowCreatePicker(false)}
      >
        <Pressable
          style={styles.pickerBackdrop}
          onPress={() => setShowCreatePicker(false)}
        >
          <View
            style={[styles.pickerSheet, { backgroundColor: c.card, borderColor: c.border }]}
            onStartShouldSetResponder={() => true}
          >
            <View style={[styles.pickerHandle, { backgroundColor: c.border }]} />
            <Text style={[styles.pickerTitle, { color: c.foreground }]}>Create Content</Text>

            <Pressable
              style={({ pressed }) => [
                styles.pickerOption,
                { backgroundColor: pressed ? c.secondary : "transparent" },
              ]}
              onPress={() => {
                setShowCreatePicker(false);
                setLauncherMode("story");
              }}
            >
              <View style={[styles.pickerIconWrap, { backgroundColor: c.primary + "18" }]}>
                <Ionicons name="book-outline" size={24} color={c.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.pickerOptionTitle, { color: c.foreground }]}>
                  Create Story
                </Text>
                <Text style={[styles.pickerOptionSub, { color: c.mutedForeground }]}>
                  Share photos, videos or text with 50+ filters
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={c.mutedForeground} />
            </Pressable>

            <View style={[styles.pickerDivider, { backgroundColor: c.border }]} />

            <Pressable
              style={({ pressed }) => [
                styles.pickerOption,
                { backgroundColor: pressed ? c.secondary : "transparent" },
              ]}
              onPress={() => {
                setShowCreatePicker(false);
                setLauncherMode("reel");
              }}
            >
              <View style={[styles.pickerIconWrap, { backgroundColor: "#c026d318" }]}>
                <Ionicons name="videocam-outline" size={24} color="#c026d3" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.pickerOptionTitle, { color: c.foreground }]}>
                  Create Reel
                </Text>
                <Text style={[styles.pickerOptionSub, { color: c.mutedForeground }]}>
                  Share short-form video reels with music & stickers
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={c.mutedForeground} />
            </Pressable>
          </View>
        </Pressable>
      </Modal>

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
            onPress={() => setShowCreatePicker(true)}
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
  pickerBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  pickerSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 36,
  },
  pickerHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  pickerTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    marginBottom: 16,
  },
  pickerOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 14,
  },
  pickerIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  pickerOptionTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  pickerOptionSub: {
    fontSize: 12,
    marginTop: 2,
  },
  pickerDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 4,
    marginLeft: 68,
  },
});

