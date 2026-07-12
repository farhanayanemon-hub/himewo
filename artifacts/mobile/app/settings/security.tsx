import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { Ionicons } from "@expo/vector-icons";
import { SettingsScreen, Section, Row } from "@/components/settings/SettingsUI";
import { useAuth, type TotpEnrollment } from "@/lib/auth";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useColors } from "@/hooks/useColors";

type PwStep = "idle" | "method" | "verify" | "newpass";
type MfaState = "loading" | "off" | "enrolling" | "on";

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : "Something went wrong";
}

export default function SecuritySettingsScreen() {
  const c = useColors();
  const {
    user,
    supabaseEnabled,
    sendResetEmailOtp,
    sendResetPhoneOtp,
    verifyEmailOtp,
    verifyPhoneOtpNoSync,
    setPassword: setAccountPassword,
    listTotpFactors,
    enrollTotp,
    verifyTotpEnrollment,
    unenrollTotp,
  } = useAuth();

  // ---------------- Change password (OTP-gated) ----------------
  const [pwStep, setPwStep] = useState<PwStep>("idle");
  const [contacts, setContacts] = useState<{ email: string | null; phone: string | null }>({
    email: null,
    phone: null,
  });
  const [method, setMethod] = useState<"email" | "phone">("email");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pwBusy, setPwBusy] = useState(false);

  const startPasswordChange = async () => {
    if (!isSupabaseConfigured || !supabase) {
      Alert.alert("Unavailable", "You can't change your password in this environment.");
      return;
    }
    setPwBusy(true);
    try {
      const { data } = await supabase.auth.getUser();
      const email = data.user?.email ?? null;
      const phone = data.user?.phone ? `+${data.user.phone.replace(/^\+/, "")}` : null;
      if (!email && !phone) {
        Alert.alert("Unavailable", "No email or phone number on this account.");
        return;
      }
      setContacts({ email, phone });
      setMethod(email ? "email" : "phone");
      setOtp("");
      setPassword("");
      setConfirm("");
      setPwStep("method");
    } catch (e) {
      Alert.alert("Error", errMsg(e));
    } finally {
      setPwBusy(false);
    }
  };

  const sendCode = async () => {
    setPwBusy(true);
    try {
      if (method === "email" && contacts.email) {
        await sendResetEmailOtp(contacts.email);
      } else if (method === "phone" && contacts.phone) {
        await sendResetPhoneOtp(contacts.phone);
      } else {
        Alert.alert("Error", "No contact method available.");
        return;
      }
      setPwStep("verify");
    } catch (e) {
      Alert.alert("Could not send code", errMsg(e));
    } finally {
      setPwBusy(false);
    }
  };

  const verifyCode = async () => {
    setPwBusy(true);
    try {
      if (method === "email" && contacts.email) {
        await verifyEmailOtp(contacts.email, otp.trim());
      } else if (contacts.phone) {
        await verifyPhoneOtpNoSync(contacts.phone, otp.trim());
      }
      setPwStep("newpass");
    } catch (e) {
      Alert.alert("Invalid code", errMsg(e));
    } finally {
      setPwBusy(false);
    }
  };

  const saveNewPassword = async () => {
    if (password.length < 6) {
      Alert.alert("Password too short", "Use at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      Alert.alert("Doesn't match", "Both passwords must be the same.");
      return;
    }
    setPwBusy(true);
    try {
      await setAccountPassword(password);
      Alert.alert("Done", "Your password has been changed.");
      setPwStep("idle");
      setOtp("");
      setPassword("");
      setConfirm("");
    } catch (e) {
      Alert.alert("Error", errMsg(e));
    } finally {
      setPwBusy(false);
    }
  };

  // ---------------- Two-factor authentication ----------------
  const [mfaState, setMfaState] = useState<MfaState>("loading");
  const [factorId, setFactorId] = useState<string | null>(null);
  const [enrollment, setEnrollment] = useState<TotpEnrollment | null>(null);
  const [enrollCode, setEnrollCode] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [showDisable, setShowDisable] = useState(false);
  const [mfaBusy, setMfaBusy] = useState(false);

  const loadFactors = useCallback(async () => {
    if (!supabaseEnabled) {
      setMfaState("off");
      return;
    }
    try {
      const factors = await listTotpFactors();
      const verified = factors.find((f) => f.status === "verified");
      if (verified) {
        setFactorId(verified.id);
        setMfaState("on");
      } else {
        setFactorId(null);
        setMfaState("off");
      }
    } catch {
      setMfaState("off");
    }
  }, [supabaseEnabled, listTotpFactors]);

  useEffect(() => {
    void loadFactors();
  }, [loadFactors]);

  const startEnroll = async () => {
    setMfaBusy(true);
    try {
      const data = await enrollTotp();
      setEnrollment(data);
      setEnrollCode("");
      setMfaState("enrolling");
    } catch (e) {
      Alert.alert("Error", errMsg(e));
    } finally {
      setMfaBusy(false);
    }
  };

  const confirmEnroll = async () => {
    if (!enrollment) return;
    setMfaBusy(true);
    try {
      await verifyTotpEnrollment(enrollment.factorId, enrollCode.trim());
      Alert.alert("Done", "Two-factor authentication is on.");
      setEnrollment(null);
      setEnrollCode("");
      await loadFactors();
    } catch (e) {
      Alert.alert("Invalid code", errMsg(e));
    } finally {
      setMfaBusy(false);
    }
  };

  const disableMfa = async () => {
    if (!factorId) return;
    setMfaBusy(true);
    try {
      await unenrollTotp(factorId, disableCode.trim());
      Alert.alert("Done", "Two-factor authentication is off.");
      setShowDisable(false);
      setDisableCode("");
      await loadFactors();
    } catch (e) {
      Alert.alert("Invalid code", errMsg(e));
    } finally {
      setMfaBusy(false);
    }
  };

  const copySecret = async () => {
    if (!enrollment) return;
    await Clipboard.setStringAsync(enrollment.secret);
    Alert.alert("Copied", "Setup key copied to clipboard.");
  };

  const openAuthenticator = async () => {
    if (!enrollment) return;
    try {
      await Linking.openURL(enrollment.uri);
    } catch {
      Alert.alert(
        "No authenticator app",
        "Install an authenticator app (Google Authenticator, Authy…) and add the setup key manually.",
      );
    }
  };

  const labelStyle = {
    color: c.mutedForeground,
    fontFamily: "Inter_500Medium" as const,
    fontSize: 12,
    marginBottom: 4,
  };
  const inputStyle = {
    color: c.foreground,
    fontFamily: "Inter_400Regular" as const,
    fontSize: 15,
    paddingVertical: 6,
  };
  const bodyText = {
    color: c.mutedForeground,
    fontFamily: "Inter_400Regular" as const,
    fontSize: 13,
    lineHeight: 19,
  };

  const PrimaryButton = ({
    label,
    onPress,
    busy,
    disabled,
    destructive,
  }: {
    label: string;
    onPress: () => void;
    busy?: boolean;
    disabled?: boolean;
    destructive?: boolean;
  }) => (
    <Pressable
      onPress={onPress}
      disabled={busy || disabled}
      style={{
        backgroundColor: destructive ? c.destructive : c.primary,
        borderRadius: 12,
        paddingVertical: 13,
        alignItems: "center",
        opacity: busy || disabled ? 0.6 : 1,
      }}
    >
      {busy ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={{ color: "#fff", fontFamily: "Inter_700Bold", fontSize: 15 }}>
          {label}
        </Text>
      )}
    </Pressable>
  );

  const GhostButton = ({ label, onPress }: { label: string; onPress: () => void }) => (
    <Pressable onPress={onPress} style={{ paddingVertical: 10, alignItems: "center" }}>
      <Text style={{ color: c.primary, fontFamily: "Inter_600SemiBold", fontSize: 14 }}>
        {label}
      </Text>
    </Pressable>
  );

  return (
    <SettingsScreen title="Password & security">
      <Section title="Login info">
        <Row
          title="Email"
          right={
            <Text style={{ color: c.mutedForeground, fontFamily: "Inter_400Regular" }}>
              {user?.email ?? "—"}
            </Text>
          }
        />
        <Row
          title="Username"
          last
          right={
            <Text style={{ color: c.mutedForeground, fontFamily: "Inter_400Regular" }}>
              @{user?.username ?? "—"}
            </Text>
          }
        />
      </Section>

      <Section title="Change password">
        <View style={{ paddingHorizontal: 14, paddingVertical: 12, gap: 12 }}>
          {pwStep === "idle" && (
            <>
              <Text style={bodyText}>
                To keep your account safe, changing your password requires a
                verification code sent to your email or phone.
              </Text>
              <PrimaryButton label="Change password" onPress={startPasswordChange} busy={pwBusy} />
            </>
          )}

          {pwStep === "method" && (
            <>
              <Text style={bodyText}>Where should we send your verification code?</Text>
              {contacts.email && (
                <Pressable
                  onPress={() => setMethod("email")}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                    borderWidth: 1,
                    borderColor: method === "email" ? c.primary : c.border,
                    borderRadius: 12,
                    padding: 12,
                  }}
                >
                  <Ionicons
                    name={method === "email" ? "radio-button-on" : "radio-button-off"}
                    size={20}
                    color={method === "email" ? c.primary : c.mutedForeground}
                  />
                  <Text style={{ color: c.foreground, fontFamily: "Inter_500Medium", fontSize: 14 }}>
                    Email — {contacts.email}
                  </Text>
                </Pressable>
              )}
              {contacts.phone && (
                <Pressable
                  onPress={() => setMethod("phone")}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                    borderWidth: 1,
                    borderColor: method === "phone" ? c.primary : c.border,
                    borderRadius: 12,
                    padding: 12,
                  }}
                >
                  <Ionicons
                    name={method === "phone" ? "radio-button-on" : "radio-button-off"}
                    size={20}
                    color={method === "phone" ? c.primary : c.mutedForeground}
                  />
                  <Text style={{ color: c.foreground, fontFamily: "Inter_500Medium", fontSize: 14 }}>
                    Phone — {contacts.phone}
                  </Text>
                </Pressable>
              )}
              <PrimaryButton label="Send code" onPress={sendCode} busy={pwBusy} />
              <GhostButton label="Cancel" onPress={() => setPwStep("idle")} />
            </>
          )}

          {pwStep === "verify" && (
            <>
              <Text style={bodyText}>
                Enter the 6-digit code we sent to{" "}
                {method === "email" ? contacts.email : contacts.phone}.
              </Text>
              <View>
                <Text style={labelStyle}>Verification code</Text>
                <TextInput
                  value={otp}
                  onChangeText={setOtp}
                  placeholder="6-digit code"
                  placeholderTextColor={c.mutedForeground}
                  keyboardType="number-pad"
                  autoCapitalize="none"
                  style={inputStyle}
                />
              </View>
              <PrimaryButton
                label="Verify"
                onPress={verifyCode}
                busy={pwBusy}
                disabled={otp.trim().length === 0}
              />
              <GhostButton label="Back" onPress={() => setPwStep("method")} />
            </>
          )}

          {pwStep === "newpass" && (
            <>
              <View>
                <Text style={labelStyle}>New password</Text>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="At least 6 characters"
                  placeholderTextColor={c.mutedForeground}
                  secureTextEntry
                  style={inputStyle}
                />
              </View>
              <View style={{ borderTopColor: c.border, borderTopWidth: 0.5, paddingTop: 12 }}>
                <Text style={labelStyle}>Re-enter password</Text>
                <TextInput
                  value={confirm}
                  onChangeText={setConfirm}
                  placeholder="Same password"
                  placeholderTextColor={c.mutedForeground}
                  secureTextEntry
                  style={inputStyle}
                />
              </View>
              <PrimaryButton label="Save new password" onPress={saveNewPassword} busy={pwBusy} />
            </>
          )}
        </View>
      </Section>

      <Section title="Two-factor authentication">
        <View style={{ paddingHorizontal: 14, paddingVertical: 12, gap: 12 }}>
          {!supabaseEnabled ? (
            <Text style={bodyText}>
              Two-factor authentication isn't available in this environment.
            </Text>
          ) : mfaState === "loading" ? (
            <ActivityIndicator color={c.primary} />
          ) : mfaState === "on" ? (
            <>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Ionicons name="shield-checkmark" size={20} color="#22c55e" />
                <Text style={{ color: "#22c55e", fontFamily: "Inter_600SemiBold", fontSize: 14 }}>
                  Two-factor authentication is on
                </Text>
              </View>
              <Text style={bodyText}>
                When you log in, you'll be asked for a 6-digit code from your
                authenticator app after entering your password. Keep your setup
                key or authenticator backup safe — if you lose access to the
                app, you won't be able to log in.
              </Text>
              {!showDisable ? (
                <GhostButton
                  label="Turn off two-factor authentication"
                  onPress={() => setShowDisable(true)}
                />
              ) : (
                <>
                  <View>
                    <Text style={labelStyle}>
                      Enter a current code from your authenticator app
                    </Text>
                    <TextInput
                      value={disableCode}
                      onChangeText={setDisableCode}
                      placeholder="6-digit code"
                      placeholderTextColor={c.mutedForeground}
                      keyboardType="number-pad"
                      autoCapitalize="none"
                      style={inputStyle}
                    />
                  </View>
                  <PrimaryButton
                    label="Turn off"
                    onPress={disableMfa}
                    busy={mfaBusy}
                    disabled={disableCode.trim().length === 0}
                    destructive
                  />
                  <GhostButton
                    label="Cancel"
                    onPress={() => {
                      setShowDisable(false);
                      setDisableCode("");
                    }}
                  />
                </>
              )}
            </>
          ) : mfaState === "enrolling" && enrollment ? (
            <>
              <Text style={bodyText}>
                Add this account to an authenticator app (Google Authenticator,
                Authy, 1Password…) with the setup key below, then enter the
                6-digit code the app shows.
              </Text>
              <View>
                <Text style={labelStyle}>Setup key</Text>
                <Text
                  selectable
                  style={{
                    color: c.foreground,
                    fontFamily: "Inter_600SemiBold",
                    fontSize: 14,
                  }}
                >
                  {enrollment.secret}
                </Text>
              </View>
              <View style={{ flexDirection: "row", gap: 10 }}>
                <Pressable
                  onPress={copySecret}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    borderWidth: 1,
                    borderColor: c.border,
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                  }}
                >
                  <Ionicons name="copy-outline" size={16} color={c.primary} />
                  <Text style={{ color: c.primary, fontFamily: "Inter_600SemiBold", fontSize: 13 }}>
                    Copy key
                  </Text>
                </Pressable>
                <Pressable
                  onPress={openAuthenticator}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    borderWidth: 1,
                    borderColor: c.border,
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                  }}
                >
                  <Ionicons name="open-outline" size={16} color={c.primary} />
                  <Text style={{ color: c.primary, fontFamily: "Inter_600SemiBold", fontSize: 13 }}>
                    Open authenticator
                  </Text>
                </Pressable>
              </View>
              <Text style={bodyText}>
                Save the setup key somewhere safe — it's the only way to restore
                your authenticator if you switch phones.
              </Text>
              <View>
                <Text style={labelStyle}>Code from the app</Text>
                <TextInput
                  value={enrollCode}
                  onChangeText={setEnrollCode}
                  placeholder="6-digit code"
                  placeholderTextColor={c.mutedForeground}
                  keyboardType="number-pad"
                  autoCapitalize="none"
                  style={inputStyle}
                />
              </View>
              <PrimaryButton
                label="Verify & turn on"
                onPress={confirmEnroll}
                busy={mfaBusy}
                disabled={enrollCode.trim().length === 0}
              />
              <GhostButton
                label="Cancel"
                onPress={() => {
                  setEnrollment(null);
                  setMfaState("off");
                }}
              />
            </>
          ) : (
            <>
              <Text style={bodyText}>
                Add an extra layer of security: after entering your password,
                you'll also need a 6-digit code from an authenticator app on
                your phone.
              </Text>
              <PrimaryButton
                label="Enable two-factor authentication"
                onPress={startEnroll}
                busy={mfaBusy}
              />
            </>
          )}
        </View>
      </Section>
    </SettingsScreen>
  );
}
