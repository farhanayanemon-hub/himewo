import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Switch,
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
import { usePreferences } from "@/lib/preferences";
import { openMainApp } from "@/lib/mainApp";
import { uploadMedia, UploadUnavailableError, type PickedAsset } from "@/lib/upload";

export default function SettingsScreen() {
  const c = useColors();
  const qc = useQueryClient();
  const { user, refreshUser, signOut, supabaseEnabled, devUsers, signInAsDevUser } =
    useAuth();
  const { themeMode, activeStatus, setThemeMode, setActiveStatus } = usePreferences();
  const updateProfile = useUpdateMyProfile();

  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [location, setLocation] = useState(user?.location ?? "");
  const [work, setWork] = useState(user?.work ?? "");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user?.avatarUrl ?? null);
  const [pendingAvatar, setPendingAvatar] = useState<PickedAsset | null>(null);
  const [saving, setSaving] = useState(false);
  const [switchOpen, setSwitchOpen] = useState(false);

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

  const switchTo = async (id: string) => {
    setSwitchOpen(false);
    if (id === user?.id) return;
    await signInAsDevUser(id);
    qc.invalidateQueries();
    router.replace("/");
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

        <Text style={[styles.sectionTitle, { color: c.mutedForeground }]}>HIMEWO</Text>
        <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
          <ActionRow
            c={c}
            icon="apps"
            title="Account Center"
            subtitle="Manage your HiMewo account"
            onPress={() => openMainApp("/settings")}
          />
          <ActionRow
            c={c}
            icon="swap-horizontal"
            title="Switch profile"
            subtitle={`Signed in as ${user?.displayName ?? ""}`}
            onPress={() => setSwitchOpen(true)}
            last
          />
        </View>

        <Text style={[styles.sectionTitle, { color: c.mutedForeground }]}>PREFERENCES</Text>
        <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
          <ToggleRow
            c={c}
            icon="moon"
            title="Dark mode"
            subtitle="Use the dark theme"
            value={themeMode === "dark"}
            onValueChange={(v) => setThemeMode(v ? "dark" : "light")}
          />
          <ToggleRow
            c={c}
            icon="ellipse"
            title="Active status"
            subtitle="Show when you're active"
            value={activeStatus}
            onValueChange={setActiveStatus}
            last
          />
        </View>

        <Text style={[styles.sectionTitle, { color: c.mutedForeground }]}>PROFILE</Text>
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

      <Modal
        visible={switchOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSwitchOpen(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: c.background }} edges={["top"]}>
          <View style={[styles.header, { borderBottomColor: c.border }]}>
            <Pressable onPress={() => setSwitchOpen(false)} hitSlop={8}>
              <Ionicons name="close" size={24} color={c.foreground} />
            </Pressable>
            <Text style={{ color: c.foreground, fontFamily: "Inter_700Bold", fontSize: 18 }}>
              Switch profile
            </Text>
            <View style={{ width: 24 }} />
          </View>
          {supabaseEnabled ? (
            <View style={{ padding: 24, alignItems: "center" }}>
              <Text style={{ color: c.mutedForeground, textAlign: "center" }}>
                Profile switching is available in demo mode only.
              </Text>
            </View>
          ) : (
            <ScrollView>
              {devUsers.map((u) => (
                <Pressable
                  key={u.id}
                  style={[styles.userRow, { borderBottomColor: c.border }]}
                  onPress={() => switchTo(u.id)}
                >
                  <Avatar uri={u.avatarUrl} name={u.displayName} size={48} />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={{ color: c.foreground, fontFamily: "Inter_600SemiBold", fontSize: 16 }}>
                      {u.displayName}
                    </Text>
                    <Text style={{ color: c.mutedForeground, fontSize: 13 }}>@{u.username}</Text>
                  </View>
                  {u.id === user?.id ? (
                    <Ionicons name="checkmark-circle" size={22} color={c.primary} />
                  ) : null}
                </Pressable>
              ))}
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function ActionRow({
  c,
  icon,
  title,
  subtitle,
  onPress,
  last,
}: {
  c: ReturnType<typeof useColors>;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  onPress: () => void;
  last?: boolean;
}) {
  return (
    <Pressable
      style={[styles.settingRow, !last && { borderBottomColor: c.border, borderBottomWidth: StyleSheet.hairlineWidth }]}
      onPress={onPress}
    >
      <Ionicons name={icon} size={22} color={c.foreground} />
      <View style={{ flex: 1 }}>
        <Text style={{ color: c.foreground, fontFamily: "Inter_600SemiBold", fontSize: 15 }}>
          {title}
        </Text>
        {subtitle ? (
          <Text numberOfLines={1} style={{ color: c.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 13 }}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={20} color={c.mutedForeground} />
    </Pressable>
  );
}

function ToggleRow({
  c,
  icon,
  title,
  subtitle,
  value,
  onValueChange,
  last,
}: {
  c: ReturnType<typeof useColors>;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  last?: boolean;
}) {
  return (
    <View
      style={[styles.settingRow, !last && { borderBottomColor: c.border, borderBottomWidth: StyleSheet.hairlineWidth }]}
    >
      <Ionicons name={icon} size={22} color={c.foreground} />
      <View style={{ flex: 1 }}>
        <Text style={{ color: c.foreground, fontFamily: "Inter_600SemiBold", fontSize: 15 }}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={{ color: c.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 13 }}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ true: c.primary }}
      />
    </View>
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
    marginTop: 16,
  },
  card: {
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  field: { paddingHorizontal: 14, paddingVertical: 10 },
  input: { fontFamily: "Inter_400Regular", fontSize: 15, padding: 0 },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
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
