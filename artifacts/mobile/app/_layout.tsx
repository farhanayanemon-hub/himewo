import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import { ActivityIndicator, Platform, View, useColorScheme } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { CallProvider } from "@/components/CallProvider";
import { OnboardingFlow } from "@/components/OnboardingFlow";
import { AuthProvider, useAuth } from "@/lib/auth";
import { RealtimeProvider } from "@/lib/realtime";
import { ActingPageProvider } from "@/lib/acting-page";
import { useColors } from "@/hooks/useColors";

SplashScreen.preventAutoHideAsync();

// Web mirror only: React Native Web renders <TextInput> as real <input>/<textarea>,
// so focused fields show the browser's default focus *outline* — an ugly black
// rectangle around inputs (login, search, create-post, etc). Native-only props like
// `underlineColorAndroid` can't touch a browser outline, so we strip it globally.
// This app exports as an SPA (web.output "single"), where `+html.tsx` is ignored,
// so we inject the stylesheet at runtime instead. No-op on native.
if (Platform.OS === "web" && typeof document !== "undefined") {
  const STYLE_ID = "himewo-web-focus-fix";
  if (!document.getElementById(STYLE_ID)) {
    const el = document.createElement("style");
    el.id = STYLE_ID;
    el.textContent =
      "*{-webkit-tap-highlight-color:transparent}" +
      "input,textarea,select,[contenteditable],button{outline:none !important}" +
      "input:focus,input:focus-visible,textarea:focus,textarea:focus-visible,select:focus,[contenteditable]:focus{outline:none !important}";
    document.head.appendChild(el);
  }
}

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 15_000 } },
});

function RootNavigator() {
  const { loading, isAuthenticated, user } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const c = useColors();

  useEffect(() => {
    if (loading) return;
    const inAuthGroup = segments[0] === "(auth)";
    if (!isAuthenticated && !inAuthGroup) {
      router.replace("/(auth)/login");
    } else if (isAuthenticated && inAuthGroup) {
      router.replace("/(tabs)");
    }
  }, [loading, isAuthenticated, segments, router]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: c.background }}>
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  // One-time post-signup onboarding takeover (false = explicitly not done;
  // null/undefined = legacy or non-owner payloads, never show). Rendered as
  // an overlay so the router stays mounted underneath.
  const showOnboarding =
    isAuthenticated && user?.hasCompletedOnboarding === false;

  return (
    <View style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.background } }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="create-post" options={{ presentation: "modal" }} />
      <Stack.Screen name="create-story" options={{ presentation: "modal" }} />
      <Stack.Screen
        name="story/[id]"
        options={{ presentation: "fullScreenModal", animation: "fade" }}
      />
      <Stack.Screen name="search" options={{ presentation: "modal" }} />
      <Stack.Screen
        name="groups/index"
        options={{
          headerShown: true,
          headerStyle: { backgroundColor: c.card },
          headerTintColor: c.foreground,
          headerTitleStyle: { fontFamily: "Inter_700Bold" },
        }}
      />
      <Stack.Screen
        name="groups/[id]"
        options={{
          headerShown: true,
          headerStyle: { backgroundColor: c.card },
          headerTintColor: c.foreground,
          headerTitleStyle: { fontFamily: "Inter_700Bold" },
        }}
      />
      <Stack.Screen
        name="pages/index"
        options={{
          headerShown: true,
          headerStyle: { backgroundColor: c.card },
          headerTintColor: c.foreground,
          headerTitleStyle: { fontFamily: "Inter_700Bold" },
        }}
      />
      <Stack.Screen
        name="pages/[id]"
        options={{
          headerShown: true,
          headerStyle: { backgroundColor: c.card },
          headerTintColor: c.foreground,
          headerTitleStyle: { fontFamily: "Inter_700Bold" },
        }}
      />
      <Stack.Screen
        name="saved"
        options={{
          title: "Saved",
          headerShown: true,
          headerStyle: { backgroundColor: c.card },
          headerTintColor: c.foreground,
          headerTitleStyle: { fontFamily: "Inter_700Bold" },
        }}
      />
      <Stack.Screen name="earnings" />
      </Stack>
      {showOnboarding && <OnboardingFlow />}
    </View>
  );
}

function ThemedRoot() {
  const scheme = useColorScheme();
  return (
    <>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <AuthProvider>
        <RealtimeProvider>
          <ActingPageProvider>
            <CallProvider>
              <RootNavigator />
            </CallProvider>
          </ActingPageProvider>
        </RealtimeProvider>
      </AuthProvider>
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <KeyboardProvider>
              <ThemedRoot />
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
