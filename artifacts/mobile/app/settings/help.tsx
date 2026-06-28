import { useState } from "react";
import { Linking, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SettingsScreen, Section } from "@/components/settings/SettingsUI";
import { useColors } from "@/hooks/useColors";

const FAQ = [
  {
    q: "Kivabe password change korbo?",
    a: "Settings → Password & security te giye notun password set korun.",
  },
  {
    q: "Ke amar post dekhte parbe?",
    a: "Settings → Privacy te 'Post ke dekhte parbe' theke audience set korun.",
  },
  {
    q: "Notification bondho korbo kivabe?",
    a: "Settings → Notifications te giye je notification chan na off korun.",
  },
  {
    q: "Profile edit korbo kothay?",
    a: "Settings → Account Center theke 'Edit profile' e jaan.",
  },
];

export default function HelpSettingsScreen() {
  const c = useColors();
  const [open, setOpen] = useState<number | null>(null);

  return (
    <SettingsScreen title="Help & support">
      <Section title="Common proshno">
        {FAQ.map((item, i) => (
          <Pressable
            key={i}
            onPress={() => setOpen(open === i ? null : i)}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 14,
              borderBottomColor: c.border,
              borderBottomWidth: i < FAQ.length - 1 ? 0.5 : 0,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <Text
                style={{
                  color: c.foreground,
                  fontFamily: "Inter_600SemiBold",
                  fontSize: 15,
                  flex: 1,
                }}
              >
                {item.q}
              </Text>
              <Ionicons
                name={open === i ? "chevron-up" : "chevron-down"}
                size={18}
                color={c.mutedForeground}
              />
            </View>
            {open === i ? (
              <Text
                style={{
                  color: c.mutedForeground,
                  fontFamily: "Inter_400Regular",
                  fontSize: 14,
                  marginTop: 8,
                  lineHeight: 20,
                }}
              >
                {item.a}
              </Text>
            ) : null}
          </Pressable>
        ))}
      </Section>

      <Section title="Aro help">
        <Pressable
          onPress={() => Linking.openURL("mailto:support@himewo.app")}
          style={{ paddingHorizontal: 14, paddingVertical: 16 }}
        >
          <Text
            style={{
              color: c.foreground,
              fontFamily: "Inter_600SemiBold",
              fontSize: 15,
            }}
          >
            Support team ke email korun
          </Text>
          <Text
            style={{
              color: c.primary,
              fontFamily: "Inter_400Regular",
              fontSize: 14,
              marginTop: 2,
            }}
          >
            support@himewo.app
          </Text>
        </Pressable>
      </Section>
    </SettingsScreen>
  );
}
