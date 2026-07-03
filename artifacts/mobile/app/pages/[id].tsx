import {
  ActivityIndicator,
  ScrollView,
  Pressable,
  Text,
  View,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Stack, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetPage,
  useFollowPage,
  useUnfollowPage,
  getListPagesQueryKey,
  getGetPageQueryKey,
} from "@workspace/api-client-react";
import { useState } from "react";
import { BoostSheet } from "@/components/BoostSheet";
import { useColors } from "@/hooks/useColors";

export default function PageDetailScreen() {
  const c = useColors();
  const qc = useQueryClient();
  const { id: idParam } = useLocalSearchParams<{ id: string }>();
  const id = Number(idParam);

  const { data: page, isLoading } = useGetPage(id);
  const [boostOpen, setBoostOpen] = useState(false);
  const followPage = useFollowPage();
  const unfollowPage = useUnfollowPage();

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: getListPagesQueryKey() });
    qc.invalidateQueries({ queryKey: getGetPageQueryKey(id) });
  };

  const handleFollow = () => {
    if (!page) return;
    if (page.viewerFollows) {
      unfollowPage.mutate({ id }, { onSuccess: invalidate });
    } else {
      followPage.mutate({ id }, { onSuccess: invalidate });
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: c.background }]}>
        <Stack.Screen options={{ title: "Page" }} />
        <ActivityIndicator color={c.primary} size="large" />
      </SafeAreaView>
    );
  }

  if (!page) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: c.background }]}>
        <Stack.Screen options={{ title: "Page" }} />
        <Text style={{ color: c.mutedForeground, fontFamily: "Inter_500Medium" }}>Page not found</Text>
      </SafeAreaView>
    );
  }

  const busy = followPage.isPending || unfollowPage.isPending;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }} edges={["bottom"]}>
      <Stack.Screen options={{ title: page.name }} />
      <ScrollView>
        <View style={[styles.cover, { backgroundColor: c.secondary }]}>
          {page.coverUrl ? (
            <Image source={{ uri: page.coverUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
          ) : null}
        </View>
        <View style={{ paddingHorizontal: 16, paddingBottom: 24 }}>
          <View style={styles.avatarRow}>
            <View style={[styles.avatar, { backgroundColor: c.secondary, borderColor: c.background }]}>
              {page.avatarUrl ? (
                <Image source={{ uri: page.avatarUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
              ) : (
                <Ionicons name="document-text" size={36} color={c.primary} />
              )}
            </View>
            <View style={{ flexDirection: "row", gap: 8, alignItems: "flex-end" }}>
              {page.viewerCanPost && (
                <Pressable
                  style={[styles.followBtn, { backgroundColor: c.secondary, flexDirection: "row", alignItems: "center", gap: 6 }]}
                  onPress={() => setBoostOpen(true)}
                >
                  <Ionicons name="rocket" size={16} color={c.foreground} />
                  <Text style={{ color: c.foreground, fontFamily: "Inter_700Bold" }}>Boost</Text>
                </Pressable>
              )}
              <Pressable
                style={[
                  styles.followBtn,
                  { backgroundColor: page.viewerFollows ? c.secondary : c.primary },
                ]}
                onPress={handleFollow}
                disabled={busy}
              >
                {busy ? (
                  <ActivityIndicator color={page.viewerFollows ? c.foreground : "#fff"} size="small" />
                ) : (
                  <Text
                    style={{
                      color: page.viewerFollows ? c.foreground : "#fff",
                      fontFamily: "Inter_700Bold",
                    }}
                  >
                    {page.viewerFollows ? "Following" : "Follow"}
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
          <Text style={[styles.name, { color: c.foreground }]}>{page.name}</Text>
          {page.category ? (
            <Text style={[styles.category, { color: c.mutedForeground }]}>{page.category}</Text>
          ) : null}
          {page.description ? (
            <Text style={[styles.desc, { color: c.foreground }]}>{page.description}</Text>
          ) : null}
          <Text style={[styles.followers, { color: c.mutedForeground }]}>
            {page.followerCount} Followers
          </Text>
        </View>
      </ScrollView>

      {page.viewerCanPost && (
        <BoostSheet
          type="page"
          id={id}
          visible={boostOpen}
          onClose={() => setBoostOpen(false)}
          onDone={invalidate}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  cover: { height: 150 },
  avatarRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: "hidden",
    marginTop: -50,
    borderWidth: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  followBtn: { borderRadius: 10, paddingVertical: 10, paddingHorizontal: 24, marginBottom: 8 },
  name: { fontFamily: "Inter_700Bold", fontSize: 22, marginTop: 12 },
  category: { fontFamily: "Inter_500Medium", fontSize: 14, marginTop: 2 },
  desc: { fontFamily: "Inter_400Regular", fontSize: 15, marginTop: 10, lineHeight: 21 },
  followers: { fontFamily: "Inter_600SemiBold", fontSize: 14, marginTop: 14 },
});
