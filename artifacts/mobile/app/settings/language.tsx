import { ActivityIndicator, View } from "react-native";
import {
  useGetMySettings,
  useUpdateMySettings,
  getGetMySettingsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { SettingsScreen, Section, ChoiceRow } from "@/components/settings/SettingsUI";
import { useColors } from "@/hooks/useColors";

const LANGUAGES = [
  { value: "banglish", label: "Banglish", sub: "Bangla + English mix" },
  { value: "bn", label: "বাংলা", sub: "Bangla" },
  { value: "en", label: "English", sub: "English" },
];

export default function LanguageSettingsScreen() {
  const c = useColors();
  const { data, isLoading } = useGetMySettings();
  const update = useUpdateMySettings();
  const qc = useQueryClient();

  const save = (language: string) => {
    update.mutate(
      { data: { language: language as "banglish" | "bn" | "en" } },
      {
        onSuccess: () =>
          qc.invalidateQueries({ queryKey: getGetMySettingsQueryKey() }),
      },
    );
  };

  if (isLoading || !data) {
    return (
      <SettingsScreen title="Language">
        <View style={{ paddingVertical: 40, alignItems: "center" }}>
          <ActivityIndicator color={c.primary} />
        </View>
      </SettingsScreen>
    );
  }

  return (
    <SettingsScreen title="Language">
      <Section title="App er bhasha">
        {LANGUAGES.map((l, i) => (
          <ChoiceRow
            key={l.value}
            label={l.label}
            subtitle={l.sub}
            selected={data.language === l.value}
            onPress={() => save(l.value)}
            last={i === LANGUAGES.length - 1}
          />
        ))}
      </Section>
    </SettingsScreen>
  );
}
