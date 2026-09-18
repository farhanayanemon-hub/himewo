import { useState, useEffect, useCallback } from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import * as Linking from "expo-linking";
import Constants from "expo-constants";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

export interface AppVersionData {
  latestVersion: string;
  latestVersionCode: number;
  releaseNotes: string;
  socialApkUrl: string;
  chatApkUrl: string;
}

export function compareSemver(current: string, latest: string): boolean {
  const parse = (v: string) =>
    v
      .replace(/^v/, "")
      .split(".")
      .map((n) => parseInt(n, 10) || 0);
  const [c1, c2, c3] = parse(current);
  const [l1, l2, l3] = parse(latest);
  if (l1 > c1) return true;
  if (l1 === c1 && l2 > c2) return true;
  if (l1 === c1 && l2 === c2 && l3 > c3) return true;
  return false;
}

const CURRENT_VERSION = Constants.expoConfig?.version || "1.2.0";
const API_ENDPOINTS = [
  "https://api.himewo.com/api/app/version",
  "https://workspaceapi-server-production-5e99.up.railway.app/api/app/version",
];

export function useAppUpdate(appType: "social" | "chat" = "social") {
  const [loading, setLoading] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [versionData, setVersionData] = useState<AppVersionData | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const checkForUpdate = useCallback(
    async (isManual = false) => {
      setLoading(true);
      let data: AppVersionData | null = null;

      for (const url of API_ENDPOINTS) {
        try {
          const res = await fetch(url);
          if (res.ok) {
            data = await res.json();
            break;
          }
        } catch {
          // try fallback
        }
      }

      setLoading(false);

      if (!data) {
        if (isManual) {
          Alert.alert(
            "Check Failed",
            "Could not reach update server. Please check your internet connection.",
          );
        }
        return;
      }

      setVersionData(data);
      const isNewer = compareSemver(CURRENT_VERSION, data.latestVersion);

      if (isNewer) {
        setUpdateAvailable(true);
        setModalVisible(true);
      } else if (isManual) {
        Alert.alert(
          "Up to Date",
          `You are using the latest version of HiMewo (v${CURRENT_VERSION}).`,
        );
      }
    },
    [],
  );

  useEffect(() => {
    // Check quietly on app launch
    checkForUpdate(false);
  }, [checkForUpdate]);

  const downloadAndInstall = async () => {
    const url =
      appType === "social"
        ? versionData?.socialApkUrl ||
          "https://github.com/farhanayanemon-hub/himewo/releases/download/v1.2.0/himewo-social.apk"
        : versionData?.chatApkUrl ||
          "https://github.com/farhanayanemon-hub/himewo/releases/download/v1.2.0/himewo-chat.apk";

    setModalVisible(false);
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert("Download Error", "Could not open download link.");
    }
  };

  const dismiss = () => {
    setModalVisible(false);
  };

  return {
    currentVersion: CURRENT_VERSION,
    loading,
    updateAvailable,
    versionData,
    modalVisible,
    checkForUpdate,
    downloadAndInstall,
    dismiss,
  };
}

export function UpdatePromptModal({
  visible,
  versionData,
  currentVersion,
  onUpdate,
  onDismiss,
}: {
  visible: boolean;
  versionData: AppVersionData | null;
  currentVersion: string;
  onUpdate: () => void;
  onDismiss: () => void;
}) {
  const c = useColors();

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.backdrop}>
        <View
          style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}
        >
          <View style={[styles.iconCircle, { backgroundColor: c.primary + "18" }]}>
            <Ionicons name="sparkles" size={28} color={c.primary} />
          </View>

          <Text style={[styles.title, { color: c.foreground }]}>
            New Update Available!
          </Text>
          <Text style={[styles.versionTag, { color: c.primary }]}>
            v{versionData?.latestVersion || "New"} · Current: v{currentVersion}
          </Text>

          <Text style={[styles.notes, { color: c.mutedForeground }]}>
            {versionData?.releaseNotes ||
              "Bug fixes, performance improvements and new features are ready."}
          </Text>

          <Pressable
            style={[styles.updateBtn, { backgroundColor: c.primary }]}
            onPress={onUpdate}
          >
            <Ionicons name="cloud-download-outline" size={18} color="#fff" />
            <Text style={styles.updateBtnText}>Update Now</Text>
          </Pressable>

          <Pressable style={styles.laterBtn} onPress={onDismiss}>
            <Text style={[styles.laterBtnText, { color: c.mutedForeground }]}>
              Maybe Later
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  versionTag: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    marginTop: 4,
    marginBottom: 12,
  },
  notes: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
    marginBottom: 20,
  },
  updateBtn: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    borderRadius: 14,
    marginBottom: 10,
  },
  updateBtnText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  laterBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  laterBtnText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
});
