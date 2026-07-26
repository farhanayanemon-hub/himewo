import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  SectionList,
  Text,
  TextInput,
  View,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  useSearchAll,
  getSearchAllQueryKey,
  type Profile,
  type Page,
  type Group,
} from "@workspace/api-client-react";
import { Avatar } from "@/components/Avatar";
import { useColors } from "@/hooks/useColors";

type Row =
  | { kind: "person"; person: Profile }
  | { kind: "page"; page: Page }
  | { kind: "group"; group: Group };

export default function SearchScreen() {
  const c = useColors();
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  const enabled = debounced.length > 0;
  const searchParams = { q: debounced, limit: 10 };
  const { data, isLoading, isFetching } = useSearchAll(searchParams, {
    query: { enabled, queryKey: getSearchAllQueryKey(searchParams) },
  });

  const people = data?.people ?? [];
  const pages = data?.pages ?? [];
  const groups = data?.groups ?? [];
  const total = people.length + pages.length + groups.length;

  const sections = [
    {
      title: "People",
      data: people.map((person): Row => ({ kind: "person", person })),
    },
    {
      title: "Hubs",
      data: pages.map((page): Row => ({ kind: "page", page })),
    },
    {
      title: "Circles",
      data: groups.map((group): Row => ({ kind: "group", group })),
    },
  ].filter((s) => s.data.length > 0);

  const renderRow = (item: Row) => {
    if (item.kind === "person") {
      const p = item.person;
      return (
        <Pressable style={styles.row} onPress={() => router.push(`/profile/${p.id}`)}>
          <Avatar uri={p.avatarUrl} name={p.displayName} size={48} />
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Text
                numberOfLines={1}
                style={{ color: c.foreground, fontFamily: "Inter_600SemiBold", fontSize: 15 }}
              >
                {p.displayName}
              </Text>
              {p.isVerified && (
                <Ionicons name="checkmark-circle" size={15} color={c.primary} />
              )}
            </View>
            <Text
              numberOfLines={1}
              style={{ color: c.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 13 }}
            >
              @{p.username}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={c.mutedForeground} />
        </Pressable>
      );
    }
    if (item.kind === "page") {
      const p = item.page;
      return (
        <Pressable style={styles.row} onPress={() => router.push(`/pages/${p.id}`)}>
          <Avatar uri={p.avatarUrl} name={p.name} size={48} />
          <View style={{ flex: 1 }}>
            <Text
              numberOfLines={1}
              style={{ color: c.foreground, fontFamily: "Inter_600SemiBold", fontSize: 15 }}
            >
              {p.name}
            </Text>
            <Text
              numberOfLines={1}
              style={{ color: c.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 13 }}
            >
              Hub{p.category ? ` · ${p.category}` : ""} · {p.followerCount} followers
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={c.mutedForeground} />
        </Pressable>
      );
    }
    const g = item.group;
    return (
      <Pressable style={styles.row} onPress={() => router.push(`/groups/${g.id}`)}>
        <Avatar uri={g.avatarUrl} name={g.name} size={48} />
        <View style={{ flex: 1 }}>
          <Text
            numberOfLines={1}
            style={{ color: c.foreground, fontFamily: "Inter_600SemiBold", fontSize: 15 }}
          >
            {g.name}
          </Text>
          <Text
            numberOfLines={1}
            style={{ color: c.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 13 }}
          >
            Circle · {g.privacy} · {g.memberCount} members
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={c.mutedForeground} />
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }}>
      <View style={[styles.header, { borderBottomColor: c.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={c.foreground} />
        </Pressable>
        <View style={[styles.searchBox, { backgroundColor: c.secondary }]}>
          <Ionicons name="search" size={18} color={c.mutedForeground} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search HiMewo"
            placeholderTextColor={c.mutedForeground}
            autoFocus
            returnKeyType="search"
            underlineColorAndroid="transparent"
            style={[styles.input, { color: c.foreground }]}
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery("")} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={c.mutedForeground} />
            </Pressable>
          )}
        </View>
      </View>

      {!enabled ? (
        <View style={styles.center}>
          <Ionicons name="search" size={48} color={c.mutedForeground} />
          <Text style={[styles.emptyText, { color: c.mutedForeground }]}>
            Search for people, hubs and circles
          </Text>
        </View>
      ) : isLoading || (isFetching && total === 0) ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={c.primary} />
        </View>
      ) : total === 0 ? (
        <View style={styles.center}>
          <Ionicons name="search-outline" size={48} color={c.mutedForeground} />
          <Text style={[styles.emptyText, { color: c.mutedForeground }]}>
            No results for "{debounced}"
          </Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) =>
            item.kind === "person"
              ? `u-${item.person.id}`
              : item.kind === "page"
                ? `p-${item.page.id}`
                : `g-${item.group.id}`
          }
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingVertical: 8 }}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => (
            <Text style={[styles.sectionHeader, { color: c.mutedForeground }]}>
              {section.title}
            </Text>
          )}
          renderItem={({ item }) => renderRow(item)}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  input: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 16, padding: 0 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 32 },
  emptyText: { fontFamily: "Inter_500Medium", fontSize: 15, textAlign: "center" },
  sectionHeader: {
    fontFamily: "Inter_700Bold",
    fontSize: 13,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
});
