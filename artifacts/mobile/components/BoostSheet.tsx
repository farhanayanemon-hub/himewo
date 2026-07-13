import { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  useBoostPost,
  useBoostPage,
  type BoostPostInputCallToAction,
} from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";

const ctaOptions: { value: BoostPostInputCallToAction; label: string }[] = [
  { value: "learn_more", label: "Learn more" },
  { value: "shop_now", label: "Shop now" },
  { value: "sign_up", label: "Sign up" },
  { value: "contact_us", label: "Contact us" },
  { value: "book_now", label: "Book now" },
];

function isSafeUrl(url: string) {
  return url.trim() === "" || /^https?:\/\//i.test(url.trim());
}

export function BoostSheet({
  type,
  id,
  visible,
  onClose,
  onDone,
}: {
  type: "post" | "page";
  id: number;
  visible: boolean;
  onClose: () => void;
  onDone?: () => void;
}) {
  const c = useColors();
  const boostPost = useBoostPost();
  const boostPage = useBoostPage();
  const [budget, setBudget] = useState("5");
  const [days, setDays] = useState("7");
  const [headline, setHeadline] = useState("");
  const [cta, setCta] = useState<BoostPostInputCallToAction>("learn_more");
  const [destinationUrl, setDestinationUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  const pending = boostPost.isPending || boostPage.isPending;

  const reset = () => {
    setBudget("5");
    setDays("7");
    setHeadline("");
    setCta("learn_more");
    setDestinationUrl("");
    setError(null);
  };

  const close = () => {
    reset();
    onClose();
  };

  const handleBoost = () => {
    setError(null);
    const budgetCents = Math.round(parseFloat(budget) * 100);
    const dayCount = parseInt(days, 10);
    if (!Number.isFinite(budgetCents) || budgetCents < 100) {
      setError("Budget must be at least $1.");
      return;
    }
    if (!Number.isInteger(dayCount) || dayCount < 1 || dayCount > 30) {
      setError("Days must be between 1 and 30.");
      return;
    }
    if (!isSafeUrl(destinationUrl)) {
      setError("Link must start with http:// or https://");
      return;
    }
    const data = {
      budgetCents,
      days: dayCount,
      ...(headline.trim() ? { headline: headline.trim() } : {}),
      callToAction: cta,
      ...(destinationUrl.trim() ? { destinationUrl: destinationUrl.trim() } : {}),
    };
    const onSuccess = () => {
      reset();
      onClose();
      onDone?.();
    };
    const onError = (e: unknown) => {
      setError(e instanceof Error ? e.message : "Could not start boost.");
    };
    if (type === "post") {
      boostPost.mutate({ id, data }, { onSuccess, onError });
    } else {
      boostPage.mutate({ id, data }, { onSuccess, onError });
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close}>
        <Pressable style={[styles.sheet, { backgroundColor: c.surface }]} onPress={(e) => e.stopPropagation()}>
          <View style={[styles.handle, { backgroundColor: c.border }]} />
          <ScrollView keyboardShouldPersistTaps="handled">
            <View style={styles.titleRow}>
              <Ionicons name="rocket" size={20} color={c.primary} />
              <Text style={[styles.title, { color: c.foreground }]}>
                Boost {type === "post" ? "post" : "page"}
              </Text>
            </View>
            <Text style={[styles.subtitle, { color: c.mutedForeground }]}>
              Reach more people. Your boost goes for admin review before it runs.
            </Text>

            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: c.foreground }]}>Budget (USD)</Text>
                <TextInput
                  value={budget}
                  onChangeText={setBudget}
                  keyboardType="decimal-pad"
                  style={[styles.input, { color: c.foreground, backgroundColor: c.secondary }]}
                  placeholderTextColor={c.mutedForeground} underlineColorAndroid="transparent"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: c.foreground }]}>Days</Text>
                <TextInput
                  value={days}
                  onChangeText={setDays}
                  keyboardType="number-pad"
                  style={[styles.input, { color: c.foreground, backgroundColor: c.secondary }]}
                  placeholderTextColor={c.mutedForeground} underlineColorAndroid="transparent"
                />
              </View>
            </View>

            <Text style={[styles.label, { color: c.foreground }]}>Headline (optional)</Text>
            <TextInput
              value={headline}
              onChangeText={setHeadline}
              placeholder="Say something catchy"
              placeholderTextColor={c.mutedForeground} underlineColorAndroid="transparent"
              style={[styles.input, { color: c.foreground, backgroundColor: c.secondary }]}
            />

            <Text style={[styles.label, { color: c.foreground }]}>Button</Text>
            <View style={styles.ctaRow}>
              {ctaOptions.map((o) => {
                const active = cta === o.value;
                return (
                  <Pressable
                    key={o.value}
                    onPress={() => setCta(o.value)}
                    style={[
                      styles.chip,
                      { backgroundColor: active ? c.primary : c.secondary },
                    ]}
                  >
                    <Text
                      style={{
                        color: active ? c.primaryForeground : c.foreground,
                        fontFamily: "Inter_500Medium",
                        fontSize: 13,
                      }}
                    >
                      {o.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={[styles.label, { color: c.foreground }]}>Link (optional)</Text>
            <TextInput
              value={destinationUrl}
              onChangeText={setDestinationUrl}
              placeholder="https://..."
              placeholderTextColor={c.mutedForeground} underlineColorAndroid="transparent"
              autoCapitalize="none"
              keyboardType="url"
              style={[styles.input, { color: c.foreground, backgroundColor: c.secondary }]}
            />

            {error && <Text style={[styles.error, { color: c.destructive }]}>{error}</Text>}

            <View style={styles.actions}>
              <Pressable style={styles.btn} onPress={close}>
                <Text style={{ color: c.mutedForeground, fontFamily: "Inter_600SemiBold" }}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.btn, styles.save, { backgroundColor: c.primary }]}
                onPress={handleBoost}
                disabled={pending}
              >
                {pending ? (
                  <ActivityIndicator color={c.primaryForeground} size="small" />
                ) : (
                  <Text style={{ color: c.primaryForeground, fontFamily: "Inter_600SemiBold" }}>
                    Start boost
                  </Text>
                )}
              </Pressable>
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "#0006" },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 32,
    paddingTop: 8,
    paddingHorizontal: 16,
    maxHeight: "88%",
  },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 12 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { fontSize: 18, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 13, marginTop: 4, marginBottom: 12 },
  label: { fontSize: 13, fontFamily: "Inter_600SemiBold", marginTop: 12, marginBottom: 6 },
  input: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
  ctaRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18 },
  error: { fontSize: 13, marginTop: 12 },
  actions: { flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: 20 },
  btn: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10 },
  save: { minWidth: 110, alignItems: "center" },
});
