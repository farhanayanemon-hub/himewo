import { SettingsShell, SettingsCard } from "@/components/settings/settings-shell";
import {
  useGetMySettings,
  useUpdateMySettings,
  getGetMySettingsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Check } from "lucide-react";

const LANGUAGES = [
  { value: "banglish", label: "Banglish", sub: "Bangla + English mix" },
  { value: "bn", label: "বাংলা", sub: "Bangla" },
  { value: "en", label: "English", sub: "English" },
];

export default function SettingsLanguagePage() {
  const { data, isLoading } = useGetMySettings();
  const update = useUpdateMySettings();
  const qc = useQueryClient();

  const save = (language: string) => {
    update.mutate(
      { data: { language: language as "banglish" | "bn" | "en" } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getGetMySettingsQueryKey() });
          toast.success("Language update hoyeche");
        },
        onError: () => toast.error("Update hoyni, abar try korun"),
      },
    );
  };

  if (isLoading || !data) {
    return (
      <SettingsShell title="Language">
        <div className="flex justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </SettingsShell>
    );
  }

  return (
    <SettingsShell title="Language" description="App er bhasha set korun">
      <SettingsCard>
        {LANGUAGES.map((l) => (
          <button
            key={l.value}
            type="button"
            onClick={() => save(l.value)}
            className="w-full flex items-center justify-between gap-4 px-5 py-4 hover:bg-muted transition-colors text-left"
          >
            <div>
              <p className="font-medium leading-tight">{l.label}</p>
              <p className="text-sm text-muted-foreground mt-0.5">{l.sub}</p>
            </div>
            {data.language === l.value ? (
              <Check className="w-5 h-5 text-primary shrink-0" />
            ) : null}
          </button>
        ))}
      </SettingsCard>
    </SettingsShell>
  );
}
