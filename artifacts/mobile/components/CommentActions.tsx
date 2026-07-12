import { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import type { Comment } from "@workspace/api-client-react";
import { MENTION_RE } from "@/components/Mention";
import { useColors } from "@/hooks/useColors";

export function plainCommentText(content: string): string {
  return content.replace(MENTION_RE, "@$1");
}

// Comments can only be edited within 15 minutes of posting.
export const COMMENT_EDIT_WINDOW_MS = 15 * 60 * 1000;

export function canEditComment(createdAt: string): boolean {
  return Date.now() - new Date(createdAt).getTime() <= COMMENT_EDIT_WINDOW_MS;
}

interface CommentActionsProps {
  comment: Comment | null;
  visible: boolean;
  canModify: boolean;
  onClose: () => void;
  onReply: (comment: Comment) => void;
  onEdit: (comment: Comment) => void;
  onDelete: (comment: Comment) => void;
}

export function CommentActionsSheet({
  comment,
  visible,
  canModify,
  onClose,
  onReply,
  onEdit,
  onDelete,
}: CommentActionsProps) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const [selectVisible, setSelectVisible] = useState(false);

  if (!comment) return null;

  const row = (
    icon: keyof typeof Ionicons.glyphMap,
    label: string,
    onPress: () => void,
    destructive = false,
  ) => (
    <Pressable
      key={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: pressed ? c.secondary : "transparent" },
      ]}
    >
      <Ionicons
        name={icon}
        size={22}
        color={destructive ? "#e11d48" : c.foreground}
      />
      <Text
        style={[
          styles.rowLabel,
          { color: destructive ? "#e11d48" : c.foreground },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );

  return (
    <>
      <Modal
        visible={visible && !selectVisible}
        transparent
        animationType="slide"
        onRequestClose={onClose}
      >
        <View style={styles.backdrop}>
          <Pressable style={{ flex: 1 }} onPress={onClose} />
          <View
            style={[
              styles.sheet,
              { backgroundColor: c.surface, paddingBottom: insets.bottom + 10 },
            ]}
          >
            <View style={[styles.handle, { backgroundColor: c.border }]} />
            {row("arrow-undo-outline", "Reply", () => {
              onClose();
              onReply(comment);
            })}
            {row("copy-outline", "Copy", async () => {
              onClose();
              await Clipboard.setStringAsync(plainCommentText(comment.content));
            })}
            {row("text-outline", "Select text", () => {
              setSelectVisible(true);
            })}
            {canModify &&
              canEditComment(comment.createdAt) &&
              row("create-outline", "Edit", () => {
                onClose();
                onEdit(comment);
              })}
            {canModify &&
              row(
                "trash-outline",
                "Delete",
                () => {
                  onClose();
                  onDelete(comment);
                },
                true,
              )}
          </View>
        </View>
      </Modal>

      <Modal
        visible={selectVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setSelectVisible(false);
          onClose();
        }}
      >
        <View style={styles.selectBackdrop}>
          <View style={[styles.selectCard, { backgroundColor: c.surface }]}>
            <Text style={[styles.selectTitle, { color: c.mutedForeground }]}>
              Select text
            </Text>
            <ScrollView style={{ maxHeight: 300 }}>
              <Text
                selectable
                style={{ color: c.foreground, fontSize: 15, lineHeight: 22 }}
              >
                {plainCommentText(comment.content)}
              </Text>
            </ScrollView>
            <Pressable
              onPress={() => {
                setSelectVisible(false);
                onClose();
              }}
              style={[styles.selectClose, { backgroundColor: c.secondary }]}
            >
              <Text style={{ color: c.foreground, fontFamily: "Inter_600SemiBold" }}>
                Done
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "#0006" },
  sheet: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingTop: 8,
    paddingHorizontal: 8,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 13,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  rowLabel: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  selectBackdrop: {
    flex: 1,
    backgroundColor: "#0008",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  selectCard: {
    width: "100%",
    borderRadius: 16,
    padding: 16,
  },
  selectTitle: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  selectClose: {
    marginTop: 14,
    alignSelf: "flex-end",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
});
