import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
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
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetFriendSuggestions,
  getGetFriendSuggestionsQueryKey,
  useUpdateMyProfile,
  useSendFriendRequest,
  useCompleteOnboarding,
  getGetCurrentUserQueryKey,
} from "@workspace/api-client-react";
import { Avatar } from "@/components/Avatar";
import { useAuth } from "@/lib/auth";
import { useColors } from "@/hooks/useColors";
import { uploadMedia, UploadUnavailableError, type PickedAsset } from "@/lib/upload";

type Step = "photo" | "cover" | "bio" | "friends" | "done";

const STEPS: Step[] = ["photo", "cover", "bio", "friends"];

/**
 * One-time post-signup onboarding: profile photo → cover → bio → 5 friend
 * requests → celebration. Rendered as a full-screen takeover from the root
 * navigator while `hasCompletedOnboarding === false`. Every step can be
 * skipped; finishing marks onboarding complete server-side.
 */
export function OnboardingFlow() {
  const c = useColors();
  const qc = useQueryClient();
  const { user, refreshUser } = useAuth();

  const [step, setStep] = useState<Step>("photo");
  const [pendingAvatar, setPendingAvatar] = useState<PickedAsset | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    user?.avatarUrl ?? null,
  );
  const [pendingCover, setPendingCover] = useState<PickedAsset | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(
    user?.coverUrl ?? null,
  );
  const [bio, setBio] = useState(user?.bio ?? "");
  const [saving, setSaving] = useState(false);

  const updateProfile = useUpdateMyProfile();
  const sendRequest = useSendFriendRequest();
  const completeOnboarding = useCompleteOnboarding();

  const suggestionsParams = { mode: "onboarding" as const, limit: 12 };
  const suggestions = useGetFriendSuggestions(suggestionsParams, {
    query: {
      queryKey: getGetFriendSuggestionsQueryKey(suggestionsParams),
      enabled: step === "friends",
      staleTime: Infinity,
    },
  });
  const [requested, setRequested] = useState<Set<string>>(new Set());
  const [requesting, setRequesting] = useState<string | null>(null);

  const people = suggestions.data ?? [];
  const goal = Math.min(5, people.length || 5);
  const sentCount = requested.size;
  const stepIndex = STEPS.indexOf(step);

  // Done-step celebration (RN built-in Animated only).
  const doneScale = useRef(new Animated.Value(0.3)).current;
  const doneOpacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (step !== "done") return;
    Animated.parallel([
      Animated.spring(doneScale, {
        toValue: 1,
        friction: 4,
        tension: 60,
        useNativeDriver: true,
      }),
      Animated.timing(doneOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, [step, doneScale, doneOpacity]);

  const pick = async (kind: "avatar" | "cover") => {
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
        setAvatarPreview(asset.uri);
      } else {
        setPendingCover(asset);
        setCoverPreview(asset.uri);
      }
    }
  };

  const savePhotoStep = async (kind: "avatar" | "cover", next: Step) => {
    const asset = kind === "avatar" ? pendingAvatar : pendingCover;
    if (!asset) {
      setStep(next);
      return;
    }
    setSaving(true);
    try {
      const uploaded = await uploadMedia(asset);
      await updateProfile.mutateAsync({
        data:
          kind === "avatar"
            ? { avatarUrl: uploaded.url }
            : { coverUrl: uploaded.url },
      });
      qc.invalidateQueries({ queryKey: getGetCurrentUserQueryKey() });
      if (kind === "avatar") setPendingAvatar(null);
      else setPendingCover(null);
      setStep(next);
    } catch (err) {
      if (err instanceof UploadUnavailableError) {
        Alert.alert(
          "Upload unavailable",
          "Photo upload isn't available right now — you can add it later from Edit profile.",
        );
        setStep(next);
      } else {
        Alert.alert("Upload failed", "Please try again.");
      }
    } finally {
      setSaving(false);
    }
  };

  const saveBioStep = async () => {
    const trimmed = bio.trim();
    if (!trimmed || trimmed === (user?.bio ?? "")) {
      setStep("friends");
      return;
    }
    setSaving(true);
    try {
      await updateProfile.mutateAsync({ data: { bio: trimmed } });
      qc.invalidateQueries({ queryKey: getGetCurrentUserQueryKey() });
      setStep("friends");
    } catch {
      Alert.alert("Couldn't save", "Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const addFriend = async (id: string) => {
    if (requested.has(id) || requesting) return;
    setRequesting(id);
    try {
      await sendRequest.mutateAsync({ data: { addresseeId: id } });
      setRequested((prev) => new Set(prev).add(id));
    } catch {
      Alert.alert("Couldn't send", "That friend request didn't go through.");
    } finally {
      setRequesting(null);
    }
  };

  const finish = async () => {
    setSaving(true);
    try {
      await completeOnboarding.mutateAsync();
      qc.invalidateQueries({ queryKey: getGetCurrentUserQueryKey() });
      setStep("done");
    } catch {
      Alert.alert("Something went wrong", "Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const nextFor = (s: Step): Step =>
    s === "photo" ? "cover" : s === "cover" ? "bio" : "friends";

  return (
    <SafeAreaView
      style={[StyleSheet.absoluteFill, { backgroundColor: c.background, zIndex: 100 }]}
    >
      {step !== "done" && (
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <Text style={[styles.title, { color: c.primary }]}>
              Welcome to HiMewo!
            </Text>
            <Text style={{ color: c.mutedForeground, fontSize: 12 }}>
              Step {stepIndex + 1} of {STEPS.length}
            </Text>
          </View>
          <View style={styles.progressRow}>
            {STEPS.map((s, i) => (
              <View
                key={s}
                style={[
                  styles.progressBar,
                  { backgroundColor: i <= stepIndex ? c.primary : c.secondary },
                ]}
              />
            ))}
          </View>
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
      >
        {step === "photo" && (
          <View style={styles.center}>
            <Text style={[styles.stepTitle, { color: c.foreground }]}>
              Add a profile picture
            </Text>
            <Text style={[styles.stepSub, { color: c.mutedForeground }]}>
              Help your friends recognize you.
            </Text>
            <Pressable
              onPress={() => void pick("avatar")}
              disabled={saving}
              style={[
                styles.avatarPick,
                { backgroundColor: c.secondary, borderColor: c.border },
              ]}
            >
              {avatarPreview ? (
                <Image
                  source={{ uri: avatarPreview }}
                  style={{ width: "100%", height: "100%" }}
                  contentFit="cover"
                />
              ) : (
                <Ionicons name="camera" size={40} color={c.mutedForeground} />
              )}
            </Pressable>
            <Pressable
              onPress={() => void pick("avatar")}
              disabled={saving}
              style={[styles.outlineBtn, { borderColor: c.border }]}
            >
              <Text style={{ color: c.foreground, fontFamily: "Inter_600SemiBold" }}>
                {avatarPreview ? "Change photo" : "Upload photo"}
              </Text>
            </Pressable>
          </View>
        )}

        {step === "cover" && (
          <View style={styles.center}>
            <Text style={[styles.stepTitle, { color: c.foreground }]}>
              Add a cover photo
            </Text>
            <Text style={[styles.stepSub, { color: c.mutedForeground }]}>
              Show a bit of your world at the top of your profile.
            </Text>
            <Pressable
              onPress={() => void pick("cover")}
              disabled={saving}
              style={[
                styles.coverPick,
                { backgroundColor: c.secondary, borderColor: c.border },
              ]}
            >
              {coverPreview ? (
                <Image
                  source={{ uri: coverPreview }}
                  style={{ width: "100%", height: "100%" }}
                  contentFit="cover"
                />
              ) : (
                <View style={{ alignItems: "center", gap: 8 }}>
                  <Ionicons name="image" size={36} color={c.mutedForeground} />
                  <Text style={{ color: c.mutedForeground, fontSize: 13 }}>
                    Tap to upload
                  </Text>
                </View>
              )}
            </Pressable>
          </View>
        )}

        {step === "bio" && (
          <View style={{ gap: 12 }}>
            <View style={styles.center}>
              <Text style={[styles.stepTitle, { color: c.foreground }]}>
                Tell us about yourself
              </Text>
              <Text style={[styles.stepSub, { color: c.mutedForeground }]}>
                A short bio for your profile.
              </Text>
            </View>
            <TextInput
              value={bio}
              onChangeText={setBio}
              placeholder="What's your story?"
              placeholderTextColor={c.mutedForeground}
              underlineColorAndroid="transparent"
              multiline
              maxLength={300}
              style={[
                styles.bioInput,
                {
                  color: c.foreground,
                  backgroundColor: c.card,
                  borderColor: c.border,
                },
              ]}
            />
            <Text
              style={{
                color: c.mutedForeground,
                fontSize: 12,
                textAlign: "right",
              }}
            >
              {bio.length}/300
            </Text>
          </View>
        )}

        {step === "friends" && (
          <View style={{ gap: 14 }}>
            <View style={styles.center}>
              <Text style={[styles.stepTitle, { color: c.foreground }]}>
                Find your friends
              </Text>
              <Text style={[styles.stepSub, { color: c.mutedForeground }]}>
                Send {goal} friend requests to get your feed going.
              </Text>
              <View
                style={[styles.counterPill, { backgroundColor: `${c.primary}1A` }]}
              >
                <Ionicons name="person-add" size={16} color={c.primary} />
                <Text
                  style={{
                    color: c.primary,
                    fontFamily: "Inter_700Bold",
                    fontSize: 14,
                  }}
                >
                  {Math.min(sentCount, goal)} of {goal} sent
                </Text>
              </View>
            </View>
            {suggestions.isLoading ? (
              <ActivityIndicator
                color={c.primary}
                style={{ marginVertical: 32 }}
              />
            ) : people.length === 0 ? (
              <Text
                style={{
                  color: c.mutedForeground,
                  textAlign: "center",
                  marginVertical: 32,
                  fontSize: 14,
                }}
              >
                No suggestions right now — you can find friends later from the
                Friends tab.
              </Text>
            ) : (
              <View style={styles.grid}>
                {people.map((p) => {
                  const sent = requested.has(p.id);
                  return (
                    <View
                      key={p.id}
                      style={[
                        styles.personCard,
                        { backgroundColor: c.card, borderColor: c.border },
                      ]}
                    >
                      <Avatar uri={p.avatarUrl} name={p.displayName} size={56} />
                      <Text
                        numberOfLines={1}
                        style={{
                          color: c.foreground,
                          fontFamily: "Inter_600SemiBold",
                          fontSize: 13,
                        }}
                      >
                        {p.displayName}
                      </Text>
                      <Pressable
                        onPress={() => void addFriend(p.id)}
                        disabled={sent || requesting === p.id}
                        style={[
                          styles.addBtn,
                          {
                            backgroundColor: sent ? c.secondary : c.primary,
                          },
                        ]}
                      >
                        {requesting === p.id ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <Text
                            style={{
                              color: sent ? c.foreground : "#fff",
                              fontFamily: "Inter_600SemiBold",
                              fontSize: 13,
                            }}
                          >
                            {sent ? "Sent ✓" : "Add"}
                          </Text>
                        )}
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {step === "done" && (
          <Animated.View
            style={[
              styles.center,
              {
                marginTop: 80,
                opacity: doneOpacity,
                transform: [{ scale: doneScale }],
              },
            ]}
          >
            <View
              style={[styles.doneCircle, { backgroundColor: `${c.primary}1A` }]}
            >
              <Ionicons name="sparkles" size={48} color={c.primary} />
            </View>
            <Text
              style={{
                color: c.foreground,
                fontFamily: "Inter_700Bold",
                fontSize: 24,
                marginTop: 16,
              }}
            >
              You're all set!
            </Text>
            <Text
              style={[styles.stepSub, { color: c.mutedForeground, marginTop: 8 }]}
            >
              Your profile is ready. Time to explore HiMewo and connect with
              your friends.
            </Text>
            <Pressable
              onPress={() => void refreshUser()}
              style={[
                styles.primaryBtn,
                { backgroundColor: c.primary, marginTop: 24, minWidth: 200 },
              ]}
            >
              <Text style={styles.primaryBtnText}>Go to HiMewo</Text>
            </Pressable>
          </Animated.View>
        )}
      </ScrollView>

      {step !== "done" && (
        <View style={styles.footer}>
          <Pressable
            onPress={() =>
              step === "friends" ? void finish() : setStep(nextFor(step))
            }
            disabled={saving}
            style={styles.skipBtn}
          >
            <Text
              style={{
                color: c.mutedForeground,
                fontFamily: "Inter_600SemiBold",
              }}
            >
              Skip
            </Text>
          </Pressable>
          <Pressable
            onPress={() => {
              if (step === "photo") void savePhotoStep("avatar", "cover");
              else if (step === "cover") void savePhotoStep("cover", "bio");
              else if (step === "bio") void saveBioStep();
              else void finish();
            }}
            disabled={
              saving ||
              (step === "friends" && people.length > 0 && sentCount < goal)
            }
            style={[
              styles.primaryBtn,
              {
                backgroundColor: c.primary,
                opacity:
                  saving ||
                  (step === "friends" && people.length > 0 && sentCount < goal)
                    ? 0.5
                    : 1,
              },
            ]}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>
                {step === "friends" ? "Finish" : "Next"}
              </Text>
            )}
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingTop: 12, gap: 10 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: { fontFamily: "Inter_700Bold", fontSize: 20 },
  progressRow: { flexDirection: "row", gap: 6 },
  progressBar: { flex: 1, height: 5, borderRadius: 3 },
  body: { padding: 20, paddingBottom: 40, flexGrow: 1 },
  center: { alignItems: "center", gap: 8 },
  stepTitle: { fontFamily: "Inter_700Bold", fontSize: 18, textAlign: "center" },
  stepSub: { fontSize: 14, textAlign: "center", maxWidth: 280 },
  avatarPick: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  coverPick: {
    width: "100%",
    height: 160,
    borderRadius: 14,
    borderWidth: 2,
    borderStyle: "dashed",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  outlineBtn: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 9,
    marginTop: 4,
  },
  bioInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    minHeight: 110,
    textAlignVertical: "top",
    fontSize: 16,
  },
  counterPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    marginTop: 8,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "space-between",
  },
  personCard: {
    width: "48%",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    gap: 8,
  },
  addBtn: {
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: "center",
    alignSelf: "stretch",
  },
  doneCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    paddingTop: 8,
  },
  skipBtn: { paddingVertical: 12, paddingHorizontal: 8 },
  primaryBtn: {
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 15 },
});
