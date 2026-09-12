import { useState, useCallback } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListLiveStreams,
  getListLiveStreamsQueryKey,
  useStartLiveStream,
  type LiveStream,
} from "@workspace/api-client-react";
import { Avatar } from "@/components/Avatar";
import { useAuth } from "@/lib/auth";
import { useColors } from "@/hooks/useColors";

export default function LiveScreen() {
  const c = useColors();
  const qc = useQueryClient();
  const { user } = useAuth();
  const [goLiveModal, setGoLiveModal] = useState(false);
  const [title, setTitle] = useState("");

  const { data: streams, isLoading, isRefetching, refetch } = useListLiveStreams();
  const startStream = useStartLiveStream();

  const onRefresh = useCallback(() => {
    qc.invalidateQueries({ queryKey: getListLiveStreamsQueryKey() });
    refetch();
  }, [qc, refetch]);

  const handleStartLive = () => {
    if (!title.trim()) {
      Alert.alert("Title required", "Please enter a title for your live stream.");
      return;
    }

    startStream.mutate(
      { data: { title: title.trim() } },
      {
        onSuccess: (res) => {
          qc.invalidateQueries({ queryKey: getListLiveStreamsQueryKey() });
          setGoLiveModal(false);
          setTitle("");
          Alert.alert("Live Stream Started", "Your stream is now live!");
        },
        onError: (err: any) => {
          Alert.alert("Failed", err?.message || "Could not start live stream.");
        },
      }
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }} edges={["top"]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: c.card, borderBottomColor: c.border }]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Pressable onPress={() => router.back()} hitSlop={8} style={styles.iconBtn}>
            <Ionicons name="arrow-back" size={24} color={c.foreground} />
          </Pressable>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <View style={[styles.badgeIcon, { backgroundColor: "#ef444420" }]}>
              <Ionicons name="radio" size={18} color="#ef4444" />
            </View>
            <Text style={[styles.title, { color: c.foreground }]}>Live Streams</Text>
          </View>
        </View>

        <Pressable
          onPress={() => setGoLiveModal(true)}
          style={[styles.goLiveBtn, { backgroundColor: "#ef4444" }]}
        >
          <Ionicons name="videocam" size={18} color="#fff" />
          <Text style={styles.goLiveBtnText}>Go Live</Text>
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#ef4444" />
          <Text style={{ color: c.mutedForeground, marginTop: 12, fontSize: 14 }}>
            Checking live streams...
          </Text>
        </View>
      ) : (
        <FlatList
          data={streams || []}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: 16, paddingBottom: 32, gap: 14 }}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor="#ef4444" />
          }
          renderItem={({ item }) => (
            <View style={[styles.streamCard, { backgroundColor: c.card, borderColor: c.border }]}>
              <View style={styles.previewPlaceholder}>
                <View style={styles.liveBadge}>
                  <View style={styles.pulseDot} />
                  <Text style={styles.liveBadgeText}>LIVE</Text>
                </View>

                <View style={styles.viewerBadge}>
                  <Ionicons name="radio" size={14} color="#fff" />
                  <Text style={styles.viewerCount}>Stream</Text>
                </View>

                <Ionicons name="videocam-outline" size={48} color="rgba(255,255,255,0.4)" />
              </View>

              <View style={{ padding: 14, gap: 10 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <Avatar uri={item.host.avatarUrl} name={item.host.displayName} size={40} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.streamTitle, { color: c.foreground }]} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={{ fontSize: 13, color: c.mutedForeground }} numberOfLines={1}>
                      {item.host.displayName}
                    </Text>
                  </View>
                </View>

                <Pressable
                  onPress={() => Alert.alert("Join Live Stream", `Joining "${item.title}"...`)}
                  style={[styles.watchBtn, { backgroundColor: c.primary }]}
                >
                  <Ionicons name="play" size={16} color="#fff" />
                  <Text style={styles.watchBtnText}>Watch Stream</Text>
                </Pressable>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={[styles.emptyCard, { backgroundColor: c.card, borderColor: c.border }]}>
              <View style={[styles.emptyIconWrap, { backgroundColor: "#ef444420" }]}>
                <Ionicons name="radio-outline" size={44} color="#ef4444" />
              </View>
              <Text style={[styles.emptyTitle, { color: c.foreground }]}>No Active Streams</Text>
              <Text style={[styles.emptySub, { color: c.mutedForeground }]}>
                There are no active live streams right now. Tap "Go Live" to start your own broadcast!
              </Text>
              <Pressable
                onPress={() => setGoLiveModal(true)}
                style={[styles.emptyGoLive, { backgroundColor: "#ef4444" }]}
              >
                <Ionicons name="videocam" size={18} color="#fff" />
                <Text style={{ color: "#fff", fontWeight: "700", fontSize: 14 }}>Start Broadcast</Text>
              </Pressable>
            </View>
          }
        />
      )}

      {/* Go Live Modal */}
      <Modal visible={goLiveModal} animationType="slide" transparent onRequestClose={() => setGoLiveModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: c.card }]}>
            <View style={[styles.modalHeader, { borderBottomColor: c.border }]}>
              <Text style={[styles.modalTitle, { color: c.foreground }]}>Go Live</Text>
              <Pressable onPress={() => setGoLiveModal(false)} hitSlop={8}>
                <Ionicons name="close" size={24} color={c.mutedForeground} />
              </Pressable>
            </View>

            <View style={{ padding: 16, gap: 16 }}>
              <View style={{ gap: 6 }}>
                <Text style={[styles.inputLabel, { color: c.foreground }]}>Stream Title *</Text>
                <TextInput
                  value={title}
                  onChangeText={setTitle}
                  placeholder="What are you streaming about?"
                  placeholderTextColor={c.mutedForeground}
                  style={[styles.input, { backgroundColor: c.secondary, color: c.foreground, borderColor: c.border }]}
                />
              </View>

              <Text style={{ fontSize: 12, color: c.mutedForeground, lineHeight: 18 }}>
                Starting a stream notifies your friends and followers. Ensure your microphone and camera permissions are granted.
              </Text>

              <Pressable
                onPress={handleStartLive}
                disabled={startStream.isPending}
                style={[styles.startBtn, { backgroundColor: "#ef4444" }]}
              >
                {startStream.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.startBtnText}>Start Live Stream</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
  },
  goLiveBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  goLiveBtnText: {
    color: "#fff",
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
  centerBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  streamCard: {
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
  },
  previewPlaceholder: {
    height: 180,
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  liveBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#ef4444",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#fff",
  },
  liveBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontFamily: "Inter_700Bold",
  },
  viewerBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  viewerCount: {
    color: "#fff",
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  streamTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
  },
  watchBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
  },
  watchBtnText: {
    color: "#fff",
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  emptyCard: {
    padding: 32,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 20,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 17,
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 20,
  },
  emptyGoLive: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
  },
  inputLabel: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  input: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
  },
  startBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 8,
  },
  startBtnText: {
    color: "#fff",
    fontFamily: "Inter_700Bold",
    fontSize: 15,
  },
});
