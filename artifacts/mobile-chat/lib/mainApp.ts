import { Alert, Linking } from "react-native";

const MAIN_APP_URL = process.env.EXPO_PUBLIC_MAIN_APP_URL;

export const hasMainAppLink = Boolean(MAIN_APP_URL);

export async function openMainApp(path?: string): Promise<void> {
  if (!MAIN_APP_URL) {
    Alert.alert(
      "HiMewo",
      "Link your main HiMewo app first (set EXPO_PUBLIC_MAIN_APP_URL) to jump back to it from here.",
    );
    return;
  }
  const base = MAIN_APP_URL.replace(/\/+$/, "");
  const url = path ? `${base}${path.startsWith("/") ? path : `/${path}`}` : base;
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert("Couldn't open", "Unable to open the HiMewo app right now.");
  }
}
