import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { findAccount, type FindAccountResult } from "@workspace/api-client-react";
import { Avatar } from "@/components/Avatar";
import { useAuth } from "@/lib/auth";
import { useColors } from "@/hooks/useColors";
import { isPhoneLike, normalizePhone } from "@/lib/phone";

type Step = "identifier" | "result" | "otp" | "password" | "done";

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "Something went wrong. Please try again.";
}

export function AccountRecovery({
  mode,
  onClose,
}: {
  mode: "forgot" | "find";
  onClose: () => void;
}) {
  const c = useColors();
  const {
    setWizardActive,
    sendResetEmailOtp,
    sendResetPhoneOtp,
    verifyEmailOtp,
    verifyPhoneOtpNoSync,
    setPassword: applyPassword,
    refreshUser,
  } = useAuth();

  const [step, setStep] = useState<Step>("identifier");
  const [identifier, setIdentifier] = useState("");
  const [account, setAccount] = useState<FindAccountResult | null>(null);
  const [otp, setOtp] = useState("");
  const [password, setPasswordValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const sessionCreated = useRef(false);
  const completed = useRef(false);

  // Suppress the auth provider's auto-login redirect while the flow is open so
  // the user can finish setting a new password before entering the app.
  useEffect(() => {
    setWizardActive(true);
    return () => {
      setWizardActive(false);
      // OTP verified = the user proved they own this existing account; if they
      // abandon before setting a password, just complete the login.
      if (sessionCreated.current && !completed.current) {
        void refreshUser().catch(() => {});
      }
    };
  }, [setWizardActive, refreshUser]);

  const usePhone = isPhoneLike(identifier);
  const contact = usePhone ? normalizePhone(identifier) : identifier.trim();

  async function sendOtp() {
    if (usePhone) {
      await sendResetPhoneOtp(contact);
    } else {
      await sendResetEmailOtp(contact);
    }
  }

  const handleIdentifierNext = async () => {
    setError(null);
    setBusy(true);
    try {
      if (mode === "find") {
        const result = await findAccount({ identifier: identifier.trim() });
        if (!result.found) {
          setError(
            "No account matches that email or phone number. Check for typos and try again.",
          );
          return;
        }
        setAccount(result);
        setStep("result");
        return;
      }
      await sendOtp();
      setStep("otp");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const handleStartReset = async () => {
    setError(null);
    setBusy(true);
    try {
      await sendOtp();
      setStep("otp");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const handleVerifyOtp = async () => {
    setError(null);
    setBusy(true);
    try {
      if (usePhone) {
        await verifyPhoneOtpNoSync(contact, otp.trim());
      } else {
        await verifyEmailOtp(contact, otp.trim());
      }
      sessionCreated.current = true;
      setStep("password");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const handleSetPassword = async () => {
    setError(null);
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setBusy(true);
    try {
      await applyPassword(password);
      setStep("done");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const handleFinish = async () => {
    completed.current = true;
    setWizardActive(false);
    await refreshUser().catch(() => {});
    onClose();
  };

  const goBack = () => {
    setError(null);
    if (step === "otp") {
      setOtp("");
      setStep(mode === "find" ? "result" : "identifier");
    } else if (step === "result") {
      setAccount(null);
      setStep("identifier");
    } else {
      onClose();
    }
  };

  const title = mode === "find" ? "Find my account" : "Reset your password";

  return (
    <View style={styles.container}>
      {step !== "done" && step !== "password" && (
        <Pressable onPress={goBack} style={styles.backRow}>
          <Ionicons name="chevron-back" size={22} color={c.primary} />
          <Text style={{ color: c.primary, fontFamily: "Inter_600SemiBold", fontSize: 15 }}>
            Back
          </Text>
        </Pressable>
      )}

      {step === "identifier" && (
        <View style={styles.section}>
          <Text style={[styles.title, { color: c.foreground }]}>{title}</Text>
          <Text style={{ color: c.mutedForeground, fontSize: 14 }}>
            {mode === "find"
              ? "Enter the email address or mobile number linked to your account."
              : "Enter your email address or mobile number and we'll send you a verification code."}
          </Text>
          <View style={[styles.field, { backgroundColor: c.card, borderColor: c.border }]}>
            <Ionicons name="person-circle-outline" size={20} color={c.mutedForeground} />
            <TextInput
              style={{ flex: 1, color: c.foreground, fontSize: 16 }}
              placeholder="Email address or mobile number"
              placeholderTextColor={c.mutedForeground}
              underlineColorAndroid="transparent"
              value={identifier}
              onChangeText={setIdentifier}
              autoCapitalize="none"
              keyboardType="email-address"
              onFocus={() => setFocusedField("identifier")}
              onBlur={() => setFocusedField(null)}
            />
          </View>
          {usePhone && (
            <Text style={{ color: c.mutedForeground, fontSize: 12 }}>
              We'll use {normalizePhone(identifier)} — include your country code if that looks
              wrong.
            </Text>
          )}
          {error && <Text style={{ color: c.destructive, fontSize: 13 }}>{error}</Text>}
          <Pressable
            style={[styles.primaryBtn, { backgroundColor: c.primary }]}
            onPress={handleIdentifierNext}
            disabled={busy || identifier.trim().length < 3}
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>
                {mode === "find" ? "Search" : "Send Code"}
              </Text>
            )}
          </Pressable>
        </View>
      )}

      {step === "result" && account && (
        <View style={styles.section}>
          <Text style={[styles.title, { color: c.foreground }]}>We found your account</Text>
          <Text style={{ color: c.mutedForeground, fontSize: 14 }}>
            Is this you? You can reset the password to get back in.
          </Text>
          <View style={[styles.accountCard, { backgroundColor: c.card, borderColor: c.border }]}>
            <Avatar uri={account.avatarUrl ?? undefined} name={account.displayName ?? "?"} size={52} />
            <View style={{ flex: 1 }}>
              <Text
                style={{ color: c.foreground, fontFamily: "Inter_700Bold", fontSize: 16 }}
                numberOfLines={1}
              >
                {account.displayName}
              </Text>
              <Text style={{ color: c.mutedForeground, fontSize: 13 }} numberOfLines={1}>
                {account.maskedEmail ?? account.maskedPhone}
              </Text>
            </View>
          </View>
          {error && <Text style={{ color: c.destructive, fontSize: 13 }}>{error}</Text>}
          <Pressable
            style={[styles.primaryBtn, { backgroundColor: c.primary }]}
            onPress={handleStartReset}
            disabled={busy}
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>Reset password</Text>
            )}
          </Pressable>
          <Pressable onPress={goBack}>
            <Text style={[styles.linkText, { color: c.primary }]}>Not you? Search again</Text>
          </Pressable>
        </View>
      )}

      {step === "otp" && (
        <View style={styles.section}>
          <Text style={[styles.title, { color: c.foreground }]}>Enter the code</Text>
          <Text style={{ color: c.mutedForeground, fontSize: 14 }}>
            We sent a verification code to {usePhone ? contact : identifier.trim()}.
          </Text>
          <View style={[styles.field, { backgroundColor: c.card, borderColor: c.border }]}>
            <Ionicons name="keypad-outline" size={20} color={c.mutedForeground} />
            <TextInput
              style={{ flex: 1, color: c.foreground, fontSize: 16 }}
              placeholder="Verification code"
              placeholderTextColor={c.mutedForeground}
              underlineColorAndroid="transparent"
              value={otp}
              onChangeText={setOtp}
              keyboardType="number-pad"
              autoCapitalize="none"
              onFocus={() => setFocusedField("otp")}
              onBlur={() => setFocusedField(null)}
            />
          </View>
          {error && <Text style={{ color: c.destructive, fontSize: 13 }}>{error}</Text>}
          <Pressable
            style={[styles.primaryBtn, { backgroundColor: c.primary }]}
            onPress={handleVerifyOtp}
            disabled={busy || otp.trim().length === 0}
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>Verify</Text>
            )}
          </Pressable>
          <Pressable
            disabled={busy}
            onPress={async () => {
              setError(null);
              setBusy(true);
              try {
                await sendOtp();
              } catch (err) {
                setError(getErrorMessage(err));
              } finally {
                setBusy(false);
              }
            }}
          >
            <Text style={[styles.linkText, { color: c.primary }]}>Resend code</Text>
          </Pressable>
        </View>
      )}

      {step === "password" && (
        <View style={styles.section}>
          <Text style={[styles.title, { color: c.foreground }]}>Set a new password</Text>
          <Text style={{ color: c.mutedForeground, fontSize: 14 }}>
            You're verified. Choose a new password (at least 8 characters).
          </Text>
          <View style={[styles.field, { backgroundColor: c.card, borderColor: c.border }]}>
            <Ionicons name="lock-closed-outline" size={20} color={c.mutedForeground} />
            <TextInput
              style={{ flex: 1, color: c.foreground, fontSize: 16 }}
              placeholder="New password"
              placeholderTextColor={c.mutedForeground}
              underlineColorAndroid="transparent"
              value={password}
              onChangeText={setPasswordValue}
              secureTextEntry
              onFocus={() => setFocusedField("password")}
              onBlur={() => setFocusedField(null)}
            />
          </View>
          {error && <Text style={{ color: c.destructive, fontSize: 13 }}>{error}</Text>}
          <Pressable
            style={[styles.primaryBtn, { backgroundColor: c.primary }]}
            onPress={handleSetPassword}
            disabled={busy || password.length === 0}
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>Save password</Text>
            )}
          </Pressable>
        </View>
      )}

      {step === "done" && (
        <View style={[styles.section, { alignItems: "center", paddingTop: 32 }]}>
          <View style={[styles.doneBadge, { backgroundColor: c.primary }]}>
            <Ionicons name="checkmark" size={40} color="#fff" />
          </View>
          <Text style={[styles.title, { color: c.foreground, textAlign: "center" }]}>
            Password updated!
          </Text>
          <Text style={{ color: c.mutedForeground, fontSize: 14, textAlign: "center" }}>
            You're all set — let's get you back in.
          </Text>
          <Pressable
            style={[styles.primaryBtn, { backgroundColor: c.primary, alignSelf: "stretch" }]}
            onPress={handleFinish}
          >
            <Text style={styles.primaryBtnText}>Continue to HiMewo</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginBottom: 8,
    alignSelf: "flex-start",
  },
  section: { gap: 12 },
  title: { fontFamily: "Inter_700Bold", fontSize: 24 },
  field: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  accountCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  primaryBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
  },
  primaryBtnText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 16 },
  linkText: { textAlign: "center", fontFamily: "Inter_600SemiBold", marginTop: 4 },
  doneBadge: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
});
