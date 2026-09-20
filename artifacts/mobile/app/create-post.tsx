import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  StyleSheet,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import {
  useCreatePost,
  getGetFeedQueryKey,
  PostInputPrivacy,
  type MediaItemInput,
} from "@workspace/api-client-react";
import { Avatar } from "@/components/Avatar";
import { EmojiPickerSheet } from "@/components/EmojiPickerSheet";
import { useAuth } from "@/lib/auth";
import { useActingPage } from "@/lib/acting-page";
import { useColors } from "@/hooks/useColors";
import { uploadMedia, UploadUnavailableError, captureWithCamera, type PickedAsset } from "@/lib/upload";

const privacyOptions = [
  { value: PostInputPrivacy.public, label: "Public", icon: "earth" as const },
  { value: PostInputPrivacy.friends, label: "Friends", icon: "people" as const },
  { value: PostInputPrivacy.private, label: "Only me", icon: "lock-closed" as const },
];

type FeelingItem = { verb: string; label: string; emoji: string };

const FEELINGS: FeelingItem[] = [
  { verb: "feeling", label: "happy", emoji: "😊" },
  { verb: "feeling", label: "blessed", emoji: "😇" },
  { verb: "feeling", label: "loved", emoji: "🥰" },
  { verb: "feeling", label: "excited", emoji: "🤩" },
  { verb: "feeling", label: "grateful", emoji: "🙏" },
  { verb: "feeling", label: "relaxed", emoji: "😌" },
  { verb: "feeling", label: "sad", emoji: "😢" },
  { verb: "feeling", label: "tired", emoji: "😴" },
  { verb: "feeling", label: "angry", emoji: "😠" },
  { verb: "feeling", label: "sick", emoji: "🤒" },
  { verb: "feeling", label: "proud", emoji: "🥲" },
  { verb: "feeling", label: "motivated", emoji: "💪" },
];

const ACTIVITIES: FeelingItem[] = [
  { verb: "celebrating", label: "a birthday", emoji: "🎉" },
  { verb: "watching", label: "a movie", emoji: "🎬" },
  { verb: "listening to", label: "music", emoji: "🎵" },
  { verb: "eating", label: "delicious food", emoji: "🍔" },
  { verb: "drinking", label: "coffee", emoji: "☕" },
  { verb: "traveling to", label: "a new place", emoji: "✈️" },
  { verb: "reading", label: "a book", emoji: "📖" },
  { verb: "playing", label: "games", emoji: "🎮" },
  { verb: "working out", label: "at the gym", emoji: "🏋️" },
  { verb: "studying", label: "hard", emoji: "📚" },
  { verb: "shopping", label: "for something nice", emoji: "🛍️" },
  { verb: "praying", label: "", emoji: "🤲" },
];

