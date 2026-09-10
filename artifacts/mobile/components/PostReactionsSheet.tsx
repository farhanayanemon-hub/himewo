import { useState, useMemo } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
  StyleSheet,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  useListPostReactions,
  getListPostReactionsQueryKey,
  ReactionType,
} from "@workspace/api-client-react";
import { Avatar } from "@/components/Avatar";
import { reactionConfig } from "@/constants/reactions";
import { useColors } from "@/hooks/useColors";

interface PostReactionsSheetProps {
  postId: number;
  visible: boolean;
  onClose: () => void;
}

export function PostReactionsSheet({
  postId,
  visible,
  onClose,
}: PostReactionsSheetProps) {
  const c = useColors();
  const [activeFilter, setActiveFilter] = useState<"all" | ReactionType>("all");

  const { data: reactions, isLoading } = useListPostReactions(postId, {
    query: {
      enabled: visible && !!postId,
      queryKey: getListPostReactionsQueryKey(postId),
    },
  });

  const allReactions = reactions ?? [];

  // Group counts by reaction type
  const countsByType = useMemo(() => {
    const map = new Map<ReactionType, number>();
    for (const r of allReactions) {
      const t = r.type as ReactionType;
      map.set(t, (map.get(t) ?? 0) + 1);
    }
    return map;
  }, [allReactions]);

  // Filtered list
  const filtered = useMemo(() => {
    if (activeFilter === "all") return allReactions;
    return allReactions.filter((r) => r.type === activeFilter);
  }, [allReactions, activeFilter]);

  // Distinct types present
  const presentTypes = useMemo(() => {
    const set = new Set<ReactionType>();
    for (const r of allReactions) {
      set.add(r.type as ReactionType);
    }
    return Array.from(set);
  }, [allReactions]);

  const handleUserPress = (item: (typeof allReactions)[0]) => {
    onClose();
    if (item.page?.id) {
      router.push({ pathname: "/pages", params: { id: String(item.page.id) } } as any);
    } else if (item.user) {
      const target = item.user.username || item.user.id;
      router.push(`/profile/${target}` as any);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: c.card }]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Top handle */}
          <View style={[styles.handle, { backgroundColor: c.border }]} />

          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: c.foreground }]}>
              People who reacted
              {allReactions.length > 0 && ` (${allReactions.length})`}
            </Text>
            <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={c.mutedForeground} />
            </Pressable>
          </View>

          {/* Filter Pills Tabs */}
          <View style={[styles.filterBar, { borderBottomColor: c.border }]}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterScroll}
            >
              <Pressable
                onPress={() => setActiveFilter("all")}
                style={[
                  styles.pill,
                  {
                    backgroundColor:
                      activeFilter === "all" ? c.primary : c.secondary,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.pillText,
                    {
                      color:
                        activeFilter === "all"
                          ? c.primaryForeground
                          : c.foreground,
                    },
                  ]}
                >
                  All {allReactions.length > 0 && `(${allReactions.length})`}
                </Text>
              </Pressable>

              {presentTypes.map((type) => {
                const count = countsByType.get(type) ?? 0;
                const config = reactionConfig[type];
                const active = activeFilter === type;
                return (
                  <Pressable
                    key={type}
                    onPress={() => setActiveFilter(type)}
                    style={[
                      styles.pill,
                      styles.emojiPill,
                      {
                        backgroundColor: active ? c.primary : c.secondary,
                      },
                    ]}
                  >
                    <Text style={{ fontSize: 13 }}>{config?.emoji ?? "👍"}</Text>
                    <Text
                      style={[
                        styles.pillText,
                        {
                          color: active ? c.primaryForeground : c.foreground,
                        },
                      ]}
                    >
                      {count}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* Reactions List */}
          {isLoading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator color={c.primary} size="small" />
              <Text style={[styles.statusText, { color: c.mutedForeground }]}>
                Loading reactions...
              </Text>
            </View>
          ) : filtered.length === 0 ? (
            <View style={styles.centerContainer}>
              <Ionicons
                name="people-outline"
                size={36}
                color={c.mutedForeground}
              />
              <Text style={[styles.statusText, { color: c.mutedForeground }]}>
                No reactions found
              </Text>
            </View>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(item, index) => `${item.user?.id || item.page?.id || index}-${index}`}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => {
                const name = item.page
                  ? item.page.name
                  : item.user?.displayName || "User";
                const avatar = item.page
                  ? item.page.avatarUrl
                  : item.user?.avatarUrl;
                const username = !item.page ? item.user?.username : undefined;
                const rType = item.type as ReactionType;
                const emoji = reactionConfig[rType]?.emoji ?? "👍";

                return (
                  <Pressable
                    style={({ pressed }) => [
                      styles.userRow,
                      pressed && { opacity: 0.7 },
                    ]}
                    onPress={() => handleUserPress(item)}
                  >
                    <View style={styles.avatarContainer}>
                      <Avatar uri={avatar} name={name} size={44} />
                      <View
                        style={[
                          styles.emojiBadge,
                          {
                            backgroundColor: c.card,
                            borderColor: c.border,
                          },
                        ]}
                      >
                        <Text style={styles.emojiText}>{emoji}</Text>
                      </View>
                    </View>

                    <View style={styles.userInfo}>
                      <Text
                        style={[styles.userName, { color: c.foreground }]}
                        numberOfLines={1}
                      >
                        {name}
                      </Text>
                      {username && (
                        <Text
                          style={[styles.userHandle, { color: c.mutedForeground }]}
                          numberOfLines={1}
                        >
                          @{username}
                        </Text>
                      )}
                    </View>
                  </Pressable>
                );
              }}
            />
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "#0006",
  },
  sheet: {
    height: "55%",
    minHeight: 380,
    maxHeight: 520,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 8,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  title: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  closeBtn: {
    padding: 4,
  },
  filterBar: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: 8,
  },
  filterScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  emojiPill: {
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 12,
  },
  pillText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  statusText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 9,
    gap: 12,
  },
  avatarContainer: {
    position: "relative",
  },
  emojiBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  emojiText: {
    fontSize: 11,
    lineHeight: 12,
  },
  userInfo: {
    flex: 1,
    justifyContent: "center",
  },
  userName: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  userHandle: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 1,
  },
});
