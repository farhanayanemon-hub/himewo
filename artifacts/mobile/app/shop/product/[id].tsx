import { useMemo, useState } from "react";
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
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetProduct,
  useGetShopSettings,
  useCreateOrder,
  getGetProductQueryKey,
  getListOrdersQueryKey,
  type CreateOrderInputPaymentMethod,
} from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { formatTaka } from "@/constants/shop";
import { shadow, glow } from "@/constants/shadows";

export default function ProductScreen() {
  const c = useColors();
  const qc = useQueryClient();
  const params = useLocalSearchParams<{ id: string }>();
  const productId = Number(params.id);
  const valid = Number.isFinite(productId);

  const { data: product, isLoading } = useGetProduct(productId, {
    query: { enabled: valid, queryKey: getGetProductQueryKey(productId) },
  });
  const { data: settings } = useGetShopSettings();
  const createOrder = useCreateOrder();

  const [photoIndex, setPhotoIndex] = useState(0);
  const [qty, setQty] = useState(1);
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [method, setMethod] = useState<CreateOrderInputPaymentMethod>("cod");
  const [paymentRef, setPaymentRef] = useState("");

  const maxQty = Math.max(1, product?.stockQty ?? 1);
  const totalCents = (product?.priceCents ?? 0) * qty;

  const canOrder = useMemo(() => {
    if (!product) return false;
    if (address.trim().length === 0) return false;
    if (phone.trim().length === 0) return false;
    if (method === "direct" && paymentRef.trim().length === 0) return false;
    return true;
  }, [product, address, phone, method, paymentRef]);

  const handleOrder = () => {
    if (!product || !canOrder || createOrder.isPending) return;
    createOrder.mutate(
      {
        data: {
          productId: product.id,
          quantity: qty,
          deliveryAddress: address.trim(),
          phone: phone.trim(),
          paymentMethod: method,
          ...(method === "direct" ? { paymentRef: paymentRef.trim() } : {}),
        },
      },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListOrdersQueryKey() });
          Alert.alert(
            "Order placed",
            method === "direct"
              ? "Your order is awaiting payment verification by an admin."
              : "Your order has been placed.",
            [{ text: "View orders", onPress: () => router.replace("/shop/orders") }],
          );
        },
        onError: () => Alert.alert("Order failed", "Please try again."),
      },
    );
  };

  const inputStyle = [
    styles.input,
    { backgroundColor: c.card, borderColor: c.border, color: c.foreground },
  ];

  if (isLoading || !product) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c.background }} edges={["bottom"]}>
        <ActivityIndicator color={c.primary} size="large" style={{ marginTop: 64 }} />
      </SafeAreaView>
    );
  }

  const outOfStock = product.stockQty <= 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }} edges={["bottom"]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.gallery, { backgroundColor: c.secondary }]}>
          {product.photos[photoIndex] ? (
            <Image
              source={{ uri: product.photos[photoIndex] }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
            />
          ) : (
            <Ionicons name="image-outline" size={48} color={c.mutedForeground} />
          )}
        </View>
        {product.photos.length > 1 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, padding: 12 }}
          >
            {product.photos.map((p, i) => (
              <Pressable
                key={i}
                onPress={() => setPhotoIndex(i)}
                style={[
                  styles.thumb,
                  {
                    backgroundColor: c.secondary,
                    borderColor: i === photoIndex ? c.primary : c.border,
                  },
                ]}
              >
                <Image source={{ uri: p }} style={StyleSheet.absoluteFill} contentFit="cover" />
              </Pressable>
            ))}
          </ScrollView>
        ) : null}

        <View style={{ padding: 16, gap: 16 }}>
          <View style={{ gap: 4 }}>
            <Text style={[styles.price, { color: c.primary }]}>
              {formatTaka(product.priceCents)}
            </Text>
            <Text style={[styles.name, { color: c.foreground }]}>{product.name}</Text>
            {product.stallName ? (
              <Text style={{ color: c.mutedForeground, fontSize: 13 }}>
                Sold by {product.stallName}
              </Text>
            ) : null}
            <Text
              style={{
                color: outOfStock ? c.destructive : c.mutedForeground,
                fontSize: 13,
                fontFamily: "Inter_500Medium",
              }}
            >
              {outOfStock ? "Out of stock" : `${product.stockQty} in stock`}
            </Text>
          </View>

          {product.description ? (
            <Text style={[styles.desc, { color: c.foreground }]}>{product.description}</Text>
          ) : null}

          {!outOfStock ? (
            <View style={{ gap: 16 }}>
              <View style={[styles.divider, { backgroundColor: c.border }]} />
              <Text style={[styles.sectionTitle, { color: c.foreground }]}>Place an order</Text>

              <View style={{ gap: 8 }}>
                <Text style={[styles.label, { color: c.foreground }]}>Quantity</Text>
                <View style={styles.stepper}>
                  <Pressable
                    style={[styles.stepBtn, { backgroundColor: c.secondary }]}
                    onPress={() => setQty((q) => Math.max(1, q - 1))}
                  >
                    <Ionicons name="remove" size={20} color={c.foreground} />
                  </Pressable>
                  <Text style={[styles.qty, { color: c.foreground }]}>{qty}</Text>
                  <Pressable
                    style={[styles.stepBtn, { backgroundColor: c.secondary }]}
                    onPress={() => setQty((q) => Math.min(maxQty, q + 1))}
                  >
                    <Ionicons name="add" size={20} color={c.foreground} />
                  </Pressable>
                </View>
              </View>

              <View style={{ gap: 8 }}>
                <Text style={[styles.label, { color: c.foreground }]}>Delivery address</Text>
                <TextInput
                  value={address}
                  onChangeText={setAddress}
                  placeholder="House, road, area, city"
                  placeholderTextColor={c.mutedForeground}
                  underlineColorAndroid="transparent"
                  multiline
                  style={[...inputStyle, { height: 80, textAlignVertical: "top", paddingTop: 12 }]}
                />
              </View>

              <View style={{ gap: 8 }}>
                <Text style={[styles.label, { color: c.foreground }]}>Phone</Text>
                <TextInput
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="01XXXXXXXXX"
                  placeholderTextColor={c.mutedForeground}
                  keyboardType="phone-pad"
                  underlineColorAndroid="transparent"
                  style={inputStyle}
                />
              </View>

              <View style={{ gap: 8 }}>
                <Text style={[styles.label, { color: c.foreground }]}>Payment</Text>
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <PayOption
                    label="Cash on Delivery"
                    active={method === "cod"}
                    onPress={() => setMethod("cod")}
                    c={c}
                  />
                  <PayOption
                    label="Direct payment"
                    active={method === "direct"}
                    onPress={() => setMethod("direct")}
                    c={c}
                  />
                </View>
              </View>

              {method === "direct" ? (
                <View
                  style={[
                    styles.directBox,
                    { backgroundColor: c.card, borderColor: c.border },
                  ]}
                >
                  <Text style={[styles.label, { color: c.foreground }]}>
                    Payment instructions
                  </Text>
                  <Text style={{ color: c.mutedForeground, fontSize: 14, lineHeight: 20 }}>
                    {settings?.paymentInstructions?.trim() ||
                      "Contact the platform admin for payment details."}
                  </Text>
                  <TextInput
                    value={paymentRef}
                    onChangeText={setPaymentRef}
                    placeholder="Transaction ID"
                    placeholderTextColor={c.mutedForeground}
                    underlineColorAndroid="transparent"
                    style={[...inputStyle, { marginTop: 4 }]}
                  />
                </View>
              ) : null}

              <View style={styles.totalRow}>
                <Text style={{ color: c.mutedForeground, fontSize: 15 }}>Total</Text>
                <Text style={[styles.total, { color: c.foreground }]}>
                  {formatTaka(totalCents)}
                </Text>
              </View>

              <Pressable
                style={[
                  styles.submit,
                  { backgroundColor: canOrder ? c.primary : c.secondary },
                  canOrder ? glow(c.primary) : null,
                ]}
                onPress={handleOrder}
                disabled={!canOrder || createOrder.isPending}
              >
                {createOrder.isPending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text
                    style={{
                      color: canOrder ? "#fff" : c.mutedForeground,
                      fontFamily: "Inter_700Bold",
                      fontSize: 16,
                    }}
                  >
                    Place order
                  </Text>
                )}
              </Pressable>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function PayOption({
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
        styles.payOption,
        {
          backgroundColor: active ? c.primary + "22" : c.card,
          borderColor: active ? c.primary : c.border,
        },
      ]}
    >
      <Ionicons
        name={active ? "radio-button-on" : "radio-button-off"}
        size={18}
        color={active ? c.primary : c.mutedForeground}
      />
      <Text
        style={{
          color: c.foreground,
          fontFamily: "Inter_600SemiBold",
          fontSize: 13,
          flexShrink: 1,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  gallery: { aspectRatio: 1, alignItems: "center", justifyContent: "center" },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 2,
  },
  price: { fontFamily: "Inter_700Bold", fontSize: 22 },
  name: { fontFamily: "Inter_700Bold", fontSize: 20 },
  desc: { fontFamily: "Inter_400Regular", fontSize: 15, lineHeight: 22 },
  divider: { height: StyleSheet.hairlineWidth },
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 17 },
  label: { fontFamily: "Inter_700Bold", fontSize: 14 },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    fontFamily: "Inter_400Regular",
    fontSize: 16,
  },
  stepper: { flexDirection: "row", alignItems: "center", gap: 18 },
  stepBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  qty: { fontFamily: "Inter_700Bold", fontSize: 18, minWidth: 24, textAlign: "center" },
  payOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    height: 48,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  directBox: {
    gap: 8,
    padding: 14,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  totalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  total: { fontFamily: "Inter_700Bold", fontSize: 20 },
  submit: {
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
});
