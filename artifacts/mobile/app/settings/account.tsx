import { Text, Pressable, View } from "react-native";
import { router } from "expo-router";
import { SettingsScreen, Section, Row } from "@/components/settings/SettingsUI";
import { useAuth } from "@/lib/auth";
import { useColors } from "@/hooks/useColors";

export default function AccountSettingsScreen() {
  const c = useColors();
  const { user } = useAuth();

  return (
    <SettingsScreen title="Account Center">
      <Section title="Personal details">
        <Row
          title="Naam"
          right={
            <Text style={{ color: c.mutedForeground, fontFamily: "Inter_400Regular" }}>
              {user?.displayName ?? "—"}
            </Text>
          }
        />
        <Row
          title="Username"
          right={
            <Text style={{ color: c.mutedForeground, fontFamily: "Inter_400Regular" }}>
              @{user?.username ?? "—"}
            </Text>
          }
        />
        <Row
          title="Email"
          last
          right={
            <Text style={{ color: c.mutedForeground, fontFamily: "Inter_400Regular" }}>
              {user?.email ?? "—"}
            </Text>
          }
        />
      </Section>

      <Section title="Profile">
        <Pressable onPress={() => router.push("/edit-profile")}>
          <View style={{ paddingHorizontal: 14, paddingVertical: 16 }}>
            <Text
              style={{
                color: c.primary,
                fontFamily: "Inter_600SemiBold",
                fontSize: 15,
              }}
            >
              Edit profile
            </Text>
            <Text
              style={{
                color: c.mutedForeground,
                fontFamily: "Inter_400Regular",
                fontSize: 13,
                marginTop: 2,
              }}
            >
              Bio, photo, work, education update korun
            </Text>
          </View>
        </Pressable>
      </Section>
    </SettingsScreen>
  );
}
