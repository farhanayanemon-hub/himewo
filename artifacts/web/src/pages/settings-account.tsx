import { useState } from "react";
import { SettingsShell, SettingsCard, SettingsRow } from "@/components/settings/settings-shell";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";
import { toast } from "sonner";
import { useUpdateMyProfile } from "@workspace/api-client-react";

const DAY_MS = 24 * 60 * 60 * 1000;
const USERNAME_COOLDOWN_DAYS = 30;
const DISPLAY_NAME_COOLDOWN_DAYS = 60;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function cooldownInfo(changedAt: string | null | undefined, days: number) {
  if (!changedAt) return { locked: false, lastChanged: null, nextAllowed: null };
  const changed = new Date(changedAt);
  const next = new Date(changed.getTime() + days * DAY_MS);
  return {
    locked: Date.now() < next.getTime(),
    lastChanged: formatDate(changedAt),
    nextAllowed: formatDate(next.toISOString()),
  };
}

function errorMessage(err: unknown, fallback: string) {
  if (err && typeof err === "object") {
    const data = (err as { data?: unknown }).data;
    if (data && typeof data === "object") {
      const msg = (data as { error?: unknown }).error;
      if (typeof msg === "string" && msg.length) return msg;
    }
  }
  return fallback;
}

function EditableRow({
  title,
  currentValue,
  displayValue,
  hint,
  locked,
  lockedHint,
  placeholder,
  normalize,
  onSave,
  saving,
}: {
  title: string;
  currentValue: string;
  displayValue: string;
  hint: string | null;
  locked: boolean;
  lockedHint: string | null;
  placeholder: string;
  normalize?: (v: string) => string;
  onSave: (value: string) => void;
  saving: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(currentValue);

  return (
    <div className="px-5 py-4">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="font-medium">{title}</p>
          {!editing ? (
            <p className="text-sm text-muted-foreground mt-0.5 truncate">{displayValue}</p>
          ) : null}
        </div>
        {!editing ? (
          <Button
            variant="outline"
            size="sm"
            disabled={locked}
            onClick={() => {
              setValue(currentValue);
              setEditing(true);
            }}
          >
            Edit
          </Button>
        ) : null}
      </div>
      {editing ? (
        <div className="mt-3 space-y-2">
          <Input
            value={value}
            placeholder={placeholder}
            onChange={(e) =>
              setValue(normalize ? normalize(e.target.value) : e.target.value)
            }
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={saving || !value.trim() || value.trim() === currentValue}
              onClick={() => onSave(value.trim())}
            >
              {saving ? "Saving..." : "Save"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={saving}
              onClick={() => setEditing(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : null}
      {locked && lockedHint ? (
        <p className="text-xs text-muted-foreground mt-2">{lockedHint}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground mt-2">{hint}</p>
      ) : null}
    </div>
  );
}

export default function SettingsAccountPage() {
  const { user, refreshUser } = useAuth();
  const updateProfile = useUpdateMyProfile();
  const [savingField, setSavingField] = useState<"username" | "displayName" | null>(null);

  const usernameCd = cooldownInfo(user?.usernameChangedAt, USERNAME_COOLDOWN_DAYS);
  const nameCd = cooldownInfo(user?.displayNameChangedAt, DISPLAY_NAME_COOLDOWN_DAYS);

  const save = (field: "username" | "displayName", value: string) => {
    setSavingField(field);
    updateProfile.mutate(
      { data: { [field]: value } },
      {
        onSuccess: async () => {
          await refreshUser();
          toast.success(field === "username" ? "Username updated" : "Name updated");
          setSavingField(null);
        },
        onError: (err) => {
          toast.error(
            errorMessage(
              err,
              field === "username" ? "Failed to update username" : "Failed to update name",
            ),
          );
          setSavingField(null);
        },
      },
    );
  };

  return (
    <SettingsShell
      title="Account Center"
      description="Your personal details and account info"
    >
      <SettingsCard title="Personal details">
        <EditableRow
          title="Name"
          currentValue={user?.displayName || ""}
          displayValue={user?.displayName || "—"}
          hint={
            nameCd.lastChanged
              ? `Last changed on ${nameCd.lastChanged}. Names can be changed once every ${DISPLAY_NAME_COOLDOWN_DAYS} days.`
              : `Names can be changed once every ${DISPLAY_NAME_COOLDOWN_DAYS} days.`
          }
          locked={nameCd.locked}
          lockedHint={
            nameCd.locked
              ? `Last changed on ${nameCd.lastChanged}. You can change your name again on ${nameCd.nextAllowed}.`
              : null
          }
          placeholder="Your name"
          onSave={(v) => save("displayName", v)}
          saving={savingField === "displayName"}
        />
        <EditableRow
          title="Username"
          currentValue={user?.username || ""}
          displayValue={user?.username ? `@${user.username} — himewo.com/${user.username}` : "—"}
          hint={
            usernameCd.lastChanged
              ? `Last changed on ${usernameCd.lastChanged}. Usernames can be changed once every ${USERNAME_COOLDOWN_DAYS} days.`
              : `Your profile link is himewo.com/${user?.username || "username"}. Usernames can be changed once every ${USERNAME_COOLDOWN_DAYS} days.`
          }
          locked={usernameCd.locked}
          lockedHint={
            usernameCd.locked
              ? `Last changed on ${usernameCd.lastChanged}. You can change your username again on ${usernameCd.nextAllowed}.`
              : null
          }
          placeholder="username"
          normalize={(v) => v.toLowerCase().replace(/[^a-z0-9._]/g, "")}
          onSave={(v) => save("username", v)}
          saving={savingField === "username"}
        />
        {user?.email ? (
          <SettingsRow title="Email" control={<span className="text-muted-foreground">{user.email}</span>} />
        ) : null}
        {user?.phone ? (
          <SettingsRow title="Phone" control={<span className="text-muted-foreground">{user.phone}</span>} />
        ) : null}
      </SettingsCard>

      <SettingsCard>
        <div className="px-5 py-4 flex items-center justify-between gap-4">
          <div>
            <p className="font-medium">Edit your profile</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              Update your bio, photo, work, and education
            </p>
          </div>
          <Link href="/edit-profile">
            <Button variant="outline">Edit profile</Button>
          </Link>
        </div>
      </SettingsCard>
    </SettingsShell>
  );
}
