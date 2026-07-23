import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListOrders,
  useUpdateOrderStatus,
  useCreateShopReview,
  getListOrdersQueryKey,
  getGetProductReviewsQueryKey,
  getGetProductQueryKey,
  type ShopOrder,
  type UpdateOrderStatusInputStatus,
} from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { formatTaka, orderStatusLabel, ORDER_STATUS_COLOR } from "@/constants/shop";
import { shadow } from "@/constants/shadows";

type Role = "buyer" | "seller";

interface Action {
  label: string;
  status: UpdateOrderStatusInputStatus;
  destructive?: boolean;
}

function actionsFor(order: ShopOrder, role: Role): Action[] {
  if (role === "seller") {
    switch (order.status) {
      case "pending":
        return [
          { label: "Confirm", status: "confirmed" },
          { label: "Cancel", status: "cancelled", destructive: true },
        ];
      case "confirmed":
        return [{ label: "Mark delivered", status: "delivered" }];
      default:
        return [];
    }
  }
  // buyer
  switch (order.status) {
    case "awaiting_verification":
    case "pending":
      return [{ label: "Cancel", status: "cancelled", destructive: true }];
    case "delivered":
      return [{ label: "Confirm received", status: "completed" }];
    default:
      return [];
  }
}

export default function OrdersScreen() {
  const c = useColors();
  const [role, setRole] = useState<Role>("buyer");

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }} edges={["bottom"]}>
      <View style={{ flexDirection: "row", gap: 10, padding: 16, paddingBottom: 4 }}>
        <Tab label="Buying" active={role === "buyer"} onPress={() => setRole("buyer")} c={c} />
        <Tab label="Selling" active={role === "seller"} onPress={() => setRole("seller")} c={c} />
      </View>
      <OrdersList role={role} c={c} />
    </SafeAreaView>
  );
}

