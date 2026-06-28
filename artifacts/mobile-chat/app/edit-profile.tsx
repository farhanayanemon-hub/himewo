import { Touchable } from "@/components/Touchable";
import { fs } from "@/constants/typography";
import { shadow, glow } from "@/constants/shadows";
import { useCallback, useState } from "react";
import {
  Alert,
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
import { uploadMedia, UploadUnavailableError } from "@/lib/upload";

export default function EditProfileScreen() {
  const c = useColors();
  const qc = useQueryClient();
  const { user, refreshUser } = useAuth();
  const updateProfile = useUpdateMyProfile();

  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [location, setLocation] = useState(user?.location ?? "");
  const [work, setWork] = useState(user?.work ?? "");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user?.avatarUrl ?? null);

  const commitProfile = useCallback(async () => {
    if (!displayName.trim()) return;
    try {
      const data: ProfileUpdate = {
        displayName: displayName.trim(),
        bio: bio.trim(),
        location: location.trim(),
        work: work.trim(),
      };
      await updateProfile.mutateAsync({ data });
      qc.invalidateQueries({ queryKey: getGetCurrentUserQueryKey() });
      await refreshUser();
    } catch {
      // Silent: next blur retries.
    }
  }, [displayName, bio, location, work, updateProfile, qc, refreshUser]);

  const pickAvatar = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (res.canceled || !res.assets[0]) return;
    const asset = res.assets[0];
    setAvatarUrl(asset.uri);
    try {
      const uploaded = await uploadMedia(asset);
      await updateProfile.mutateAsync({ data: { avatarUrl: uploaded.url } });
      qc.invalidateQueries({ queryKey: getGetCurrentUserQueryKey() });
      await refreshUser();
    } catch (err) {
      setAvatarUrl(user?.avatarUrl ?? null);
      Alert.alert(
        err instanceof UploadUnavailableError ? "Photo upload unavailable" : "Error",
        err instanceof UploadUnavailableError
          ? "Storage isn't configured in this environment."
          : "Could not update your photo. Please try again.",
      );
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }}>
      <View style={[styles.header, { backgroundColor: c.card }, shadow("sm")]}>
        <Touchable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={c.foreground} />
        </Touchable>
        <Text style={{ color: c.foreground, fontFamily: "Inter_700Bold", fontSize: fs(18) }}>
          Edit profile
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.avatarSection}>
          <Touchable onPress={pickAvatar} style={styles.avatarWrap}>
            <Avatar uri={avatarUrl} name={displayName} size={96} />
            <View style={[styles.cameraBadge, { backgroundColor: c.primary, borderColor: c.background }, glow(c.primary)]}>
              <Ionicons name="camera" size={18} color="#fff" />
            </View>
          </Touchable>
          <Text style={{ color: c.mutedForeground, fontFamily: "Inter_500Medium", fontSize: fs(13) }}>
            @{user?.username}
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: c.card }, shadow("md")]}>
          <Field label="Display name" c={c}>
            <TextInput
              value={displayName}
              onChangeText={setDisplayName}
              onBlur={commitProfile}
              placeholder="Your name"
              placeholderTextColor={c.mutedForeground}
              style={[styles.input, { color: c.foreground }]}
            />
          </Field>
          <Field label="Bio" c={c}>
            <TextInput
              value={bio}
              onChangeText={setBio}
              onBlur={commitProfile}
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
              onBlur={commitProfile}
              placeholder="Where you live"
              placeholderTextColor={c.mutedForeground}
              style={[styles.input, { color: c.foreground }]}
            />
          </Field>
          <Field label="Work" c={c} last>
            <TextInput
              value={work}
              onChangeText={setWork}
              onBlur={commitProfile}
              placeholder="Where you work"
              placeholderTextColor={c.mutedForeground}
              style={[styles.input, { color: c.foreground }]}
            />
          </Field>
        </View>
        <Text style={{ color: c.mutedForeground, fontSize: fs(12), textAlign: "center", marginTop: 16, paddingHorizontal: 32 }}>
          Changes save automatically. Your profile is shared across HiMewo.
        </Text>
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
      <Text style={{ color: c.mutedForeground, fontFamily: "Inter_500Medium", fontSize: fs(12), marginBottom: 4 }}>
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
    zIndex: 2,
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
  card: { marginHorizontal: 16, borderRadius: 16 },
  field: { paddingHorizontal: 14, paddingVertical: 10 },
  input: { fontFamily: "Inter_400Regular", fontSize: fs(15), padding: 0 },
});
