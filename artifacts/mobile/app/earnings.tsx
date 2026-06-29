import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetEarningsSummary,
  getGetEarningsSummaryQueryKey,
  useGetEarningsHistory,
  getGetEarningsHistoryQueryKey,
  useListWithdrawalAccounts,
  getListWithdrawalAccountsQueryKey,
  useAddWithdrawalAccount,
  useDeleteWithdrawalAccount,
  useListMyWithdrawals,
  getListMyWithdrawalsQueryKey,
  useCreateWithdrawal,
  type EarningsSummary,
  type PointTransaction,
  type WithdrawalAccount,
  type WithdrawalRequest,
} from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";

type MethodField = {
  key: string;
  label: string;
  keyboard?: "default" | "email-address" | "phone-pad";
  placeholder?: string;
};
type MethodConfig = {
  value: string;
  label: string;
  fields: MethodField[];
  guide: string;
};

const METHODS: MethodConfig[] = [
  {
    value: "paypal",
    label: "PayPal",
    fields: [
      { key: "email", label: "PayPal email", keyboard: "email-address", placeholder: "you@example.com" },
    ],
    guide: "Use the email address tied to your PayPal account.",
  },
  {
    value: "wise",
    label: "Wise",
    fields: [
      { key: "email", label: "Wise email", keyboard: "email-address", placeholder: "you@example.com" },
    ],
    guide: "Open a free Wise account and use its registered email.",
  },
  {
    value: "binance",
    label: "Binance",
    fields: [
      { key: "payId", label: "Binance Pay ID or email", placeholder: "Pay ID / email" },
    ],
    guide: "Find your Binance Pay ID under Binance → Pay → profile.",
  },
  {
    value: "bybit",
    label: "Bybit",
    fields: [{ key: "uid", label: "Bybit UID", placeholder: "Your Bybit UID" }],
    guide: "Your UID is shown at the top of the Bybit app home screen.",
  },
  {
    value: "bkash",
    label: "bKash",
    fields: [{ key: "phone", label: "bKash number", keyboard: "phone-pad", placeholder: "01XXXXXXXXX" }],
    guide: "Use your personal bKash wallet number.",
  },
  {
    value: "nagad",
    label: "Nagad",
    fields: [{ key: "phone", label: "Nagad number", keyboard: "phone-pad", placeholder: "01XXXXXXXXX" }],
    guide: "Use your personal Nagad wallet number.",
  },
];

const ACTION_LABELS: Record<string, string> = {
  post: "Created a post",
  like: "Reacted to a post",
  comment: "Commented on a post",
  share: "Shared a post",
  withdraw: "Withdrawal",
  withdraw_refund: "Withdrawal refund",
  admin_adjust: "Admin adjustment",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "#d97706",
  approved: "#2563eb",
  paid: "#16a34a",
  rejected: "#dc2626",
};

const POSITIVE = "#16a34a";

