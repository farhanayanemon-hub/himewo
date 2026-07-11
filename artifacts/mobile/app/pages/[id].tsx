import { useState, useEffect } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Pressable,
  Text,
  TextInput,
  View,
  StyleSheet,
  Linking,
  Modal,
  Switch,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { Stack, useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetPage,
  useGetPagePosts,
  useFollowPage,
  useUnfollowPage,
  useUpdatePage,
  useCreateConversation,
  useListPageReviews,
  useReviewPage,
  useDeletePageReview,
  useListPageMedia,
  useListPageMembers,
  useAddPageMember,
  useRemovePageMember,
  useSearchUsers,
  useListPageFollowers,
  useListPageFollowing,
  useInviteToPage,
  useListFriends,
  getListPagesQueryKey,
  getGetPageQueryKey,
  getListPageReviewsQueryKey,
  getListPageMembersQueryKey,
  getSearchUsersQueryKey,
  getListPageFollowersQueryKey,
  getListPageFollowingQueryKey,
  getListFriendsQueryKey,
  type Page,
  type PageReview,
  type Profile,
} from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/lib/auth";
import { useActingPage } from "@/lib/acting-page";
import { PostCard } from "@/components/PostCard";
import { uploadMedia, UploadUnavailableError } from "@/lib/upload";
import { PAGE_CATEGORIES } from "./index";

type CtaType = Page["ctaType"];
const CTA_OPTIONS: CtaType[] = ["none", "message", "call", "shop", "signup"];

function StarRow({
  value,
  onChange,
  size = 22,
}: {
  value: number;
  onChange?: (v: number) => void;
  size?: number;
}) {
  return (
    <View style={{ flexDirection: "row", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable
          key={n}
          disabled={!onChange}
          onPress={() => onChange?.(n)}
          hitSlop={onChange ? 6 : 0}
        >
          <Ionicons
            name={n <= value ? "star" : "star-outline"}
            size={size}
            color="#facc15"
          />
        </Pressable>
      ))}
    </View>
  );
}

function AboutRow({
  icon,
  text,
  color,
  muted,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
  color: string;
  muted: string;
}) {
  return (
    <View style={styles.aboutRow}>
      <Ionicons name={icon} size={18} color={muted} />
      <Text style={[styles.aboutText, { color }]}>{text}</Text>
    </View>
  );
}

