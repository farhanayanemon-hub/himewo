import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
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

export default function CreatePostScreen() {
  const c = useColors();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { actingPage } = useActingPage();
  const createPost = useCreatePost();

  const [content, setContent] = useState("");
  const [privacy, setPrivacy] = useState<PostInputPrivacy>(PostInputPrivacy.public);
  const [assets, setAssets] = useState<PickedAsset[]>([]);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

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

  const canPost = (content.trim().length > 0 || assets.length > 0) && !uploading;

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

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <Avatar uri={user?.avatarUrl} name={user?.displayName} size={44} />
          <View>
            <Text style={{ color: c.foreground, fontFamily: "Inter_600SemiBold", fontSize: 15 }}>
              {user?.displayName}
            </Text>
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
          multiline
          autoFocus
          style={{ color: c.foreground, fontSize: 18, minHeight: 120, lineHeight: 24 }}
        />

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
          <Ionicons name="images" size={24} color="#31a24c" />
          <Text style={[styles.toolLabel, { color: c.foreground }]}>Gallery</Text>
        </Pressable>
        <Pressable style={styles.tool} onPress={capture}>
          <Ionicons name="camera" size={24} color="#1877f2" />
          <Text style={[styles.toolLabel, { color: c.foreground }]}>Camera</Text>
        </Pressable>
        <Pressable style={styles.tool} onPress={() => setEmojiOpen(true)}>
          <Ionicons name="happy" size={24} color="#f7b125" />
          <Text style={[styles.toolLabel, { color: c.foreground }]}>Emoji</Text>
        </Pressable>
      </View>

      <EmojiPickerSheet
        visible={emojiOpen}
        onClose={() => setEmojiOpen(false)}
        onSelect={(e) => setContent((t) => t + e)}
      />
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
    gap: 8,
    paddingVertical: 10,
  },
  toolLabel: { fontFamily: "Inter_500Medium", fontSize: 14 },
});
