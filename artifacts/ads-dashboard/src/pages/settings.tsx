import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useUpdateAdAccount,
  getListAdAccountsQueryKey,
  type AdAccountUpdate,
} from "@workspace/api-client-react";
import { useAccount } from "@/lib/account-context";
import { useToast } from "@/hooks/use-toast";
import { NoAccount } from "@/components/no-account";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Status = NonNullable<AdAccountUpdate["status"]>;
const STATUSES: Status[] = ["active", "suspended", "closed"];

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
          toast({ title: "Settings save hoyeche" });
        },
        onError: (err) =>
          toast({
            title: "Save hoyni",
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
          Ad account er tottho update korun.
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
              {update.isPending ? "Save hocche..." : "Save changes"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
