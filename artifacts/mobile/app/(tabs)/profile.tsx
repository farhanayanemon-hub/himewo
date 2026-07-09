import { ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/lib/auth";
import { useColors } from "@/hooks/useColors";
import { ProfileBody } from "../profile/[id]";

export default function MyProfileTab() {
  const c = useColors();
  const { user } = useAuth();

  if (!user) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c.background }} edges={["top"]}>
        <ActivityIndicator color={c.primary} style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  return <ProfileBody userId={user.id} hideBackButton />;
}
