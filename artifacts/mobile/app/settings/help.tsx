import { useState } from "react";
import { Linking, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SettingsScreen, Section } from "@/components/settings/SettingsUI";
import { useColors } from "@/hooks/useColors";

const FAQ = [
  {
    q: "How do I change my password?",
    a: "Go to Settings → Password & security and set a new password.",
  },
  {
    q: "Who can see my posts?",
    a: "Go to Settings → Privacy and set the audience under 'Who can see your posts'.",
  },
  {
    q: "How do I turn off notifications?",
    a: "Go to Settings → Notifications and turn off the ones you don't want.",
  },
  {
    q: "Where do I edit my profile?",
    a: "Go to Settings → Account Center and tap 'Edit profile'.",
  },
];

export default function HelpSettingsScreen() {
  const c = useColors();
  const [open, setOpen] = useState<number | null>(null);

  return (
    <SettingsScreen title="Help & support">
      <Section title="Common questions">
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

      <Section title="More help">
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
            Email our support team
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
