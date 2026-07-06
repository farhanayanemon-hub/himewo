import { Touchable } from "@/components/Touchable";
import { fs } from "@/constants/typography";
import { shadow, glow } from "@/constants/shadows";
import { useState } from "react";
import {
  Alert,
  Modal,
  ScrollView,
  Switch,
  Text,
  View,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { Avatar } from "@/components/Avatar";
import { useAuth } from "@/lib/auth";
import { useColors } from "@/hooks/useColors";
import { usePreferences } from "@/lib/preferences";
import { openMainApp } from "@/lib/mainApp";

export default function SettingsScreen() {
  const c = useColors();
  const qc = useQueryClient();
  const { user, signOut, supabaseEnabled, devUsers, signInAsDevUser } = useAuth();
  const { themeMode, activeStatus, setThemeMode, setActiveStatus } = usePreferences();
  const [switchOpen, setSwitchOpen] = useState(false);

  const confirmLogout = () => {
    Alert.alert("Log out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Log out", style: "destructive", onPress: () => void signOut() },
    ]);
  };

  const switchTo = async (id: string) => {
    setSwitchOpen(false);
    if (id === user?.id) return;
    await signInAsDevUser(id);
    qc.invalidateQueries();
    router.replace("/");
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }}>
      <View style={[styles.header, { backgroundColor: c.card }, shadow("sm")]}>
        <Touchable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={c.foreground} />
        </Touchable>
        <Text style={{ color: c.foreground, fontFamily: "Inter_700Bold", fontSize: fs(18) }}>
          Settings
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <Touchable
          style={[styles.profile, { backgroundColor: c.card }, shadow("md")]}
          onPress={() => router.push("/edit-profile")}
        >
          <Avatar uri={user?.avatarUrl} name={user?.displayName} size={60} />
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={{ color: c.foreground, fontFamily: "Inter_700Bold", fontSize: fs(18) }}>
              {user?.displayName ?? "You"}
            </Text>
            <Text style={{ color: c.mutedForeground, fontSize: fs(13) }}>@{user?.username}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={c.mutedForeground} />
        </Touchable>

        <Text style={[styles.sectionTitle, { color: c.mutedForeground }]}>YOUR ACCOUNT</Text>
        <View style={[styles.card, { backgroundColor: c.card }, shadow("md")]}>
          <Row c={c} icon="person-circle" iconColor={c.primary} title="Accounts Center"
            subtitle="Password, security, personal details"
            onPress={() => router.push("/accounts-center")} last />
        </View>

        <Text style={[styles.sectionTitle, { color: c.mutedForeground }]}>PREFERENCES</Text>
        <View style={[styles.card, { backgroundColor: c.card }, shadow("md")]}>
          <ToggleRow c={c} icon="ellipse" iconColor="#31a24c" title="Active status"
            subtitle={activeStatus ? "On" : "Off"} value={activeStatus} onValueChange={setActiveStatus} />
          <ToggleRow c={c} icon="moon" iconColor="#8b6dff" title="Dark mode"
            subtitle={themeMode === "dark" ? "On" : "Off"} value={themeMode === "dark"}
            onValueChange={(v) => setThemeMode(v ? "dark" : "light")} />
          <Row c={c} icon="notifications" iconColor="#f3425f" title="Notifications and sounds"
            onPress={() => router.push("/notification-settings")} />
          <Row c={c} icon="shield-checkmark" iconColor="#6c4be0" title="Privacy and safety"
            onPress={() => router.push("/privacy-settings")} last />
        </View>

        <Text style={[styles.sectionTitle, { color: c.mutedForeground }]}>MORE</Text>
        <View style={[styles.card, { backgroundColor: c.card }, shadow("md")]}>
          <Row c={c} icon="apps" iconColor="#f5851f" title="Open HiMewo app"
            subtitle="Go to the full social app" onPress={() => openMainApp()} />
          <Row c={c} icon="archive" iconColor="#65676b" title="Archived chats"
            onPress={() => router.push("/archive")} />
          {!supabaseEnabled && (
            <Row c={c} icon="swap-horizontal" iconColor="#6c4be0" title="Switch profile"
              subtitle={`Signed in as ${user?.displayName ?? ""}`} onPress={() => setSwitchOpen(true)} />
          )}
          <Row c={c} icon="log-out" iconColor={c.destructive} title="Log out"
            titleColor={c.destructive} onPress={confirmLogout} last />
        </View>
      </ScrollView>

      <Modal
        visible={switchOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSwitchOpen(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: c.background }} edges={["top"]}>
          <View style={[styles.header, { backgroundColor: c.card }, shadow("sm")]}>
            <Touchable onPress={() => setSwitchOpen(false)} hitSlop={8}>
              <Ionicons name="close" size={24} color={c.foreground} />
            </Touchable>
            <Text style={{ color: c.foreground, fontFamily: "Inter_700Bold", fontSize: fs(18) }}>
              Switch profile
            </Text>
            <View style={{ width: 24 }} />
          </View>
          <ScrollView>
            {devUsers.map((u) => (
              <Touchable
                key={u.id}
                style={[styles.userRow, { borderBottomColor: c.border }]}
                onPress={() => switchTo(u.id)}
              >
                <Avatar uri={u.avatarUrl} name={u.displayName} size={48} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={{ color: c.foreground, fontFamily: "Inter_600SemiBold", fontSize: fs(16) }}>
                    {u.displayName}
                  </Text>
                  <Text style={{ color: c.mutedForeground, fontSize: fs(13) }}>@{u.username}</Text>
                </View>
                {u.id === user?.id ? (
                  <Ionicons name="checkmark-circle" size={22} color={c.primary} />
                ) : null}
              </Touchable>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function Row({
  c,
  icon,
  iconColor,
  title,
  subtitle,
  titleColor,
  onPress,
  last,
}: {
  c: ReturnType<typeof useColors>;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  title: string;
  subtitle?: string;
  titleColor?: string;
  onPress: () => void;
  last?: boolean;
}) {
  return (
    <Touchable
      style={[styles.row, !last && { borderBottomColor: c.border, borderBottomWidth: StyleSheet.hairlineWidth }]}
      onPress={onPress}
    >
      <View style={[styles.iconWrap, { backgroundColor: iconColor }]}>
        <Ionicons name={icon} size={18} color="#fff" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: titleColor ?? c.foreground, fontFamily: "Inter_600SemiBold", fontSize: fs(15) }}>
          {title}
        </Text>
        {subtitle ? (
          <Text numberOfLines={1} style={{ color: c.mutedForeground, fontSize: fs(12), marginTop: 2 }}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={20} color={c.mutedForeground} />
    </Touchable>
  );
}

function ToggleRow({
  c,
  icon,
  iconColor,
  title,
  subtitle,
  value,
  onValueChange,
  last,
}: {
  c: ReturnType<typeof useColors>;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  title: string;
  subtitle?: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  last?: boolean;
}) {
  return (
    <View style={[styles.row, !last && { borderBottomColor: c.border, borderBottomWidth: StyleSheet.hairlineWidth }]}>
      <View style={[styles.iconWrap, { backgroundColor: iconColor }]}>
        <Ionicons name={icon} size={18} color="#fff" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: c.foreground, fontFamily: "Inter_600SemiBold", fontSize: fs(15) }}>{title}</Text>
        {subtitle ? (
          <Text style={{ color: c.mutedForeground, fontSize: fs(12), marginTop: 2 }}>{subtitle}</Text>
        ) : null}
      </View>
      <Switch value={value} onValueChange={onValueChange} trackColor={{ true: c.primary }} />
    </View>
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
  profile: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 16,
  },
  sectionTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: fs(12),
    letterSpacing: 0.5,
    marginLeft: 16,
    marginBottom: 8,
    marginTop: 20,
  },
  card: { marginHorizontal: 16, borderRadius: 16 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
