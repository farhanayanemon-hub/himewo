import { useMemo, useState } from "react";
import type { AdTargetingSpec } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MapPin, X, Plus } from "lucide-react";

// Facebook-style location suggestions: countries + Bangladesh divisions and
// major cities. Free typing is still allowed — this is a suggestion list,
// not a restriction.
const LOCATION_SUGGESTIONS = [
  "Bangladesh",
  "Dhaka",
  "Chittagong",
  "Sylhet",
  "Khulna",
  "Rajshahi",
  "Barishal",
  "Rangpur",
  "Mymensingh",
  "Comilla",
  "Narayanganj",
  "Gazipur",
  "Cox's Bazar",
  "India",
  "Kolkata",
  "Pakistan",
  "Nepal",
  "Sri Lanka",
  "Malaysia",
  "Singapore",
  "Saudi Arabia",
  "United Arab Emirates",
  "Qatar",
  "Kuwait",
  "Oman",
  "United States",
  "United Kingdom",
  "Canada",
  "Australia",
  "Germany",
  "France",
  "Italy",
  "Japan",
  "South Korea",
];

const INTEREST_SUGGESTIONS = [
  "Cricket",
  "Football",
  "Cooking",
  "Travel",
  "Fashion",
  "Beauty",
  "Technology",
  "Mobile phones",
  "Gaming",
  "Music",
  "Movies",
  "Education",
  "Online shopping",
  "Food & dining",
  "Fitness",
  "Photography",
  "Business",
  "Real estate",
  "Cars & bikes",
  "Books",
  "Health",
  "Parenting",
  "Pets",
  "Religion",
  "News",
];

const LANGUAGE_SUGGESTIONS = [
  "Bangla",
  "English",
  "Hindi",
  "Urdu",
  "Arabic",
];

const AGE_OPTIONS = Array.from({ length: 53 }, (_, i) => 13 + i); // 13..65

// A Facebook-style tag picker: chips for the chosen values, a search box
// with a suggestion dropdown, and free-text add for anything not listed.
function TagPicker({
  values,
  onChange,
  suggestions,
  placeholder,
  addLabel,
}: {
  values: string[];
  onChange: (next: string[]) => void;
  suggestions: string[];
  placeholder: string;
  addLabel: string;
}) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);

  const lower = values.map((v) => v.toLowerCase());
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return suggestions
      .filter((s) => !lower.includes(s.toLowerCase()))
      .filter((s) => (q ? s.toLowerCase().includes(q) : true))
      .slice(0, 8);
  }, [query, suggestions, lower]);

  const add = (v: string) => {
    const val = v.trim();
    if (!val) return;
    if (lower.includes(val.toLowerCase())) {
      setQuery("");
      return;
    }
    onChange([...values, val]);
    setQuery("");
  };

  const remove = (v: string) => onChange(values.filter((x) => x !== v));

  const showDropdown = focused && (matches.length > 0 || query.trim().length > 0);

  return (
    <div className="space-y-2">
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {values.map((v) => (
            <Badge key={v} variant="secondary" className="gap-1 pr-1">
              {v}
              <button
                type="button"
                onClick={() => remove(v)}
                className="rounded-full p-0.5 hover:bg-muted-foreground/20"
                aria-label={`Remove ${v}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
      <div className="relative">
        <Input
          value={query}
          placeholder={placeholder}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add(matches[0] ?? query);
            }
          }}
        />
        {showDropdown && (
          <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-56 overflow-y-auto rounded-md border bg-popover p-1 shadow-md">
            {matches.map((s) => (
              <button
                key={s}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => add(s)}
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
              >
                <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                {s}
              </button>
            ))}
            {query.trim() &&
              !matches.some(
                (m) => m.toLowerCase() === query.trim().toLowerCase(),
              ) && (
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => add(query)}
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
                >
                  <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                  {addLabel} "{query.trim()}"
                </button>
              )}
          </div>
        )}
      </div>
    </div>
  );
}

type GenderChoice = "all" | "male" | "female";

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
  const genderChoice: GenderChoice =
    genders.length === 1 ? (genders[0] as GenderChoice) : "all";

  const setGender = (g: GenderChoice) =>
    set({ genders: g === "all" ? [] : [g] });

  return (
    <div className="space-y-5">
      {/* Locations */}
      <div className="space-y-1.5">
        <Label className="flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
          Locations
        </Label>
        <TagPicker
          values={value.locations ?? []}
          onChange={(next) => set({ locations: next })}
          suggestions={LOCATION_SUGGESTIONS}
          placeholder="Search city or country (e.g. Dhaka)"
          addLabel="Add location"
        />
        <p className="text-xs text-muted-foreground">
          Leave empty to show your ad everywhere.
        </p>
      </div>

      {/* Age */}
      <div className="space-y-1.5">
        <Label>Age</Label>
        <div className="flex items-center gap-2">
          <Select
            value={String(value.ageMin ?? 18)}
            onValueChange={(v) => set({ ageMin: Number(v) })}
          >
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AGE_OPTIONS.map((a) => (
                <SelectItem key={a} value={String(a)}>
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">to</span>
          <Select
            value={String(value.ageMax ?? 65)}
            onValueChange={(v) => set({ ageMax: Number(v) })}
          >
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AGE_OPTIONS.map((a) => (
                <SelectItem key={a} value={String(a)}>
                  {a === 65 ? "65+" : a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Gender */}
      <div className="space-y-1.5">
        <Label>Gender</Label>
        <div className="flex gap-2">
          {(
            [
              { v: "all", label: "All" },
              { v: "male", label: "Men" },
              { v: "female", label: "Women" },
            ] as const
          ).map((g) => (
            <Button
              key={g.v}
              type="button"
              size="sm"
              variant={genderChoice === g.v ? "default" : "outline"}
              onClick={() => setGender(g.v)}
            >
              {g.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Detailed targeting — interests */}
      <div className="space-y-1.5">
        <Label>Detailed targeting — interests</Label>
        <TagPicker
          values={value.interests ?? []}
          onChange={(next) => set({ interests: next })}
          suggestions={INTEREST_SUGGESTIONS}
          placeholder="Search interests (e.g. Cricket, Cooking)"
          addLabel="Add interest"
        />
        <p className="text-xs text-muted-foreground">
          People interested in these topics will see your ad.
        </p>
      </div>

      {/* Languages */}
      <div className="space-y-1.5">
        <Label>Languages</Label>
        <TagPicker
          values={value.languages ?? []}
          onChange={(next) => set({ languages: next })}
          suggestions={LANGUAGE_SUGGESTIONS}
          placeholder="Search languages (e.g. Bangla)"
          addLabel="Add language"
        />
      </div>
    </div>
  );
}
