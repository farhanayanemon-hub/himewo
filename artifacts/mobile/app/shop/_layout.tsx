import { Stack } from "expo-router";
import { useColors } from "@/hooks/useColors";

export default function ShopLayout() {
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
      <Stack.Screen name="index" options={{ title: "Shop" }} />
      <Stack.Screen name="stall/[id]" options={{ title: "Stall" }} />
      <Stack.Screen name="product/[id]" options={{ title: "Product" }} />
      <Stack.Screen name="orders" options={{ title: "My orders" }} />
      <Stack.Screen name="my-stall" options={{ title: "My stall" }} />
    </Stack>
  );
}
