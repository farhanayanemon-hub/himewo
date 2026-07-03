import { useState } from "react";
import { Linking, Pressable, Text, View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  useRecordAdClick,
  type ServedAd,
} from "@workspace/api-client-react";
import { MediaGrid } from "@/components/MediaGrid";
import { useColors } from "@/hooks/useColors";

const ctaLabels: Record<string, string> = {
  learn_more: "Learn more",
  shop_now: "Shop now",
  sign_up: "Sign up",
  book_now: "Book now",
  contact_us: "Contact us",
  download: "Download",
  get_offer: "Get offer",
  subscribe: "Subscribe",
};

function safeUrl(url: string | null | undefined): string | null {
  if (url && /^https?:\/\//i.test(url)) return url;
  return null;
}

export function SponsoredCard({ ad }: { ad: ServedAd }) {
  const c = useColors();
  const recordClick = useRecordAdClick();

  const [pressed] = useState(false);
  const destination =
    safeUrl(ad.destinationUrl) ?? safeUrl(ad.creative?.linkUrl) ?? null;

  const onPress = () => {
    recordClick.mutate({ id: ad.adId, data: { placement: ad.placement as never } });
    if (destination) Linking.openURL(destination).catch(() => {});
  };

  const creative = ad.creative;
  const title = ad.boostedPage?.name || ad.name;
  const body =
    creative?.primaryText || creative?.description || ad.boostedPost?.content || "";
  const media =
    creative?.mediaUrls && creative.mediaUrls.length > 0
      ? creative.mediaUrls.map((url, i) => ({ id: i, type: "image" as const, url }))
      : ad.boostedPost?.media ?? [];
  const ctaLabel = creative?.callToAction
    ? ctaLabels[creative.callToAction] ?? "Learn more"
    : "Learn more";

  return (
    <View style={[styles.card, { backgroundColor: c.card }, pressed && { opacity: 0.9 }]}>
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: c.secondary }]}>
          <Text style={{ color: c.primary, fontFamily: "Inter_700Bold", fontSize: 18 }}>
            {title.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: c.foreground, fontFamily: "Inter_600SemiBold", fontSize: 15 }}>
            {title}
          </Text>
          <Text style={{ color: c.mutedForeground, fontSize: 12 }}>Sponsored</Text>
        </View>
      </View>

      {body.length > 0 && (
        <Text style={[styles.content, { color: c.foreground }]}>{body}</Text>
      )}

      {media.length > 0 && (
        <Pressable onPress={onPress}>
          <MediaGrid media={media} />
        </Pressable>
      )}

      <Pressable
        style={[styles.cta, { backgroundColor: c.secondary }]}
        onPress={onPress}
      >
        <Text style={{ color: c.foreground, fontFamily: "Inter_600SemiBold", fontSize: 14 }}>
          {creative?.headline || ctaLabel}
        </Text>
        <View style={[styles.ctaBtn, { backgroundColor: c.primary }]}>
          <Text style={{ color: c.primaryForeground, fontFamily: "Inter_600SemiBold", fontSize: 13 }}>
            {ctaLabel}
          </Text>
          {destination && <Ionicons name="open-outline" size={14} color={c.primaryForeground} />}
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 8, paddingTop: 12, paddingBottom: 12 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  content: { paddingHorizontal: 14, fontSize: 15, lineHeight: 21, marginBottom: 10 },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginHorizontal: 14,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  ctaBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
});
