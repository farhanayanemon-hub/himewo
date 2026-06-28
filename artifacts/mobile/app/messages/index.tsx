import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

/**
 * Messaging lives in the dedicated "HiMewo Chat" app (Messenger-style), not in
 * the main social app — same idea as Facebook pushing chat to Messenger.
 *
 * This screen is the animated promo that every "chat" entry point in the main
 * app lands on. The button is smart:
 *  - web        -> opens the HiMewo Chat web app in a new tab
 *  - native + installed     -> opens the app via its custom scheme
 *  - native + not installed -> sends the user to the Play Store
 */
const CHAT_SCHEME = "mobilechat://";
const CHAT_WEB_URL = "https://himewo-chat.pages.dev";
// NOTE: update the package id once HiMewo Chat is published to the Play Store.
const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.himewo.chat";

type IconName = keyof typeof Ionicons.glyphMap;

const FEATURES: { icon: IconName; title: string; desc: string }[] = [
  { icon: "flash", title: "Lightning-fast chats", desc: "Instant messages with typing & read receipts." },
  { icon: "videocam", title: "Voice & video calls", desc: "Crystal-clear free calls with your friends." },
  { icon: "happy", title: "Reactions & sounds", desc: "Fun reactions, stickers and playful sounds." },
  { icon: "sparkles", title: "And much more", desc: "A whole app built just for messaging." },
];

export default function ChatPromoScreen() {
  const c = useColors();
  const [installed, setInstalled] = useState(false);
  const [checking, setChecking] = useState(Platform.OS !== "web");

  const intro = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const float = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const native = Platform.OS !== "web";

    Animated.timing(intro, {
      toValue: 1,
      duration: 600,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: native,
    }).start();

    const loop = (v: Animated.Value, duration: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(v, { toValue: 1, duration, easing: Easing.inOut(Easing.ease), useNativeDriver: native }),
          Animated.timing(v, { toValue: 0, duration, easing: Easing.inOut(Easing.ease), useNativeDriver: native }),
        ]),
      );

    const p = loop(pulse, 1200);
    const f = loop(float, 1800);
    p.start();
    f.start();
    return () => {
      p.stop();
      f.stop();
    };
  }, [intro, pulse, float]);

  useEffect(() => {
    let active = true;
    if (Platform.OS === "web") return;
    (async () => {
      try {
        const can = await Linking.canOpenURL(CHAT_SCHEME);
        if (active) setInstalled(can);
      } catch {
        if (active) setInstalled(false);
      } finally {
        if (active) setChecking(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const openWeb = () => {
    const w = globalThis as unknown as { open?: (url: string, target?: string) => void };
    if (typeof w.open === "function") w.open(CHAT_WEB_URL, "_blank");
    else Linking.openURL(CHAT_WEB_URL).catch(() => {});
  };

  const handlePrimary = async () => {
    if (Platform.OS === "web") {
      openWeb();
      return;
    }
    try {
      await Linking.openURL(installed ? CHAT_SCHEME : PLAY_STORE_URL);
    } catch {
      openWeb();
    }
  };

  const primaryLabel =
    Platform.OS === "web" ? "Open HiMewo Chat" : installed ? "Open App" : "Get App Now";
  const primaryIcon: IconName =
    Platform.OS !== "web" && !installed ? "logo-google-playstore" : "open-outline";

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] });
  const translateY = float.interpolate({ inputRange: [0, 1], outputRange: [0, -10] });
  const introTranslate = intro.interpolate({ inputRange: [0, 1], outputRange: [24, 0] });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={c.foreground} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Animated.View style={{ transform: [{ translateY }], alignItems: "center" }}>
          <View style={[styles.haloOuter, { backgroundColor: c.primary + "14" }]}>
            <View style={[styles.haloInner, { backgroundColor: c.primary + "24" }]}>
              <Animated.View
                style={[styles.heroCircle, { backgroundColor: c.primary, transform: [{ scale }] }]}
              >
                <Ionicons name="chatbubbles" size={56} color="#fff" />
              </Animated.View>
            </View>
          </View>
        </Animated.View>

        <Animated.View
          style={{
            opacity: intro,
            transform: [{ translateY: introTranslate }],
            alignItems: "center",
            width: "100%",
          }}
        >
          <Text style={[styles.title, { color: c.foreground }]}>
            Chat better on <Text style={{ color: c.primary }}>HiMewo Chat</Text>
          </Text>
          <Text style={[styles.subtitle, { color: c.mutedForeground }]}>
            Messaging has moved to our dedicated app — it&apos;s faster, smoother and packed
            with way more features.
          </Text>

          <View style={styles.features}>
            {FEATURES.map((f, i) => (
              <FeatureRow key={f.title} icon={f.icon} title={f.title} desc={f.desc} index={i} c={c} />
            ))}
          </View>
        </Animated.View>
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: c.background, borderTopColor: c.border }]}>
        <Pressable
          onPress={handlePrimary}
          disabled={checking}
          style={({ pressed }) => [
            styles.cta,
            { backgroundColor: c.primary, opacity: pressed || checking ? 0.85 : 1 },
          ]}
        >
          <Ionicons name={primaryIcon} size={20} color="#fff" />
          <Text style={styles.ctaText}>{primaryLabel}</Text>
        </Pressable>
        {Platform.OS !== "web" && (
          <Pressable onPress={openWeb} hitSlop={8} style={styles.browserBtn}>
            <Text style={[styles.browserText, { color: c.mutedForeground }]}>
              Or open chat in your browser
            </Text>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}

function FeatureRow({
  icon,
  title,
  desc,
  index,
  c,
}: {
  icon: IconName;
  title: string;
  desc: string;
  index: number;
  c: ReturnType<typeof useColors>;
}) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(a, {
      toValue: 1,
      duration: 450,
      delay: 250 + index * 120,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== "web",
    }).start();
  }, [a, index]);
  const tx = a.interpolate({ inputRange: [0, 1], outputRange: [20, 0] });
  return (
    <Animated.View
      style={[
        styles.featureRow,
        { backgroundColor: c.card, borderColor: c.border, opacity: a, transform: [{ translateX: tx }] },
      ]}
    >
      <View style={[styles.featureIcon, { backgroundColor: c.primary + "1a" }]}>
        <Ionicons name={icon} size={22} color={c.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.featureTitle, { color: c.foreground }]}>{title}</Text>
        <Text style={[styles.featureDesc, { color: c.mutedForeground }]}>{desc}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingVertical: 8 },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  scroll: { alignItems: "center", paddingHorizontal: 24, paddingBottom: 24, paddingTop: 8 },
  haloOuter: {
    width: 184,
    height: 184,
    borderRadius: 92,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  haloInner: {
    width: 144,
    height: 144,
    borderRadius: 72,
    alignItems: "center",
    justifyContent: "center",
  },
  heroCircle: {
    width: 104,
    height: 104,
    borderRadius: 52,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#ff751a",
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  title: { fontFamily: "Inter_700Bold", fontSize: 26, textAlign: "center", marginTop: 8 },
  subtitle: {
    fontSize: 15,
    textAlign: "center",
    marginTop: 10,
    lineHeight: 22,
    paddingHorizontal: 4,
  },
  features: { width: "100%", marginTop: 24, gap: 12 },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 14,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  featureTitle: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
  featureDesc: { fontSize: 13, marginTop: 2, lineHeight: 18 },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 16,
  },
  ctaText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 16 },
  browserBtn: { alignItems: "center", paddingVertical: 6 },
  browserText: { fontSize: 13, fontFamily: "Inter_600SemiBold", textDecorationLine: "underline" },
});
