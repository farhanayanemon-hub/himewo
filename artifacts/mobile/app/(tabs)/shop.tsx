import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { ShopHomeScreen } from "@/components/ShopHomeScreen";

export default function ShopTabScreen() {
  const c = useColors();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }} edges={["top"]}>
      <View style={[styles.header, { backgroundColor: c.background, borderBottomColor: c.border }]}>
        <Text style={[styles.title, { color: c.foreground }]}>Shop</Text>
      </View>
      <ShopHomeScreen inTab />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    fontWeight: "700",
  },
});
