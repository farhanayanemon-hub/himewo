import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Image,
  Modal,
  Platform,
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
import { detectCountry, validateName } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { getApiOrigin } from "@/lib/api";
import { useColors } from "@/hooks/useColors";
import {
  COUNTRIES,
  DEFAULT_COUNTRY,
  countryFlagUrl,
  findCountry,
  type Country,
} from "@/constants/countries";

// Flag as an image — emoji flags do not render on Android.
function CountryFlag({ code, size = 20 }: { code: string; size?: number }) {
  return (
    <Image
      source={{ uri: countryFlagUrl(code) }}
      style={{ width: size, height: Math.round(size * 0.72), borderRadius: 2 }}
      resizeMode="cover"
    />
  );
}

type Step =
  | "name"
  | "dob"
  | "gender"
  | "phone"
  | "email"
  | "otp"
  | "password"
  | "done";

const TOTAL_STEPS = 6;

function stepProgress(step: Step): number {
  switch (step) {
    case "name":
      return 1;
    case "dob":
      return 2;
    case "gender":
      return 3;
    case "phone":
    case "email":
      return 4;
    case "otp":
      return 5;
    case "password":
      return 6;
    case "done":
      return 6;
  }
}

function computeAge(dob: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) return null;
  const d = new Date(dob + "T00:00:00");
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export default function SignupScreen() {
  const c = useColors();
  const {
    setWizardActive,
    sendEmailOtp,
    verifyEmailOtp,
    sendPhoneOtp,
    verifyPhoneOtpNoSync,
    setPassword: applyPassword,
    completeWizardSignup,
    refreshUser,
    signOut,
  } = useAuth();

  const [step, setStep] = useState<Step>("name");
  const historyRef = useRef<Step[]>([]);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [day, setDay] = useState("");
  const [month, setMonth] = useState(""); // 1-12
  const [year, setYear] = useState("");
  const [gender, setGender] = useState<"male" | "female" | null>(null);
  const [country, setCountry] = useState<Country>(DEFAULT_COUNTRY);
  const [detected, setDetected] = useState<Country | null>(null);
  const [blocked, setBlocked] = useState<Set<string>>(new Set());
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerQuery, setPickerQuery] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [contactMethod, setContactMethod] = useState<"phone" | "email">("phone");
  const [otp, setOtp] = useState("");
  const [password, setPasswordValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Track whether the wizard created a Supabase session (OTP verified) and
  // whether signup fully completed, so an abandoned wizard doesn't leave a
  // half-created session with no profile behind.
  const sessionCreated = useRef(false);
  const completed = useRef(false);

  const slide = useRef(new Animated.Value(0)).current;
  const celebrate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setWizardActive(true);
    return () => {
      setWizardActive(false);
      if (sessionCreated.current && !completed.current) {
        void signOut().catch(() => {});
      }
    };
  }, [setWizardActive, signOut]);

  useEffect(() => {
    let cancelled = false;
    detectCountry()
      .then((geo) => {
        if (cancelled) return;
        const found = findCountry(geo.countryCode);
        if (found) {
          setDetected(found);
          setCountry(found);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch blocked countries so they never appear in the picker.
  useEffect(() => {
    let cancelled = false;
    const origin = getApiOrigin() ?? "";
    fetch(`${origin}/api/auth/signup-config`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { blockedCountries?: unknown } | null) => {
        if (cancelled || !d || !Array.isArray(d.blockedCountries)) return;
        setBlocked(
          new Set(
            d.blockedCountries
              .filter((co): co is string => typeof co === "string")
              .map((co) => co.toUpperCase()),
          ),
        );
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // If the selected country becomes blocked, fall back to the first allowed one.
  useEffect(() => {
    if (blocked.size && blocked.has(country.code)) {
      const firstAllowed = COUNTRIES.find((co) => !blocked.has(co.code));
      if (firstAllowed) setCountry(firstAllowed);
    }
  }, [blocked, country.code]);

  useEffect(() => {
    slide.setValue(24);
    Animated.timing(slide, {
      toValue: 0,
      duration: 240,
      useNativeDriver: Platform.OS !== "web",
    }).start();
    if (step === "done") {
      celebrate.setValue(0);
      Animated.spring(celebrate, {
        toValue: 1,
        friction: 4,
        useNativeDriver: Platform.OS !== "web",
      }).start();
    }
  }, [step, slide, celebrate]);

  const dob = useMemo(() => {
    const y = year.padStart(4, "0");
    const m = month.padStart(2, "0");
    const d = day.padStart(2, "0");
    if (year.length !== 4 || !month || !day) return "";
    return `${y}-${m}-${d}`;
  }, [year, month, day]);

  const age = computeAge(dob);
  const dobValid = age !== null && age >= 13 && age <= 120;
  const nameValid = firstName.trim().length >= 2 && lastName.trim().length >= 1;

  const fullPhone = phone.trim().startsWith("+")
    ? phone.trim()
    : `${country.dialCode}${phone.trim().replace(/^0+/, "")}`;

  const filteredCountries = useMemo(() => {
    const base =
      blocked.size > 0
        ? COUNTRIES.filter((co) => !blocked.has(co.code))
        : COUNTRIES;
    const q = pickerQuery.trim().toLowerCase();
    if (!q) return base;
    return base.filter(
      (co) =>
        co.name.toLowerCase().includes(q) ||
        co.dialCode.includes(q) ||
        co.code.toLowerCase() === q,
    );
  }, [pickerQuery, blocked]);

  function goTo(next: Step) {
    historyRef.current.push(step);
    setStep(next);
    setError(null);
  }

  function goBack() {
    const prev = historyRef.current.pop();
    if (prev) {
      setStep(prev);
      setError(null);
    } else {
      router.back();
    }
  }

  const [firstNameError, setFirstNameError] = useState<string | null>(null);
  const [lastNameError, setLastNameError] = useState<string | null>(null);

  async function handleNameNext() {
    setError(null);
    setFirstNameError(null);
    setLastNameError(null);
    setBusy(true);
    try {
      const result = await validateName({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });
      if (result.valid) {
        goTo("dob");
      } else {
        setFirstNameError(result.firstNameError ?? null);
        setLastNameError(result.lastNameError ?? null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not check the name");
    } finally {
      setBusy(false);
    }
  }

  async function handleSendOtp(method: "phone" | "email") {
    setError(null);
    setBusy(true);
    try {
      if (method === "phone") {
        await sendPhoneOtp(fullPhone);
      } else {
        await sendEmailOtp(email.trim());
      }
      setContactMethod(method);
      goTo("otp");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send code");
    } finally {
      setBusy(false);
    }
  }

  async function handleVerifyOtp() {
    setError(null);
    setBusy(true);
    try {
      if (contactMethod === "phone") {
        await verifyPhoneOtpNoSync(fullPhone, otp.trim());
      } else {
        await verifyEmailOtp(email.trim(), otp.trim());
      }
      sessionCreated.current = true;
      goTo("password");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid code");
    } finally {
      setBusy(false);
    }
  }

  async function handleFinish() {
    setError(null);
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setBusy(true);
    try {
      await applyPassword(password);
      await completeWizardSignup({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        gender: gender!,
        birthday: dob,
        country: country.code,
        email: contactMethod === "email" ? email.trim() : undefined,
        phone: contactMethod === "phone" ? fullPhone : undefined,
      });
      completed.current = true;
      goTo("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  const progress = stepProgress(step) / TOTAL_STEPS;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }}>
      {/* Header */}
      <View style={styles.header}>
        {step !== "done" && (
          <Pressable onPress={goBack} hitSlop={10} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={26} color={c.foreground} />
          </Pressable>
        )}
        <Text style={[styles.brand, { color: c.primary }]}>HiMewo</Text>
        <View style={{ width: 34 }} />
      </View>
      {step !== "done" && (
        <View style={[styles.progressTrack, { backgroundColor: c.secondary }]}>
          <View
            style={[
              styles.progressFill,
              { backgroundColor: c.primary, width: `${progress * 100}%` },
            ]}
          />
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View style={{ transform: [{ translateY: slide }], gap: 14 }}>
          {step === "name" && (
            <>
              <Title c={c} title="What's your name?" subtitle="Use the name you go by in everyday life." />
              <View style={{ flexDirection: "row", gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <WizInput
                    placeholder="First name"
                    value={firstName}
                    onChangeText={(t: string) => {
                      setFirstName(t);
                      setFirstNameError(null);
                    }}
                  />
                  {firstNameError && (
                    <Text style={{ color: c.destructive, fontSize: 12, marginTop: 4, fontFamily: "Inter_400Regular" }}>
                      {firstNameError}
                    </Text>
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <WizInput
                    placeholder="Last name"
                    value={lastName}
                    onChangeText={(t: string) => {
                      setLastName(t);
                      setLastNameError(null);
                    }}
                  />
                  {lastNameError && (
                    <Text style={{ color: c.destructive, fontSize: 12, marginTop: 4, fontFamily: "Inter_400Regular" }}>
                      {lastNameError}
                    </Text>
                  )}
                </View>
              </View>
              <Text
                style={{
                  color: c.mutedForeground,
                  fontSize: 12,
                  lineHeight: 17,
                  backgroundColor: c.secondary,
                  borderRadius: 10,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  fontFamily: "Inter_400Regular",
                }}
              >
                Make sure it's the name people call you in real life — fake or
                joke names aren't allowed on HiMewo.
              </Text>
              {error && (
                <Text style={{ color: c.destructive, fontSize: 13, fontFamily: "Inter_400Regular" }}>
                  {error}
                </Text>
              )}
              <PrimaryBtn
                label={busy ? "Checking…" : "Next"}
                disabled={!nameValid || busy}
                onPress={handleNameNext}
              />
            </>
          )}

          {step === "dob" && (
            <>
              <Title
                c={c}
                title="When's your birthday?"
                subtitle="Choose your date of birth. You can make this private later."
              />
              <View style={{ flexDirection: "row", gap: 10 }}>
                <WizInput
                  placeholder="Day"
                  value={day}
                  onChangeText={(t) => setDay(t.replace(/\D/g, "").slice(0, 2))}
                  keyboardType="number-pad"
                  style={{ flex: 1 }}
                />
                <MonthPicker c={c} value={month} onChange={setMonth} />
                <WizInput
                  placeholder="Year"
                  value={year}
                  onChangeText={(t) => setYear(t.replace(/\D/g, "").slice(0, 4))}
                  keyboardType="number-pad"
                  style={{ flex: 1 }}
                />
              </View>
              {age !== null && (
                <Text
                  style={{
                    color: dobValid ? c.primary : c.destructive,
                    fontFamily: "Inter_600SemiBold",
                    fontSize: 14,
                  }}
                >
                  {age} years old
                  {!dobValid && age < 13 ? " — you must be at least 13 to join" : ""}
                </Text>
              )}
              <PrimaryBtn label="Next" disabled={!dobValid} onPress={() => goTo("gender")} />
            </>
          )}

          {step === "gender" && (
            <>
              <Title c={c} title="What's your gender?" subtitle="You can change who sees this later." />
              <View style={{ flexDirection: "row", gap: 10 }}>
                {(["male", "female"] as const).map((g) => (
                  <Pressable
                    key={g}
                    onPress={() => setGender(g)}
                    style={[
                      styles.genderCard,
                      {
                        borderColor: gender === g ? c.primary : c.border,
                        backgroundColor: gender === g ? c.primary + "14" : c.card,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: gender === g ? c.primary : c.foreground,
                        fontFamily: "Inter_600SemiBold",
                        fontSize: 16,
                      }}
                    >
                      {g === "male" ? "Male" : "Female"}
                    </Text>
                    <Ionicons
                      name={gender === g ? "radio-button-on" : "radio-button-off"}
                      size={20}
                      color={gender === g ? c.primary : c.mutedForeground}
                    />
                  </Pressable>
                ))}
              </View>
              <PrimaryBtn label="Next" disabled={!gender} onPress={() => goTo("phone")} />
            </>
          )}

          {step === "phone" && (
            <>
              <Title
                c={c}
                title="What's your mobile number?"
                subtitle="We'll send you a code to confirm it's you."
              />
              <Pressable
                onPress={() => setPickerOpen(true)}
                style={[styles.countryBtn, { borderColor: c.border, backgroundColor: c.card }]}
              >
                <CountryFlag code={country.code} size={22} />
                <Text
                  style={{ flex: 1, color: c.foreground, fontSize: 15 }}
                  numberOfLines={1}
                >
                  {country.name}
                </Text>
                <Text style={{ color: c.mutedForeground, fontSize: 15 }}>
                  {country.dialCode}
                </Text>
                <Ionicons name="chevron-down" size={18} color={c.mutedForeground} />
              </Pressable>
              <View style={{ flexDirection: "row", gap: 10 }}>
                <View
                  style={[
                    styles.dialBox,
                    { borderColor: c.border, backgroundColor: c.secondary },
                  ]}
                >
                  <Text style={{ color: c.mutedForeground, fontSize: 15 }}>
                    {country.dialCode}
                  </Text>
                </View>
                <WizInput
                  placeholder="1XXX XXXXXX"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  style={{ flex: 1 }}
                />
              </View>
              {error && <ErrText c={c} text={error} />}
              <PrimaryBtn
                label={busy ? "" : "Next"}
                busy={busy}
                disabled={busy || phone.trim().length < 6}
                onPress={() => void handleSendOtp("phone")}
              />
              <View style={styles.dividerRow}>
                <View style={[styles.divider, { backgroundColor: c.border }]} />
                <Text style={{ color: c.mutedForeground, fontSize: 12 }}>OR</Text>
                <View style={[styles.divider, { backgroundColor: c.border }]} />
              </View>
              <Pressable
                onPress={() => goTo("email")}
                style={[styles.outlineBtn, { borderColor: c.border, backgroundColor: c.card }]}
              >
                <Ionicons name="mail-outline" size={18} color={c.foreground} />
                <Text style={{ color: c.foreground, fontFamily: "Inter_600SemiBold", fontSize: 15 }}>
                  Sign up with email address
                </Text>
              </Pressable>
            </>
          )}

          {step === "email" && (
            <>
              <Title
                c={c}
                title="What's your email address?"
                subtitle="We'll send you a code to confirm it's you."
              />
              <WizInput
                placeholder="Email address"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              {detected && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <CountryFlag code={detected.code} size={16} />
                  <Text style={{ color: c.mutedForeground, fontSize: 13 }}>
                    Detected country: {detected.name}
                  </Text>
                </View>
              )}
              {error && <ErrText c={c} text={error} />}
              <PrimaryBtn
                label={busy ? "" : "Next"}
                busy={busy}
                disabled={busy || !/^\S+@\S+\.\S+$/.test(email.trim())}
                onPress={() => void handleSendOtp("email")}
              />
            </>
          )}

          {step === "otp" && (
            <>
              <Title
                c={c}
                title="Enter the code"
                subtitle={`We sent a code to ${
                  contactMethod === "phone" ? fullPhone : email.trim()
                }.`}
              />
              <WizInput
                placeholder="123456"
                value={otp}
                onChangeText={setOtp}
                keyboardType="number-pad"
                autoCapitalize="none"
                style={{ textAlign: "center", letterSpacing: 8, fontSize: 20 }}
              />
              {error && <ErrText c={c} text={error} />}
              <PrimaryBtn
                label={busy ? "" : "Verify"}
                busy={busy}
                disabled={busy || otp.trim().length < 4}
                onPress={() => void handleVerifyOtp()}
              />
              <Pressable onPress={() => void handleSendOtp(contactMethod)} disabled={busy}>
                <Text style={{ color: c.primary, textAlign: "center", fontFamily: "Inter_600SemiBold" }}>
                  Resend code
                </Text>
              </Pressable>
            </>
          )}

          {step === "password" && (
            <>
              <Title
                c={c}
                title="Create a password"
                subtitle={`You'll use it to log in with your ${
                  contactMethod === "phone" ? "number" : "email"
                } later. At least 8 characters.`}
              />
              <WizInput
                placeholder="New password"
                value={password}
                onChangeText={setPasswordValue}
                secureTextEntry
              />
              {error && <ErrText c={c} text={error} />}
              <PrimaryBtn
                label={busy ? "" : "Finish signup"}
                busy={busy}
                disabled={busy || password.length < 8}
                onPress={() => void handleFinish()}
              />
            </>
          )}

          {step === "done" && (
            <View style={{ alignItems: "center", paddingVertical: 30, gap: 8 }}>
              <Animated.View
                style={{
                  transform: [{ scale: celebrate }],
                  width: 96,
                  height: 96,
                  borderRadius: 48,
                  backgroundColor: c.primary,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="checkmark" size={52} color="#fff" />
              </Animated.View>
              <Text style={{ fontSize: 26 }}>🎉 ✨ 💙 🎊</Text>
              <Text style={{ color: c.foreground, fontFamily: "Inter_700Bold", fontSize: 24 }}>
                You're all set!
              </Text>
              <Text style={{ color: c.mutedForeground, fontSize: 14, textAlign: "center" }}>
                Welcome to HiMewo. Your account is ready.
              </Text>
              <View style={{ height: 12 }} />
              <PrimaryBtn label="Go to HiMewo" onPress={() => void refreshUser()} />
            </View>
          )}
        </Animated.View>
      </ScrollView>

      {/* Country picker */}
      <Modal visible={pickerOpen} animationType="slide" onRequestClose={() => setPickerOpen(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: c.background }}>
          <View style={styles.header}>
            <Pressable onPress={() => setPickerOpen(false)} hitSlop={10} style={styles.backBtn}>
              <Ionicons name="close" size={26} color={c.foreground} />
            </Pressable>
            <Text style={{ color: c.foreground, fontFamily: "Inter_700Bold", fontSize: 17 }}>
              Select country
            </Text>
            <View style={{ width: 34 }} />
          </View>
          <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
            <WizInput
              placeholder="Search country…"
              value={pickerQuery}
              onChangeText={setPickerQuery}
              autoCapitalize="none"
            />
          </View>
          <FlatList
            data={filteredCountries}
            keyExtractor={(item) => item.code}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  setCountry(item);
                  setPickerOpen(false);
                  setPickerQuery("");
                }}
                style={[styles.countryRow, { borderBottomColor: c.border }]}
              >
                <CountryFlag code={item.code} size={22} />
                <Text style={{ flex: 1, color: c.foreground, fontSize: 15 }}>{item.name}</Text>
                <Text style={{ color: c.mutedForeground, fontSize: 15 }}>{item.dialCode}</Text>
              </Pressable>
            )}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function Title({
  c,
  title,
  subtitle,
}: {
  c: ReturnType<typeof useColors>;
  title: string;
  subtitle: string;
}) {
  return (
    <View style={{ gap: 4 }}>
      <Text style={{ color: c.foreground, fontFamily: "Inter_700Bold", fontSize: 24 }}>
        {title}
      </Text>
      <Text style={{ color: c.mutedForeground, fontSize: 14 }}>{subtitle}</Text>
    </View>
  );
}

function ErrText({ c, text }: { c: ReturnType<typeof useColors>; text: string }) {
  return <Text style={{ color: c.destructive, fontSize: 13 }}>{text}</Text>;
}

function WizInput(props: React.ComponentProps<typeof TextInput>) {
  const c = useColors();
  const { style, ...rest } = props;
  return (
    <TextInput
      placeholderTextColor={c.mutedForeground}
      {...rest}
      style={[
        styles.input,
        { borderColor: c.border, backgroundColor: c.card, color: c.foreground },
        style,
      ]}
    />
  );
}

function PrimaryBtn({
  label,
  onPress,
  disabled,
  busy,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  busy?: boolean;
}) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.primaryBtn,
        { backgroundColor: c.primary, opacity: disabled && !busy ? 0.5 : 1 },
      ]}
    >
      {busy ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={{ color: "#fff", fontFamily: "Inter_700Bold", fontSize: 16 }}>{label}</Text>
      )}
    </Pressable>
  );
}

function MonthPicker({
  c,
  value,
  onChange,
}: {
  c: ReturnType<typeof useColors>;
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const label = value ? MONTHS[Number(value) - 1] : "Month";
  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={[
          styles.input,
          {
            borderColor: c.border,
            backgroundColor: c.card,
            flex: 1.4,
            justifyContent: "center",
          },
        ]}
      >
        <Text style={{ color: value ? c.foreground : c.mutedForeground, fontSize: 15 }}>
          {label}
        </Text>
      </Pressable>
      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 30 }}
          onPress={() => setOpen(false)}
        >
          <View style={{ backgroundColor: c.card, borderRadius: 14, overflow: "hidden" }}>
            <ScrollView style={{ maxHeight: 380 }}>
              {MONTHS.map((m, i) => (
                <Pressable
                  key={m}
                  onPress={() => {
                    onChange(String(i + 1));
                    setOpen(false);
                  }}
                  style={{ paddingVertical: 13, paddingHorizontal: 18 }}
                >
                  <Text
                    style={{
                      color: String(i + 1) === value ? c.primary : c.foreground,
                      fontFamily:
                        String(i + 1) === value ? "Inter_700Bold" : "Inter_500Medium",
                      fontSize: 16,
                    }}
                  >
                    {m}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  backBtn: { width: 34, alignItems: "flex-start" },
  brand: { fontFamily: "Inter_700Bold", fontSize: 20 },
  progressTrack: {
    height: 5,
    borderRadius: 3,
    marginHorizontal: 16,
    overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: 3 },
  body: { padding: 20, paddingTop: 26 },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
  },
  genderCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 15,
  },
  countryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  dialBox: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    justifyContent: "center",
  },
  primaryBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    alignSelf: "stretch",
    minWidth: 200,
  },
  outlineBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 13,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginVertical: 2,
  },
  divider: { flex: 1, height: StyleSheet.hairlineWidth },
  countryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
