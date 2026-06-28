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
      Alert.alert("Password chhoto", "Kompokkhe 6 character din.");
      return;
    }
    if (password !== confirm) {
      Alert.alert("Mile nai", "Duita password ek hote hobe.");
      return;
    }
    if (!isSupabaseConfigured || !supabase) {
      Alert.alert("Unavailable", "Ei environment e password change kora jachhe na.");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        Alert.alert("Error", error.message || "Password change hoyni.");
      } else {
        Alert.alert("Done", "Password change hoyeche.");
        setPassword("");
        setConfirm("");
      }
    } catch {
      Alert.alert("Error", "Password change hoyni, abar try korun.");
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

      <Section title="Password change korun">
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
              Notun password
            </Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Kompokkhe 6 character"
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
              Password abar din
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
              Password change korun
            </Text>
          )}
        </Pressable>
      </View>
    </SettingsScreen>
  );
}
