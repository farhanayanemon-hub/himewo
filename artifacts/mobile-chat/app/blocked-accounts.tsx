import { Touchable } from "@/components/Touchable";
import { fs } from "@/constants/typography";
import { shadow } from "@/constants/shadows";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Text,
  View,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListBlockedUsers,
  useUnblockUser,
  getListBlockedUsersQueryKey,
  getListConversationsQueryKey,
  type Profile,
} from "@workspace/api-client-react";
import { Avatar } from "@/components/Avatar";
import { useColors } from "@/hooks/useColors";

export default function BlockedAccountsScreen() {
  const c = useColors();
  const qc = useQueryClient();
  const { data, isLoading } = useListBlockedUsers();
  const blocked = (data ?? []) as Profile[];
  const unblock = useUnblockUser();

  const onUnblock = (p: Profile) => {
    Alert.alert("Unblock", `Unblock ${p.displayName}? They will be able to message you again.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Unblock",
        onPress: async () => {
          await unblock.mutateAsync({ id: p.id });
          qc.invalidateQueries({ queryKey: getListBlockedUsersQueryKey() });
          qc.invalidateQueries({ queryKey: getListConversationsQueryKey() });
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }}>
      <View style={[styles.header, { backgroundColor: c.card }, shadow("sm")]}>
        <Touchable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={c.foreground} />
        </Touchable>
        <Text style={{ color: c.foreground, fontFamily: "Inter_700Bold", fontSize: fs(18) }}>
          Blocked accounts
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {isLoading ? (
        <ActivityIndicator color={c.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={blocked}
          keyExtractor={(p) => p.id}
          contentContainerStyle={{ paddingBottom: 40 }}
          ListEmptyComponent={
            <View style={{ alignItems: "center", marginTop: 60, paddingHorizontal: 32 }}>
              <Ionicons name="remove-circle-outline" size={44} color={c.mutedForeground} />
              <Text
                style={{
                  color: c.mutedForeground,
                  fontSize: fs(14),
                  marginTop: 12,
                  textAlign: "center",
                }}
              >
                You haven't blocked anyone. Blocked people can't message you or
                start new chats with you.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={[styles.row, { borderBottomColor: c.border }]}>
              <Avatar uri={item.avatarUrl} name={item.displayName} size={46} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={{ color: c.foreground, fontFamily: "Inter_600SemiBold", fontSize: fs(15) }}>
                  {item.displayName}
                </Text>
                <Text style={{ color: c.mutedForeground, fontSize: fs(12) }}>@{item.username}</Text>
              </View>
              <Touchable
                style={[styles.actionBtn, { backgroundColor: c.muted }]}
                onPress={() => onUnblock(item)}
              >
                <Text style={{ color: c.foreground, fontFamily: "Inter_600SemiBold", fontSize: fs(13) }}>
                  Unblock
                </Text>
              </Touchable>
            </View>
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
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    zIndex: 2,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  actionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
  },
});
