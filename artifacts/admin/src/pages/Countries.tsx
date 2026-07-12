import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Save, Search, Ban } from "lucide-react";
import { COUNTRIES, countryFlagUrl } from "@workspace/countries";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import type { SettingsResponse } from "../lib/types";
import {
  Button,
  Card,
  CardHeader,
  ErrorNote,
  Input,
  Loading,
  Toggle,
} from "../components/ui";
import { PageHeader } from "../components/Layout";

const SETTING_KEY = "blocked_signup_countries";

function parseBlocked(raw: string | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((c): c is string => typeof c === "string").map((c) => c.toUpperCase())
      : [];
  } catch {
    return [];
  }
}

export function Countries() {
  const { can } = useAuth();
  const qc = useQueryClient();
  const canManage = can("settings.manage");

  const query = useQuery({
    queryKey: ["settings"],
    queryFn: () => api.get<SettingsResponse>("/admin/settings"),
  });

  const save = useMutation({
    mutationFn: (codes: string[]) =>
      api.put(`/admin/settings/${SETTING_KEY}`, { value: JSON.stringify(codes) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["settings"] }),
  });

  const [blocked, setBlocked] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (query.data) {
      setBlocked(new Set(parseBlocked(query.data.settings[SETTING_KEY])));
    }
  }, [query.data]);

  const savedBlocked = useMemo(
    () => new Set(parseBlocked(query.data?.settings[SETTING_KEY])),
    [query.data],
  );
  const dirty = useMemo(() => {
    if (blocked.size !== savedBlocked.size) return true;
    for (const c of blocked) if (!savedBlocked.has(c)) return true;
    return false;
  }, [blocked, savedBlocked]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.dialCode.includes(q),
    );
  }, [search]);

  function toggle(code: string, allowed: boolean) {
    setBlocked((prev) => {
      const next = new Set(prev);
      if (allowed) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  return (
    <div>
      <PageHeader
        title="Signup countries"
        description="Block specific countries from creating new phone accounts. Blocked countries are hidden in the signup country picker and rejected server-side. Existing users are never affected."
        action={
          <Button
            disabled={!canManage || !dirty}
            loading={save.isPending}
            onClick={() => save.mutate([...blocked])}
          >
            <Save className="mr-1.5 h-4 w-4" /> Save changes
          </Button>
        }
      />

      <ErrorNote error={query.error || save.error} />
      {query.isLoading && <Loading />}

      {query.data && (
        <Card>
          <CardHeader
            title="Countries"
            subtitle={
              blocked.size === 0
                ? "All countries are currently allowed."
                : `${blocked.size} ${blocked.size === 1 ? "country" : "countries"} blocked from phone signup.`
            }
          />
          <div className="px-5 py-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search country, code or dial code…"
                className="pl-9"
              />
            </div>
          </div>
          <div className="max-h-[60vh] divide-y divide-slate-50 overflow-y-auto">
            {filtered.map((c) => {
              const isBlocked = blocked.has(c.code);
              return (
                <div
                  key={c.code}
                  className="flex items-center justify-between gap-3 px-5 py-2.5"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <img
                      src={countryFlagUrl(c.code)}
                      alt=""
                      width={24}
                      height={18}
                      className="h-[18px] w-6 shrink-0 rounded-sm object-cover ring-1 ring-slate-200"
                      loading="lazy"
                    />
                    <span className="truncate text-sm text-slate-700">{c.name}</span>
                    <span className="shrink-0 text-xs text-slate-400">{c.dialCode}</span>
                    {isBlocked && (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-600">
                        <Ban className="h-3 w-3" /> Blocked
                      </span>
                    )}
                  </div>
                  <Toggle
                    checked={!isBlocked}
                    disabled={!canManage}
                    onChange={(allowed) => toggle(c.code, allowed)}
                  />
                </div>
              );
            })}
            {filtered.length === 0 && (
              <p className="px-5 py-6 text-center text-sm text-slate-400">
                No country matches “{search}”.
              </p>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
