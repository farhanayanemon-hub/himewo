import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
  StyleSheet,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import {
  useSharePost,
  getGetFeedQueryKey,
  getGetPostQueryKey,
} from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";

interface ShareSheetProps {
  postId: number | null;
  visible: boolean;
  onClose: () => void;
  onShared?: () => void;
}

export function ShareSheet({ postId, visible, onClose, onShared }: ShareSheetProps) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [caption, setCaption] = useState("");
  const sharePost = useSharePost();

  const close = () => {
    setCaption("");
    onClose();
  };

  const submit = () => {
    if (postId == null) return;
    const text = caption.trim();
    sharePost.mutate(
      { id: postId, data: { caption: text || undefined } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getGetFeedQueryKey() });
          qc.invalidateQueries({ queryKey: getGetPostQueryKey(postId) });
          onShared?.();
          setCaption("");
          onClose();
          Alert.alert("Shared", "This post has been shared to your timeline.");
        },
        onError: () => Alert.alert("Error", "Could not share this post."),
      },
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <View style={styles.backdrop}>
        <Pressable style={{ flex: 1 }} onPress={close} />
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={[styles.sheet, { backgroundColor: c.background, paddingBottom: insets.bottom + 16 }]}>
            <View style={[styles.handle, { backgroundColor: c.border }]} />
            <Text style={[styles.title, { color: c.foreground }]}>Share to your timeline</Text>
            <Text style={{ color: c.mutedForeground, fontSize: 13, marginBottom: 12 }}>
              Add a caption (optional)
            </Text>

            <TextInput
              value={caption}
              onChangeText={setCaption}
              placeholder="Say something about this..."
              placeholderTextColor={c.mutedForeground}
              multiline
              style={[
                styles.input,
                { backgroundColor: c.secondary, color: c.foreground, borderColor: c.border },
              ]}
            />

            <View style={styles.actions}>
              <Pressable style={[styles.btn, { backgroundColor: c.secondary }]} onPress={close}>
                <Text style={[styles.btnLabel, { color: c.foreground }]}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.btn, styles.shareBtn, { backgroundColor: c.primary, opacity: sharePost.isPending ? 0.6 : 1 }]}
                onPress={submit}
                disabled={sharePost.isPending}
              >
                <Ionicons name="arrow-redo" size={18} color={c.primaryForeground} />
                <Text style={[styles.btnLabel, { color: c.primaryForeground }]}>
                  {sharePost.isPending ? "Sharing..." : "Share now"}
                </Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 14 },
  title: { fontFamily: "Inter_700Bold", fontSize: 18, marginBottom: 4 },
  input: {
    minHeight: 90,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    fontSize: 15,
    textAlignVertical: "top",
  },
  actions: { flexDirection: "row", gap: 10, marginTop: 16 },
  btn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
  },
  shareBtn: {},
  btnLabel: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
});
