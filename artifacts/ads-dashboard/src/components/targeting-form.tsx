import type { AdTargetingSpec } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

const GENDERS = [
  { value: "male", label: "Men" },
  { value: "female", label: "Women" },
];

function toList(v: string): string[] {
  return v
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function TargetingForm({
  value,
  onChange,
}: {
  value: AdTargetingSpec;
  onChange: (next: AdTargetingSpec) => void;
}) {
  const set = (patch: Partial<AdTargetingSpec>) =>
    onChange({ ...value, ...patch });

  const genders = value.genders ?? [];

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Locations</Label>
        <Input
          placeholder="Dhaka, Chittagong, Sylhet"
          value={(value.locations ?? []).join(", ")}
          onChange={(e) => set({ locations: toList(e.target.value) })}
        />
        <p className="text-xs text-muted-foreground">Comma diye alada korun.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Age min</Label>
          <Input
            type="number"
            min={13}
            max={120}
            value={value.ageMin ?? ""}
            onChange={(e) =>
              set({
                ageMin: e.target.value ? Number(e.target.value) : undefined,
              })
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label>Age max</Label>
          <Input
            type="number"
            min={13}
            max={120}
            value={value.ageMax ?? ""}
            onChange={(e) =>
              set({
                ageMax: e.target.value ? Number(e.target.value) : undefined,
              })
            }
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Gender</Label>
        <div className="flex gap-4">
          {GENDERS.map((g) => {
            const checked = genders.includes(g.value);
            return (
              <label
                key={g.value}
                className="flex items-center gap-2 text-sm"
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={(c) => {
                    const next = c
                      ? [...genders, g.value]
                      : genders.filter((x) => x !== g.value);
                    set({ genders: next });
                  }}
                />
                {g.label}
              </label>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">
          Khali rakhle sobar jonno.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label>Interests</Label>
        <Input
          placeholder="Cricket, Cooking, Travel"
          value={(value.interests ?? []).join(", ")}
          onChange={(e) => set({ interests: toList(e.target.value) })}
        />
      </div>

      <div className="space-y-1.5">
        <Label>Languages</Label>
        <Input
          placeholder="Bangla, English"
          value={(value.languages ?? []).join(", ")}
          onChange={(e) => set({ languages: toList(e.target.value) })}
        />
      </div>
    </div>
  );
}