function ReviewsBlock({ page }: { page: Page }) {
  const c = useColors();
  const qc = useQueryClient();
  const { data: reviews, isLoading } = useListPageReviews(page.id);
  const reviewPage = useReviewPage();
  const deleteReview = useDeletePageReview();

  const [rating, setRating] = useState(page.viewerReview?.rating ?? 0);
  const [body, setBody] = useState(page.viewerReview?.body ?? "");

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: getListPageReviewsQueryKey(page.id) });
    qc.invalidateQueries({ queryKey: getGetPageQueryKey(page.id) });
    qc.invalidateQueries({ queryKey: getListPagesQueryKey() });
  };

  const submit = () => {
    if (rating < 1) return;
    reviewPage.mutate(
      { id: page.id, data: { rating, body: body.trim() || undefined } },
      { onSuccess: invalidate },
    );
  };

  const remove = () => {
    deleteReview.mutate(
      { id: page.id },
      {
        onSuccess: () => {
          setRating(0);
          setBody("");
          invalidate();
        },
      },
    );
  };

  return (
    <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
      <View style={styles.cardHeader}>
        <Text style={[styles.cardTitle, { color: c.foreground }]}>Reviews</Text>
        {page.reviewCount > 0 ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Ionicons name="star" size={15} color="#facc15" />
            <Text style={{ color: c.foreground, fontFamily: "Inter_600SemiBold", fontSize: 13 }}>
              {page.averageRating?.toFixed(1)} · {page.reviewCount} reviews
            </Text>
          </View>
        ) : null}
      </View>

      {page.viewerCanReview ? (
        <View style={[styles.composer, { borderColor: c.border }]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Text style={{ color: c.foreground, fontFamily: "Inter_500Medium", fontSize: 13 }}>
              Your rating:
            </Text>
            <StarRow value={rating} onChange={setRating} />
          </View>
          <TextInput
            value={body}
            onChangeText={setBody}
            placeholder="Share your experience (optional)"
            placeholderTextColor={c.mutedForeground}
            multiline
            style={[
              styles.input,
              { color: c.foreground, borderColor: c.border, backgroundColor: c.background },
            ]}
          />
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Pressable
              onPress={submit}
              disabled={rating < 1 || reviewPage.isPending}
              style={[
                styles.smallBtn,
                { backgroundColor: c.primary, opacity: rating < 1 ? 0.5 : 1 },
              ]}
            >
              {reviewPage.isPending ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={{ color: "#fff", fontFamily: "Inter_700Bold", fontSize: 13 }}>
                  {page.viewerReview ? "Update" : "Submit"}
                </Text>
              )}
            </Pressable>
            {page.viewerReview ? (
              <Pressable
                onPress={remove}
                disabled={deleteReview.isPending}
                style={[styles.smallBtn, { backgroundColor: c.secondary }]}
              >
                {deleteReview.isPending ? (
                  <ActivityIndicator color={c.foreground} size="small" />
                ) : (
                  <Text style={{ color: c.foreground, fontFamily: "Inter_700Bold", fontSize: 13 }}>
                    Delete
                  </Text>
                )}
              </Pressable>
            ) : null}
          </View>
        </View>
      ) : null}

      {isLoading ? (
        <ActivityIndicator color={c.primary} style={{ marginVertical: 16 }} />
      ) : !reviews || reviews.length === 0 ? (
        <Text style={{ color: c.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 13, paddingVertical: 12 }}>
          No reviews yet. Be the first!
        </Text>
      ) : (
        <View style={{ gap: 14, marginTop: 4 }}>
          {reviews.map((rev: PageReview) => (
            <View key={rev.id} style={{ flexDirection: "row", gap: 10 }}>
              <View style={[styles.reviewAvatar, { backgroundColor: c.secondary }]}>
                {rev.user.avatarUrl ? (
                  <Image source={{ uri: rev.user.avatarUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
                ) : (
                  <Ionicons name="person" size={18} color={c.mutedForeground} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Text style={{ color: c.foreground, fontFamily: "Inter_600SemiBold", fontSize: 13 }}>
                    {rev.user.displayName || rev.user.username}
                  </Text>
                  <StarRow value={rev.rating} size={13} />
                </View>
                {rev.body ? (
                  <Text style={{ color: c.foreground, fontFamily: "Inter_400Regular", fontSize: 14, marginTop: 2 }}>
                    {rev.body}
                  </Text>
                ) : null}
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function MediaGridBlock({ pageId }: { pageId: number }) {
  const c = useColors();
  const { data: media, isLoading } = useListPageMedia(pageId);

  if (isLoading) {
    return <ActivityIndicator color={c.primary} style={{ marginVertical: 24 }} />;
  }
  if (!media || media.length === 0) {
    return (
      <View style={[styles.emptyBox, { backgroundColor: c.card, borderColor: c.border }]}>
        <Text style={{ color: c.mutedForeground, fontFamily: "Inter_500Medium" }}>
          No photos or videos yet.
        </Text>
      </View>
    );
  }
  return (
    <View style={styles.mediaGrid}>
      {media.map((item) => (
        <Pressable
          key={item.id}
          style={[styles.mediaCell, { backgroundColor: c.secondary }]}
          onPress={() => router.push(`/post/${item.postId}`)}
        >
          <Image
            source={{ uri: item.thumbnailUrl ?? item.url }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
          />
          {item.type === "video" ? (
            <View style={styles.videoBadge}>
              <Ionicons name="play" size={14} color="#fff" />
            </View>
          ) : null}
        </Pressable>
      ))}
    </View>
  );
}

function EditPageModal({
  page,
  visible,
  onClose,
}: {
  page: Page;
  visible: boolean;
  onClose: () => void;
}) {
  const c = useColors();
  const qc = useQueryClient();
  const updatePage = useUpdatePage();

  const [name, setName] = useState(page.name);
  const [category, setCategory] = useState(page.category ?? "");
  const [description, setDescription] = useState(page.description ?? "");
  const [contactPhone, setContactPhone] = useState(page.contactPhone ?? "");
  const [contactEmail, setContactEmail] = useState(page.contactEmail ?? "");
  const [website, setWebsite] = useState(page.website ?? "");
  const [address, setAddress] = useState(page.address ?? "");
  const [hours, setHours] = useState(page.hours ?? "");
  const [ctaType, setCtaType] = useState<CtaType>(page.ctaType);
  const [ctaUrl, setCtaUrl] = useState(page.ctaUrl ?? "");
  const [reviewsEnabled, setReviewsEnabled] = useState(page.reviewsEnabled);

  const save = () => {
    if (!name.trim()) {
      Alert.alert("Name required", "Please enter a page name.");
      return;
    }
    updatePage.mutate(
      {
        id: page.id,
        data: {
          name: name.trim(),
          category: category || null,
          description: description.trim() || null,
          contactPhone: contactPhone.trim() || null,
          contactEmail: contactEmail.trim() || null,
          website: website.trim() || null,
          address: address.trim() || null,
          hours: hours.trim() || null,
          ctaType,
          ctaUrl: ctaUrl.trim() || null,
          reviewsEnabled,
        },
      },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getGetPageQueryKey(page.id) });
          qc.invalidateQueries({ queryKey: getListPagesQueryKey() });
          onClose();
        },
      },
    );
  };

  const inputStyle = [
    styles.input,
    { color: c.foreground, borderColor: c.border, backgroundColor: c.secondary },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={[styles.modalCard, { backgroundColor: c.card }]}>
          <Text style={[styles.modalTitle, { color: c.foreground }]}>Edit Page</Text>
          <ScrollView style={{ maxHeight: 460 }} contentContainerStyle={{ gap: 12, paddingBottom: 8 }}>
            <TextInput value={name} onChangeText={setName} placeholder="Page name" placeholderTextColor={c.mutedForeground} style={inputStyle} />
            <Text style={[styles.fieldLabel, { color: c.mutedForeground }]}>Category</Text>
            <View style={styles.chipWrap}>
              {PAGE_CATEGORIES.map((cat: string) => {
                const selected = category === cat;
                return (
                  <Pressable
                    key={cat}
                    onPress={() => setCategory(cat)}
                    style={[styles.chip, { backgroundColor: selected ? c.primary : c.secondary, borderColor: selected ? c.primary : c.border }]}
                  >
                    <Text style={{ color: selected ? "#fff" : c.foreground, fontFamily: selected ? "Inter_600SemiBold" : "Inter_400Regular", fontSize: 13 }}>
                      {cat}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <TextInput value={description} onChangeText={setDescription} placeholder="Description" placeholderTextColor={c.mutedForeground} multiline style={[inputStyle, styles.textarea]} />
            <TextInput value={contactPhone} onChangeText={setContactPhone} placeholder="Phone" placeholderTextColor={c.mutedForeground} style={inputStyle} keyboardType="phone-pad" />
            <TextInput value={contactEmail} onChangeText={setContactEmail} placeholder="Email" placeholderTextColor={c.mutedForeground} style={inputStyle} keyboardType="email-address" autoCapitalize="none" />
            <TextInput value={website} onChangeText={setWebsite} placeholder="Website (https://...)" placeholderTextColor={c.mutedForeground} style={inputStyle} autoCapitalize="none" />
            <TextInput value={address} onChangeText={setAddress} placeholder="Address" placeholderTextColor={c.mutedForeground} style={inputStyle} />
            <TextInput value={hours} onChangeText={setHours} placeholder="Hours (e.g. Mon-Fri 9am-6pm)" placeholderTextColor={c.mutedForeground} style={inputStyle} />
            <Text style={[styles.fieldLabel, { color: c.mutedForeground }]}>Action Button</Text>
            <View style={styles.chipWrap}>
              {CTA_OPTIONS.map((opt) => {
                const selected = ctaType === opt;
                return (
                  <Pressable
                    key={opt}
                    onPress={() => setCtaType(opt)}
                    style={[styles.chip, { backgroundColor: selected ? c.primary : c.secondary, borderColor: selected ? c.primary : c.border }]}
                  >
                    <Text style={{ color: selected ? "#fff" : c.foreground, fontFamily: selected ? "Inter_600SemiBold" : "Inter_400Regular", fontSize: 13 }}>
                      {opt}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {ctaType === "shop" || ctaType === "signup" ? (
              <TextInput value={ctaUrl} onChangeText={setCtaUrl} placeholder="Button link URL (https://...)" placeholderTextColor={c.mutedForeground} style={inputStyle} autoCapitalize="none" />
            ) : null}
            <View style={[styles.switchRow, { borderColor: c.border }]}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={{ color: c.foreground, fontFamily: "Inter_600SemiBold", fontSize: 14 }}>Reviews</Text>
                <Text style={{ color: c.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 }}>
                  Let people rate and review this Page.
                </Text>
              </View>
              <Switch value={reviewsEnabled} onValueChange={setReviewsEnabled} />
            </View>
          </ScrollView>
          <View style={styles.modalActions}>
            <Pressable style={[styles.btn, { backgroundColor: c.secondary }]} onPress={onClose}>
              <Text style={{ color: c.foreground, fontFamily: "Inter_600SemiBold" }}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.btn, { backgroundColor: name.trim() ? c.primary : c.secondary }]}
              onPress={save}
              disabled={!name.trim() || updatePage.isPending}
            >
              {updatePage.isPending ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={{ color: name.trim() ? "#fff" : c.mutedForeground, fontFamily: "Inter_700Bold" }}>Save</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function PageAccessModal({
  page,
  visible,
  onClose,
}: {
  page: Page;
  visible: boolean;
  onClose: () => void;
}) {
  const c = useColors();
  const qc = useQueryClient();
  const [query, setQuery] = useState("");

  const { data: members, isLoading } = useListPageMembers(page.id, {
    query: { enabled: visible, queryKey: getListPageMembersQueryKey(page.id) },
  });
  const addMember = useAddPageMember();
  const removeMember = useRemovePageMember();

  const q = query.trim();
  const { data: results } = useSearchUsers(
    { q, limit: 6 },
    { query: { enabled: visible && q.length >= 2, queryKey: getSearchUsersQueryKey({ q, limit: 6 }) } },
  );

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: getListPageMembersQueryKey(page.id) });

  const memberIds = new Set((members ?? []).map((m) => m.user.id));
  const candidates = (results ?? []).filter(
    (p: Profile) => p.id !== page.ownerId && !memberIds.has(p.id),
  );

  const add = (userId: string) =>
    addMember.mutate(
      { id: page.id, data: { userId } },
      { onSuccess: () => { invalidate(); setQuery(""); } },
    );
  const remove = (userId: string) =>
    removeMember.mutate({ id: page.id, userId }, { onSuccess: invalidate });

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={[styles.modalCard, { backgroundColor: c.card }]}>
          <Text style={[styles.modalTitle, { color: c.foreground }]}>Page access</Text>
          <Text style={{ color: c.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 13, marginBottom: 10 }}>
            People with access can post and edit this Page. Only you (the owner) can manage access.
          </Text>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search by name or username..."
            placeholderTextColor={c.mutedForeground}
            autoCapitalize="none"
            style={[styles.input, { color: c.foreground, borderColor: c.border, backgroundColor: c.secondary }]}
          />
          <ScrollView style={{ maxHeight: 360, marginTop: 10 }} contentContainerStyle={{ gap: 8 }}>
            {q.length >= 2 && candidates.length > 0
              ? candidates.map((p: Profile) => (
                  <View key={p.id} style={[styles.memberRow, { borderColor: c.border }]}>
                    <View style={[styles.reviewAvatar, { backgroundColor: c.secondary, width: 34, height: 34, borderRadius: 17 }]}>
                      {p.avatarUrl ? (
                        <Image source={{ uri: p.avatarUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
                      ) : (
                        <Ionicons name="person" size={16} color={c.mutedForeground} />
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: c.foreground, fontFamily: "Inter_600SemiBold", fontSize: 13 }}>{p.displayName}</Text>
                      <Text style={{ color: c.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 12 }}>@{p.username}</Text>
                    </View>
                    <Pressable
                      onPress={() => add(p.id)}
                      disabled={addMember.isPending}
                      style={[styles.smallBtn, { backgroundColor: c.secondary, flexDirection: "row", gap: 4 }]}
                    >
                      <Ionicons name="person-add-outline" size={15} color={c.foreground} />
                      <Text style={{ color: c.foreground, fontFamily: "Inter_600SemiBold", fontSize: 12 }}>Add</Text>
                    </Pressable>
                  </View>
                ))
              : null}

            <Text style={[styles.fieldLabel, { color: c.mutedForeground, marginTop: 6 }]}>People with access</Text>
            {isLoading ? (
              <ActivityIndicator color={c.primary} style={{ marginVertical: 12 }} />
            ) : !members || members.length === 0 ? (
              <Text style={{ color: c.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 13 }}>
                Only you have access to this Page.
              </Text>
            ) : (
              members.map((m) => (
                <View key={m.id} style={[styles.memberRow, { borderColor: c.border }]}>
                  <View style={[styles.reviewAvatar, { backgroundColor: c.secondary, width: 34, height: 34, borderRadius: 17 }]}>
                    {m.user.avatarUrl ? (
                      <Image source={{ uri: m.user.avatarUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
                    ) : (
                      <Ionicons name="person" size={16} color={c.mutedForeground} />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: c.foreground, fontFamily: "Inter_600SemiBold", fontSize: 13 }}>{m.user.displayName}</Text>
                    <Text style={{ color: c.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 12 }}>@{m.user.username} · Editor</Text>
                  </View>
                  <Pressable onPress={() => remove(m.user.id)} disabled={removeMember.isPending} hitSlop={8}>
                    <Ionicons name="close-circle" size={22} color={c.mutedForeground} />
                  </Pressable>
                </View>
              ))
            )}
          </ScrollView>
          <View style={[styles.modalActions, { marginTop: 12 }]}>
            <Pressable style={[styles.btn, { backgroundColor: c.primary, flex: 1 }]} onPress={onClose}>
              <Text style={{ color: "#fff", fontFamily: "Inter_700Bold" }}>Done</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

type PeopleRow = {
  key: string;
  title: string;
  subtitle?: string;
  avatarUrl?: string | null;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
};

function PeopleListModal({
  visible,
  onClose,
  title,
  loading,
  rows,
  emptyText,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  loading: boolean;
  rows: PeopleRow[];
  emptyText: string;
}) {
  const c = useColors();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={[styles.modalCard, { backgroundColor: c.card }]}>
          <Text style={[styles.modalTitle, { color: c.foreground }]}>{title}</Text>
          {loading ? (
            <ActivityIndicator color={c.primary} style={{ marginVertical: 24 }} />
          ) : rows.length === 0 ? (
            <Text style={{ color: c.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 13, paddingVertical: 16 }}>
              {emptyText}
            </Text>
          ) : (
            <ScrollView style={{ maxHeight: 380 }} contentContainerStyle={{ gap: 8 }}>
              {rows.map((row) => (
                <Pressable
                  key={row.key}
                  style={[styles.memberRow, { borderColor: c.border }]}
                  onPress={row.onPress}
                >
                  <View style={[styles.reviewAvatar, { backgroundColor: c.secondary, width: 40, height: 40, borderRadius: 20 }]}>
                    {row.avatarUrl ? (
                      <Image source={{ uri: row.avatarUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
                    ) : (
                      <Ionicons name={row.icon} size={18} color={c.mutedForeground} />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: c.foreground, fontFamily: "Inter_600SemiBold", fontSize: 14 }} numberOfLines={1}>
                      {row.title}
                    </Text>
                    {row.subtitle ? (
                      <Text style={{ color: c.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 12 }} numberOfLines={1}>
                        {row.subtitle}
                      </Text>
                    ) : null}
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={c.mutedForeground} />
                </Pressable>
              ))}
            </ScrollView>
          )}
          <View style={[styles.modalActions, { marginTop: 12 }]}>
            <Pressable style={[styles.btn, { backgroundColor: c.primary, flex: 1 }]} onPress={onClose}>
              <Text style={{ color: "#fff", fontFamily: "Inter_700Bold" }}>Done</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function InviteFriendsModal({
  visible,
  onClose,
  onInvite,
  isPending,
  title,
  subtitle,
}: {
  visible: boolean;
  onClose: () => void;
  onInvite: (userIds: string[]) => void;
  isPending: boolean;
  title: string;
  subtitle: string;
}) {
  const c = useColors();
  const { data: friends, isLoading } = useListFriends({
    query: { enabled: visible, queryKey: getListFriendsQueryKey() },
  });
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!visible) setSelected(new Set());
  }, [visible]);

  const toggle = (fid: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(fid)) next.delete(fid);
      else next.add(fid);
      return next;
    });
  };

  const submit = () => {
    if (selected.size === 0) return;
    onInvite(Array.from(selected));
  };

  const list = (friends ?? []) as Profile[];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={[styles.modalCard, { backgroundColor: c.card }]}>
          <Text style={[styles.modalTitle, { color: c.foreground }]}>{title}</Text>
          <Text style={{ color: c.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 13, marginBottom: 10 }}>
            {subtitle}
          </Text>
          {isLoading ? (
            <ActivityIndicator color={c.primary} style={{ marginVertical: 24 }} />
          ) : list.length === 0 ? (
            <Text style={{ color: c.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 13, paddingVertical: 16 }}>
              You have no friends to invite yet.
            </Text>
          ) : (
            <ScrollView style={{ maxHeight: 360 }} contentContainerStyle={{ gap: 8 }}>
              {list.map((f) => {
                const checked = selected.has(f.id);
                return (
                  <Pressable
                    key={f.id}
                    style={[styles.memberRow, { borderColor: c.border }]}
                    onPress={() => toggle(f.id)}
                  >
                    <View style={[styles.reviewAvatar, { backgroundColor: c.secondary, width: 40, height: 40, borderRadius: 20 }]}>
                      {f.avatarUrl ? (
                        <Image source={{ uri: f.avatarUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
                      ) : (
                        <Ionicons name="person" size={18} color={c.mutedForeground} />
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: c.foreground, fontFamily: "Inter_600SemiBold", fontSize: 14 }} numberOfLines={1}>
                        {f.displayName}
                      </Text>
                      <Text style={{ color: c.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 12 }} numberOfLines={1}>
                        @{f.username}
                      </Text>
                    </View>
                    <Ionicons
                      name={checked ? "checkbox" : "square-outline"}
                      size={22}
                      color={checked ? c.primary : c.mutedForeground}
                    />
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
          <View style={[styles.modalActions, { marginTop: 12 }]}>
            <Pressable style={[styles.btn, { backgroundColor: c.secondary }]} onPress={onClose}>
              <Text style={{ color: c.foreground, fontFamily: "Inter_600SemiBold" }}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.btn, { backgroundColor: selected.size > 0 ? c.primary : c.secondary }]}
              onPress={submit}
              disabled={selected.size === 0 || isPending}
            >
              {isPending ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={{ color: selected.size > 0 ? "#fff" : c.mutedForeground, fontFamily: "Inter_700Bold" }}>
                  {selected.size > 0 ? `Invite (${selected.size})` : "Invite"}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function PageMenuModal({
  visible,
  onClose,
  onInvite,
  onCreateGroup,
}: {
  visible: boolean;
  onClose: () => void;
  onInvite: () => void;
  onCreateGroup: () => void;
}) {
  const c = useColors();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <View style={[styles.modalCard, { backgroundColor: c.card }]}>
          <Pressable style={styles.menuRow} onPress={onInvite}>
            <Ionicons name="person-add-outline" size={20} color={c.foreground} />
            <Text style={{ color: c.foreground, fontFamily: "Inter_600SemiBold", fontSize: 15 }}>Invite friends</Text>
          </Pressable>
          <Pressable style={styles.menuRow} onPress={onCreateGroup}>
            <Ionicons name="people-outline" size={20} color={c.foreground} />
            <Text style={{ color: c.foreground, fontFamily: "Inter_600SemiBold", fontSize: 15 }}>Create group</Text>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

export default function PageDetailScreen() {
  const c = useColors();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { id: idParam } = useLocalSearchParams<{ id: string }>();
  const id = Number(idParam);
  const { actingPage } = useActingPage();

  const { data: page, isLoading } = useGetPage(
    id,
    actingPage ? { asPageId: actingPage.id } : undefined,
  );
  const { data: posts, isLoading: postsLoading } = useGetPagePosts(id);
  const followPage = useFollowPage();
  const unfollowPage = useUnfollowPage();
  const updatePage = useUpdatePage();
  const createConversation = useCreateConversation();

  const [tab, setTab] = useState<"posts" | "media">("posts");
  const [editOpen, setEditOpen] = useState(false);
  const [accessOpen, setAccessOpen] = useState(false);
  const [photoBusy, setPhotoBusy] = useState<null | "avatar" | "cover">(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [followersOpen, setFollowersOpen] = useState(false);
  const [followingOpen, setFollowingOpen] = useState(false);

  const { data: followers, isLoading: followersLoading } = useListPageFollowers(id, {
    query: { enabled: followersOpen, queryKey: getListPageFollowersQueryKey(id) },
  });
  const { data: following, isLoading: followingLoading } = useListPageFollowing(id, {
    query: { enabled: followingOpen, queryKey: getListPageFollowingQueryKey(id) },
  });
  const inviteToPage = useInviteToPage();

  const handleInvite = (userIds: string[]) => {
    inviteToPage.mutate(
      { id, data: { userIds } },
      {
        onSuccess: () => {
          setInviteOpen(false);
          qc.invalidateQueries({ queryKey: getListPageFollowersQueryKey(id) });
          Alert.alert("Invites sent", "Your friends have been invited to follow this page.");
        },
        onError: () => Alert.alert("Could not send invites", "Please try again."),
      },
    );
  };

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: getListPagesQueryKey() });
    qc.invalidateQueries({ queryKey: getGetPageQueryKey(id) });
  };

  const followParams = actingPage ? { asPageId: actingPage.id } : undefined;
  const handleFollow = () => {
    if (!page) return;
    if (page.viewerFollows) {
      unfollowPage.mutate({ id, params: followParams }, { onSuccess: invalidate });
    } else {
      followPage.mutate({ id, params: followParams }, { onSuccess: invalidate });
    }
  };

  const editPhoto = async (kind: "avatar" | "cover") => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: kind === "avatar" ? [1, 1] : [16, 9],
      quality: 0.8,
    });
    if (res.canceled || !res.assets[0]) return;
    setPhotoBusy(kind);
    try {
      const uploaded = await uploadMedia(res.assets[0]);
      await updatePage.mutateAsync({
        id,
        data: kind === "avatar" ? { avatarUrl: uploaded.url } : { coverUrl: uploaded.url },
      });
      invalidate();
    } catch (err) {
      if (err instanceof UploadUnavailableError) {
        Alert.alert("Upload unavailable", "Media upload isn't configured in this environment.");
      } else {
        Alert.alert("Upload failed", "Please try again.");
      }
    } finally {
      setPhotoBusy(null);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: c.background }]}>
        <Stack.Screen options={{ title: "Page" }} />
        <ActivityIndicator color={c.primary} size="large" />
      </SafeAreaView>
    );
  }

  if (!page) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: c.background }]}>
        <Stack.Screen options={{ title: "Page" }} />
        <Text style={{ color: c.mutedForeground, fontFamily: "Inter_500Medium" }}>Page not found</Text>
      </SafeAreaView>
    );
  }

  const busy = followPage.isPending || unfollowPage.isPending;
  const isManager = !!page.viewerCanPost;
  const isOwner = user?.id === page.ownerId;
  const hasAbout =
    !!page.contactPhone ||
    !!page.contactEmail ||
    !!page.website ||
    !!page.address ||
    !!page.hours;

  const handleCta = () => {
    if (page.ctaType === "message") {
      createConversation.mutate(
        { data: { type: "direct", memberIds: [page.ownerId] } },
        {
          onSuccess: (conv) => router.push(`/messages/${conv.id}`),
          onError: () => router.push("/messages"),
        },
      );
    } else if (page.ctaType === "call" && page.contactPhone) {
      Linking.openURL(`tel:${page.contactPhone}`);
    } else if ((page.ctaType === "shop" || page.ctaType === "signup") && page.ctaUrl) {
      Linking.openURL(page.ctaUrl);
    }
  };
  const ctaLabel =
    page.ctaType === "message"
      ? "Message"
      : page.ctaType === "call"
        ? "Call"
        : page.ctaType === "shop"
          ? "Shop Now"
          : page.ctaType === "signup"
            ? "Sign Up"
            : null;
  const showCta =
    page.ctaType === "message" ||
    (page.ctaType === "call" && !!page.contactPhone) ||
    ((page.ctaType === "shop" || page.ctaType === "signup") && !!page.ctaUrl);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }} edges={["bottom"]}>
      <Stack.Screen options={{ title: page.name }} />
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <Pressable
          style={[styles.cover, { backgroundColor: c.secondary }]}
          disabled={!isManager || photoBusy !== null}
          onPress={() => editPhoto("cover")}
        >
          {page.coverUrl ? (
            <Image source={{ uri: page.coverUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
          ) : null}
          {isManager ? (
            <View style={styles.coverCam}>
              {photoBusy === "cover" ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Ionicons name="camera" size={16} color="#fff" />
              )}
            </View>
          ) : null}
        </Pressable>
        <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
          <View style={styles.avatarRow}>
            <Pressable
              style={[styles.avatar, { backgroundColor: c.secondary, borderColor: c.background }]}
              disabled={!isManager || photoBusy !== null}
              onPress={() => editPhoto("avatar")}
            >
              {page.avatarUrl ? (
                <Image source={{ uri: page.avatarUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
              ) : (
                <Ionicons name="document-text" size={36} color={c.primary} />
              )}
              {isManager ? (
                <View style={styles.avatarCam}>
                  {photoBusy === "avatar" ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Ionicons name="camera" size={14} color="#fff" />
                  )}
                </View>
              ) : null}
            </Pressable>
            <View style={{ flexDirection: "row", gap: 8, alignItems: "flex-end", flexShrink: 1, flexWrap: "wrap", justifyContent: "flex-end" }}>
              {showCta && ctaLabel ? (
                <Pressable
                  style={[styles.iconBtn, { backgroundColor: c.secondary }]}
                  onPress={handleCta}
                  disabled={createConversation.isPending}
                >
                  {createConversation.isPending && page.ctaType === "message" ? (
                    <ActivityIndicator color={c.foreground} size="small" />
                  ) : (
                    <Text style={{ color: c.foreground, fontFamily: "Inter_700Bold" }}>{ctaLabel}</Text>
                  )}
                </Pressable>
              ) : null}
              <Pressable
                style={[styles.iconBtn, { backgroundColor: page.viewerFollows ? c.secondary : c.primary }]}
                onPress={handleFollow}
                disabled={busy}
              >
                {busy ? (
                  <ActivityIndicator color={page.viewerFollows ? c.foreground : "#fff"} size="small" />
                ) : (
                  <Text style={{ color: page.viewerFollows ? c.foreground : "#fff", fontFamily: "Inter_700Bold" }}>
                    {page.viewerFollows ? "Following" : "Follow"}
                  </Text>
                )}
              </Pressable>
              {isManager ? (
                <Pressable style={[styles.squareBtn, { backgroundColor: c.secondary }]} onPress={() => setEditOpen(true)}>
                  <Ionicons name="create-outline" size={18} color={c.foreground} />
                </Pressable>
              ) : null}
              {isOwner ? (
                <Pressable style={[styles.squareBtn, { backgroundColor: c.secondary }]} onPress={() => setAccessOpen(true)}>
                  <Ionicons name="people-outline" size={18} color={c.foreground} />
                </Pressable>
              ) : null}
              <Pressable style={[styles.squareBtn, { backgroundColor: c.secondary }]} onPress={() => setMenuOpen(true)}>
                <Ionicons name="ellipsis-horizontal" size={18} color={c.foreground} />
              </Pressable>
            </View>
          </View>
          <Text style={[styles.name, { color: c.foreground }]}>{page.name}</Text>
          {page.category ? (
            <Text style={[styles.category, { color: c.mutedForeground }]}>{page.category}</Text>
          ) : null}
          {page.description ? (
            <Text style={[styles.desc, { color: c.foreground }]}>{page.description}</Text>
          ) : null}
          <View style={styles.statsRow}>
            <Pressable onPress={() => setFollowersOpen(true)} hitSlop={6}>
              <Text style={[styles.stat, { color: c.mutedForeground }]}>{page.followerCount} Followers</Text>
            </Pressable>
            <Pressable onPress={() => setFollowingOpen(true)} hitSlop={6}>
              <Text style={[styles.stat, { color: c.mutedForeground }]}>{page.followingCount} Following</Text>
            </Pressable>
            {page.reviewCount > 0 ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Ionicons name="star" size={14} color="#facc15" />
                <Text style={[styles.stat, { color: c.mutedForeground }]}>
                  {page.averageRating?.toFixed(1)} ({page.reviewCount})
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={{ paddingHorizontal: 16, gap: 12 }}>
          {hasAbout ? (
            <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
              <Text style={[styles.cardTitle, { color: c.foreground, marginBottom: 10 }]}>About</Text>
              {page.contactPhone ? <AboutRow icon="call-outline" text={page.contactPhone} color={c.foreground} muted={c.mutedForeground} /> : null}
              {page.contactEmail ? <AboutRow icon="mail-outline" text={page.contactEmail} color={c.foreground} muted={c.mutedForeground} /> : null}
              {page.website ? <AboutRow icon="globe-outline" text={page.website} color={c.foreground} muted={c.mutedForeground} /> : null}
              {page.address ? <AboutRow icon="location-outline" text={page.address} color={c.foreground} muted={c.mutedForeground} /> : null}
              {page.hours ? <AboutRow icon="time-outline" text={page.hours} color={c.foreground} muted={c.mutedForeground} /> : null}
            </View>
          ) : null}

          {page.reviewsEnabled ? <ReviewsBlock page={page} /> : null}

          <View style={[styles.tabBar, { borderBottomColor: c.border }]}>
            <Pressable onPress={() => setTab("posts")} style={styles.tabBtn}>
              <Text style={[styles.tabLabel, { color: tab === "posts" ? c.primary : c.mutedForeground }]}>Posts</Text>
              {tab === "posts" ? <View style={[styles.tabUnderline, { backgroundColor: c.primary }]} /> : null}
            </Pressable>
            <Pressable onPress={() => setTab("media")} style={styles.tabBtn}>
              <Text style={[styles.tabLabel, { color: tab === "media" ? c.primary : c.mutedForeground }]}>Photos & Videos</Text>
              {tab === "media" ? <View style={[styles.tabUnderline, { backgroundColor: c.primary }]} /> : null}
            </Pressable>
          </View>
        </View>

        {tab === "posts" ? (
          <View style={{ paddingHorizontal: 16, marginTop: 12, gap: 12 }}>
            {isManager ? (
              <Pressable
                style={[styles.composeBtn, { backgroundColor: c.card, borderColor: c.border }]}
                onPress={() => router.push("/create-post")}
              >
                <Ionicons name="create-outline" size={18} color={c.primary} />
                <Text style={{ color: c.mutedForeground, fontFamily: "Inter_500Medium" }}>Write a post…</Text>
              </Pressable>
            ) : null}
            {postsLoading ? (
              <ActivityIndicator color={c.primary} style={{ marginVertical: 24 }} />
            ) : !posts || posts.length === 0 ? (
              <View style={[styles.emptyBox, { backgroundColor: c.card, borderColor: c.border }]}>
                <Text style={{ color: c.mutedForeground, fontFamily: "Inter_500Medium" }}>No posts yet.</Text>
              </View>
            ) : (
              posts.map((post) => (
                <PostCard key={post.id} post={post} onComment={() => router.push(`/post/${post.id}`)} />
              ))
            )}
          </View>
        ) : (
          <View style={{ paddingHorizontal: 16, marginTop: 12 }}>
            <MediaGridBlock pageId={id} />
          </View>
        )}
      </ScrollView>

      {isManager ? <EditPageModal page={page} visible={editOpen} onClose={() => setEditOpen(false)} /> : null}
      {isOwner ? <PageAccessModal page={page} visible={accessOpen} onClose={() => setAccessOpen(false)} /> : null}

      <PageMenuModal
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        onInvite={() => {
          setMenuOpen(false);
          setInviteOpen(true);
        }}
        onCreateGroup={() => {
          setMenuOpen(false);
          router.push("/groups?create=1");
        }}
      />
      <InviteFriendsModal
        visible={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onInvite={handleInvite}
        isPending={inviteToPage.isPending}
        title="Invite friends"
        subtitle={`Invite friends to follow ${page.name}.`}
      />
      <PeopleListModal
        visible={followersOpen}
        onClose={() => setFollowersOpen(false)}
        title="Followers"
        loading={followersLoading}
        emptyText="No followers yet."
        rows={(followers ?? []).map((p) => ({
          key: p.id,
          title: p.displayName || p.username,
          subtitle: `@${p.username}`,
          avatarUrl: p.avatarUrl,
          icon: "person",
          onPress: () => {
            setFollowersOpen(false);
            router.push(`/profile/${p.id}`);
          },
        }))}
      />
      <PeopleListModal
        visible={followingOpen}
        onClose={() => setFollowingOpen(false)}
        title="Following"
        loading={followingLoading}
        emptyText="Not following any pages yet."
        rows={(following ?? []).map((pg) => ({
          key: String(pg.id),
          title: pg.name,
          subtitle: pg.category ?? undefined,
          avatarUrl: pg.avatarUrl,
          icon: "document-text",
          onPress: () => {
            setFollowingOpen(false);
            router.push(`/pages/${pg.id}`);
          },
        }))}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  cover: { height: 150 },
  coverCam: {
    position: "absolute",
    right: 12,
    bottom: 12,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 16,
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: "hidden",
    marginTop: -50,
    borderWidth: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarCam: {
    position: "absolute",
    right: 2,
    bottom: 2,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 13,
    width: 26,
    height: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  iconBtn: { borderRadius: 10, paddingVertical: 10, paddingHorizontal: 18, marginBottom: 8 },
  squareBtn: {
    borderRadius: 10,
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  name: { fontFamily: "Inter_700Bold", fontSize: 22, marginTop: 12 },
  category: { fontFamily: "Inter_500Medium", fontSize: 14, marginTop: 2 },
  desc: { fontFamily: "Inter_400Regular", fontSize: 15, marginTop: 10, lineHeight: 21 },
  statsRow: { flexDirection: "row", alignItems: "center", gap: 14, marginTop: 14, flexWrap: "wrap" },
  stat: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  card: { borderWidth: 1, borderRadius: 14, padding: 14 },
  cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  cardTitle: { fontFamily: "Inter_700Bold", fontSize: 17 },
  aboutRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 5 },
  aboutText: { fontFamily: "Inter_400Regular", fontSize: 14, flex: 1 },
  composer: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 14, gap: 10 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
  },
  textarea: { minHeight: 60, textAlignVertical: "top" },
  fieldLabel: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  smallBtn: {
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  reviewAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  tabBar: { flexDirection: "row", gap: 4, borderBottomWidth: 1, marginTop: 2 },
  tabBtn: { paddingVertical: 10, paddingHorizontal: 14, position: "relative" },
  tabLabel: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  tabUnderline: { position: "absolute", left: 0, right: 0, bottom: -1, height: 2, borderRadius: 2 },
  composeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  emptyBox: { borderWidth: 1, borderRadius: 14, padding: 24, alignItems: "center" },
  mediaGrid: { flexDirection: "row", flexWrap: "wrap", gap: 3 },
  mediaCell: { width: "32.6%", aspectRatio: 1, overflow: "hidden", borderRadius: 4 },
  videoBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 10,
    padding: 3,
  },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalCard: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 34 },
  modalTitle: { fontFamily: "Inter_700Bold", fontSize: 19, marginBottom: 14 },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderWidth: 1, borderRadius: 999, paddingVertical: 7, paddingHorizontal: 14 },
  modalActions: { flexDirection: "row", gap: 10, marginTop: 14 },
  btn: { flex: 1, borderRadius: 12, paddingVertical: 13, alignItems: "center", justifyContent: "center" },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 10,
    padding: 8,
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
});
