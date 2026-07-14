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
import { AuthProvider, useAuth } from "@/lib/auth";
import { RealtimeProvider } from "@/lib/realtime";
import { PreferencesProvider, usePreferencesOptional } from "@/lib/preferences";
import { useColors } from "@/hooks/useColors";

SplashScreen.preventAutoHideAsync();

// Web mirror only: React Native Web renders <TextInput> as real <input>/<textarea>,
// so focused fields show the browser's default focus *outline* — an ugly black
// rectangle around inputs (message composer, search, GIF/music pickers, etc).
// Native-only props like `underlineColorAndroid` can't touch a browser outline, so
// we strip it globally. This app exports as an SPA (web.output "single"), where
// `+html.tsx` is ignored, so we inject the stylesheet at runtime instead. No-op on native.
if (Platform.OS === "web" && typeof document !== "undefined") {
  const STYLE_ID = "himewo-web-focus-fix";
  if (!document.getElementById(STYLE_ID)) {
    const el = document.createElement("style");
    el.id = STYLE_ID;
    // Apple-style: strip the browser default focus outline AND any box-shadow on
    // text-entry fields entirely — no border/ring appears on tap or focus. Buttons
    // keep their default outline for accessibility.
    el.textContent =
      "*{-webkit-tap-highlight-color:transparent}" +
      "input,textarea,select,[contenteditable]{outline:none !important;box-shadow:none !important}" +
      "input:focus,input:focus-visible,textarea:focus,textarea:focus-visible,select:focus,[contenteditable]:focus{outline:none !important;box-shadow:none !important}";
    document.head.appendChild(el);
  }
}

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 15_000 } },
});

function RootNavigator() {
  const { loading, isAuthenticated } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const c = useColors();

  useEffect(() => {
    if (loading) return;
    const inAuthGroup = segments[0] === "(auth)";
    if (!isAuthenticated && !inAuthGroup) {
      router.replace("/(auth)/login");
    } else if (isAuthenticated && inAuthGroup) {
      router.replace("/");
    }
  }, [loading, isAuthenticated, segments, router]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: c.background }}>
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.background } }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="messages/[id]" />
      <Stack.Screen name="story/[id]" options={{ presentation: "fullScreenModal", animation: "fade" }} />
      <Stack.Screen name="create-story" options={{ presentation: "modal" }} />
      <Stack.Screen name="settings" options={{ presentation: "modal" }} />
      <Stack.Screen name="message-requests" />
      <Stack.Screen name="archive" />
    </Stack>
  );
}

function ThemedRoot() {
  const scheme = useColorScheme();
  const prefs = usePreferencesOptional();
  const mode = prefs?.themeMode ?? "system";
  const effective = mode === "system" ? scheme : mode;
  return (
    <>
      <StatusBar style={effective === "dark" ? "light" : "dark"} />
      <AuthProvider>
        <RealtimeProvider>
          <CallProvider>
            <RootNavigator />
          </CallProvider>
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
              <PreferencesProvider>
                <ThemedRoot />
              </PreferencesProvider>
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
