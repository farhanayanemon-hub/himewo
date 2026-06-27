import { useColorScheme } from "react-native";

import colors from "@/constants/colors";
import { usePreferencesOptional } from "@/lib/preferences";

/**
 * Returns the design tokens for the active color scheme.
 *
 * Honors the user's theme preference (system / light / dark) from
 * PreferencesProvider. When no provider is mounted it falls back to the
 * device appearance. The returned object contains all color tokens for the
 * active palette plus scheme-independent values like `radius`.
 */
export function useColors() {
  const scheme = useColorScheme();
  const prefs = usePreferencesOptional();
  const mode = prefs?.themeMode ?? "system";
  const effective = mode === "system" ? scheme : mode;
  const palette =
    effective === "dark" && "dark" in colors
      ? (colors as { dark: typeof colors.light }).dark
      : colors.light;
  return { ...palette, radius: colors.radius };
}
