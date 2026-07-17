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
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useColors } from "@/hooks/useColors";
import { getApiOrigin } from "@/lib/api";
import { supabase, isSupabaseConfigured, getDevUserId } from "@/lib/supabase";

interface VerificationState {
  isVerified: boolean;
  request: {
    id: number;
    status: "pending" | "approved" | "rejected";
    note: string | null;
    reviewNote: string | null;
    createdAt: string;
  } | null;
}

async function getAuthToken(): Promise<string | null> {
  if (isSupabaseConfigured && supabase) {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }
  const devId = await getDevUserId();
  return devId ? `dev:${devId}` : null;
}

async function fetchVerificationState(): Promise<VerificationState> {
  const origin = getApiOrigin();
  const token = await getAuthToken();
  const res = await fetch(`${origin}/api/verification/request`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`Could not load status (${res.status})`);
  return (await res.json()) as VerificationState;
}

async function submitVerificationRequest(note: string): Promise<void> {
  const origin = getApiOrigin();
  const token = await getAuthToken();
  const res = await fetch(`${origin}/api/verification/request`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ note: note.trim() || undefined }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error || `Could not submit (${res.status})`);
  }
}

export default function VerifiedScreen() {
  const c = useColors();
  const [note, setNote] = useState("");
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["verification-request"],
    queryFn: fetchVerificationState,
  });

  const submit = useMutation({
    mutationFn: () => submitVerificationRequest(note),
    onSuccess: () => {
      setNote("");
      queryClient.invalidateQueries({ queryKey: ["verification-request"] });
      Alert.alert("Request submitted", "We'll review your request soon.");
    },
    onError: (err: Error) => {
      Alert.alert("Could not submit", err.message);
    },
  });

  const status = data?.isVerified
    ? "verified"
    : data?.request?.status === "pending"
      ? "pending"
      : data?.request?.status === "rejected"
        ? "rejected"
        : "none";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }} edges={["top"]}>
      <View style={[styles.header, { borderBottomColor: c.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={c.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: c.text }]}>Verified Badge</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <View style={[styles.heroIcon, { backgroundColor: "rgba(24,119,242,0.12)" }]}>
            <Ionicons name="checkmark-circle" size={44} color="#1877f2" />
          </View>
          <Text style={[styles.heroTitle, { color: c.text }]}>Verified Badge</Text>
          <Text style={[styles.heroSub, { color: c.muted }]}>
            The blue badge shows people that your profile is authentic. Apply below and our
            team will review your request.
          </Text>
        </View>

        {isLoading ? (
          <ActivityIndicator style={{ marginTop: 32 }} color={c.muted} />
        ) : isError ? (
          <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
            <Ionicons name="close-circle" size={36} color="#dc2626" style={styles.cardIcon} />
            <Text style={[styles.cardTitle, { color: c.text }]}>Couldn't load your status</Text>
            <Text style={[styles.cardSub, { color: c.muted }]}>
              Please check your connection and try again.
            </Text>
            <Pressable style={[styles.button, { marginTop: 12, alignSelf: "stretch" }]} onPress={() => refetch()}>
              <Text style={styles.buttonText}>Retry</Text>
            </Pressable>
          </View>
        ) : status === "verified" ? (
          <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
            <Ionicons name="checkmark-circle" size={36} color="#1877f2" style={styles.cardIcon} />
            <Text style={[styles.cardTitle, { color: c.text }]}>You're verified!</Text>
            <Text style={[styles.cardSub, { color: c.muted }]}>
              Your profile shows the blue verified badge.
            </Text>
          </View>
        ) : status === "pending" ? (
          <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
            <Ionicons name="time" size={36} color="#f59e0b" style={styles.cardIcon} />
            <Text style={[styles.cardTitle, { color: c.text }]}>Request pending</Text>
            <Text style={[styles.cardSub, { color: c.muted }]}>
              Your request is being reviewed. We'll notify you once it's decided.
            </Text>
          </View>
        ) : (
          <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border, alignItems: "stretch" }]}>
            {status === "rejected" && (
              <View style={styles.rejectedBox}>
                <Ionicons name="close-circle" size={20} color="#dc2626" />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rejectedTitle, { color: c.text }]}>
                    Your previous request was not approved.
                  </Text>
                  {!!data?.request?.reviewNote && (
                    <Text style={[styles.cardSub, { color: c.muted }]}>
                      {data.request.reviewNote}
                    </Text>
                  )}
                  <Text style={[styles.cardSub, { color: c.muted }]}>
                    You can apply again below.
                  </Text>
                </View>
              </View>
            )}
            <Text style={[styles.label, { color: c.text }]}>
              Why should your profile be verified? (optional)
            </Text>
            <TextInput
              style={[styles.input, { color: c.text, backgroundColor: c.background, borderColor: c.border }]}
              value={note}
              onChangeText={setNote}
              maxLength={1000}
              multiline
              numberOfLines={4}
              placeholder="Tell us about yourself — public figure, creator, business, etc."
              placeholderTextColor={c.muted}
              textAlignVertical="top"
            />
            <Pressable
              style={[styles.button, { opacity: submit.isPending ? 0.6 : 1 }]}
              disabled={submit.isPending}
              onPress={() => submit.mutate()}
            >
              {submit.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Submit request</Text>
              )}
            </Pressable>
          </View>
        )}
      </ScrollView>
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
  headerTitle: { fontSize: 17, fontWeight: "700" },
  content: { padding: 20, paddingBottom: 48 },
  hero: { alignItems: "center", marginBottom: 24 },
  heroIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  heroTitle: { fontSize: 22, fontWeight: "700" },
  heroSub: { fontSize: 14, textAlign: "center", marginTop: 8, lineHeight: 20 },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
  },
  cardIcon: { marginBottom: 8 },
  cardTitle: { fontSize: 17, fontWeight: "700" },
  cardSub: { fontSize: 13, textAlign: "left", marginTop: 4, lineHeight: 18 },
  rejectedBox: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: "rgba(220,38,38,0.08)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  rejectedTitle: { fontSize: 13, fontWeight: "600" },
  label: { fontSize: 14, fontWeight: "600", marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    minHeight: 100,
    fontSize: 15,
    marginBottom: 16,
  },
  button: {
    backgroundColor: "#1877f2",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
