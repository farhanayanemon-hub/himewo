import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Avatar } from "@/components/Avatar";
import { useAuth } from "@/lib/auth";
import { useColors } from "@/hooks/useColors";

type Mode = "signin" | "signup";

export default function LoginScreen() {
  const c = useColors();
  const {
    supabaseEnabled,
    devUsers,
    signInAsDevUser,
    signInWithEmail,
    signUpWithEmail,
  } = useAuth();

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devBusy, setDevBusy] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    setBusy(true);
    try {
      if (mode === "signin") {
        await signInWithEmail(email.trim(), password);
      } else {
        await signUpWithEmail({
          email: email.trim(),
          password,
          username: username.trim(),
          displayName: displayName.trim(),
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const devLogin = async (id: string) => {
    setDevBusy(id);
    try {
      await signInAsDevUser(id);
    } finally {
      setDevBusy(null);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.brand}>
          <View style={[styles.logo, { backgroundColor: c.primary }]}>
            <Ionicons name="chatbubble-ellipses" size={34} color="#fff" />
          </View>
          <Text style={[styles.title, { color: c.primary }]}>HiMewo</Text>
          <Text style={{ color: c.mutedForeground, fontSize: 14 }}>
            Connect with friends and the world
          </Text>
        </View>

        {supabaseEnabled ? (
          <View style={styles.form}>
            {mode === "signup" && (
              <>
                <Field
                  icon="person-outline"
                  placeholder="Display name"
                  value={displayName}
                  onChangeText={setDisplayName}
                />
                <Field
                  icon="at-outline"
                  placeholder="Username"
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                />
              </>
            )}
            <Field
              icon="mail-outline"
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Field
              icon="lock-closed-outline"
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            {error && <Text style={{ color: c.destructive, fontSize: 13 }}>{error}</Text>}

            <Pressable
              style={[styles.primaryBtn, { backgroundColor: c.primary }]}
              onPress={submit}
              disabled={busy}
            >
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryBtnText}>
                  {mode === "signin" ? "Log In" : "Create Account"}
                </Text>
              )}
            </Pressable>

            <Pressable onPress={() => setMode(mode === "signin" ? "signup" : "signin")}>
              <Text style={{ color: c.primary, textAlign: "center", fontFamily: "Inter_600SemiBold" }}>
                {mode === "signin"
                  ? "Don't have an account? Sign up"
                  : "Already have an account? Log in"}
              </Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.devSection}>
            <Text style={[styles.devTitle, { color: c.foreground }]}>
              Choose a demo account
            </Text>
            <Text style={{ color: c.mutedForeground, fontSize: 13, marginBottom: 12 }}>
              Connect Supabase later for real email & phone login.
            </Text>
            {devUsers.map((u) => (
              <Pressable
                key={u.id}
                style={[styles.devUser, { backgroundColor: c.card, borderColor: c.border }]}
                onPress={() => devLogin(u.id)}
                disabled={devBusy != null}
              >
                <Avatar uri={u.avatarUrl} name={u.displayName} size={44} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: c.foreground, fontFamily: "Inter_600SemiBold", fontSize: 15 }}>
                    {u.displayName}
                  </Text>
                  <Text style={{ color: c.mutedForeground, fontSize: 13 }}>@{u.username}</Text>
                </View>
                {devBusy === u.id ? (
                  <ActivityIndicator color={c.primary} />
                ) : (
                  <Ionicons name="chevron-forward" size={20} color={c.mutedForeground} />
                )}
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({
  icon,
  ...props
}: { icon: keyof typeof Ionicons.glyphMap } & React.ComponentProps<typeof TextInput>) {
  const c = useColors();
  return (
    <View style={[styles.field, { backgroundColor: c.card, borderColor: c.border }]}>
      <Ionicons name={icon} size={20} color={c.mutedForeground} />
      <TextInput
        style={{ flex: 1, color: c.foreground, fontSize: 15 }}
        placeholderTextColor={c.mutedForeground}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, paddingTop: 48, gap: 8 },
  brand: { alignItems: "center", marginBottom: 28, gap: 6 },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  title: { fontFamily: "Inter_700Bold", fontSize: 34 },
  form: { gap: 12 },
  field: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  primaryBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
  },
  primaryBtnText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 16 },
  devSection: { marginTop: 8 },
  devTitle: { fontFamily: "Inter_700Bold", fontSize: 18 },
  devUser: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
  },
});
