import { useState, useCallback } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListEvents,
  getListEventsQueryKey,
  useCreateEvent,
  useDeleteEvent,
  useRsvpEvent,
  useClearEventRsvp,
  type Event as EventType,
} from "@workspace/api-client-react";
import { Avatar } from "@/components/Avatar";
import { useAuth } from "@/lib/auth";
import { useColors } from "@/hooks/useColors";
import { uploadMedia } from "@/lib/upload";

function formatEventDate(dateString: string): string {
  try {
    const d = new Date(dateString);
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return dateString;
  }
}

export default function EventsScreen() {
  const c = useColors();
  const qc = useQueryClient();
  const { user } = useAuth();
  const [filter, setFilter] = useState<"all" | "going" | "interested">("all");
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // Form states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const { data: events, isLoading, isRefetching, refetch } = useListEvents();
  const createEvent = useCreateEvent();
  const deleteEvent = useDeleteEvent();
  const rsvp = useRsvpEvent();
  const clearRsvp = useClearEventRsvp();

  const invalidate = useCallback(() => {
    qc.invalidateQueries({ queryKey: getListEventsQueryKey() });
  }, [qc]);

  const filteredEvents = (events || []).filter((e) => {
    if (filter === "going") return e.viewerRsvp === "going";
    if (filter === "interested") return e.viewerRsvp === "interested";
    return true;
  });

  const onToggleRsvp = (event: EventType, status: "going" | "interested") => {
    if (event.viewerRsvp === status) {
      clearRsvp.mutate({ eventId: event.id }, { onSuccess: invalidate });
    } else {
      rsvp.mutate({ eventId: event.id, data: { status } }, { onSuccess: invalidate });
    }
  };

  const onDelete = (event: EventType) => {
    Alert.alert("Delete Event", "Are you sure you want to delete this event?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          deleteEvent.mutate({ eventId: event.id }, { onSuccess: invalidate });
        },
      },
    ]);
  };

  const handlePickCover = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });
    if (!res.canceled && res.assets[0]) {
      setUploading(true);
      try {
        const uploaded = await uploadMedia(res.assets[0]);
        setCoverUrl(uploaded.url);
      } catch (err: any) {
        Alert.alert("Upload failed", err?.message || "Could not upload image.");
      } finally {
        setUploading(false);
      }
    }
  };

  const handleCreate = () => {
    if (!title.trim()) {
      Alert.alert("Required", "Please enter an event title.");
      return;
    }
    const startsAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // Default tomorrow
    createEvent.mutate(
      {
        data: {
          title: title.trim(),
          description: description.trim() || undefined,
          location: location.trim() || undefined,
          coverUrl: coverUrl || undefined,
          startsAt,
        },
      },
      {
        onSuccess: () => {
          invalidate();
          setCreateModalOpen(false);
          setTitle("");
          setDescription("");
          setLocation("");
          setCoverUrl(null);
          Alert.alert("Success", "Event created successfully!");
        },
        onError: (err: any) => {
          Alert.alert("Error", err?.message || "Failed to create event.");
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
            <View style={[styles.badgeIcon, { backgroundColor: "#ec489920" }]}>
              <Ionicons name="calendar" size={18} color="#ec4899" />
            </View>
            <Text style={[styles.title, { color: c.foreground }]}>Events</Text>
          </View>
        </View>

        <Pressable
          onPress={() => setCreateModalOpen(true)}
          style={[styles.createBtn, { backgroundColor: c.primary }]}
        >
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={styles.createBtnText}>Create</Text>
        </Pressable>
      </View>

      {/* Filter Tabs */}
      <View style={[styles.tabs, { backgroundColor: c.card, borderBottomColor: c.border }]}>
        {(["all", "going", "interested"] as const).map((tab) => {
          const active = filter === tab;
          const label = tab === "all" ? "All Events" : tab === "going" ? "Going" : "Interested";
          return (
            <Pressable
              key={tab}
              onPress={() => setFilter(tab)}
              style={[
                styles.tabItem,
                active && { borderBottomColor: c.primary, borderBottomWidth: 2 },
              ]}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: active ? c.primary : c.mutedForeground, fontWeight: active ? "700" : "500" },
                ]}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {isLoading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={c.primary} />
          <Text style={{ color: c.mutedForeground, marginTop: 12, fontSize: 14 }}>
            Loading events...
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredEvents}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: 16, paddingBottom: 32, gap: 14 }}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={c.primary} />
          }
          renderItem={({ item }) => {
            const isHost = user && item.host && user.id === item.host.id;
            const isGoing = item.viewerRsvp === "going";
            const isInterested = item.viewerRsvp === "interested";

            return (
              <View style={[styles.eventCard, { backgroundColor: c.card, borderColor: c.border }]}>
                {item.coverUrl ? (
                  <Image source={{ uri: item.coverUrl }} style={styles.eventCover} contentFit="cover" />
                ) : (
                  <View style={[styles.eventCoverFallback, { backgroundColor: "#ec489920" }]}>
                    <Ionicons name="calendar-outline" size={48} color="#ec4899" />
                  </View>
                )}

                <View style={{ padding: 14, gap: 10 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.eventDate, { color: "#ec4899" }]}>
                        {formatEventDate(item.startsAt)}
                      </Text>
                      <Text style={[styles.eventTitle, { color: c.foreground }]} numberOfLines={2}>
                        {item.title}
                      </Text>
                    </View>
                    {isHost && (
                      <Pressable onPress={() => onDelete(item)} hitSlop={8}>
                        <Ionicons name="trash-outline" size={18} color={c.destructive} />
                      </Pressable>
                    )}
                  </View>

                  {item.location ? (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Ionicons name="location-outline" size={16} color={c.mutedForeground} />
                      <Text style={[styles.eventLocation, { color: c.mutedForeground }]} numberOfLines={1}>
                        {item.location}
                      </Text>
                    </View>
                  ) : null}

                  {item.description ? (
                    <Text style={[styles.eventDesc, { color: c.foreground }]} numberOfLines={2}>
                      {item.description}
                    </Text>
                  ) : null}

                  {/* Host info */}
                  {item.host && (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingTop: 4 }}>
                      <Avatar uri={item.host.avatarUrl} name={item.host.displayName} size={24} />
                      <Text style={{ fontSize: 12, color: c.mutedForeground }}>
                        Hosted by <Text style={{ fontWeight: "600", color: c.foreground }}>{item.host.displayName}</Text>
                      </Text>
                    </View>
                  )}

                  {/* Actions & stats */}
                  <View style={[styles.eventActions, { borderTopColor: c.border }]}>
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      <Pressable
                        onPress={() => onToggleRsvp(item, "going")}
                        style={[
                          styles.rsvpBtn,
                          isGoing
                            ? { backgroundColor: "#16a34a20", borderColor: "#16a34a" }
                            : { backgroundColor: c.secondary, borderColor: "transparent" },
                        ]}
                      >
                        <Ionicons
                          name={isGoing ? "checkmark-circle" : "checkmark"}
                          size={16}
                          color={isGoing ? "#16a34a" : c.foreground}
                        />
                        <Text style={{ fontSize: 13, fontWeight: "600", color: isGoing ? "#16a34a" : c.foreground }}>
                          Going
                        </Text>
                      </Pressable>

                      <Pressable
                        onPress={() => onToggleRsvp(item, "interested")}
                        style={[
                          styles.rsvpBtn,
                          isInterested
                            ? { backgroundColor: "#eab30820", borderColor: "#eab308" }
                            : { backgroundColor: c.secondary, borderColor: "transparent" },
                        ]}
                      >
                        <Ionicons
                          name={isInterested ? "star" : "star-outline"}
                          size={16}
                          color={isInterested ? "#ca8a04" : c.foreground}
                        />
                        <Text style={{ fontSize: 13, fontWeight: "600", color: isInterested ? "#ca8a04" : c.foreground }}>
                          Interested
                        </Text>
                      </Pressable>
                    </View>

                    <Text style={{ fontSize: 11, color: c.mutedForeground }}>
                      {(item.goingCount || 0) + (item.interestedCount || 0)} responding
                    </Text>
                  </View>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={[styles.emptyCard, { backgroundColor: c.card, borderColor: c.border }]}>
              <View style={[styles.emptyIconWrap, { backgroundColor: "#ec489920" }]}>
                <Ionicons name="calendar-outline" size={42} color="#ec4899" />
              </View>
              <Text style={[styles.emptyTitle, { color: c.foreground }]}>No events found</Text>
              <Text style={[styles.emptySub, { color: c.mutedForeground }]}>
                {filter === "all"
                  ? "There are no upcoming events right now. Create one and invite people!"
                  : `You have not marked any events as "${filter}".`}
              </Text>
            </View>
          }
        />
      )}

      {/* Create Event Modal */}
      <Modal visible={createModalOpen} animationType="slide" transparent onRequestClose={() => setCreateModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: c.card }]}>
            <View style={[styles.modalHeader, { borderBottomColor: c.border }]}>
              <Text style={[styles.modalTitle, { color: c.foreground }]}>Create Event</Text>
              <Pressable onPress={() => setCreateModalOpen(false)} hitSlop={8}>
                <Ionicons name="close" size={24} color={c.mutedForeground} />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
              <Pressable onPress={handlePickCover} style={[styles.coverPicker, { borderColor: c.border, backgroundColor: c.secondary }]}>
                {coverUrl ? (
                  <Image source={{ uri: coverUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
                ) : (
                  <View style={{ alignItems: "center", gap: 6 }}>
                    <Ionicons name="image-outline" size={32} color={c.mutedForeground} />
                    <Text style={{ fontSize: 13, color: c.mutedForeground }}>
                      {uploading ? "Uploading cover..." : "Add Event Cover Photo"}
                    </Text>
                  </View>
                )}
              </Pressable>

              <View style={{ gap: 6 }}>
                <Text style={[styles.inputLabel, { color: c.foreground }]}>Event Title *</Text>
                <TextInput
                  value={title}
                  onChangeText={setTitle}
                  placeholder="e.g. Summer Music Meetup"
                  placeholderTextColor={c.mutedForeground}
                  style={[styles.input, { backgroundColor: c.secondary, color: c.foreground, borderColor: c.border }]}
                />
              </View>

              <View style={{ gap: 6 }}>
                <Text style={[styles.inputLabel, { color: c.foreground }]}>Location</Text>
                <TextInput
                  value={location}
                  onChangeText={setLocation}
                  placeholder="e.g. Central Park or Online Live"
                  placeholderTextColor={c.mutedForeground}
                  style={[styles.input, { backgroundColor: c.secondary, color: c.foreground, borderColor: c.border }]}
                />
              </View>

              <View style={{ gap: 6 }}>
                <Text style={[styles.inputLabel, { color: c.foreground }]}>Description</Text>
                <TextInput
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Tell people what this event is about..."
                  placeholderTextColor={c.mutedForeground}
                  multiline
                  style={[styles.input, styles.textArea, { backgroundColor: c.secondary, color: c.foreground, borderColor: c.border }]}
                />
              </View>

              <Pressable
                onPress={handleCreate}
                disabled={createEvent.isPending || uploading}
                style={[styles.submitBtn, { backgroundColor: c.primary }]}
              >
                {createEvent.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitBtnText}>Create Event</Text>
                )}
              </Pressable>
            </ScrollView>
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
  createBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  createBtnText: {
    color: "#fff",
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
  tabs: {
    flexDirection: "row",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabText: {
    fontSize: 13,
  },
  centerBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  eventCard: {
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
  },
  eventCover: {
    width: "100%",
    height: 160,
  },
  eventCoverFallback: {
    width: "100%",
    height: 140,
    alignItems: "center",
    justifyContent: "center",
  },
  eventDate: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  eventTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 17,
  },
  eventLocation: {
    fontSize: 13,
  },
  eventDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  eventActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 10,
    marginTop: 4,
  },
  rsvpBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
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
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "85%",
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
  coverPicker: {
    height: 140,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
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
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  submitBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 8,
  },
  submitBtnText: {
    color: "#fff",
    fontFamily: "Inter_700Bold",
    fontSize: 15,
  },
});
