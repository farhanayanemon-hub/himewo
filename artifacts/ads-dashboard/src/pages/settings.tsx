import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useUpdateAdAccount,
  useTransferAdAccount,
  useSearchUsers,
  getListAdAccountsQueryKey,
  getSearchUsersQueryKey,
  type AdAccountUpdate,
  type Profile,
} from "@workspace/api-client-react";
import { useAccount } from "@/lib/account-context";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { NoAccount } from "@/components/no-account";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Status = NonNullable<AdAccountUpdate["status"]>;
const STATUSES: Status[] = ["active", "suspended", "closed"];

function TransferOwnershipCard() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { selectedAccount } = useAccount();
  const { user } = useAuth();
  const transfer = useTransferAdAccount();

  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Profile | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const q = query.trim();
  const { data: results } = useSearchUsers(
    { q, limit: 6 },
    {
      query: {
        enabled: q.length >= 2 && !selected,
        queryKey: getSearchUsersQueryKey({ q, limit: 6 }),
      },
    },
  );

  if (!selectedAccount || !user || selectedAccount.ownerId !== user.id) {
    return null;
  }

  const doTransfer = () => {
    if (!selected) return;
    transfer.mutate(
      { id: selectedAccount.id, data: { userId: selected.id } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListAdAccountsQueryKey() });
          setConfirmOpen(false);
          setSelected(null);
          setQuery("");
          toast({ title: "Ownership transferred" });
        },
        onError: (err) =>
          toast({
            title: "Couldn't transfer",
            description: err instanceof Error ? err.message : "Try again.",
            variant: "destructive",
          }),
      },
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Transfer ownership</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Hand this ad account over to another person. You will stay on the
          account as an admin.
        </p>
        {selected ? (
          <div className="flex items-center justify-between rounded-lg border p-2">
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={selected.avatarUrl ?? undefined} />
                <AvatarFallback>
                  {selected.displayName.slice(0, 1).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="text-sm">
                <div className="font-medium">{selected.displayName}</div>
                <div className="text-xs text-muted-foreground">
                  @{selected.username}
                </div>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>
              Change
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <Label>New owner</Label>
            <Input
              placeholder="Search people by name or username..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {q.length >= 2 && (results ?? []).length > 0 && (
              <div className="divide-y rounded-lg border">
                {(results ?? [])
                  .filter((p) => p.id !== user.id)
                  .map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className="flex w-full items-center gap-2 p-2 text-left hover:bg-muted"
                      onClick={() => setSelected(p)}
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={p.avatarUrl ?? undefined} />
                        <AvatarFallback>
                          {p.displayName.slice(0, 1).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="text-sm">
                        <div className="font-medium">{p.displayName}</div>
                        <div className="text-xs text-muted-foreground">
                          @{p.username}
                        </div>
                      </div>
                    </button>
                  ))}
              </div>
            )}
          </div>
        )}
        <Button
          variant="destructive"
          disabled={!selected || transfer.isPending}
          onClick={() => setConfirmOpen(true)}
        >
          Transfer ownership
        </Button>
        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Transfer this ad account?</AlertDialogTitle>
              <AlertDialogDescription>
                {selected
                  ? `${selected.displayName} (@${selected.username}) will become the new owner of "${selectedAccount.name}". You will remain as an admin.`
                  : ""}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={doTransfer}
                disabled={transfer.isPending}
              >
                {transfer.isPending ? "Transferring..." : "Yes, transfer"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}

export default function SettingsPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { selectedAccountId, selectedAccount } = useAccount();
  const update = useUpdateAdAccount();

  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("");
  const [timezone, setTimezone] = useState("");
  const [status, setStatus] = useState<Status>("active");

  useEffect(() => {
    if (selectedAccount) {
      setName(selectedAccount.name);
      setCurrency(selectedAccount.currency);
      setTimezone(selectedAccount.timezone);
      setStatus(selectedAccount.status as Status);
    }
  }, [selectedAccount]);

  if (selectedAccountId == null || !selectedAccount) return <NoAccount />;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const data: AdAccountUpdate = {
      name: name.trim(),
      currency: currency.trim(),
      timezone: timezone.trim(),
      status,
    };
    update.mutate(
      { id: selectedAccount.id, data },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListAdAccountsQueryKey() });
          toast({ title: "Settings saved" });
        },
        onError: (err) =>
          toast({
            title: "Couldn't save",
            description: err instanceof Error ? err.message : "Try again.",
            variant: "destructive",
          }),
      },
    );
  };

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Account Settings</h1>
        <p className="text-sm text-muted-foreground">
          Update your ad account details.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{selectedAccount.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Currency</Label>
                <Input
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Timezone</Label>
                <Input
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as Status)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={update.isPending}>
              {update.isPending ? "Saving..." : "Save changes"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <TransferOwnershipCard />
    </div>
  );
}