function usd(n: number): string {
  return `$${n.toFixed(2)}`;
}
function pointsToUsd(points: number, rate: number): number {
  return rate > 0 ? points / rate : 0;
}
function methodLabel(value: string): string {
  return METHODS.find((m) => m.value === value)?.label ?? value;
}
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function EarningsScreen() {
  const c = useColors();
  const { data: summary, isLoading } = useGetEarningsSummary();
  const redirected = useRef(false);

  // When the system is OFF, the whole experience is hidden. Redirect
  // deterministically (back() can no-op on a deep link / cold start, which
  // would otherwise trap the user on the loading spinner).
  useEffect(() => {
    if (isLoading || redirected.current) return;
    if (!summary || !summary.enabled) {
      redirected.current = true;
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace("/(tabs)/menu");
      }
    }
  }, [isLoading, summary]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }}>
      <View style={[styles.header, { borderBottomColor: c.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={c.foreground} />
        </Pressable>
        <Text style={{ color: c.foreground, fontFamily: "Inter_700Bold", fontSize: 18 }}>
          Earnings
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {isLoading || !summary || !summary.enabled ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={c.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48, gap: 16 }}>
          <BalanceHeader summary={summary} />
          <RulesSection summary={summary} />
          <AccountsSection />
          <WithdrawSection summary={summary} />
          <HistorySection rate={summary.pointsPerDollar} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function Card({ children, style }: { children: React.ReactNode; style?: object }) {
  const c = useColors();
  return (
    <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }, style]}>
      {children}
    </View>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  const c = useColors();
  return (
    <Text style={{ color: c.foreground, fontFamily: "Inter_700Bold", fontSize: 16, marginBottom: 10 }}>
      {children}
    </Text>
  );
}

function BalanceHeader({ summary }: { summary: EarningsSummary }) {
  const c = useColors();
  const rate = summary.pointsPerDollar;
  return (
    <Card style={{ backgroundColor: c.primary + "14" }}>
      <Text style={{ color: c.mutedForeground, fontFamily: "Inter_500Medium", fontSize: 13 }}>
        Available balance
      </Text>
      <Text style={{ color: c.foreground, fontFamily: "Inter_700Bold", fontSize: 36, marginTop: 2 }}>
        {usd(summary.balanceDollars)}
      </Text>
      <Text style={{ color: c.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 }}>
        {summary.balancePoints.toLocaleString()} points
        {summary.pendingWithdrawalDollars > 0
          ? ` · ${usd(summary.pendingWithdrawalDollars)} pending`
          : ""}
      </Text>

      <View style={{ flexDirection: "row", gap: 12, marginTop: 16 }}>
        <StatBox
          icon="trending-up"
          label="Today"
          value={usd(pointsToUsd(summary.todayPoints, rate))}
          sub={`${summary.todayPoints.toLocaleString()} pts`}
        />
        <StatBox
          icon="calendar-outline"
          label="This month"
          value={usd(pointsToUsd(summary.monthPoints, rate))}
          sub={`${summary.monthPoints.toLocaleString()} pts`}
        />
      </View>
    </Card>
  );
}

function StatBox({
  icon,
  label,
  value,
  sub,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  sub: string;
}) {
  const c = useColors();
  return (
    <View style={{ flex: 1, backgroundColor: c.background, borderRadius: 10, padding: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
        <Ionicons name={icon} size={13} color={c.mutedForeground} />
        <Text style={{ color: c.mutedForeground, fontFamily: "Inter_500Medium", fontSize: 12 }}>
          {label}
        </Text>
      </View>
      <Text style={{ color: c.foreground, fontFamily: "Inter_700Bold", fontSize: 16, marginTop: 2 }}>
        {value}
      </Text>
      <Text style={{ color: c.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 11 }}>
        {sub}
      </Text>
    </View>
  );
}

function RulesSection({ summary }: { summary: EarningsSummary }) {
  const c = useColors();
  const rate = summary.pointsPerDollar;
  const rules = [
    { label: "Create a post", points: summary.rewards.post },
    { label: "React to a post", points: summary.rewards.like },
    { label: "Comment on a post", points: summary.rewards.comment },
    { label: "Share a post", points: summary.rewards.share },
  ];
  return (
    <Card>
      <SectionTitle>How it works</SectionTitle>
      <Text style={{ color: c.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 19, marginBottom: 12 }}>
        Earn points for engaging with posts. Every {rate.toLocaleString()} points = $1. You can
        request a payout once you reach {usd(summary.minWithdrawDollars)}.
      </Text>
      <View style={{ gap: 8 }}>
        {rules.map((r) => (
          <View
            key={r.label}
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              backgroundColor: c.background,
              borderRadius: 10,
              paddingHorizontal: 12,
              paddingVertical: 10,
            }}
          >
            <Text style={{ color: c.foreground, fontFamily: "Inter_500Medium", fontSize: 14 }}>
              {r.label}
            </Text>
            <Text style={{ color: c.primary, fontFamily: "Inter_700Bold", fontSize: 14 }}>
              +{r.points}
            </Text>
          </View>
        ))}
      </View>
      {summary.dailyPointCap ? (
        <Text style={{ color: c.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 10 }}>
          You can earn up to {summary.dailyPointCap.toLocaleString()} points per day.
        </Text>
      ) : null}
    </Card>
  );
}

function AccountsSection() {
  const c = useColors();
  const qc = useQueryClient();
  const { data: accounts, isLoading } = useListWithdrawalAccounts();
  const add = useAddWithdrawalAccount();
  const remove = useDeleteWithdrawalAccount();

  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState(METHODS[0].value);
  const [fields, setFields] = useState<Record<string, string>>({});

  const config = METHODS.find((m) => m.value === method)!;

  const resetForm = () => {
    setMethod(METHODS[0].value);
    setFields({});
    setOpen(false);
  };

  const submit = () => {
    const missing = config.fields.find((f) => !(fields[f.key] ?? "").trim());
    if (missing) {
      Alert.alert("Missing info", `Please enter your ${missing.label.toLowerCase()}.`);
      return;
    }
    const details: Record<string, string> = {};
    for (const f of config.fields) details[f.key] = fields[f.key].trim();
    add.mutate(
      { data: { method: config.value as never, label: config.label, details } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListWithdrawalAccountsQueryKey() });
          resetForm();
        },
        onError: () => Alert.alert("Error", "Couldn't add account. Please try again."),
      },
    );
  };

  const onRemove = (acc: WithdrawalAccount) => {
    Alert.alert("Remove account", `Remove this ${methodLabel(acc.method)} account?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () =>
          remove.mutate(
            { id: acc.id },
            {
              onSuccess: () =>
                qc.invalidateQueries({ queryKey: getListWithdrawalAccountsQueryKey() }),
              onError: () => Alert.alert("Error", "Couldn't remove account."),
            },
          ),
      },
    ]);
  };

  const inputStyle = {
    color: c.foreground,
    fontFamily: "Inter_400Regular" as const,
    fontSize: 15,
    backgroundColor: c.background,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
  };

  return (
    <Card>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <SectionTitle>Payout accounts</SectionTitle>
        {!open && (
          <Pressable
            onPress={() => setOpen(true)}
            style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
            hitSlop={8}
          >
            <Ionicons name="add" size={18} color={c.primary} />
            <Text style={{ color: c.primary, fontFamily: "Inter_600SemiBold", fontSize: 14 }}>Add</Text>
          </Pressable>
        )}
      </View>

      {isLoading ? (
        <ActivityIndicator color={c.primary} style={{ paddingVertical: 12 }} />
      ) : accounts && accounts.length > 0 ? (
        <View style={{ gap: 8 }}>
          {accounts.map((acc) => (
            <View
              key={acc.id}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                backgroundColor: c.background,
                borderRadius: 10,
                paddingHorizontal: 12,
                paddingVertical: 10,
              }}
            >
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={{ color: c.foreground, fontFamily: "Inter_600SemiBold", fontSize: 14 }}>
                  {methodLabel(acc.method)}
                </Text>
                <Text
                  style={{ color: c.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 12 }}
                  numberOfLines={1}
                >
                  {Object.values(acc.details).join(" · ") || "—"}
                </Text>
              </View>
              <Pressable onPress={() => onRemove(acc)} hitSlop={8} disabled={remove.isPending}>
                <Ionicons name="trash-outline" size={18} color={c.destructive} />
              </Pressable>
            </View>
          ))}
        </View>
      ) : !open ? (
        <Text style={{ color: c.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 13 }}>
          No payout accounts yet. Add one to request a withdrawal.
        </Text>
      ) : null}

      {open && (
        <View style={{ marginTop: 12, borderTopColor: c.border, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 14, gap: 12 }}>
          <Text style={{ color: c.mutedForeground, fontFamily: "Inter_500Medium", fontSize: 12 }}>
            Method
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {METHODS.map((m) => {
              const active = m.value === method;
              return (
                <Pressable
                  key={m.value}
                  onPress={() => {
                    setMethod(m.value);
                    setFields({});
                  }}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 20,
                    backgroundColor: active ? c.primary : c.background,
                    borderWidth: StyleSheet.hairlineWidth,
                    borderColor: active ? c.primary : c.border,
                  }}
                >
                  <Text
                    style={{
                      color: active ? c.primaryForeground : c.foreground,
                      fontFamily: "Inter_600SemiBold",
                      fontSize: 13,
                    }}
                  >
                    {m.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {config.fields.map((f) => (
            <View key={f.key}>
              <Text style={{ color: c.mutedForeground, fontFamily: "Inter_500Medium", fontSize: 12, marginBottom: 4 }}>
                {f.label}
              </Text>
              <TextInput
                value={fields[f.key] ?? ""}
                onChangeText={(v) => setFields((prev) => ({ ...prev, [f.key]: v }))}
                placeholder={f.placeholder}
                placeholderTextColor={c.mutedForeground}
                keyboardType={f.keyboard ?? "default"}
                autoCapitalize="none"
                style={inputStyle}
              />
            </View>
          ))}

          <Text style={{ color: c.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 12 }}>
            {config.guide}
          </Text>

          <View style={{ flexDirection: "row", gap: 8 }}>
            <Pressable
              onPress={submit}
              disabled={add.isPending}
              style={{
                flex: 1,
                backgroundColor: c.primary,
                borderRadius: 10,
                paddingVertical: 12,
                alignItems: "center",
                opacity: add.isPending ? 0.7 : 1,
              }}
            >
              {add.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ color: "#fff", fontFamily: "Inter_700Bold", fontSize: 14 }}>
                  Save account
                </Text>
              )}
            </Pressable>
            <Pressable
              onPress={resetForm}
              style={{ paddingHorizontal: 16, justifyContent: "center" }}
            >
              <Text style={{ color: c.mutedForeground, fontFamily: "Inter_600SemiBold", fontSize: 14 }}>
                Cancel
              </Text>
            </Pressable>
          </View>
        </View>
      )}
    </Card>
  );
}

function WithdrawSection({ summary }: { summary: EarningsSummary }) {
  const c = useColors();
  const qc = useQueryClient();
  const { data: accounts } = useListWithdrawalAccounts();
  const { data: requests, isLoading } = useListMyWithdrawals();
  const create = useCreateWithdrawal();

  const [accountId, setAccountId] = useState<number | null>(null);
  const [amount, setAmount] = useState("");

  const maxWhole = Math.floor(summary.balanceDollars);
  const min = summary.minWithdrawDollars;
  const hasAccounts = (accounts?.length ?? 0) > 0;
  const canWithdraw = maxWhole >= min;

  const submit = () => {
    if (accountId == null) {
      Alert.alert("Pick an account", "Choose a payout account first.");
      return;
    }
    const value = Number(amount);
    if (!Number.isInteger(value) || value <= 0) {
      Alert.alert("Invalid amount", "Enter a whole dollar amount.");
      return;
    }
    if (value < min) {
      Alert.alert("Too low", `Minimum withdrawal is ${usd(min)}.`);
      return;
    }
    if (value > maxWhole) {
      Alert.alert("Not enough balance", `You can withdraw up to ${usd(maxWhole)}.`);
      return;
    }
    create.mutate(
      { data: { amountDollars: value, accountId } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListMyWithdrawalsQueryKey() });
          qc.invalidateQueries({ queryKey: getGetEarningsSummaryQueryKey() });
          qc.invalidateQueries({ queryKey: getGetEarningsHistoryQueryKey() });
          setAmount("");
          Alert.alert("Submitted", "Your withdrawal request was submitted.");
        },
        onError: () => Alert.alert("Error", "Couldn't submit. Please try again."),
      },
    );
  };

  const inputStyle = {
    color: c.foreground,
    fontFamily: "Inter_400Regular" as const,
    fontSize: 15,
    backgroundColor: c.background,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
  };

  return (
    <Card>
      <SectionTitle>Withdraw</SectionTitle>

      {!hasAccounts ? (
        <Text style={{ color: c.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 13 }}>
          Add a payout account above to request a withdrawal.
        </Text>
      ) : !canWithdraw ? (
        <Text style={{ color: c.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 13 }}>
          You need at least {usd(min)} to withdraw. Keep earning!
        </Text>
      ) : (
        <View style={{ gap: 12 }}>
          <View>
            <Text style={{ color: c.mutedForeground, fontFamily: "Inter_500Medium", fontSize: 12, marginBottom: 6 }}>
              Payout account
            </Text>
            <View style={{ gap: 8 }}>
              {accounts!.map((acc) => {
                const active = acc.id === accountId;
                return (
                  <Pressable
                    key={acc.id}
                    onPress={() => setAccountId(acc.id)}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      borderRadius: 10,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      backgroundColor: active ? c.primary + "14" : c.background,
                      borderWidth: 1,
                      borderColor: active ? c.primary : c.border,
                    }}
                  >
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <Text style={{ color: c.foreground, fontFamily: "Inter_600SemiBold", fontSize: 14 }}>
                        {methodLabel(acc.method)}
                      </Text>
                      <Text
                        style={{ color: c.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 12 }}
                        numberOfLines={1}
                      >
                        {Object.values(acc.details).join(" · ")}
                      </Text>
                    </View>
                    {active && <Ionicons name="checkmark-circle" size={20} color={c.primary} />}
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View>
            <Text style={{ color: c.mutedForeground, fontFamily: "Inter_500Medium", fontSize: 12, marginBottom: 4 }}>
              Amount (USD)
            </Text>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              placeholder={`${min}`}
              placeholderTextColor={c.mutedForeground}
              keyboardType="number-pad"
              style={inputStyle}
            />
            <Text style={{ color: c.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 4 }}>
              Min {usd(min)} · Available {usd(maxWhole)}
            </Text>
          </View>

          <Pressable
            onPress={submit}
            disabled={create.isPending}
            style={{
              backgroundColor: c.primary,
              borderRadius: 10,
              paddingVertical: 13,
              alignItems: "center",
              flexDirection: "row",
              justifyContent: "center",
              gap: 6,
              opacity: create.isPending ? 0.7 : 1,
            }}
          >
            {create.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="arrow-down-circle-outline" size={18} color="#fff" />
                <Text style={{ color: "#fff", fontFamily: "Inter_700Bold", fontSize: 15 }}>
                  Request withdrawal
                </Text>
              </>
            )}
          </Pressable>
        </View>
      )}

      <Text style={{ color: c.mutedForeground, fontFamily: "Inter_600SemiBold", fontSize: 13, marginTop: 18, marginBottom: 8 }}>
        Your requests
      </Text>
      {isLoading ? (
        <ActivityIndicator color={c.primary} style={{ paddingVertical: 8 }} />
      ) : requests && requests.length > 0 ? (
        <View style={{ gap: 8 }}>
          {requests.map((r) => (
            <WithdrawalRow key={r.id} request={r} />
          ))}
        </View>
      ) : (
        <Text style={{ color: c.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 13 }}>
          No requests yet.
        </Text>
      )}
    </Card>
  );
}

function WithdrawalRow({ request }: { request: WithdrawalRequest }) {
  const c = useColors();
  const color = STATUS_COLORS[request.status] ?? c.mutedForeground;
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: c.background,
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
      }}
    >
      <View style={{ flex: 1, paddingRight: 8 }}>
        <Text style={{ color: c.foreground, fontFamily: "Inter_600SemiBold", fontSize: 14 }}>
          {usd(request.amountDollars)} · {methodLabel(request.method)}
        </Text>
        <Text style={{ color: c.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 12 }}>
          {formatDate(request.createdAt)}
          {request.adminNote ? ` · ${request.adminNote}` : ""}
        </Text>
      </View>
      <View style={{ backgroundColor: color + "22", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 }}>
        <Text style={{ color, fontFamily: "Inter_700Bold", fontSize: 12, textTransform: "capitalize" }}>
          {request.status}
        </Text>
      </View>
    </View>
  );
}

function HistorySection({ rate }: { rate: number }) {
  const c = useColors();
  const PAGE = 20;
  const [cursor, setCursor] = useState<number | undefined>(undefined);
  const [items, setItems] = useState<PointTransaction[]>([]);
  const { data: page, isLoading } = useGetEarningsHistory({
    limit: PAGE,
    ...(cursor ? { cursor } : {}),
  });

  useEffect(() => {
    if (!page) return;
    if (cursor === undefined) {
      setItems(page);
      return;
    }
    setItems((prev) => {
      const seen = new Set(prev.map((p) => p.id));
      return [...prev, ...page.filter((p) => !seen.has(p.id))];
    });
  }, [page, cursor]);

  const hasMore = (page?.length ?? 0) === PAGE;
  const loadMore = () => {
    if (items.length > 0) setCursor(items[items.length - 1].id);
  };
  const empty = !isLoading && items.length === 0;

  return (
    <Card>
      <SectionTitle>Points history</SectionTitle>
      {isLoading && items.length === 0 ? (
        <ActivityIndicator color={c.primary} style={{ paddingVertical: 12 }} />
      ) : empty ? (
        <Text style={{ color: c.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 13 }}>
          Nothing yet. Start posting and engaging to earn points!
        </Text>
      ) : (
        <>
          <View>
            {items.map((t, i) => (
              <HistoryRow key={t.id} tx={t} rate={rate} last={i === items.length - 1} />
            ))}
          </View>
          {hasMore && (
            <Pressable onPress={loadMore} style={{ alignItems: "center", paddingVertical: 12, marginTop: 4 }}>
              <Text style={{ color: c.primary, fontFamily: "Inter_600SemiBold", fontSize: 14 }}>
                Load more
              </Text>
            </Pressable>
          )}
        </>
      )}
    </Card>
  );
}

function HistoryRow({
  tx,
  rate,
  last,
}: {
  tx: PointTransaction;
  rate: number;
  last: boolean;
}) {
  const c = useColors();
  const positive = tx.points >= 0;
  const dollars = pointsToUsd(Math.abs(tx.points), rate);
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 10,
        borderBottomColor: c.border,
        borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth,
      }}
    >
      <View style={{ flex: 1, paddingRight: 8 }}>
        <Text style={{ color: c.foreground, fontFamily: "Inter_500Medium", fontSize: 14 }}>
          {ACTION_LABELS[tx.action] ?? tx.action}
        </Text>
        <Text style={{ color: c.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 12 }}>
          {formatDate(tx.createdAt)}
        </Text>
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <Text style={{ color: positive ? POSITIVE : c.foreground, fontFamily: "Inter_700Bold", fontSize: 14 }}>
          {positive ? "+" : "−"}
          {Math.abs(tx.points).toLocaleString()} pts
        </Text>
        <Text style={{ color: c.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 11 }}>
          {positive ? "+" : "−"}
          {usd(dollars)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  card: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
  },
});
