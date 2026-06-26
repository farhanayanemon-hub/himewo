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
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import {
  useUpdateMyProfile,
  getGetCurrentUserQueryKey,
  type ProfileUpdate,
} from "@workspace/api-client-react";
import { Avatar } from "@/components/Avatar";
import { useAuth } from "@/lib/auth";
import { useColors } from "@/hooks/useColors";
import { uploadMedia, UploadUnavailableError, type PickedAsset } from "@/lib/upload";

export default function SettingsScreen() {
  const c = useColors();
  const qc = useQueryClient();
  const { user, refreshUser, signOut } = useAuth();
  const updateProfile = useUpdateMyProfile();

  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [location, setLocation] = useState(user?.location ?? "");
  const [work, setWork] = useState(user?.work ?? "");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user?.avatarUrl ?? null);
  const [pendingAvatar, setPendingAvatar] = useState<PickedAsset | null>(null);
  const [saving, setSaving] = useState(false);

  const pickAvatar = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!res.canceled && res.assets[0]) {
      const asset = res.assets[0];
      setPendingAvatar(asset);
      setAvatarUrl(asset.uri);
    }
  };

  const save = async () => {
    if (!displayName.trim()) {
      Alert.alert("Name required", "Please enter a display name.");
      return;
    }
    setSaving(true);
    try {
      const data: ProfileUpdate = {
        displayName: displayName.trim(),
        bio: bio.trim(),
        location: location.trim(),
        work: work.trim(),
      };

      if (pendingAvatar) {
        try {
          const uploaded = await uploadMedia(pendingAvatar);
          data.avatarUrl = uploaded.url;
        } catch (err) {
          if (err instanceof UploadUnavailableError) {
            Alert.alert(
              "Photo upload unavailable",
              "Storage isn't configured in this environment. Your other changes will still be saved.",
            );
          } else {
            throw err;
          }
        }
      }

      await updateProfile.mutateAsync({ data });
      qc.invalidateQueries({ queryKey: getGetCurrentUserQueryKey() });
      await refreshUser();
      router.back();
    } catch {
      Alert.alert("Error", "Could not save your changes. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const confirmLogout = () => {
    Alert.alert("Log out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log out",
        style: "destructive",
        onPress: () => {
          void signOut();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }}>
      <View style={[styles.header, { borderBottomColor: c.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={c.foreground} />
        </Pressable>
        <Text style={{ color: c.foreground, fontFamily: "Inter_700Bold", fontSize: 18 }}>
          Settings
        </Text>
        <Pressable onPress={save} disabled={saving} hitSlop={8}>
          {saving ? (
            <ActivityIndicator color={c.primary} size="small" />
          ) : (
            <Text style={{ color: c.primary, fontFamily: "Inter_700Bold", fontSize: 16 }}>
              Save
            </Text>
          )}
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.avatarSection}>
          <Pressable onPress={pickAvatar} style={styles.avatarWrap}>
            <Avatar uri={avatarUrl} name={displayName} size={96} />
            <View style={[styles.cameraBadge, { backgroundColor: c.primary, borderColor: c.background }]}>
              <Ionicons name="camera" size={18} color="#fff" />
            </View>
          </Pressable>
          <Text style={{ color: c.mutedForeground, fontFamily: "Inter_500Medium", fontSize: 13 }}>
            @{user?.username}
          </Text>
        </View>

        <Text style={[styles.sectionTitle, { color: c.mutedForeground }]}>ACCOUNT</Text>
        <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
          <Field label="Display name" c={c}>
            <TextInput
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Your name"
              placeholderTextColor={c.mutedForeground}
              style={[styles.input, { color: c.foreground }]}
            />
          </Field>
          <Field label="Bio" c={c}>
            <TextInput
              value={bio}
              onChangeText={setBio}
              placeholder="Tell people about yourself"
              placeholderTextColor={c.mutedForeground}
              multiline
              style={[styles.input, { color: c.foreground, minHeight: 60, textAlignVertical: "top" }]}
            />
          </Field>
          <Field label="Location" c={c}>
            <TextInput
              value={location}
              onChangeText={setLocation}
              placeholder="Where you live"
              placeholderTextColor={c.mutedForeground}
              style={[styles.input, { color: c.foreground }]}
            />
          </Field>
          <Field label="Work" c={c} last>
            <TextInput
              value={work}
              onChangeText={setWork}
              placeholder="Where you work"
              placeholderTextColor={c.mutedForeground}
              style={[styles.input, { color: c.foreground }]}
            />
          </Field>
        </View>

        <Text style={[styles.sectionTitle, { color: c.mutedForeground }]}>APPEARANCE</Text>
        <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
          <View style={styles.appearanceRow}>
            <Ionicons name="contrast" size={22} color={c.foreground} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: c.foreground, fontFamily: "Inter_600SemiBold", fontSize: 15 }}>
                Theme
              </Text>
              <Text style={{ color: c.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 13 }}>
                Follows your system appearance
              </Text>
            </View>
          </View>
        </View>

        <View style={{ paddingHorizontal: 16, marginTop: 24 }}>
          <Pressable
            style={[styles.logout, { borderColor: c.destructive }]}
            onPress={confirmLogout}
          >
            <Ionicons name="log-out-outline" size={20} color={c.destructive} />
            <Text style={{ color: c.destructive, fontFamily: "Inter_700Bold", fontSize: 15 }}>
              Log out
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({
  label,
  children,
  c,
  last,
}: {
  label: string;
  children: React.ReactNode;
  c: ReturnType<typeof useColors>;
  last?: boolean;
}) {
  return (
    <View style={[styles.field, !last && { borderBottomColor: c.border, borderBottomWidth: StyleSheet.hairlineWidth }]}>
      <Text style={{ color: c.mutedForeground, fontFamily: "Inter_500Medium", fontSize: 12, marginBottom: 4 }}>
        {label}
      </Text>
      {children}
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
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatarSection: { alignItems: "center", gap: 8, paddingVertical: 24 },
  avatarWrap: { position: "relative" },
  cameraBadge: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    letterSpacing: 0.5,
    marginLeft: 16,
    marginBottom: 8,
    marginTop: 8,
  },
  card: {
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  field: { paddingHorizontal: 14, paddingVertical: 10 },
  input: { fontFamily: "Inter_400Regular", fontSize: 15, padding: 0 },
  appearanceRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 14 },
  logout: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 14,
  },
});
