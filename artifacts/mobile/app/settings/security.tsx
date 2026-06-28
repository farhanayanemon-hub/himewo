import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, Text, TextInput, View } from "react-native";
import { SettingsScreen, Section, Row } from "@/components/settings/SettingsUI";
import { useAuth } from "@/lib/auth";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useColors } from "@/hooks/useColors";

export default function SecuritySettingsScreen() {
  const c = useColors();
  const { user } = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  const changePassword = async () => {
    if (password.length < 6) {
      Alert.alert("Password too short", "Use at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      Alert.alert("Doesn't match", "Both passwords must be the same.");
      return;
    }
    if (!isSupabaseConfigured || !supabase) {
      Alert.alert("Unavailable", "You can't change your password in this environment.");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        Alert.alert("Error", error.message || "Couldn't change password.");
      } else {
        Alert.alert("Done", "Your password has been changed.");
        setPassword("");
        setConfirm("");
      }
    } catch {
      Alert.alert("Error", "Couldn't change password. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    color: c.foreground,
    fontFamily: "Inter_400Regular" as const,
    fontSize: 15,
    paddingVertical: 6,
  };

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
          <View>
            <Text
              style={{
                color: c.mutedForeground,
                fontFamily: "Inter_500Medium",
                fontSize: 12,
                marginBottom: 4,
              }}
            >
              New password
            </Text>
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
            <Text
              style={{
                color: c.mutedForeground,
                fontFamily: "Inter_500Medium",
                fontSize: 12,
                marginBottom: 4,
              }}
            >
              Re-enter password
            </Text>
            <TextInput
              value={confirm}
              onChangeText={setConfirm}
              placeholder="Same password"
              placeholderTextColor={c.mutedForeground}
              secureTextEntry
              style={inputStyle}
            />
          </View>
        </View>
      </Section>

      <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
        <Pressable
          onPress={changePassword}
          disabled={saving}
          style={{
            backgroundColor: c.primary,
            borderRadius: 12,
            paddingVertical: 14,
            alignItems: "center",
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ color: "#fff", fontFamily: "Inter_700Bold", fontSize: 15 }}>
              Change password
            </Text>
          )}
        </Pressable>
      </View>
    </SettingsScreen>
  );
}
