import { Stack } from "expo-router";
import { useColors } from "@/hooks/useColors";

export default function MarketplaceLayout() {
  const c = useColors();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: c.card },
        headerTintColor: c.foreground,
        headerTitleStyle: { fontFamily: "Inter_700Bold" },
        contentStyle: { backgroundColor: c.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: "Marketplace" }} />
      <Stack.Screen name="[id]" options={{ title: "Listing" }} />
      <Stack.Screen
        name="create"
        options={{ title: "New listing", presentation: "modal" }}
      />
      <Stack.Screen name="selling" options={{ title: "Your selling" }} />
    </Stack>
  );
}