export default function CreatePostScreen() {
  const c = useColors();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { actingPage } = useActingPage();
  const createPost = useCreatePost();

  const { media } = useLocalSearchParams<{ media?: string }>();

  const [content, setContent] = useState("");
  const [privacy, setPrivacy] = useState<PostInputPrivacy>(PostInputPrivacy.public);
  const [assets, setAssets] = useState<PickedAsset[]>([]);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Feelings & Location state
  const [feeling, setFeeling] = useState<FeelingItem | null>(null);
  const [feelingOpen, setFeelingOpen] = useState(false);
  const [feelingTab, setFeelingTab] = useState<"feelings" | "activities">("feelings");
  const [feelingSearch, setFeelingSearch] = useState("");
  const [location, setLocation] = useState("");
  const [showLocation, setShowLocation] = useState(false);

  const pick = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 6,
    });
    if (!res.canceled) {
      setAssets((prev) => [...prev, ...res.assets].slice(0, 6));
    }
  };

  const autoOpened = useRef(false);
  useEffect(() => {
    if (media && !autoOpened.current) {
      autoOpened.current = true;
      pick();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [media]);

  const capture = async () => {
    const asset = await captureWithCamera(["images", "videos"]);
    if (asset) {
      setAssets((prev) => [...prev, asset].slice(0, 6));
    }
  };

  const submit = async () => {
    if (!content.trim() && assets.length === 0) return;
    setUploading(true);
    try {
      let media: MediaItemInput[] = [];
      if (assets.length > 0) {
        try {
          const uploaded = await Promise.all(assets.map((a) => uploadMedia(a)));
          media = uploaded.map((u, i) => ({
            url: u.url,
            type: u.type,
            width: u.width,
            height: u.height,
            position: i,
          }));
        } catch (err) {
          if (err instanceof UploadUnavailableError) {
            Alert.alert(
              "Media upload unavailable",
              "Storage isn't configured in this environment. Your text post will still be shared.",
            );
          } else {
            throw err;
          }
        }
      }
      await createPost.mutateAsync({
        data: {
          content: content.trim(),
          privacy,
          media,
          feelingVerb: feeling?.verb || undefined,
          feeling: feeling?.label || undefined,
          feelingEmoji: feeling?.emoji || undefined,
          location: location.trim() || undefined,
          ...(actingPage ? { pageId: actingPage.id } : {}),
        },
      });
      qc.invalidateQueries({ queryKey: getGetFeedQueryKey() });
      router.back();
    } catch {
      Alert.alert("Error", "Could not publish your post. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const canPost =
    (content.trim().length > 0 || assets.length > 0 || !!feeling || !!location.trim()) && !uploading;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }}>
      <View style={[styles.header, { borderBottomColor: c.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="close" size={26} color={c.foreground} />
        </Pressable>
        <Text style={{ color: c.foreground, fontFamily: "Inter_700Bold", fontSize: 18 }}>
          Create post
        </Text>
        <Pressable
          style={[
            styles.postBtn,
            { backgroundColor: canPost ? c.primary : c.secondary },
          ]}
          onPress={submit}
          disabled={!canPost}
        >
          {uploading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text
              style={{
                color: canPost ? "#fff" : c.mutedForeground,
                fontFamily: "Inter_700Bold",
              }}
            >
              Post
            </Text>
          )}
        </Pressable>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <Avatar
              uri={actingPage ? actingPage.avatarUrl : user?.avatarUrl}
              name={actingPage?.name ?? user?.displayName}
              size={44}
            />
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center" }}>
                <Text style={{ color: c.foreground, fontFamily: "Inter_600SemiBold", fontSize: 15 }}>
                  {actingPage?.name ?? user?.displayName}
                </Text>
                {feeling && (
                  <View style={{ flexDirection: "row", alignItems: "center", marginLeft: 4 }}>
                    <Text style={{ color: c.mutedForeground, fontSize: 13 }}>
                      {" "}is {feeling.emoji} {feeling.verb} {feeling.label}
                    </Text>
                    <Pressable onPress={() => setFeeling(null)} hitSlop={6} style={{ marginLeft: 4 }}>
                      <Ionicons name="close-circle" size={15} color={c.mutedForeground} />
                    </Pressable>
                  </View>
                )}
                {location.trim().length > 0 && (
                  <View style={{ flexDirection: "row", alignItems: "center", marginLeft: 4 }}>
                    <Text style={{ color: c.mutedForeground, fontSize: 13 }}>
                      {" "}at 📍 {location}
                    </Text>
                    <Pressable onPress={() => setLocation("")} hitSlop={6} style={{ marginLeft: 4 }}>
                      <Ionicons name="close-circle" size={15} color={c.mutedForeground} />
                    </Pressable>
                  </View>
                )}
              </View>
              <View style={styles.privacyRow}>
                {privacyOptions.map((opt) => (
                  <Pressable
                    key={opt.value}
                    style={[
                      styles.privacyChip,
                      {
                        backgroundColor: privacy === opt.value ? c.primary : c.secondary,
                      },
                    ]}
                    onPress={() => setPrivacy(opt.value)}
                  >
                    <Ionicons
                      name={opt.icon}
                      size={12}
                      color={privacy === opt.value ? "#fff" : c.mutedForeground}
                    />
                    <Text
                      style={{
                        color: privacy === opt.value ? "#fff" : c.mutedForeground,
                        fontSize: 11,
                        fontFamily: "Inter_500Medium",
                      }}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>

          <TextInput
            value={content}
            onChangeText={setContent}
            placeholder="What's on your mind?"
            placeholderTextColor={c.mutedForeground}
            underlineColorAndroid="transparent"
            multiline
            autoFocus
            style={{ color: c.foreground, fontSize: 18, minHeight: 120, lineHeight: 24 }}
          />

          {showLocation && (
            <View style={[styles.locationBox, { backgroundColor: c.secondary, borderColor: c.border }]}>
              <Ionicons name="location" size={18} color="#ef4444" />
              <TextInput
                value={location}
                onChangeText={setLocation}
                placeholder="Add your location (e.g. Dhaka, Bangladesh)"
                placeholderTextColor={c.mutedForeground}
                style={[styles.locationInput, { color: c.foreground }]}
              />
              {location.length > 0 && (
                <Pressable onPress={() => setLocation("")} hitSlop={6}>
                  <Ionicons name="close-circle" size={18} color={c.mutedForeground} />
                </Pressable>
              )}
            </View>
          )}

          {assets.length > 0 && (
            <View style={styles.mediaPreview}>
              {assets.map((a, i) => (
                <View key={i} style={styles.mediaThumb}>
                  <Image source={{ uri: a.uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
                  <Pressable
                    style={styles.removeMedia}
                    onPress={() => setAssets((prev) => prev.filter((_, idx) => idx !== i))}
                  >
                    <Ionicons name="close" size={16} color="#fff" />
                  </Pressable>
                  {(a.type === "video") && (
                    <View style={styles.videoTag}>
                      <Ionicons name="videocam" size={14} color="#fff" />
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}
        </ScrollView>

        <View style={[styles.toolbar, { borderTopColor: c.border }]}>
          <Pressable style={styles.tool} onPress={pick}>
            <Ionicons name="images" size={22} color="#31a24c" />
            <Text style={[styles.toolLabel, { color: c.foreground }]}>Photo</Text>
          </Pressable>
          <Pressable style={styles.tool} onPress={capture}>
            <Ionicons name="camera" size={22} color="#1877f2" />
            <Text style={[styles.toolLabel, { color: c.foreground }]}>Camera</Text>
          </Pressable>
          <Pressable style={styles.tool} onPress={() => setFeelingOpen(true)}>
            <Ionicons name="happy" size={22} color="#eab308" />
            <Text style={[styles.toolLabel, { color: c.foreground }]}>Feeling</Text>
          </Pressable>
          <Pressable style={styles.tool} onPress={() => setShowLocation((v) => !v)}>
            <Ionicons name="location" size={22} color="#ef4444" />
            <Text style={[styles.toolLabel, { color: c.foreground }]}>Location</Text>
          </Pressable>
          <Pressable style={styles.tool} onPress={() => setEmojiOpen(true)}>
            <Ionicons name="sparkles" size={22} color="#8b5cf6" />
            <Text style={[styles.toolLabel, { color: c.foreground }]}>Emoji</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <EmojiPickerSheet
        visible={emojiOpen}
        onClose={() => setEmojiOpen(false)}
        onSelect={(e) => setContent((t) => t + e)}
      />

      {/* Feeling / Activity Modal */}
      <Modal
        visible={feelingOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setFeelingOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { backgroundColor: c.card, borderColor: c.border }]}>
            <View style={[styles.modalHandle, { backgroundColor: c.border }]} />
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: c.foreground }]}>How are you feeling?</Text>
              <Pressable onPress={() => setFeelingOpen(false)} hitSlop={8}>
                <Ionicons name="close" size={22} color={c.foreground} />
              </Pressable>
            </View>

            {/* Tab switch */}
            <View style={[styles.tabRow, { backgroundColor: c.secondary }]}>
              <Pressable
                style={[
                  styles.tabBtn,
                  feelingTab === "feelings" && { backgroundColor: c.card },
                ]}
                onPress={() => setFeelingTab("feelings")}
              >
                <Text
                  style={[
                    styles.tabBtnText,
                    { color: feelingTab === "feelings" ? c.foreground : c.mutedForeground },
                  ]}
                >
                  Feelings
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.tabBtn,
                  feelingTab === "activities" && { backgroundColor: c.card },
                ]}
                onPress={() => setFeelingTab("activities")}
              >
                <Text
                  style={[
                    styles.tabBtnText,
                    { color: feelingTab === "activities" ? c.foreground : c.mutedForeground },
                  ]}
                >
                  Activities
                </Text>
              </Pressable>
            </View>

            {/* Search */}
            <View style={[styles.searchBox, { backgroundColor: c.secondary }]}>
              <Ionicons name="search" size={18} color={c.mutedForeground} />
              <TextInput
                value={feelingSearch}
                onChangeText={setFeelingSearch}
                placeholder="Search feelings or activities..."
                placeholderTextColor={c.mutedForeground}
                style={[styles.searchInput, { color: c.foreground }]}
              />
            </View>

            {/* Items Grid */}
            <ScrollView contentContainerStyle={styles.feelingList}>
              {(feelingTab === "feelings" ? FEELINGS : ACTIVITIES)
                .filter((item) =>
                  feelingSearch
                    ? item.label.toLowerCase().includes(feelingSearch.toLowerCase()) ||
                      item.verb.toLowerCase().includes(feelingSearch.toLowerCase())
                    : true
                )
                .map((item) => (
                  <Pressable
                    key={item.verb + item.label}
                    style={({ pressed }) => [
                      styles.feelingItem,
                      { backgroundColor: pressed ? c.secondary : "transparent" },
                    ]}
                    onPress={() => {
                      setFeeling(item);
                      setFeelingOpen(false);
                      setFeelingSearch("");
                    }}
                  >
                    <Text style={styles.feelingEmoji}>{item.emoji}</Text>
                    <Text style={[styles.feelingLabel, { color: c.foreground }]}>
                      {item.verb} {item.label}
                    </Text>
                  </Pressable>
                ))}
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
  postBtn: { borderRadius: 8, paddingHorizontal: 18, paddingVertical: 8, minWidth: 64, alignItems: "center" },
  privacyRow: { flexDirection: "row", gap: 6, marginTop: 4 },
  privacyChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  mediaPreview: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 16 },
  mediaThumb: { width: 100, height: 100, borderRadius: 10, overflow: "hidden" },
  removeMedia: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "#0009",
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  videoTag: { position: "absolute", bottom: 4, left: 4 },
  toolbar: {
    flexDirection: "row",
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: 8,
  },
  tool: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
  },
  toolLabel: { fontFamily: "Inter_500Medium", fontSize: 13 },
  locationBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginVertical: 10,
  },
  locationInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    padding: 0,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: StyleSheet.hairlineWidth,
    maxHeight: "80%",
    paddingBottom: 32,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 6,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  modalTitle: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
  },
  tabRow: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    padding: 3,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 10,
  },
  tabBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    padding: 0,
  },
  feelingList: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  feelingItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  feelingEmoji: {
    fontSize: 22,
  },
  feelingLabel: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    textTransform: "capitalize",
  },
});
