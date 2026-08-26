import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useCreateAdAccount,
  getListAdAccountsQueryKey,
  type AdAccountInput,
} from "@workspace/api-client-react";
import { useAccount } from "@/lib/account-context";
import { formatCents } from "@/lib/money";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Check, Copy, Building2, Phone, FileText, Hash } from "lucide-react";

const CURRENCIES = [
  { code: "USD", label: "USD - US Dollar ($)" },
  { code: "BDT", label: "BDT - Bangladeshi Taka (৳)" },
  { code: "EUR", label: "EUR - Euro (€)" },
  { code: "GBP", label: "GBP - British Pound (£)" },
  { code: "INR", label: "INR - Indian Rupee (₹)" },
  { code: "CAD", label: "CAD - Canadian Dollar ($)" },
  { code: "AUD", label: "AUD - Australian Dollar ($)" },
  { code: "AED", label: "AED - UAE Dirham" },
  { code: "SAR", label: "SAR - Saudi Riyal" },
  { code: "SGD", label: "SGD - Singapore Dollar" },
  { code: "MYR", label: "MYR - Malaysian Ringgit" },
];

const TIMEZONES = [
  { value: "Asia/Dhaka", label: "(GMT+06:00) Dhaka, Bangladesh" },
  { value: "Asia/Kolkata", label: "(GMT+05:30) Mumbai, Kolkata, New Delhi" },
  { value: "Asia/Dubai", label: "(GMT+04:00) Dubai, Abu Dhabi, UAE" },
  { value: "Asia/Riyadh", label: "(GMT+03:00) Riyadh, Saudi Arabia" },
  { value: "Europe/London", label: "(GMT+00:00) London, Dublin, Edinburgh" },
  { value: "Europe/Paris", label: "(GMT+01:00) Paris, Berlin, Rome, Madrid" },
  { value: "America/New_York", label: "(GMT-05:00) Eastern Time (US & Canada)" },
  { value: "America/Chicago", label: "(GMT-06:00) Central Time (US & Canada)" },
  { value: "America/Denver", label: "(GMT-07:00) Mountain Time (US & Canada)" },
  { value: "America/Los_Angeles", label: "(GMT-08:00) Pacific Time (US & Canada)" },
  { value: "Asia/Singapore", label: "(GMT+08:00) Singapore, Kuala Lumpur" },
  { value: "Asia/Tokyo", label: "(GMT+09:00) Tokyo, Osaka, Seoul" },
  { value: "Australia/Sydney", label: "(GMT+10:00) Sydney, Melbourne" },
  { value: "UTC", label: "(GMT+00:00) UTC Universal Coordinated Time" },
];

const guessTz = () => {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (TIMEZONES.some((t) => t.value === tz)) return tz;
    return "Asia/Dhaka";
  } catch {
    return "Asia/Dhaka";
  }
};

