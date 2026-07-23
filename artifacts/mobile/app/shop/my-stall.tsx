import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetMyStall,
  useCreateStall,
  useGetStallProducts,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
  useGetShopWallet,
  useCreateShopWithdrawal,
  useListShopWithdrawals,
  useListPages,
  getGetMyStallQueryKey,
  getGetStallProductsQueryKey,
  getGetShopWalletQueryKey,
  getListShopWithdrawalsQueryKey,
  getBrowseProductsQueryKey,
  type ShopProduct,
} from "@workspace/api-client-react";
import { Avatar } from "@/components/Avatar";
import { uploadMedia, UploadUnavailableError } from "@/lib/upload";
import { useColors } from "@/hooks/useColors";
import {
  formatTaka,
  takaToCents,
  LEDGER_KIND_LABEL,
  WITHDRAWAL_METHODS,
} from "@/constants/shop";
import { shadow, glow } from "@/constants/shadows";

type Colors = ReturnType<typeof useColors>;

export default function MyStallScreen() {
  const c = useColors();
  const { data: stall, isLoading, isError } = useGetMyStall({
    query: { queryKey: getGetMyStallQueryKey(), retry: false },
  });

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c.background }} edges={["bottom"]}>
        <ActivityIndicator color={c.primary} size="large" style={{ marginTop: 64 }} />
      </SafeAreaView>
    );
  }

  if (stall && !isError) {
    return <SellerDashboard stall={stall} c={c} />;
  }

  return <StallSetup c={c} />;
}

/* ---------------------------------------------------------------- setup --- */

