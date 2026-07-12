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
import { router } from "expo-router";
import { Avatar } from "@/components/Avatar";
import { useAuth } from "@/lib/auth";
import { useColors } from "@/hooks/useColors";

type Method = "email" | "phone";

export default function LoginScreen() {
  const c = useColors();
  const {
    supabaseEnabled,
    devUsers,
    signInAsDevUser,
    signInWithEmail,
    signInWithGoogle,
    sendPhoneOtp,
    verifyPhoneOtp,
  } = useAuth();

  const [screen, setScreen] = useState<"landing" | "login">("landing");
  const [method, setMethod] = useState<Method>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpStep, setOtpStep] = useState<"phone" | "code">("phone");

  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [devBusy, setDevBusy] = useState<string | null>(null);

  const submitEmail = async () => {
    setError(null);
    setBusy(true);
    try {
      await signInWithEmail(email.trim(), password);
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

  const submitSendOtp = async () => {
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      await sendPhoneOtp(phone.trim());
      setOtpStep("code");
      setNotice(`We sent a verification code to ${phone.trim()}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send code");
    } finally {
      setBusy(false);
    }
  };

  const submitVerifyOtp = async () => {
    setError(null);
    setBusy(true);
    try {
      await verifyPhoneOtp(phone.trim(), otp.trim());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid code");
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
    setOtpStep("phone");
    setOtp("");
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

        {supabaseEnabled && screen === "landing" ? (
          <View style={styles.form}>
            <Pressable
              style={[styles.primaryBtn, { backgroundColor: c.primary }]}
              onPress={() => router.push("/(auth)/signup")}
            >
              <Text style={styles.primaryBtnText}>Create new account</Text>
            </Pressable>
            <Pressable
              style={[styles.googleBtn, { borderColor: c.border, backgroundColor: c.card }]}
              onPress={() => {
                setScreen("login");
                setError(null);
                setNotice(null);
              }}
            >
              <Text style={{ color: c.foreground, fontFamily: "Inter_700Bold", fontSize: 16 }}>
                Login
              </Text>
            </Pressable>
            <Pressable
              onPress={() =>
                setNotice("Find my account is coming soon — it's still being built.")
              }
            >
              <Text style={[styles.switchText, { color: c.primary, marginTop: 4 }]}>
                Find my account
              </Text>
            </Pressable>
            {notice && (
              <Text style={{ color: c.mutedForeground, fontSize: 13, textAlign: "center" }}>
                {notice}
              </Text>
            )}

            <View style={styles.dividerRow}>
              <View style={[styles.divider, { backgroundColor: c.border }]} />
              <Text style={{ color: c.mutedForeground, fontSize: 12 }}>OR</Text>
              <View style={[styles.divider, { backgroundColor: c.border }]} />
            </View>

            <Pressable
              style={[styles.googleBtn, { borderColor: c.border, backgroundColor: c.card }]}
              onPress={submitGoogle}
              disabled={googleBusy}
            >
              {googleBusy ? (
                <ActivityIndicator color={c.foreground} />
              ) : (
                <>
                  <Ionicons name="logo-google" size={20} color="#ea4335" />
                  <Text style={{ color: c.foreground, fontFamily: "Inter_600SemiBold", fontSize: 15 }}>
                    Continue with Google
                  </Text>
                </>
              )}
            </Pressable>
            {error && (
              <Text style={{ color: c.destructive, fontSize: 13, textAlign: "center" }}>
                {error}
              </Text>
            )}
          </View>
        ) : supabaseEnabled ? (
          <View style={styles.form}>
            <View style={[styles.tabs, { backgroundColor: c.secondary }]}>
              <Tab label="Email" active={method === "email"} onPress={() => switchMethod("email")} />
              <Tab label="Phone" active={method === "phone"} onPress={() => switchMethod("phone")} />
            </View>

            {method === "email" ? (
              <>
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
                  onPress={submitEmail}
                  disabled={busy}
                >
                  {busy ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.primaryBtnText}>Log In</Text>
                  )}
                </Pressable>
              </>
            ) : (
              <>
                {otpStep === "phone" ? (
                  <>
                    <Field
                      icon="call-outline"
                      placeholder="Phone (e.g. +8801XXXXXXXXX)"
                      value={phone}
                      onChangeText={setPhone}
                      keyboardType="phone-pad"
                      autoCapitalize="none"
                    />
                    {error && <Text style={{ color: c.destructive, fontSize: 13 }}>{error}</Text>}
                    <Pressable
                      style={[styles.primaryBtn, { backgroundColor: c.primary }]}
                      onPress={submitSendOtp}
                      disabled={busy || phone.trim().length === 0}
                    >
                      {busy ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text style={styles.primaryBtnText}>Send Code</Text>
                      )}
                    </Pressable>
                  </>
                ) : (
                  <>
                    {notice && (
                      <Text style={{ color: c.mutedForeground, fontSize: 13 }}>{notice}</Text>
                    )}
                    <Field
                      icon="keypad-outline"
                      placeholder="Verification code"
                      value={otp}
                      onChangeText={setOtp}
                      keyboardType="number-pad"
                      autoCapitalize="none"
                    />
                    {error && <Text style={{ color: c.destructive, fontSize: 13 }}>{error}</Text>}
                    <Pressable
                      style={[styles.primaryBtn, { backgroundColor: c.primary }]}
                      onPress={submitVerifyOtp}
                      disabled={busy || otp.trim().length === 0}
                    >
                      {busy ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text style={styles.primaryBtnText}>Verify & Log In</Text>
                      )}
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        setOtpStep("phone");
                        setOtp("");
                        setError(null);
                      }}
                    >
                      <Text style={[styles.switchText, { color: c.primary }]}>
                        Use a different number
                      </Text>
                    </Pressable>
                  </>
                )}
              </>
            )}

            <View style={styles.dividerRow}>
              <View style={[styles.divider, { backgroundColor: c.border }]} />
              <Text style={{ color: c.mutedForeground, fontSize: 12 }}>OR</Text>
              <View style={[styles.divider, { backgroundColor: c.border }]} />
            </View>

            <Pressable
              style={[styles.googleBtn, { borderColor: c.border, backgroundColor: c.card }]}
              onPress={submitGoogle}
              disabled={googleBusy}
            >
              {googleBusy ? (
                <ActivityIndicator color={c.foreground} />
              ) : (
                <>
                  <Ionicons name="logo-google" size={20} color="#ea4335" />
                  <Text style={{ color: c.foreground, fontFamily: "Inter_600SemiBold", fontSize: 15 }}>
                    Continue with Google
                  </Text>
                </>
              )}
            </Pressable>

            <Pressable
              onPress={() => {
                setScreen("landing");
                setError(null);
                setNotice(null);
              }}
            >
              <Text style={[styles.switchText, { color: c.primary }]}>← Back</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.devSection}>
            <Text style={[styles.devTitle, { color: c.foreground }]}>
              Choose a demo account
            </Text>
            <Text style={{ color: c.mutedForeground, fontSize: 13, marginBottom: 12 }}>
              Connect Supabase later for real email, Google & phone login.
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
    <Pressable
      style={[styles.tab, active && { backgroundColor: c.card }]}
      onPress={onPress}
    >
      <Text
        style={{
          color: active ? c.primary : c.mutedForeground,
          fontFamily: active ? "Inter_700Bold" : "Inter_500Medium",
          fontSize: 14,
        }}
      >
        {label}
      </Text>
    </Pressable>
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
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 13,
  },
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