export default function AccountsPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { accounts, isLoading, selectedAccountId, setSelectedAccountId } =
    useAccount();
  const create = useCreateAdAccount();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [tin, setTin] = useState("");
  const [bin, setBin] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [timezone, setTimezone] = useState(guessTz());

  const copyId = (idStr: string) => {
    navigator.clipboard.writeText(idStr);
    toast({ title: "Ad Account ID copied to clipboard!" });
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const data: AdAccountInput = {
      name: name.trim(),
      phone: phone.trim() || undefined,
      businessAddress: businessAddress.trim() || undefined,
      tin: tin.trim() || undefined,
      bin: bin.trim() || undefined,
      currency: currency.trim() || "USD",
      timezone: timezone.trim() || "UTC",
    };
    create.mutate(
      { data },
      {
        onSuccess: (acc) => {
          qc.invalidateQueries({ queryKey: getListAdAccountsQueryKey() });
          setSelectedAccountId(acc.id);
          setOpen(false);
          setName("");
          setPhone("");
          setBusinessAddress("");
          setTin("");
          setBin("");
          toast({
            title: "Ad Account Created Successfully!",
            description: `Account ID: ${acc.accountNumber || acc.id}`,
          });
        },
        onError: (err) =>
          toast({
            title: "Couldn't create ad account",
            description: err instanceof Error ? err.message : "Please try again.",
            variant: "destructive",
          }),
      },
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Ad Accounts</h1>
          <p className="text-sm text-muted-foreground">
            Manage your HiMewo ad accounts, billing and business profiles.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="new-account" className="aurora-button text-white">
              <Plus className="mr-2 h-4 w-4" /> Create Ad Account
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl">Create New Ad Account</DialogTitle>
            </DialogHeader>
            <form onSubmit={submit} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label htmlFor="acc-name">Account Name *</Label>
                <Input
                  id="acc-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. My Business Agency Ads"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="acc-phone">Business Phone Number *</Label>
                <Input
                  id="acc-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+880 1XXX XXXXXX"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="acc-address">Business Address *</Label>
                <Textarea
                  id="acc-address"
                  value={businessAddress}
                  onChange={(e) => setBusinessAddress(e.target.value)}
                  placeholder="Street, City, Postal Code, Country"
                  rows={2}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="acc-tin">TIN Number</Label>
                    <span className="text-[10px] text-muted-foreground">Optional</span>
                  </div>
                  <Input
                    id="acc-tin"
                    value={tin}
                    onChange={(e) => setTin(e.target.value)}
                    placeholder="Tax ID / TIN"
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="acc-bin">BIN Number</Label>
                    <span className="text-[10px] text-muted-foreground">Optional</span>
                  </div>
                  <Input
                    id="acc-bin"
                    value={bin}
                    onChange={(e) => setBin(e.target.value)}
                    placeholder="Business ID / BIN"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="acc-cur">Currency</Label>
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger id="acc-cur">
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map((c) => (
                        <SelectItem key={c.code} value={c.code}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="acc-tz">Timezone</Label>
                  <Select value={timezone} onValueChange={setTimezone}>
                    <SelectTrigger id="acc-tz">
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent className="max-h-56">
                      {TIMEZONES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
                <p>✨ A unique <strong>15-16 digit Ad Account ID</strong> will be generated automatically for this account.</p>
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="submit"
                  disabled={create.isPending}
                  className="w-full aurora-button text-white h-11 text-base font-semibold"
                >
                  {create.isPending ? "Creating Ad Account..." : "Create Ad Account"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading ad accounts...</p>
      ) : accounts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No ad accounts yet. Click <strong>"Create Ad Account"</strong> to get started.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {accounts.map((a) => {
            const active = a.id === selectedAccountId;
            const displayId = a.accountNumber || `${a.id}`.padStart(16, "0");
            return (
              <Card
                key={a.id}
                className={`transition-all ${active ? "border-primary ring-2 ring-primary/40 shadow-md" : "hover:border-primary/50"}`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-base font-bold">{a.name}</CardTitle>
                      <button
                        type="button"
                        onClick={() => copyId(displayId)}
                        className="inline-flex items-center gap-1 mt-1 text-xs font-mono font-medium text-muted-foreground hover:text-primary transition-colors bg-muted/60 px-2 py-0.5 rounded"
                        title="Click to copy Ad Account ID"
                      >
                        <Hash className="h-3 w-3 text-primary" />
                        ID: {displayId}
                        <Copy className="h-2.5 w-2.5 ml-0.5 opacity-70" />
                      </button>
                    </div>
                    <Badge variant={a.status === "active" ? "default" : "secondary"} className="capitalize">
                      {a.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm text-muted-foreground">
                    Available Balance:{" "}
                    <span className="font-bold text-foreground">
                      {formatCents(a.balanceCents, a.currency)}
                    </span>
                  </div>

                  <div className="text-xs text-muted-foreground space-y-1 border-t pt-2">
                    <div className="flex items-center justify-between">
                      <span>Currency & TZ:</span>
                      <span className="font-medium text-foreground">{a.currency} · {a.timezone}</span>
                    </div>
                    {a.phone && (
                      <div className="flex items-center gap-1 truncate">
                        <Phone className="h-3 w-3 shrink-0" />
                        <span className="truncate">{a.phone}</span>
                      </div>
                    )}
                    {a.businessAddress && (
                      <div className="flex items-center gap-1 truncate">
                        <Building2 className="h-3 w-3 shrink-0" />
                        <span className="truncate">{a.businessAddress}</span>
                      </div>
                    )}
                    {(a.tin || a.bin) && (
                      <div className="flex items-center gap-2">
                        {a.tin && <span className="font-mono">TIN: {a.tin}</span>}
                        {a.bin && <span className="font-mono">BIN: {a.bin}</span>}
                      </div>
                    )}
                  </div>

                  <Button
                    variant={active ? "default" : "outline"}
                    className={`w-full ${active ? "aurora-button text-white" : ""}`}
                    onClick={() => setSelectedAccountId(a.id)}
                  >
                    {active ? (
                      <>
                        <Check className="mr-2 h-4 w-4" /> Currently Selected
                      </>
                    ) : (
                      "Switch to this Account"
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
