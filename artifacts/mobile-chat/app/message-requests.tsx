import { Touchable } from "@/components/Touchable";
import { fs } from "@/constants/typography";
import { shadow, glow } from "@/constants/shadows";
import { useState } from "react";
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
  useListFriendRequests,
  useAcceptFriendRequest,
  useDeclineFriendRequest,
  useGetFriendSuggestions,
  useSendFriendRequest,
  getListFriendRequestsQueryKey,
  getListFriendsQueryKey,
  getGetFriendSuggestionsQueryKey,
  type FriendRequest,
  type Profile,
} from "@workspace/api-client-react";
import { Avatar } from "@/components/Avatar";
import { useColors } from "@/hooks/useColors";

type Tab = "requests" | "suggestions";

export default function MessageRequestsScreen() {
  const c = useColors();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("requests");

  const { data: reqData, isLoading: reqLoading } = useListFriendRequests();
  const requests = (reqData ?? []) as FriendRequest[];
  const accept = useAcceptFriendRequest();
  const decline = useDeclineFriendRequest();

  const { data: sugData, isLoading: sugLoading } = useGetFriendSuggestions();
  const suggestions = (sugData ?? []) as Profile[];
  const send = useSendFriendRequest();
  const [sent, setSent] = useState<Record<string, boolean>>({});

  const refreshRequests = () => {
    qc.invalidateQueries({ queryKey: getListFriendRequestsQueryKey() });
    qc.invalidateQueries({ queryKey: getListFriendsQueryKey() });
  };

  const onAccept = async (id: number) => {
    try {
      await accept.mutateAsync({ id });
      refreshRequests();
    } catch {
      Alert.alert("Couldn't accept", "Please check your connection and try again.");
    }
  };
  const onDecline = async (id: number) => {
    try {
      await decline.mutateAsync({ id });
      refreshRequests();
    } catch {
      Alert.alert("Couldn't delete", "Please check your connection and try again.");
    }
  };
  const onSend = async (id: string) => {
    setSent((s) => ({ ...s, [id]: true }));
    try {
      await send.mutateAsync({ data: { addresseeId: id } });
      qc.invalidateQueries({ queryKey: getGetFriendSuggestionsQueryKey() });
    } catch {
      setSent((s) => ({ ...s, [id]: false }));
    }
  };

  const isLoading = tab === "requests" ? reqLoading : sugLoading;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }} edges={["top"]}>
      <View style={[styles.header, { backgroundColor: c.card }, shadow("sm")]}>
        <Touchable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={c.foreground} />
        </Touchable>
        <Text style={{ color: c.foreground, fontFamily: "Inter_700Bold", fontSize: fs(18) }}>
          Message requests
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={[styles.tabs, { backgroundColor: c.card, borderBottomColor: c.border }]}>
        {(["requests", "suggestions"] as Tab[]).map((t) => {
          const active = tab === t;
          const label = t === "requests" ? "Requests" : "You may know";
          return (
            <Touchable key={t} style={styles.tab} onPress={() => setTab(t)}>
              <Text
                style={{
                  color: active ? c.primary : c.mutedForeground,
                  fontFamily: active ? "Inter_700Bold" : "Inter_600SemiBold",
                  fontSize: fs(15),
                }}
              >
                {label}
                {t === "requests" && requests.length > 0 ? ` (${requests.length})` : ""}
              </Text>
              {active && <View style={[styles.indicator, { backgroundColor: c.primary }]} />}
            </Touchable>
          );
        })}
      </View>

      {isLoading ? (
        <ActivityIndicator color={c.primary} style={{ marginTop: 40 }} />
      ) : tab === "requests" ? (
        <FlatList
          data={requests}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => {
            const p = item.requester;
            return (
              <View style={[styles.row, { borderBottomColor: c.border }]}>
                <Avatar uri={p.avatarUrl} name={p.displayName} size={52} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text numberOfLines={1} style={{ color: c.foreground, fontFamily: "Inter_600SemiBold", fontSize: fs(15) }}>
                    {p.displayName}
                  </Text>
                  <Text style={{ color: c.mutedForeground, fontSize: fs(13) }}>wants to connect</Text>
                </View>
                <View style={styles.actions}>
                  <Touchable
                    style={[styles.accept, { backgroundColor: c.primary }, glow(c.primary)]}
                    onPress={() => onAccept(item.id)}
                    disabled={accept.isPending}
                  >
                    <Text style={{ color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: fs(13) }}>Confirm</Text>
                  </Touchable>
                  <Touchable
                    style={[styles.decline, { backgroundColor: c.secondary }]}
                    onPress={() => onDecline(item.id)}
                    disabled={decline.isPending}
                  >
                    <Text style={{ color: c.foreground, fontFamily: "Inter_600SemiBold", fontSize: fs(13) }}>Delete</Text>
                  </Touchable>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <Empty c={c} icon="chatbox-ellipses-outline" text="No message requests right now." />
          }
        />
      ) : (
        <FlatList
          data={suggestions}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const requested = sent[item.id];
            return (
              <View style={[styles.row, { borderBottomColor: c.border }]}>
                <Avatar uri={item.avatarUrl} name={item.displayName} size={52} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text numberOfLines={1} style={{ color: c.foreground, fontFamily: "Inter_600SemiBold", fontSize: fs(15) }}>
                    {item.displayName}
                  </Text>
                  <Text style={{ color: c.mutedForeground, fontSize: fs(13) }}>@{item.username}</Text>
                </View>
                <Touchable
                  style={[
                    styles.addBtn,
                    requested ? { backgroundColor: c.secondary } : { backgroundColor: c.primary, ...glow(c.primary) },
                  ]}
                  onPress={() => !requested && onSend(item.id)}
                  disabled={!!requested}
                >
                  <Text style={{ color: requested ? c.mutedForeground : "#fff", fontFamily: "Inter_600SemiBold", fontSize: fs(13) }}>
                    {requested ? "Requested" : "Add friend"}
                  </Text>
                </Touchable>
              </View>
            );
          }}
          ListEmptyComponent={
            <Empty c={c} icon="people-outline" text="No suggestions right now. Check back later." />
          }
        />
      )}
    </SafeAreaView>
  );
}

function Empty({ c, icon, text }: { c: ReturnType<typeof useColors>; icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={{ alignItems: "center", marginTop: 60, paddingHorizontal: 20 }}>
      <Ionicons name={icon} size={48} color={c.mutedForeground} />
      <Text style={{ color: c.mutedForeground, marginTop: 12, textAlign: "center" }}>{text}</Text>
    </View>
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
  tabs: { flexDirection: "row", borderBottomWidth: StyleSheet.hairlineWidth },
  tab: { flex: 1, alignItems: "center", paddingVertical: 12, position: "relative" },
  indicator: { position: "absolute", bottom: 0, height: 3, width: "60%", borderRadius: 2 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  actions: { gap: 6, alignItems: "stretch" },
  accept: { borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8, alignItems: "center" },
  decline: { borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8, alignItems: "center" },
  addBtn: { borderRadius: 8, paddingHorizontal: 16, paddingVertical: 9, alignItems: "center" },
});
