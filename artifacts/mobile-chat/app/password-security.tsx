import { Touchable } from "@/components/Touchable";
import { fs } from "@/constants/typography";
import { shadow, glow } from "@/constants/shadows";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TextInput,
  View,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/lib/auth";
import { useColors } from "@/hooks/useColors";
import { supabase } from "@/lib/supabase";

export default function PasswordSecurityScreen() {
  const c = useColors();
  const { supabaseEnabled } = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  const onSave = async () => {
    if (password.length < 6) {
      Alert.alert("Password too short", "Use at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      Alert.alert("Passwords don't match", "Please re-enter the same password.");
      return;
    }
    if (!supabase) return;
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setPassword("");
      setConfirm("");
      Alert.alert("Password updated", "Your password has been changed.");
    } catch (err) {
      Alert.alert("Couldn't update password", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }}>
      <View style={[styles.header, { backgroundColor: c.card }, shadow("sm")]}>
        <Touchable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={c.foreground} />
        </Touchable>
        <Text style={{ color: c.foreground, fontFamily: "Inter_700Bold", fontSize: fs(18) }}>
          Password and security
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.iconHero}>
          <View style={[styles.heroCircle, { backgroundColor: c.secondary }]}>
            <Ionicons name="lock-closed" size={32} color={c.primary} />
          </View>
        </View>

        {supabaseEnabled ? (
          <>
            <Text style={[styles.sectionTitle, { color: c.mutedForeground }]}>CHANGE PASSWORD</Text>
            <View style={[styles.card, { backgroundColor: c.card }, shadow("md")]}>
              <View style={[styles.field, { borderBottomColor: c.border, borderBottomWidth: StyleSheet.hairlineWidth }]}>
                <Text style={[styles.label, { color: c.mutedForeground }]}>New password</Text>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="At least 6 characters"
                  placeholderTextColor={c.mutedForeground}
                  secureTextEntry
                  style={[styles.input, { color: c.foreground }]}
                />
              </View>
              <View style={styles.field}>
                <Text style={[styles.label, { color: c.mutedForeground }]}>Confirm new password</Text>
                <TextInput
                  value={confirm}
                  onChangeText={setConfirm}
                  placeholder="Re-enter password"
                  placeholderTextColor={c.mutedForeground}
                  secureTextEntry
                  style={[styles.input, { color: c.foreground }]}
                />
              </View>
            </View>

            <View style={{ paddingHorizontal: 16, marginTop: 20 }}>
              <Touchable
                style={[styles.saveBtn, { backgroundColor: c.primary }, glow(c.primary)]}
                onPress={onSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={{ color: "#fff", fontFamily: "Inter_700Bold", fontSize: fs(15) }}>
                    Update password
                  </Text>
                )}
              </Touchable>
            </View>
          </>
        ) : (
          <View style={{ paddingHorizontal: 24, marginTop: 12 }}>
            <Text style={{ color: c.mutedForeground, textAlign: "center", fontSize: fs(14), lineHeight: 20 }}>
              You're signed in with demo mode. Password and login security is available when you sign in with an email account.
            </Text>
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
    zIndex: 2,
  },
  iconHero: { alignItems: "center", paddingVertical: 24 },
  heroCircle: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center" },
  sectionTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: fs(12),
    letterSpacing: 0.5,
    marginLeft: 16,
    marginBottom: 8,
  },
  card: { marginHorizontal: 16, borderRadius: 16 },
  field: { paddingHorizontal: 14, paddingVertical: 12 },
  label: { fontFamily: "Inter_500Medium", fontSize: fs(12), marginBottom: 4 },
  input: { fontFamily: "Inter_400Regular", fontSize: fs(15), padding: 0 },
  saveBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
});
