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
  useUpdateMyProfile,
  getGetCurrentUserQueryKey,
  type ProfileUpdate,
} from "@workspace/api-client-react";
import { Avatar } from "@/components/Avatar";
import { useAuth } from "@/lib/auth";
import { useColors } from "@/hooks/useColors";
import { uploadMedia, UploadUnavailableError, type PickedAsset } from "@/lib/upload";

export default function EditProfileScreen() {
  const c = useColors();
  const qc = useQueryClient();
  const { user, refreshUser } = useAuth();
  const updateProfile = useUpdateMyProfile();

  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [birthday, setBirthday] = useState((user?.birthday ?? "").slice(0, 10));
  const [work, setWork] = useState(user?.work ?? "");
  const [education, setEducation] = useState(user?.education ?? "");
  const [location, setLocation] = useState(user?.location ?? "");
  const [hometown, setHometown] = useState(user?.hometown ?? "");
  const [hobbies, setHobbies] = useState(user?.hobbies ?? "");
  const [interests, setInterests] = useState(user?.interests ?? "");
  const [website, setWebsite] = useState(user?.website ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");

  const [avatarUrl, setAvatarUrl] = useState<string | null>(user?.avatarUrl ?? null);
  const [pendingAvatar, setPendingAvatar] = useState<PickedAsset | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(user?.coverUrl ?? null);
  const [pendingCover, setPendingCover] = useState<PickedAsset | null>(null);
  const [saving, setSaving] = useState(false);

  const pickImage = async (kind: "avatar" | "cover") => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: kind === "avatar" ? [1, 1] : [16, 9],
      quality: 0.8,
    });
    if (!res.canceled && res.assets[0]) {
      const asset = res.assets[0];
      if (kind === "avatar") {
        setPendingAvatar(asset);
        setAvatarUrl(asset.uri);
      } else {
        setPendingCover(asset);
        setCoverUrl(asset.uri);
      }
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
        birthday: birthday.trim(),
        work: work.trim(),
        education: education.trim(),
        location: location.trim(),
        hometown: hometown.trim(),
        hobbies: hobbies.trim(),
        interests: interests.trim(),
        website: website.trim(),
        email: email.trim(),
        phone: phone.trim(),
      };

      let uploadFailed = false;
      for (const [kind, asset] of [
        ["avatar", pendingAvatar],
        ["cover", pendingCover],
      ] as const) {
        if (!asset) continue;
        try {
          const uploaded = await uploadMedia(asset);
          if (kind === "avatar") data.avatarUrl = uploaded.url;
          else data.coverUrl = uploaded.url;
        } catch (err) {
          if (err instanceof UploadUnavailableError) {
            uploadFailed = true;
          } else {
            throw err;
          }
        }
      }
      if (uploadFailed) {
        Alert.alert(
          "Photo upload unavailable",
          "Storage isn't configured in this environment. Your other changes will still be saved.",
        );
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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }}>
      <View style={[styles.header, { borderBottomColor: c.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={c.foreground} />
        </Pressable>
        <Text style={{ color: c.foreground, fontFamily: "Inter_700Bold", fontSize: 18 }}>
          Edit profile
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

      <ScrollView contentContainerStyle={{ paddingBottom: 48 }}>
        {/* Cover */}
        <Pressable onPress={() => pickImage("cover")} style={styles.coverWrap}>
          {coverUrl ? (
            <Image source={{ uri: coverUrl }} style={styles.cover} contentFit="cover" />
          ) : (
            <View style={[styles.cover, { backgroundColor: c.primary }]} />
          )}
          <View style={[styles.coverBadge, { backgroundColor: c.card }]}>
            <Ionicons name="camera" size={16} color={c.foreground} />
            <Text style={{ color: c.foreground, fontFamily: "Inter_600SemiBold", fontSize: 12 }}>
              Cover
            </Text>
          </View>
        </Pressable>

        <View style={styles.avatarSection}>
          <Pressable onPress={() => pickImage("avatar")} style={styles.avatarWrap}>
            <Avatar uri={avatarUrl} name={displayName} size={96} />
            <View style={[styles.cameraBadge, { backgroundColor: c.primary, borderColor: c.background }]}>
              <Ionicons name="camera" size={18} color="#fff" />
            </View>
          </Pressable>
          <Text style={{ color: c.mutedForeground, fontFamily: "Inter_500Medium", fontSize: 13 }}>
            @{user?.username}
          </Text>
        </View>

        <Text style={[styles.sectionTitle, { color: c.mutedForeground }]}>BASIC</Text>
        <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
          <Field label="Name" c={c}>
            <TextInput value={displayName} onChangeText={setDisplayName} placeholder="Your name" placeholderTextColor={c.mutedForeground} style={[styles.input, { color: c.foreground }]} />
          </Field>
          <Field label="Bio / Intro" c={c} last>
            <TextInput value={bio} onChangeText={setBio} placeholder="Nijer somporke kichu likhun" placeholderTextColor={c.mutedForeground} multiline style={[styles.input, { color: c.foreground, minHeight: 60, textAlignVertical: "top" }]} />
          </Field>
        </View>

        <Text style={[styles.sectionTitle, { color: c.mutedForeground }]}>ABOUT YOU</Text>
        <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
          <Field label="Birthday (YYYY-MM-DD)" c={c}>
            <TextInput value={birthday} onChangeText={setBirthday} placeholder="1998-06-28" placeholderTextColor={c.mutedForeground} autoCapitalize="none" style={[styles.input, { color: c.foreground }]} />
          </Field>
          <Field label="Work" c={c}>
            <TextInput value={work} onChangeText={setWork} placeholder="Kothay kaj koren" placeholderTextColor={c.mutedForeground} style={[styles.input, { color: c.foreground }]} />
          </Field>
          <Field label="Education" c={c}>
            <TextInput value={education} onChangeText={setEducation} placeholder="Kothay porashona korechen" placeholderTextColor={c.mutedForeground} style={[styles.input, { color: c.foreground }]} />
          </Field>
          <Field label="Current city" c={c}>
            <TextInput value={location} onChangeText={setLocation} placeholder="Ekhon kothay thaken" placeholderTextColor={c.mutedForeground} style={[styles.input, { color: c.foreground }]} />
          </Field>
          <Field label="Hometown" c={c}>
            <TextInput value={hometown} onChangeText={setHometown} placeholder="Apnar nijer elaka" placeholderTextColor={c.mutedForeground} style={[styles.input, { color: c.foreground }]} />
          </Field>
          <Field label="Hobbies" c={c}>
            <TextInput value={hobbies} onChangeText={setHobbies} placeholder="Cricket, gaan, ranna..." placeholderTextColor={c.mutedForeground} style={[styles.input, { color: c.foreground }]} />
          </Field>
          <Field label="Interests" c={c} last>
            <TextInput value={interests} onChangeText={setInterests} placeholder="Travel, technology..." placeholderTextColor={c.mutedForeground} style={[styles.input, { color: c.foreground }]} />
          </Field>
        </View>

        <Text style={[styles.sectionTitle, { color: c.mutedForeground }]}>CONTACT INFO</Text>
        <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
          <Field label="Email" c={c}>
            <TextInput value={email} onChangeText={setEmail} placeholder="you@example.com" placeholderTextColor={c.mutedForeground} autoCapitalize="none" keyboardType="email-address" style={[styles.input, { color: c.foreground }]} />
          </Field>
          <Field label="Phone" c={c}>
            <TextInput value={phone} onChangeText={setPhone} placeholder="01XXXXXXXXX" placeholderTextColor={c.mutedForeground} keyboardType="phone-pad" style={[styles.input, { color: c.foreground }]} />
          </Field>
          <Field label="Website" c={c} last>
            <TextInput value={website} onChangeText={setWebsite} placeholder="https://..." placeholderTextColor={c.mutedForeground} autoCapitalize="none" style={[styles.input, { color: c.foreground }]} />
          </Field>
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
  coverWrap: { width: "100%", height: 150 },
  cover: { width: "100%", height: "100%" },
  coverBadge: {
    position: "absolute",
    bottom: 10,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  avatarSection: { alignItems: "center", gap: 8, marginTop: -48, paddingBottom: 16 },
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
});