function OrdersList({ role, c }: { role: Role; c: ReturnType<typeof useColors> }) {
  const qc = useQueryClient();
  const { data: orders, isLoading } = useListOrders(
    { role },
    { query: { queryKey: getListOrdersQueryKey({ role }) } },
  );
  const updateStatus = useUpdateOrderStatus();
  const [reviewOrder, setReviewOrder] = useState<ShopOrder | null>(null);

  const runAction = (order: ShopOrder, status: UpdateOrderStatusInputStatus) => {
    updateStatus.mutate(
      { id: order.id, data: { status } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListOrdersQueryKey({ role: "buyer" }) });
          qc.invalidateQueries({ queryKey: getListOrdersQueryKey({ role: "seller" }) });
        },
      },
    );
  };

  return (
    <FlatList
      data={orders ?? []}
      keyExtractor={(item) => String(item.id)}
      contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 96 }}
      ListEmptyComponent={
        isLoading ? (
          <ActivityIndicator color={c.primary} size="large" style={{ marginTop: 48 }} />
        ) : (
          <View style={styles.empty}>
            <Ionicons name="receipt-outline" size={40} color={c.mutedForeground} />
            <Text style={[styles.emptyText, { color: c.mutedForeground }]}>
              No {role === "buyer" ? "purchases" : "sales"} yet.
            </Text>
          </View>
        )
      }
      renderItem={({ item }) => {
        const actions = actionsFor(item, role);
        const statusColor = ORDER_STATUS_COLOR[item.status] ?? c.primary;
        return (
          <View
            style={[
              styles.card,
              { backgroundColor: c.card, borderColor: c.border },
              shadow("sm"),
            ]}
          >
            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={[styles.thumb, { backgroundColor: c.secondary }]}>
                {item.productPhoto ? (
                  <Image
                    source={{ uri: item.productPhoto }}
                    style={StyleSheet.absoluteFill}
                    contentFit="cover"
                  />
                ) : (
                  <Ionicons name="cube-outline" size={22} color={c.mutedForeground} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.title, { color: c.foreground }]} numberOfLines={1}>
                  {item.productName}
                </Text>
                <Text style={{ color: c.mutedForeground, fontSize: 13 }}>
                  Qty {item.quantity} · {formatTaka(item.totalCents)}
                </Text>
                <Text style={{ color: c.mutedForeground, fontSize: 12, marginTop: 2 }}>
                  {item.paymentMethod === "cod" ? "Cash on Delivery" : "Direct payment"}
                </Text>
              </View>
              <View style={[styles.badge, { backgroundColor: statusColor + "22" }]}>
                <Text style={{ color: statusColor, fontFamily: "Inter_600SemiBold", fontSize: 11 }}>
                  {orderStatusLabel(item.status)}
                </Text>
              </View>
            </View>

            {role === "buyer" && item.status === "completed" ? (
              item.myReviewRating != null ? (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 4,
                    marginTop: 12,
                  }}
                >
                  <Text style={{ color: c.mutedForeground, fontSize: 13 }}>
                    You rated
                  </Text>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Ionicons
                      key={i}
                      name={i <= (item.myReviewRating ?? 0) ? "star" : "star-outline"}
                      size={14}
                      color={i <= (item.myReviewRating ?? 0) ? "#f59e0b" : c.mutedForeground}
                    />
                  ))}
                </View>
              ) : (
                <Pressable
                  style={[
                    styles.actionBtn,
                    { backgroundColor: c.secondary, borderColor: c.border, marginTop: 12 },
                  ]}
                  onPress={() => setReviewOrder(item)}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Ionicons name="star-outline" size={15} color={c.foreground} />
                    <Text
                      style={{
                        color: c.foreground,
                        fontFamily: "Inter_700Bold",
                        fontSize: 13,
                      }}
                    >
                      Rate product
                    </Text>
                  </View>
                </Pressable>
              )
            ) : null}

            {actions.length ? (
              <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
                {actions.map((a) => (
                  <Pressable
                    key={a.status}
                    style={[
                      styles.actionBtn,
                      {
                        backgroundColor: a.destructive ? c.secondary : c.primary,
                        borderColor: a.destructive ? c.border : c.primary,
                      },
                    ]}
                    onPress={() => runAction(item, a.status)}
                    disabled={updateStatus.isPending}
                  >
                    <Text
                      style={{
                        color: a.destructive ? c.destructive : "#fff",
                        fontFamily: "Inter_700Bold",
                        fontSize: 13,
                      }}
                    >
                      {a.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>
        );
      }}
      ListFooterComponent={
        <ReviewModal
          order={reviewOrder}
          onClose={() => setReviewOrder(null)}
          c={c}
        />
      }
    />
  );
}

function ReviewModal({
  order,
  onClose,
  c,
}: {
  order: ShopOrder | null;
  onClose: () => void;
  c: ReturnType<typeof useColors>;
}) {
  const qc = useQueryClient();
  const createReview = useCreateShopReview();
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState("");

  const close = () => {
    setRating(0);
    setBody("");
    onClose();
  };

  const submit = () => {
    if (!order || rating < 1 || createReview.isPending) return;
    createReview.mutate(
      { id: order.id, data: { rating, body: body.trim() } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListOrdersQueryKey({ role: "buyer" }) });
          qc.invalidateQueries({
            queryKey: getGetProductReviewsQueryKey(order.productId),
          });
          qc.invalidateQueries({ queryKey: getGetProductQueryKey(order.productId) });
          close();
        },
        onError: () =>
          Alert.alert("Could not submit review", "Please try again."),
      },
    );
  };

  return (
    <Modal
      visible={order != null}
      transparent
      animationType="fade"
      onRequestClose={close}
    >
      <View style={styles.modalBackdrop}>
        <View
          style={[
            styles.modalCard,
            { backgroundColor: c.card, borderColor: c.border },
          ]}
        >
          <Text
            style={{ color: c.foreground, fontFamily: "Inter_700Bold", fontSize: 17 }}
            numberOfLines={2}
          >
            Rate "{order?.productName}"
          </Text>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "center",
              gap: 8,
              paddingVertical: 8,
            }}
          >
            {[1, 2, 3, 4, 5].map((i) => (
              <Pressable key={i} onPress={() => setRating(i)} hitSlop={6}>
                <Ionicons
                  name={i <= rating ? "star" : "star-outline"}
                  size={34}
                  color={i <= rating ? "#f59e0b" : c.mutedForeground}
                />
              </Pressable>
            ))}
          </View>
          <TextInput
            value={body}
            onChangeText={setBody}
            placeholder="How was the product and delivery? (optional)"
            placeholderTextColor={c.mutedForeground}
            multiline
            maxLength={2000}
            underlineColorAndroid="transparent"
            style={[
              styles.reviewInput,
              {
                backgroundColor: c.secondary,
                borderColor: c.border,
                color: c.foreground,
              },
            ]}
          />
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Pressable
              style={[
                styles.actionBtn,
                { backgroundColor: c.secondary, borderColor: c.border },
              ]}
              onPress={close}
              disabled={createReview.isPending}
            >
              <Text
                style={{ color: c.foreground, fontFamily: "Inter_700Bold", fontSize: 13 }}
              >
                Cancel
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.actionBtn,
                {
                  backgroundColor: rating >= 1 ? c.primary : c.secondary,
                  borderColor: rating >= 1 ? c.primary : c.border,
                },
              ]}
              onPress={submit}
              disabled={rating < 1 || createReview.isPending}
            >
              {createReview.isPending ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text
                  style={{
                    color: rating >= 1 ? "#fff" : c.mutedForeground,
                    fontFamily: "Inter_700Bold",
                    fontSize: 13,
                  }}
                >
                  Submit
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function Tab({
  label,
  active,
  onPress,
  c,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  c: ReturnType<typeof useColors>;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.tab,
        { backgroundColor: active ? c.primary : c.secondary },
      ]}
    >
      <Text
        style={{
          color: active ? "#fff" : c.foreground,
          fontFamily: "Inter_700Bold",
          fontSize: 14,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tab: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
  },
  thumb: {
    width: 60,
    height: 60,
    borderRadius: 10,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontFamily: "Inter_700Bold", fontSize: 15 },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  actionBtn: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 18,
    gap: 12,
  },
  reviewInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingTop: 12,
    minHeight: 88,
    textAlignVertical: "top",
    fontFamily: "Inter_400Regular",
    fontSize: 15,
  },
  empty: { alignItems: "center", gap: 10, marginTop: 48, paddingHorizontal: 32 },
  emptyText: { fontFamily: "Inter_500Medium", fontSize: 15, textAlign: "center" },
});