function StallSetup({ c }: { c: Colors }) {
  const qc = useQueryClient();
  const { data: pages, isLoading } = useListPages({ mine: true });
  const createStall = useCreateStall();
  const [selected, setSelected] = useState<number | null>(null);

  const hasPages = !!pages && pages.length > 0;

  const handleCreate = () => {
    if (selected == null || createStall.isPending) return;
    createStall.mutate(
      { data: { pageId: selected } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getGetMyStallQueryKey() });
        },
        onError: () => Alert.alert("Could not open stall", "Please try again."),
      },
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }} edges={["bottom"]}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        <View style={{ alignItems: "center", gap: 8, marginTop: 8 }}>
          <Ionicons name="storefront" size={40} color={c.primary} />
          <Text style={[styles.h1, { color: c.foreground }]}>Open your stall</Text>
          <Text style={{ color: c.mutedForeground, fontSize: 14, textAlign: "center" }}>
            Connect a Hub you manage. Your stall name and avatar come from the Hub.
          </Text>
        </View>

        {isLoading ? (
          <ActivityIndicator color={c.primary} style={{ marginTop: 24 }} />
        ) : hasPages ? (
          <>
            <View style={{ gap: 10 }}>
              {pages!.map((p) => {
                const active = selected === p.id;
                return (
                  <Pressable
                    key={p.id}
                    onPress={() => setSelected(p.id)}
                    style={[
                      styles.hubRow,
                      {
                        backgroundColor: c.card,
                        borderColor: active ? c.primary : c.border,
                      },
                      shadow("sm"),
                    ]}
                  >
                    <Avatar uri={p.avatarUrl} name={p.name} size={44} />
                    <Text
                      style={[styles.hubName, { color: c.foreground }]}
                      numberOfLines={1}
                    >
                      {p.name}
                    </Text>
                    <Ionicons
                      name={active ? "radio-button-on" : "radio-button-off"}
                      size={20}
                      color={active ? c.primary : c.mutedForeground}
                    />
                  </Pressable>
                );
              })}
            </View>
            <Pressable
              style={[
                styles.submit,
                { backgroundColor: selected != null ? c.primary : c.secondary },
                selected != null ? glow(c.primary) : null,
              ]}
              onPress={handleCreate}
              disabled={selected == null || createStall.isPending}
            >
              {createStall.isPending ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text
                  style={{
                    color: selected != null ? "#fff" : c.mutedForeground,
                    fontFamily: "Inter_700Bold",
                    fontSize: 16,
                  }}
                >
                  Open stall
                </Text>
              )}
            </Pressable>
          </>
        ) : (
          <View style={[styles.emptyBox, { backgroundColor: c.card, borderColor: c.border }]}>
            <Ionicons name="document-text-outline" size={36} color={c.mutedForeground} />
            <Text style={{ color: c.foreground, fontFamily: "Inter_600SemiBold", fontSize: 15, textAlign: "center" }}>
              You need a Hub to open a stall.
            </Text>
            <Pressable
              style={[styles.submit, { backgroundColor: c.primary, alignSelf: "stretch" }, glow(c.primary)]}
              onPress={() => router.push("/pages")}
            >
              <Text style={{ color: "#fff", fontFamily: "Inter_700Bold", fontSize: 16 }}>
                Create a Hub
              </Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/* ------------------------------------------------------------ dashboard --- */

function SellerDashboard({
  stall,
  c,
}: {
  stall: { id: number; name: string; avatarUrl?: string | null };
  c: Colors;
}) {
  const qc = useQueryClient();
  const { data: products } = useGetStallProducts(stall.id, undefined, {
    query: { queryKey: getGetStallProductsQueryKey(stall.id) },
  });
  const { data: wallet } = useGetShopWallet({
    query: { queryKey: getGetShopWalletQueryKey() },
  });
  const { data: withdrawals } = useListShopWithdrawals({
    query: { queryKey: getListShopWithdrawalsQueryKey() },
  });

  const deleteProduct = useDeleteProduct();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<ShopProduct | null>(null);
  const [withdrawOpen, setWithdrawOpen] = useState(false);

  const refreshProducts = () => {
    qc.invalidateQueries({ queryKey: getGetStallProductsQueryKey(stall.id) });
    qc.invalidateQueries({ queryKey: getBrowseProductsQueryKey() });
  };

  const handleDelete = (p: ShopProduct) => {
    Alert.alert("Delete product", `Remove "${p.name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () =>
          deleteProduct.mutate(
            { id: p.id },
            { onSuccess: refreshProducts },
          ),
      },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }} edges={["bottom"]}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 20, paddingBottom: 48 }}>
        {/* Stall header */}
        <View
          style={[
            styles.stallCard,
            { backgroundColor: c.card, borderColor: c.border },
            shadow("sm"),
          ]}
        >
          <Avatar uri={stall.avatarUrl} name={stall.name} size={52} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.hubName, { color: c.foreground }]} numberOfLines={1}>
              {stall.name}
            </Text>
            <Pressable onPress={() => router.push(`/shop/stall/${stall.id}`)}>
              <Text style={{ color: c.primary, fontSize: 13, fontFamily: "Inter_600SemiBold" }}>
                View public stall
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Wallet */}
        <View style={{ gap: 12 }}>
          <Text style={[styles.sectionTitle, { color: c.foreground }]}>Wallet</Text>
          <View
            style={[
              styles.walletCard,
              { backgroundColor: c.card, borderColor: c.border },
              shadow("sm"),
            ]}
          >
            <Text style={{ color: c.mutedForeground, fontSize: 13 }}>Balance</Text>
            <Text
              style={{
                color: (wallet?.balanceCents ?? 0) < 0 ? c.destructive : c.foreground,
                fontFamily: "Inter_700Bold",
                fontSize: 28,
              }}
            >
              {formatTaka(wallet?.balanceCents ?? 0)}
            </Text>
            {wallet && wallet.pendingWithdrawCents > 0 ? (
              <Text style={{ color: c.mutedForeground, fontSize: 12 }}>
                {formatTaka(wallet.pendingWithdrawCents)} pending withdrawal
              </Text>
            ) : null}
            <Pressable
              style={[styles.walletBtn, { backgroundColor: c.primary }, glow(c.primary)]}
              onPress={() => setWithdrawOpen(true)}
            >
              <Ionicons name="cash-outline" size={16} color="#fff" />
              <Text style={{ color: "#fff", fontFamily: "Inter_700Bold", fontSize: 14 }}>
                Request withdrawal
              </Text>
            </Pressable>
          </View>

          {wallet?.ledger?.length ? (
            <View style={{ gap: 6 }}>
              <Text style={[styles.subTitle, { color: c.mutedForeground }]}>History</Text>
              {wallet.ledger.map((e) => (
                <View
                  key={e.id}
                  style={[styles.ledgerRow, { borderColor: c.border }]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: c.foreground, fontFamily: "Inter_600SemiBold", fontSize: 14 }}>
                      {LEDGER_KIND_LABEL[e.kind] ?? e.kind}
                    </Text>
                    {e.note ? (
                      <Text style={{ color: c.mutedForeground, fontSize: 12 }} numberOfLines={1}>
                        {e.note}
                      </Text>
                    ) : null}
                  </View>
                  <Text
                    style={{
                      color: e.amountCents < 0 ? c.destructive : "#16a34a",
                      fontFamily: "Inter_700Bold",
                      fontSize: 14,
                    }}
                  >
                    {e.amountCents < 0 ? "-" : "+"}
                    {formatTaka(Math.abs(e.amountCents))}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>

        {/* Withdrawal requests */}
        {withdrawals?.length ? (
          <View style={{ gap: 8 }}>
            <Text style={[styles.sectionTitle, { color: c.foreground }]}>
              Withdrawal requests
            </Text>
            {withdrawals.map((w) => (
              <View
                key={w.id}
                style={[
                  styles.ledgerRow,
                  { borderColor: c.border, backgroundColor: c.card, borderRadius: 12, padding: 12 },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ color: c.foreground, fontFamily: "Inter_600SemiBold", fontSize: 14 }}>
                    {formatTaka(w.amountCents)} · {w.method}
                  </Text>
                  {w.adminNote ? (
                    <Text style={{ color: c.mutedForeground, fontSize: 12 }}>{w.adminNote}</Text>
                  ) : null}
                </View>
                <WithdrawStatusBadge status={w.status} c={c} />
              </View>
            ))}
          </View>
        ) : null}

        {/* Products */}
        <View style={{ gap: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={[styles.sectionTitle, { color: c.foreground }]}>Products</Text>
            <Pressable
              style={[styles.addBtn, { backgroundColor: c.primary }, glow(c.primary)]}
              onPress={() => {
                setEditing(null);
                setEditorOpen(true);
              }}
            >
              <Ionicons name="add" size={16} color="#fff" />
              <Text style={{ color: "#fff", fontFamily: "Inter_700Bold", fontSize: 13 }}>Add</Text>
            </Pressable>
          </View>

          {products?.length ? (
            products.map((p) => (
              <View
                key={p.id}
                style={[
                  styles.productRow,
                  { backgroundColor: c.card, borderColor: c.border },
                  shadow("sm"),
                ]}
              >
                <View style={[styles.pThumb, { backgroundColor: c.secondary }]}>
                  {p.photos[0] ? (
                    <Image source={{ uri: p.photos[0] }} style={StyleSheet.absoluteFill} contentFit="cover" />
                  ) : (
                    <Ionicons name="image-outline" size={20} color={c.mutedForeground} />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: c.foreground, fontFamily: "Inter_700Bold", fontSize: 14 }} numberOfLines={1}>
                    {p.name}
                  </Text>
                  <Text style={{ color: c.primary, fontFamily: "Inter_700Bold", fontSize: 13 }}>
                    {formatTaka(p.priceCents)}
                  </Text>
                  <Text style={{ color: c.mutedForeground, fontSize: 12 }}>
                    Stock {p.stockQty} · {p.active ? "Active" : "Hidden"}
                  </Text>
                </View>
                <Pressable
                  style={styles.iconBtn}
                  onPress={() => {
                    setEditing(p);
                    setEditorOpen(true);
                  }}
                >
                  <Ionicons name="create-outline" size={20} color={c.foreground} />
                </Pressable>
                <Pressable style={styles.iconBtn} onPress={() => handleDelete(p)}>
                  <Ionicons name="trash-outline" size={20} color={c.destructive} />
                </Pressable>
              </View>
            ))
          ) : (
            <Text style={{ color: c.mutedForeground, fontSize: 14 }}>
              No products yet. Tap Add to create your first one.
            </Text>
          )}
        </View>
      </ScrollView>

      <ProductEditor
        visible={editorOpen}
        product={editing}
        c={c}
        onClose={() => setEditorOpen(false)}
        onSaved={() => {
          setEditorOpen(false);
          refreshProducts();
        }}
      />
      <WithdrawModal
        visible={withdrawOpen}
        c={c}
        maxCents={wallet?.balanceCents ?? 0}
        onClose={() => setWithdrawOpen(false)}
        onSaved={() => {
          setWithdrawOpen(false);
          qc.invalidateQueries({ queryKey: getListShopWithdrawalsQueryKey() });
          qc.invalidateQueries({ queryKey: getGetShopWalletQueryKey() });
        }}
      />
    </SafeAreaView>
  );
}

function WithdrawStatusBadge({ status, c }: { status: string; c: Colors }) {
  const color =
    status === "approved" ? "#16a34a" : status === "rejected" ? c.destructive : "#d97706";
  return (
    <View style={{ backgroundColor: color + "22", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 }}>
      <Text style={{ color, fontFamily: "Inter_600SemiBold", fontSize: 11 }}>
        {status[0].toUpperCase() + status.slice(1)}
      </Text>
    </View>
  );
}

/* ------------------------------------------------------- product editor --- */

function ProductEditor({
  visible,
  product,
  c,
  onClose,
  onSaved,
}: {
  visible: boolean;
  product: ShopProduct | null;
  c: Colors;
  onClose: () => void;
  onSaved: () => void;
}) {
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [stock, setStock] = useState("0");
  const [active, setActive] = useState(true);
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [ready, setReady] = useState(false);

  // Sync form from the product each time the modal opens.
  if (visible && !ready) {
    setName(product?.name ?? "");
    setPrice(product ? String(product.priceCents / 100) : "");
    setDescription(product?.description ?? "");
    setStock(String(product?.stockQty ?? 0));
    setActive(product?.active ?? true);
    setPhotos(product?.photos ?? []);
    setReady(true);
  }
  if (!visible && ready) setReady(false);

  const pickPhotos = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 10,
    });
    if (res.canceled || !res.assets?.length) return;
    setUploading(true);
    try {
      for (const asset of res.assets) {
        try {
          const uploaded = await uploadMedia(asset);
          setPhotos((prev) => [...prev, uploaded.url]);
        } catch (err) {
          if (err instanceof UploadUnavailableError) {
            Alert.alert("Upload unavailable", "Direct upload isn't available in this environment.");
          } else {
            Alert.alert("Upload failed", "Please try again.");
          }
        }
      }
    } finally {
      setUploading(false);
    }
  };

  const canSubmit = name.trim().length > 0 && price.trim().length > 0;
  const pending = createProduct.isPending || updateProduct.isPending;

  const handleSubmit = () => {
    if (!canSubmit || pending || uploading) return;
    const priceCents = takaToCents(price);
    const stockQty = Math.max(0, Math.round(Number(stock) || 0));
    if (product) {
      updateProduct.mutate(
        {
          id: product.id,
          data: {
            name: name.trim(),
            priceCents,
            description: description.trim(),
            stockQty,
            active,
            photos,
          },
        },
        { onSuccess: onSaved, onError: () => Alert.alert("Save failed", "Please try again.") },
      );
    } else {
      createProduct.mutate(
        {
          data: {
            name: name.trim(),
            priceCents,
            description: description.trim(),
            stockQty,
            photos,
          },
        },
        { onSuccess: onSaved, onError: () => Alert.alert("Save failed", "Please try again.") },
      );
    }
  };

  const inputStyle = [
    styles.input,
    { backgroundColor: c.card, borderColor: c.border, color: c.foreground },
  ];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: c.background }} edges={["top", "bottom"]}>
        <View style={[styles.modalHeader, { borderBottomColor: c.border }]}>
          <Text style={[styles.h1, { color: c.foreground }]}>
            {product ? "Edit product" : "New product"}
          </Text>
          <Pressable onPress={onClose}>
            <Ionicons name="close" size={26} color={c.foreground} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }} keyboardShouldPersistTaps="handled">
          <View style={{ gap: 8 }}>
            <Text style={[styles.label, { color: c.foreground }]}>Photos</Text>
            <View style={styles.photoGrid}>
              {photos.map((p, i) => (
                <View key={i} style={[styles.photoThumb, { backgroundColor: c.secondary }]}>
                  <Image source={{ uri: p }} style={StyleSheet.absoluteFill} contentFit="cover" />
                  <Pressable
                    style={styles.photoRemove}
                    onPress={() => setPhotos((prev) => prev.filter((_, idx) => idx !== i))}
                  >
                    <Ionicons name="close" size={14} color="#fff" />
                  </Pressable>
                </View>
              ))}
              <Pressable
                style={[styles.photoAdd, { borderColor: c.border, backgroundColor: c.card }]}
                onPress={pickPhotos}
                disabled={uploading}
              >
                {uploading ? (
                  <ActivityIndicator color={c.mutedForeground} size="small" />
                ) : (
                  <Ionicons name="images-outline" size={22} color={c.mutedForeground} />
                )}
              </Pressable>
            </View>
          </View>

          <Field label="Name" c={c}>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Product name"
              placeholderTextColor={c.mutedForeground}
              underlineColorAndroid="transparent"
              style={inputStyle}
            />
          </Field>

          <Field label="Price (৳ taka)" c={c}>
            <TextInput
              value={price}
              onChangeText={setPrice}
              placeholder="0.00"
              placeholderTextColor={c.mutedForeground}
              keyboardType="decimal-pad"
              underlineColorAndroid="transparent"
              style={inputStyle}
            />
          </Field>

          <Field label="Stock" c={c}>
            <TextInput
              value={stock}
              onChangeText={setStock}
              placeholder="0"
              placeholderTextColor={c.mutedForeground}
              keyboardType="number-pad"
              underlineColorAndroid="transparent"
              style={inputStyle}
            />
          </Field>

          <Field label="Description" c={c}>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Describe your product..."
              placeholderTextColor={c.mutedForeground}
              underlineColorAndroid="transparent"
              multiline
              style={[...inputStyle, { height: 100, textAlignVertical: "top", paddingTop: 12 }]}
            />
          </Field>

          {product ? (
            <Pressable
              style={styles.toggleRow}
              onPress={() => setActive((a) => !a)}
            >
              <Ionicons
                name={active ? "checkbox" : "square-outline"}
                size={22}
                color={active ? c.primary : c.mutedForeground}
              />
              <Text style={{ color: c.foreground, fontFamily: "Inter_600SemiBold", fontSize: 15 }}>
                Active (visible in Shop)
              </Text>
            </Pressable>
          ) : null}

          <Pressable
            style={[
              styles.submit,
              { backgroundColor: canSubmit ? c.primary : c.secondary },
              canSubmit ? glow(c.primary) : null,
            ]}
            onPress={handleSubmit}
            disabled={!canSubmit || pending || uploading}
          >
            {pending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text
                style={{
                  color: canSubmit ? "#fff" : c.mutedForeground,
                  fontFamily: "Inter_700Bold",
                  fontSize: 16,
                }}
              >
                {product ? "Save changes" : "Add product"}
              </Text>
            )}
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

/* ---------------------------------------------------------- withdrawal --- */

function WithdrawModal({
  visible,
  c,
  maxCents,
  onClose,
  onSaved,
}: {
  visible: boolean;
  c: Colors;
  maxCents: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const createWithdrawal = useCreateShopWithdrawal();
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState(WITHDRAWAL_METHODS[0]);
  const [account, setAccount] = useState("");

  const canSubmit = amount.trim().length > 0 && account.trim().length > 0;

  const handleSubmit = () => {
    if (!canSubmit || createWithdrawal.isPending) return;
    const amountCents = takaToCents(amount);
    if (amountCents < 1) {
      Alert.alert("Invalid amount", "Enter an amount greater than zero.");
      return;
    }
    createWithdrawal.mutate(
      {
        data: {
          amountCents,
          method,
          details: { account: account.trim() },
        },
      },
      {
        onSuccess: () => {
          setAmount("");
          setAccount("");
          onSaved();
        },
        onError: () => Alert.alert("Request failed", "Please try again."),
      },
    );
  };

  const inputStyle = [
    styles.input,
    { backgroundColor: c.card, borderColor: c.border, color: c.foreground },
  ];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: c.background }} edges={["top", "bottom"]}>
        <View style={[styles.modalHeader, { borderBottomColor: c.border }]}>
          <Text style={[styles.h1, { color: c.foreground }]}>Request withdrawal</Text>
          <Pressable onPress={onClose}>
            <Ionicons name="close" size={26} color={c.foreground} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }} keyboardShouldPersistTaps="handled">
          <Text style={{ color: c.mutedForeground, fontSize: 13 }}>
            Available balance: {formatTaka(maxCents)}
          </Text>

          <Field label="Amount (৳ taka)" c={c}>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              placeholderTextColor={c.mutedForeground}
              keyboardType="decimal-pad"
              underlineColorAndroid="transparent"
              style={inputStyle}
            />
          </Field>

          <View style={{ gap: 8 }}>
            <Text style={[styles.label, { color: c.foreground }]}>Method</Text>
            <View style={styles.chipWrap}>
              {WITHDRAWAL_METHODS.map((m) => (
                <Pressable
                  key={m}
                  onPress={() => setMethod(m)}
                  style={[
                    styles.selectChip,
                    {
                      backgroundColor: method === m ? c.primary : c.secondary,
                      borderColor: method === m ? c.primary : c.border,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: method === m ? "#fff" : c.foreground,
                      fontFamily: "Inter_600SemiBold",
                      fontSize: 13,
                    }}
                  >
                    {m}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <Field label="Account details" c={c}>
            <TextInput
              value={account}
              onChangeText={setAccount}
              placeholder="Account / wallet number"
              placeholderTextColor={c.mutedForeground}
              underlineColorAndroid="transparent"
              style={inputStyle}
            />
          </Field>

          <Pressable
            style={[
              styles.submit,
              { backgroundColor: canSubmit ? c.primary : c.secondary },
              canSubmit ? glow(c.primary) : null,
            ]}
            onPress={handleSubmit}
            disabled={!canSubmit || createWithdrawal.isPending}
          >
            {createWithdrawal.isPending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text
                style={{
                  color: canSubmit ? "#fff" : c.mutedForeground,
                  fontFamily: "Inter_700Bold",
                  fontSize: 16,
                }}
              >
                Submit request
              </Text>
            )}
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function Field({
  label,
  c,
  children,
}: {
  label: string;
  c: Colors;
  children: React.ReactNode;
}) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={[styles.label, { color: c.foreground }]}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  h1: { fontFamily: "Inter_700Bold", fontSize: 20 },
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 17 },
  subTitle: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  label: { fontFamily: "Inter_700Bold", fontSize: 14 },
  hubRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  hubName: { flex: 1, fontFamily: "Inter_700Bold", fontSize: 16 },
  emptyBox: {
    gap: 12,
    alignItems: "center",
    padding: 24,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 8,
  },
  stallCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  walletCard: {
    gap: 6,
    padding: 16,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  walletBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 42,
    borderRadius: 12,
    marginTop: 8,
  },
  ledgerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    height: 36,
    borderRadius: 10,
  },
  productRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 10,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  pThumb: {
    width: 56,
    height: 56,
    borderRadius: 10,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  iconBtn: { padding: 6 },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    fontFamily: "Inter_400Regular",
    fontSize: 16,
  },
  photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  photoThumb: { width: 76, height: 76, borderRadius: 10, overflow: "hidden" },
  photoRemove: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  photoAdd: {
    width: 76,
    height: 76,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  selectChip: {
    paddingHorizontal: 14,
    height: 36,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  toggleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  submit: {
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
});
