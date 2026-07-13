import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  TextInput,
  View,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  useSearchUsers,
  getSearchUsersQueryKey,
  type Profile,
} from "@workspace/api-client-react";
import { Avatar } from "@/components/Avatar";
import { useColors } from "@/hooks/useColors";

export default function SearchScreen() {
  const c = useColors();
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  const enabled = debounced.length > 0;
  const searchParams = { q: debounced, limit: 30 };
  const { data, isLoading, isFetching } = useSearchUsers(searchParams, {
    query: { enabled, queryKey: getSearchUsersQueryKey(searchParams) },
  });
  const results = (data ?? []) as Profile[];

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
            placeholder="Search people"
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
            Search for people by name or username
          </Text>
        </View>
      ) : isLoading || (isFetching && results.length === 0) ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={c.primary} />
        </View>
      ) : results.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="person-outline" size={48} color={c.mutedForeground} />
          <Text style={[styles.emptyText, { color: c.mutedForeground }]}>
            No people found for "{debounced}"
          </Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingVertical: 8 }}
          renderItem={({ item }) => (
            <Pressable
              style={styles.row}
              onPress={() => router.push(`/profile/${item.id}`)}
            >
              <Avatar uri={item.avatarUrl} name={item.displayName} size={48} />
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <Text
                    numberOfLines={1}
                    style={{ color: c.foreground, fontFamily: "Inter_600SemiBold", fontSize: 15 }}
                  >
                    {item.displayName}
                  </Text>
                  {item.isVerified && (
                    <Ionicons name="checkmark-circle" size={15} color={c.primary} />
                  )}
                </View>
                <Text
                  numberOfLines={1}
                  style={{ color: c.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 13 }}
                >
                  @{item.username}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={c.mutedForeground} />
            </Pressable>
          )}
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
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
});
