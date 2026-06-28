import { useState } from "react";
import {
  ActivityIndicator,
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
import { useQueryClient } from "@tanstack/react-query";
import {
  useCreateMarketplaceListing,
  getListMarketplaceListingsQueryKey,
  getGetSellingDashboardQueryKey,
} from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { CATEGORIES, CONDITIONS } from "@/constants/marketplace";
import { glow } from "@/constants/shadows";

export default function MarketplaceCreateScreen() {
  const c = useColors();
  const qc = useQueryClient();
  const createListing = useCreateMarketplaceListing();

  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("other");
  const [condition, setCondition] = useState("used_good");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [photoInput, setPhotoInput] = useState("");

  const addPhoto = () => {
    const url = photoInput.trim();
    if (!url) return;
    setPhotos((p) => [...p, url]);
    setPhotoInput("");
  };

  const canSubmit = title.trim().length > 0 && price.trim().length > 0;

  const handleSubmit = () => {
    if (!canSubmit) return;
    createListing.mutate(
      {
        data: {
          title: title.trim(),
          price: Math.max(0, Math.round(Number(price) || 0)),
          category,
          condition,
          description: description.trim(),
          location: location.trim() || undefined,
          photos,
        },
      },
      {
        onSuccess: (listing) => {
          qc.invalidateQueries({ queryKey: getListMarketplaceListingsQueryKey() });
          qc.invalidateQueries({ queryKey: getGetSellingDashboardQueryKey() });
          router.replace(`/marketplace/${listing.id}`);
        },
      },
    );
  };

  const inputStyle = [styles.input, { backgroundColor: c.card, borderColor: c.border, color: c.foreground }];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }} edges={["bottom"]}>
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
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
          </View>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TextInput
              value={photoInput}
              onChangeText={setPhotoInput}
              placeholder="Photo image URL"
              placeholderTextColor={c.mutedForeground}
              style={[...inputStyle, { flex: 1 }]}
              autoCapitalize="none"
            />
            <Pressable
              style={[styles.addBtn, { backgroundColor: c.secondary }]}
              onPress={addPhoto}
            >
              <Ionicons name="add" size={20} color={c.foreground} />
            </Pressable>
          </View>
        </View>

        <Field label="Title" c={c}>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="What are you selling?"
            placeholderTextColor={c.mutedForeground}
            style={inputStyle}
          />
        </Field>

        <Field label="Price (৳)" c={c}>
          <TextInput
            value={price}
            onChangeText={setPrice}
            placeholder="0"
            placeholderTextColor={c.mutedForeground}
            keyboardType="numeric"
            style={inputStyle}
          />
        </Field>

        <View style={{ gap: 8 }}>
          <Text style={[styles.label, { color: c.foreground }]}>Category</Text>
          <View style={styles.chipWrap}>
            {CATEGORIES.map((cat) => (
              <SelectChip
                key={cat.value}
                label={cat.label}
                active={category === cat.value}
                onPress={() => setCategory(cat.value)}
                c={c}
              />
            ))}
          </View>
        </View>

        <View style={{ gap: 8 }}>
          <Text style={[styles.label, { color: c.foreground }]}>Condition</Text>
          <View style={styles.chipWrap}>
            {CONDITIONS.map((cond) => (
              <SelectChip
                key={cond.value}
                label={cond.label}
                active={condition === cond.value}
                onPress={() => setCondition(cond.value)}
                c={c}
              />
            ))}
          </View>
        </View>

        <Field label="Location" c={c}>
          <TextInput
            value={location}
            onChangeText={setLocation}
            placeholder="e.g. Dhaka"
            placeholderTextColor={c.mutedForeground}
            style={inputStyle}
          />
        </Field>

        <Field label="Description" c={c}>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Describe your item..."
            placeholderTextColor={c.mutedForeground}
            multiline
            style={[...inputStyle, { height: 110, textAlignVertical: "top", paddingTop: 12 }]}
          />
        </Field>

        <Pressable
          style={[
            styles.submit,
            { backgroundColor: canSubmit ? c.primary : c.secondary },
            canSubmit ? glow(c.primary) : null,
          ]}
          onPress={handleSubmit}
          disabled={!canSubmit || createListing.isPending}
        >
          {createListing.isPending ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text
              style={{
                color: canSubmit ? "#fff" : c.mutedForeground,
                fontFamily: "Inter_700Bold",
                fontSize: 16,
              }}
            >
              Publish listing
            </Text>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({
  label,
  c,
  children,
}: {
  label: string;
  c: ReturnType<typeof useColors>;
  children: React.ReactNode;
}) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={[styles.label, { color: c.foreground }]}>{label}</Text>
      {children}
    </View>
  );
}

function SelectChip({
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
        styles.selectChip,
        { backgroundColor: active ? c.primary : c.secondary, borderColor: active ? c.primary : c.border },
      ]}
    >
      <Text
        style={{
          color: active ? "#fff" : c.foreground,
          fontFamily: "Inter_600SemiBold",
          fontSize: 13,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  label: { fontFamily: "Inter_700Bold", fontSize: 15 },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
  },
  photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  photoThumb: {
    width: 76,
    height: 76,
    borderRadius: 10,
    overflow: "hidden",
  },
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
  addBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
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
  submit: {
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
});
