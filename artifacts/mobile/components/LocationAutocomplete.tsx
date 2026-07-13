import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  useGeocodeLocation,
  getGeocodeLocationQueryKey,
} from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";

export type GeoPick = { displayName: string; lat: number; lng: number };

function useDebounced<T>(value: T, delay = 400): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export function LocationAutocomplete({
  value,
  onChangeText,
  onPick,
  placeholder,
}: {
  value: string;
  onChangeText: (v: string) => void;
  onPick: (r: GeoPick) => void;
  placeholder?: string;
}) {
  const c = useColors();
  const [open, setOpen] = useState(false);
  const debounced = useDebounced(value.trim(), 400);
  const { data: results, isFetching } = useGeocodeLocation(
    { q: debounced },
    {
      query: {
        enabled: debounced.length >= 2,
        queryKey: getGeocodeLocationQueryKey({ q: debounced }),
      },
    },
  );

  return (
    <View style={{ gap: 6 }}>
      <View
        style={[
          styles.input,
          { backgroundColor: c.card, borderColor: c.border },
        ]}
      >
        <Ionicons name="location-outline" size={18} color={c.mutedForeground} />
        <TextInput
          value={value}
          onChangeText={(v) => {
            onChangeText(v);
            setOpen(true);
          }}
          placeholder={placeholder ?? "Search a city or area"}
          placeholderTextColor={c.mutedForeground}
          underlineColorAndroid="transparent"
          style={[styles.textInput, { color: c.foreground }]}
          autoCapitalize="words"
        />
        {isFetching ? (
          <ActivityIndicator size="small" color={c.mutedForeground} />
        ) : null}
      </View>
      {open && debounced.length >= 2 && results && results.length > 0 ? (
        <View
          style={[
            styles.dropdown,
            { backgroundColor: c.card, borderColor: c.border },
          ]}
        >
          {results.map((r, i) => (
            <Pressable
              key={i}
              onPress={() => {
                onPick(r);
                onChangeText(r.displayName);
                setOpen(false);
              }}
              style={[
                styles.item,
                i > 0 ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border } : null,
              ]}
            >
              <Ionicons name="location" size={14} color={c.mutedForeground} />
              <Text
                style={{ flex: 1, color: c.foreground, fontFamily: "Inter_400Regular", fontSize: 13 }}
                numberOfLines={2}
              >
                {r.displayName}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
  },
  textInput: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 16 },
  dropdown: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    overflow: "hidden",
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
});
