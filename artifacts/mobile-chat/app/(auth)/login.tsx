import { Touchable } from "@/components/Touchable";
import { fs } from "@/constants/typography";
import { shadow, glow } from "@/constants/shadows";
import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Avatar } from "@/components/Avatar";
import { useAuth } from "@/lib/auth";
import { useColors } from "@/hooks/useColors";
import { auroraGradient } from "@/constants/colors";

type Mode = "signin" | "signup";
type Method = "email" | "phone";

export default function LoginScreen() {
  const c = useColors();
  const {
    supabaseEnabled,
    devUsers,
    signInAsDevUser,
    signInWithEmail,
    signInWithPhonePassword,
    signUpWithEmail,
    signInWithGoogle,
  } = useAuth();

  const [method, setMethod] = useState<Method>("email");
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");

  const [phone, setPhone] = useState("");
  const [phonePassword, setPhonePassword] = useState("");

  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [devBusy, setDevBusy] = useState<string | null>(null);

  const submitEmail = async () => {
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

  const submitGoogle = async () => {
    setError(null);
    setGoogleBusy(true);
    try {
      await signInWithGoogle();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not sign in with Google");
    } finally {
      setGoogleBusy(false);
    }
  };

  // Phone login requires number + PASSWORD (no OTP-only login) — same as web.
  const submitPhonePassword = async () => {
    setError(null);
    setBusy(true);
    try {
      const raw = phone.trim().replace(/[\s-]/g, "");
      const normalized = raw.startsWith("+")
        ? raw
        : raw.startsWith("01")
          ? `+88${raw}`
          : `+${raw}`;
      await signInWithPhonePassword(normalized, phonePassword);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed");
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

  const switchMethod = (next: Method) => {
    setMethod(next);
    setError(null);
    setNotice(null);
    setPhonePassword("");
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={[styles.brand, { alignItems: "center", marginBottom: 20 }]}>
          <Image
            source={require("@/assets/images/icon.png")}
            style={{ width: 115, height: 115, borderRadius: 30, marginBottom: 12 }}
            resizeMode="contain"
          />
        </View>

        {supabaseEnabled ? (
          <View style={styles.form}>
            <View style={[styles.tabs, { backgroundColor: c.secondary }]}>
              <Tab label="Email" active={method === "email"} onPress={() => switchMethod("email")} />
              <Tab label="Phone" active={method === "phone"} onPress={() => switchMethod("phone")} />
            </View>

            {method === "email" ? (
              <>
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

                {error && <Text style={{ color: c.destructive, fontSize: fs(13) }}>{error}</Text>}

                <Touchable
                  style={[styles.primaryBtn, { backgroundColor: c.primary }, glow(c.primary)]}
                  onPress={submitEmail}
                  disabled={busy}
                >
                  {busy ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.primaryBtnText}>
                      {mode === "signin" ? "Log In" : "Create Account"}
                    </Text>
                  )}
                </Touchable>

                <Touchable onPress={() => setMode(mode === "signin" ? "signup" : "signin")}>
                  <Text style={[styles.switchText, { color: c.primary }]}>
                    {mode === "signin"
                      ? "Don't have an account? Sign up"
                      : "Already have an account? Log in"}
                  </Text>
                </Touchable>
              </>
            ) : (
              <>
                <Field
                  icon="call-outline"
                  placeholder="Phone (e.g. +8801XXXXXXXXX)"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  autoCapitalize="none"
                />
                <Field
                  icon="lock-closed-outline"
                  placeholder="Password"
                  value={phonePassword}
                  onChangeText={setPhonePassword}
                  secureTextEntry
                />
                {error && <Text style={{ color: c.destructive, fontSize: fs(13) }}>{error}</Text>}
                <Touchable
                  style={[styles.primaryBtn, { backgroundColor: c.primary }, glow(c.primary)]}
                  onPress={submitPhonePassword}
                  disabled={busy || phone.trim().length === 0 || phonePassword.length === 0}
                >
                  {busy ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.primaryBtnText}>Log In</Text>
                  )}
                </Touchable>
              </>
            )}

            <View style={styles.dividerRow}>
              <View style={[styles.divider, { backgroundColor: c.border }]} />
              <Text style={{ color: c.mutedForeground, fontSize: fs(12) }}>OR</Text>
              <View style={[styles.divider, { backgroundColor: c.border }]} />
            </View>

            <Touchable
              style={[styles.googleBtn, { backgroundColor: c.card }, shadow("sm")]}
              onPress={submitGoogle}
              disabled={googleBusy}
            >
              {googleBusy ? (
                <ActivityIndicator color={c.foreground} />
              ) : (
                <>
                  <Ionicons name="logo-google" size={20} color="#ea4335" />
                  <Text style={{ color: c.foreground, fontFamily: "Inter_600SemiBold", fontSize: fs(15) }}>
                    Continue with Google
                  </Text>
                </>
              )}
            </Touchable>
          </View>
        ) : (
          <View style={styles.devSection}>
            <Text style={[styles.devTitle, { color: c.foreground }]}>
              Choose a demo account
            </Text>
            <Text style={{ color: c.mutedForeground, fontSize: fs(13), marginBottom: 12 }}>
              Connect Supabase later for real email, Google & phone login.
            </Text>
            {devUsers.map((u) => (
              <Touchable
                key={u.id}
                style={[styles.devUser, { backgroundColor: c.card }, shadow("sm")]}
                onPress={() => devLogin(u.id)}
                disabled={devBusy != null}
              >
                <Avatar uri={u.avatarUrl} name={u.displayName} size={44} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: c.foreground, fontFamily: "Inter_600SemiBold", fontSize: fs(15) }}>
                    {u.displayName}
                  </Text>
                  <Text style={{ color: c.mutedForeground, fontSize: fs(13) }}>@{u.username}</Text>
                </View>
                {devBusy === u.id ? (
                  <ActivityIndicator color={c.primary} />
                ) : (
                  <Ionicons name="chevron-forward" size={20} color={c.mutedForeground} />
                )}
              </Touchable>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Tab({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const c = useColors();
  return (
    <Touchable
      style={[styles.tab, active && [{ backgroundColor: c.card }, shadow("sm")]]}
      onPress={onPress}
    >
      <Text
        style={{
          color: active ? c.primary : c.mutedForeground,
          fontFamily: active ? "Inter_700Bold" : "Inter_500Medium",
          fontSize: fs(14),
        }}
      >
        {label}
      </Text>
    </Touchable>
  );
}

function Field({
  icon,
  ...props
}: { icon: keyof typeof Ionicons.glyphMap } & React.ComponentProps<typeof TextInput>) {
  const c = useColors();
  const isPassword = props.secureTextEntry || props.placeholder?.toLowerCase().includes("password");
  const [showPass, setShowPass] = useState(false);
  return (
    <View style={[styles.field, { backgroundColor: c.card }, shadow("sm")]}>
      <Ionicons name={icon} size={20} color={c.mutedForeground} />
      <TextInput
        style={{ flex: 1, color: c.foreground, fontSize: fs(15) }}
        placeholderTextColor={c.mutedForeground}
        {...props}
        secureTextEntry={isPassword ? !showPass : false}
      />
      {isPassword && (
        <Pressable onPress={() => setShowPass((v) => !v)} hitSlop={8}>
          <Ionicons
            name={showPass ? "eye-off-outline" : "eye-outline"}
            size={20}
            color={c.mutedForeground}
          />
        </Pressable>
      )}
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
  title: { fontFamily: "Inter_700Bold", fontSize: fs(34) },
  form: { gap: 12 },
  tabs: {
    flexDirection: "row",
    borderRadius: 12,
    padding: 4,
    marginBottom: 4,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 9,
    borderRadius: 9,
  },
  field: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  primaryBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
  },
  primaryBtnText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: fs(16) },
  switchText: { textAlign: "center", fontFamily: "Inter_600SemiBold" },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginVertical: 4,
  },
  divider: { flex: 1, height: StyleSheet.hairlineWidth },
  googleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 14,
    paddingVertical: 14,
  },
  devSection: { marginTop: 8 },
  devTitle: { fontFamily: "Inter_700Bold", fontSize: fs(18) },
  devUser: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
});
