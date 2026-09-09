import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { useVideoPlayer, VideoView } from "expo-video";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import {
  useCreateStory,
  getListStoriesQueryKey,
  StoryInputMediaType,
  StoryInputAudience,
  type Profile,
} from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/lib/auth";
import { useActingPage } from "@/lib/acting-page";
import { uploadMedia, UploadUnavailableError, captureWithCamera, type PickedAsset } from "@/lib/upload";
import { GifPickerModal } from "@/components/GifPicker";
import { MusicPickerModal, type SelectedMusic } from "@/components/MusicPicker";
import { SmartStickerSheet } from "@/components/SmartStickerSheet";
import { MobileDraggableOverlay } from "@/components/MobileDraggableOverlay";
import { MentionSuggestions, activeMentionQuery, insertMention } from "@/components/Mention";
import { STORY_BACKGROUNDS, DEFAULT_STORY_BG, storyBackground } from "@/lib/storyBackgrounds";
import { MOBILE_FILTERS, type MobileFilter } from "@/lib/filters";
import type { MobileOverlayItem } from "@/lib/smartStickers";

const BG_CATEGORIES = {
  all: { label: "All (50+)" },
  vibrant: {
    label: "Vibrant",
    keys: [
      "sunset", "ocean", "forest", "berry", "night", "fire", "aurora", "cosmic",
      "neon_lime", "mango", "cotton_candy", "watermelon", "tropical", "royal",
      "flamingo", "ice_cold", "lemon_lime", "grape", "crimson", "emerald_sea",
      "hot_fuchsia", "lavender_sky", "peach", "electric_blue", "sunset_gold",
    ],
  },
  pastels: {
    label: "Pastels",
    keys: [
      "soft_mint", "lavender_fog", "rose_dust", "butter_cream", "sky_blue",
      "lilac_morning", "sage_breeze", "blush_pink", "powder_blue", "pale_gold",
    ],
  },
  dark: {
    label: "Dark Luxury",
    keys: [
      "oled_black", "midnight_navy", "dark_emerald", "wine_red", "royal_gold",
      "deep_purple", "charcoal", "dark_teal", "steel", "obsidian",
    ],
  },
  seasonal: {
    label: "Themed",
    keys: ["christmas", "halloween", "spring_blossom", "summer_wave", "autumn_leaves"],
  },
};

const FONT_OPTIONS: Array<{ id: "modern" | "serif" | "neon" | "script" | "impact"; label: string }> = [
  { id: "modern", label: "Modern" },
  { id: "serif", label: "Serif" },
  { id: "neon", label: "Neon" },
  { id: "script", label: "Script" },
  { id: "impact", label: "Impact" },
];

export default function CreateStoryScreen() {
  const c = useColors();
  const qc = useQueryClient();
  const createStory = useCreateStory();
  const { user } = useAuth();
  const { actingPage } = useActingPage();
  const params = useLocalSearchParams<{ mode?: string; uri?: string; type?: string; source?: string }>();

  const pageFields = actingPage ? { pageId: actingPage.id } : {};
  const identityName = actingPage?.name ?? user?.displayName ?? "";
  const identityAvatar = actingPage ? actingPage.avatarUrl ?? null : user?.avatarUrl ?? null;

  const [mode, setMode] = useState<"media" | "text">("media");
  const [audience, setAudience] = useState<StoryInputAudience>(StoryInputAudience.public);
  const [asset, setAsset] = useState<PickedAsset | null>(null);
  const [gifUrl, setGifUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [textContent, setTextContent] = useState("");
  const [background, setBackground] = useState(DEFAULT_STORY_BG);
  const [bgCategory, setBgCategory] = useState<keyof typeof BG_CATEGORIES>("all");
  const [fontStyle, setFontStyle] = useState<"modern" | "serif" | "neon" | "script" | "impact">("modern");

  // Filters & Overlays
  const [selectedFilter, setSelectedFilter] = useState<string>("normal");
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [overlays, setOverlays] = useState<MobileOverlayItem[]>([]);
  const [selectedOverlayId, setSelectedOverlayId] = useState<string | null>(null);

  // Modals
  const [music, setMusic] = useState<SelectedMusic | null>(null);
  const [gifOpen, setGifOpen] = useState(false);
  const [musicOpen, setMusicOpen] = useState(false);
  const [stickerOpen, setStickerOpen] = useState(false);
  const [posting, setPosting] = useState(false);

  const captionRef = useRef<TextInput>(null);
  const textRef = useRef<TextInput>(null);

  // Load from params if opened through launcher sheet
  useEffect(() => {
    if (params.mode === "text") {
      setMode("text");
    } else if (params.uri) {
      setMode("media");
      setGifUrl(null);
      setAsset({
        uri: params.uri,
        type: params.type === "video" ? "video" : "image",
      } as PickedAsset);
    }
  }, [params.mode, params.uri, params.type]);

  const isVideo = asset?.type === "video";
  const activeText = mode === "media" ? caption : textContent;
  const setActiveText = mode === "media" ? setCaption : setTextContent;
  const mentionQuery = activeMentionQuery(activeText);

  const activeFilterObj = MOBILE_FILTERS.find((f) => f.id === selectedFilter) ?? MOBILE_FILTERS[0];

  const onPickMention = (p: Profile) => {
    setActiveText(insertMention(activeText, p));
  };

  const startMention = () => {
    const prefix = activeText.length > 0 && !activeText.endsWith(" ") ? " @" : "@";
    setActiveText(activeText + prefix);
    (mode === "media" ? captionRef : textRef).current?.focus();
  };

  const pick = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      quality: 0.8,
    });
    if (!res.canceled && res.assets[0]) {
      setGifUrl(null);
      setAsset(res.assets[0]);
    }
  };

  const capture = async () => {
    const captured = await captureWithCamera(["images", "videos"]);
    if (captured) {
      setGifUrl(null);
      setAsset(captured);
    }
  };

  const handleAddSticker = (item: MobileOverlayItem) => {
    setOverlays((prev) => [...prev, item]);
    setSelectedOverlayId(item.id);
  };

  const deleteSelectedOverlay = () => {
    if (!selectedOverlayId) return;
    setOverlays((prev) => prev.filter((o) => o.id !== selectedOverlayId));
    setSelectedOverlayId(null);
  };

  const adjustSelectedSize = (delta: number) => {
    if (!selectedOverlayId) return;
    setOverlays((prev) =>
      prev.map((o) =>
        o.id === selectedOverlayId
          ? { ...o, fontSize: Math.max(12, Math.min(64, (o.fontSize ?? 20) + delta)) }
          : o,
      ),
    );
  };

  const moveOverlay = (id: string, deltaX: number, deltaY: number) => {
    setOverlays((prev) =>
      prev.map((o) =>
        o.id === id
          ? {
              ...o,
              x: Math.max(5, Math.min(95, o.x + deltaX)),
              y: Math.max(5, Math.min(95, o.y + deltaY)),
            }
          : o,
      ),
    );
  };

  const canSubmit =
    mode === "media" ? asset != null || gifUrl != null : textContent.trim().length > 0;

  const submit = async () => {
    if (!canSubmit) return;
    setPosting(true);
    try {
      const musicFields = music
        ? {
            musicUrl: music.url,
            musicTitle: music.title,
            musicArtist: music.artist ?? undefined,
          }
        : {};

      if (mode === "text") {
        await createStory.mutateAsync({
          data: {
            storyType: "text",
            audience,
            textContent: textContent.trim(),
            backgroundStyle: background,
            ...musicFields,
            ...pageFields,
          },
        });
      } else if (gifUrl) {
        await createStory.mutateAsync({
          data: {
            storyType: "media",
            audience,
            mediaUrl: gifUrl,
            mediaType: StoryInputMediaType.image,
            caption: caption.trim() || undefined,
            ...musicFields,
            ...pageFields,
          },
        });
      } else {
        let uploaded;
        try {
          uploaded = await uploadMedia(asset!);
        } catch (err) {
          if (err instanceof UploadUnavailableError) {
            Alert.alert(
              "Media upload unavailable",
              "Storage isn't configured in this environment, so this story can't be posted right now.",
            );
            return;
          }
          throw err;
        }
        await createStory.mutateAsync({
          data: {
            storyType: "media",
            audience,
            mediaUrl: uploaded.url,
            mediaType:
              uploaded.type === "video"
                ? StoryInputMediaType.video
                : StoryInputMediaType.image,
            caption: caption.trim() || undefined,
            ...musicFields,
            ...pageFields,
          },
        });
      }
      qc.invalidateQueries({ queryKey: getListStoriesQueryKey() });
      router.back();
    } catch {
      Alert.alert("Error", "Could not share your story. Please try again.");
    } finally {
      setPosting(false);
    }
  };

  const previewUri = gifUrl ?? asset?.uri ?? null;

  const bgSwatchKeys =
    bgCategory === "all"
      ? Object.keys(STORY_BACKGROUNDS)
      : BG_CATEGORIES[bgCategory]?.keys ?? Object.keys(STORY_BACKGROUNDS);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#000" }}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="close" size={28} color="#fff" />
        </Pressable>
        <View style={{ alignItems: "center" }}>
          <Text style={{ color: "#fff", fontFamily: "Inter_700Bold", fontSize: 17 }}>
            {mode === "text" ? "Text Story" : "Photo & Video Story"}
          </Text>
          {activeFilterObj.id !== "normal" && mode === "media" && (
            <Text style={{ color: "#a855f7", fontFamily: "Inter_500Medium", fontSize: 11 }}>
              Filter: {activeFilterObj.name}
            </Text>
          )}
        </View>
        <Pressable
          style={[styles.shareBtn, { backgroundColor: canSubmit ? c.primary : "#333" }]}
          onPress={submit}
          disabled={!canSubmit || posting}
        >
          {posting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={{ color: "#fff", fontFamily: "Inter_700Bold" }}>Share</Text>
          )}
        </Pressable>
      </View>

      {/* Identity row */}
      <View style={styles.identityRow}>
        {identityAvatar ? (
          <Image source={{ uri: identityAvatar }} style={styles.identityAvatar} />
        ) : (
          <View style={[styles.identityAvatar, styles.identityAvatarFallback]}>
            <Text style={styles.identityAvatarInitial}>
              {identityName ? identityName[0]?.toUpperCase() : "?"}
            </Text>
          </View>
        )}
        <Text style={styles.identityName} numberOfLines={1}>
          {identityName}
        </Text>
      </View>

      {/* Mode tabs */}
      <View style={styles.tabs}>
        <Pressable
          style={[styles.tab, mode === "media" && { backgroundColor: c.primary }]}
          onPress={() => setMode("media")}
        >
          <Ionicons name="image" size={16} color="#fff" />
          <Text style={styles.tabText}>Photo / Video / GIF</Text>
        </Pressable>
        <Pressable
          style={[styles.tab, mode === "text" && { backgroundColor: c.primary }]}
          onPress={() => setMode("text")}
        >
          <Ionicons name="text" size={16} color="#fff" />
          <Text style={styles.tabText}>Text (50+ Colors)</Text>
        </Pressable>
      </View>

      {/* Audience selector */}
      <View style={styles.audienceRow}>
        {(
          [
            { value: StoryInputAudience.public, label: "Public", icon: "earth" },
            { value: StoryInputAudience.friends, label: "Friends", icon: "people" },
            { value: StoryInputAudience.private, label: "Only me", icon: "lock-closed" },
          ] as const
        ).map((a) => (
          <Pressable
            key={a.value}
            style={[styles.audienceChip, audience === a.value && { backgroundColor: c.primary }]}
            onPress={() => setAudience(a.value)}
          >
            <Ionicons name={a.icon} size={12} color="#fff" />
            <Text style={styles.audienceChipText}>{a.label}</Text>
          </Pressable>
        ))}
      </View>

      {/* Music chip */}
      {music && (
        <View style={styles.musicChip}>
          <Ionicons name="musical-notes" size={14} color="#fff" />
          <Text style={styles.musicChipText} numberOfLines={1}>
            {music.title}
            {music.artist ? ` · ${music.artist}` : ""}
          </Text>
          <Pressable onPress={() => setMusic(null)} hitSlop={8}>
            <Ionicons name="close" size={16} color="#fff" />
          </Pressable>
        </View>
      )}

      {mode === "text" ? (
        /* Text Story Mode */
        <View style={{ flex: 1 }}>
          <LinearGradient
            colors={storyBackground(background)}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.textPreview}
          >
            <TextInput
              ref={textRef}
              value={textContent}
              onChangeText={setTextContent}
              placeholder="Start typing your story... (@ to mention)"
              placeholderTextColor="#ffffffaa"
              underlineColorAndroid="transparent"
              style={[
                styles.textStoryInput,
                fontStyle === "serif" && { fontFamily: Platform.select({ ios: "Georgia", default: "serif" }), fontStyle: "italic" },
                fontStyle === "neon" && { textShadowColor: "#a855f7", textShadowRadius: 10 },
                fontStyle === "impact" && { letterSpacing: 2, textTransform: "uppercase" },
              ]}
              multiline
              maxLength={700}
            />

            {/* Draggable overlays on text canvas */}
            {overlays.map((ov) => (
              <MobileDraggableOverlay
                key={ov.id}
                overlay={ov}
                isSelected={selectedOverlayId === ov.id}
                onSelect={() => setSelectedOverlayId(ov.id)}
                onMove={(dx, dy) => moveOverlay(ov.id, dx, dy)}
              />
            ))}

            {/* Floating tools */}
            <View style={styles.toolbar}>
              <ToolButton icon="sparkles" label="Stickers" onPress={() => setStickerOpen(true)} />
              <ToolButton icon="at-outline" label="Mention" onPress={startMention} />
              <ToolButton icon="musical-notes" label="Music" onPress={() => setMusicOpen(true)} />
            </View>

            {/* Selected Overlay Controls */}
            {selectedOverlayId && (
              <View style={styles.selectedControlsBar}>
                <Text style={styles.ctrlLabel}>Size:</Text>
                <Pressable style={styles.ctrlBtn} onPress={() => adjustSelectedSize(-3)}>
                  <Text style={styles.ctrlBtnText}>-</Text>
                </Pressable>
                <Pressable style={styles.ctrlBtn} onPress={() => adjustSelectedSize(3)}>
                  <Text style={styles.ctrlBtnText}>+</Text>
                </Pressable>
                <Pressable
                  style={[styles.ctrlBtn, { backgroundColor: "#ef444433", marginLeft: 8 }]}
                  onPress={deleteSelectedOverlay}
                >
                  <Ionicons name="trash" size={14} color="#ef4444" />
                  <Text style={[styles.ctrlBtnText, { color: "#ef4444", fontSize: 12, marginLeft: 4 }]}>
                    Delete
                  </Text>
                </Pressable>
              </View>
            )}
          </LinearGradient>

          {mentionQuery !== null && (
            <MentionSuggestions query={mentionQuery} onSelect={onPickMention} />
          )}

          {/* Font selection chips */}
          <View style={styles.fontStyleRow}>
            {FONT_OPTIONS.map((fn) => (
              <Pressable
                key={fn.id}
                style={[styles.fontChip, fontStyle === fn.id && styles.fontChipActive]}
                onPress={() => setFontStyle(fn.id)}
              >
                <Text style={[styles.fontChipText, fontStyle === fn.id && styles.fontChipTextActive]}>
                  {fn.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* 50+ Background Selector with category tabs */}
          <View style={styles.bgSection}>
            {/* Category tabs */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.bgCatRow}>
              {Object.entries(BG_CATEGORIES).map(([key, cat]) => (
                <Pressable
                  key={key}
                  style={[styles.bgCatPill, bgCategory === key && styles.bgCatPillActive]}
                  onPress={() => setBgCategory(key as keyof typeof BG_CATEGORIES)}
                >
                  <Text style={[styles.bgCatText, bgCategory === key && styles.bgCatTextActive]}>
                    {cat.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            {/* Background swatches */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}
            >
              {bgSwatchKeys.map((key) => (
                <Pressable key={key} onPress={() => setBackground(key)}>
                  <LinearGradient
                    colors={storyBackground(key)}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[
                      styles.bgSwatch,
                      background === key && { borderColor: "#fff", borderWidth: 3 },
                    ]}
                  />
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      ) : previewUri ? (
        /* Media Story Mode Preview */
        <View style={styles.preview}>
          <StoryMediaPreview
            uri={previewUri}
            isVideo={isVideo && !gifUrl}
            filterColor={activeFilterObj.overlayColor}
          />

          {isVideo && !gifUrl && (
            <View style={styles.videoBadge}>
              <Ionicons name="videocam" size={14} color="#fff" />
              <Text style={{ color: "#fff", fontSize: 11, fontFamily: "Inter_500Medium" }}>
                Video Story
              </Text>
            </View>
          )}

          {/* Render Overlays on photo/video */}
          {overlays.map((ov) => (
            <MobileDraggableOverlay
              key={ov.id}
              overlay={ov}
              isSelected={selectedOverlayId === ov.id}
              onSelect={() => setSelectedOverlayId(ov.id)}
              onMove={(dx, dy) => moveOverlay(ov.id, dx, dy)}
            />
          ))}

          {caption.trim().length > 0 && (
            <View style={styles.captionOverlay} pointerEvents="none">
              <Text style={styles.captionText}>{caption}</Text>
            </View>
          )}

          {/* Floating side tools */}
          <View style={styles.toolbar}>
            <ToolButton icon="text-outline" label="Caption" onPress={() => captionRef.current?.focus()} />
            <ToolButton icon="sparkles" label="Stickers" onPress={() => setStickerOpen(true)} />
            <ToolButton
              icon="color-filter"
              label="Filters"
              onPress={() => setFilterPanelOpen((o) => !o)}
            />
            <ToolButton icon="at-outline" label="Mention" onPress={startMention} />
            <ToolButton icon="musical-notes" label="Music" onPress={() => setMusicOpen(true)} />
          </View>

          {/* Selected Overlay Controls */}
          {selectedOverlayId && (
            <View style={styles.selectedControlsBar}>
              <Text style={styles.ctrlLabel}>Size:</Text>
              <Pressable style={styles.ctrlBtn} onPress={() => adjustSelectedSize(-3)}>
                <Text style={styles.ctrlBtnText}>-</Text>
              </Pressable>
              <Pressable style={styles.ctrlBtn} onPress={() => adjustSelectedSize(3)}>
                <Text style={styles.ctrlBtnText}>+</Text>
              </Pressable>
              <Pressable
                style={[styles.ctrlBtn, { backgroundColor: "#ef444433", marginLeft: 8 }]}
                onPress={deleteSelectedOverlay}
              >
                <Ionicons name="trash" size={14} color="#ef4444" />
                <Text style={[styles.ctrlBtnText, { color: "#ef4444", fontSize: 12, marginLeft: 4 }]}>
                  Delete
                </Text>
              </Pressable>
            </View>
          )}

          {/* Filter Bar Strip */}
          {filterPanelOpen && (
            <View style={styles.filterStripContainer}>
              <View style={styles.filterStripHeader}>
                <Text style={styles.filterStripTitle}>Snapchat & IG Filters</Text>
                <Pressable onPress={() => setFilterPanelOpen(false)}>
                  <Ionicons name="close-circle" size={18} color="#fff" />
                </Pressable>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingVertical: 4 }}>
                {MOBILE_FILTERS.map((f) => {
                  const isActive = selectedFilter === f.id;
                  return (
                    <Pressable
                      key={f.id}
                      style={[styles.filterThumb, isActive && styles.filterThumbActive]}
                      onPress={() => setSelectedFilter(f.id)}
                    >
                      <View
                        style={[
                          styles.filterCircle,
                          { backgroundColor: f.overlayColor === "transparent" ? "#3f3f46" : f.overlayColor },
                        ]}
                      >
                        {isActive && <Ionicons name="checkmark" size={14} color="#fff" />}
                      </View>
                      <Text style={[styles.filterLabel, isActive && { color: "#a855f7", fontFamily: "Inter_700Bold" }]}>
                        {f.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Bottom Bar */}
          <View style={styles.bottomBar}>
            {mentionQuery !== null && (
              <MentionSuggestions query={mentionQuery} onSelect={onPickMention} />
            )}
            <TextInput
              ref={captionRef}
              value={caption}
              onChangeText={setCaption}
              placeholder="Add a caption... (@ to mention)"
              placeholderTextColor="#ffffffaa"
              underlineColorAndroid="transparent"
              style={styles.captionInput}
              multiline
            />
            <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
              <Pressable style={styles.changeBtn} onPress={pick}>
                <Ionicons name="image" size={16} color="#fff" />
                <Text style={styles.changeBtnText}>Gallery</Text>
              </Pressable>
              <Pressable style={styles.changeBtn} onPress={capture}>
                <Ionicons name="camera" size={16} color="#fff" />
                <Text style={styles.changeBtnText}>Camera</Text>
              </Pressable>
              <Pressable style={styles.changeBtn} onPress={() => setGifOpen(true)}>
                <Ionicons name="happy" size={16} color="#fff" />
                <Text style={styles.changeBtnText}>GIF</Text>
              </Pressable>
              <Pressable style={styles.changeBtn} onPress={() => setMusicOpen(true)}>
                <Ionicons name="musical-notes" size={16} color="#fff" />
                <Text style={styles.changeBtnText}>Music</Text>
              </Pressable>
            </View>
          </View>
        </View>
      ) : (
        /* Empty State */
        <View style={styles.empty}>
          <Pressable
            style={[styles.pickBtn, { backgroundColor: c.primary }]}
            onPress={pick}
          >
            <Ionicons name="images" size={28} color="#fff" />
            <Text style={{ color: "#fff", fontFamily: "Inter_700Bold", fontSize: 16 }}>
              Choose photo or video
            </Text>
          </Pressable>
          <Pressable
            style={[styles.pickBtn, { backgroundColor: "#ffffff22" }]}
            onPress={capture}
          >
            <Ionicons name="camera" size={28} color="#fff" />
            <Text style={{ color: "#fff", fontFamily: "Inter_700Bold", fontSize: 16 }}>
              Take photo or video
            </Text>
          </Pressable>
          <Pressable
            style={[styles.pickBtn, { backgroundColor: "#ffffff22" }]}
            onPress={() => setGifOpen(true)}
          >
            <Ionicons name="happy" size={28} color="#fff" />
            <Text style={{ color: "#fff", fontFamily: "Inter_700Bold", fontSize: 16 }}>
              Pick a GIF
            </Text>
          </Pressable>
          <Text style={{ color: "#ffffff99", fontFamily: "Inter_400Regular", fontSize: 13, textAlign: "center" }}>
            Share stories with 20+ Snapchat filters, 50+ background colors & smart stickers
          </Text>
        </View>
      )}

      {/* GIF Picker */}
      <GifPickerModal
        visible={gifOpen}
        onClose={() => setGifOpen(false)}
        onSelect={(url) => {
          setAsset(null);
          setGifUrl(url);
        }}
      />

      {/* Music Picker */}
      <MusicPickerModal
        visible={musicOpen}
        onClose={() => setMusicOpen(false)}
        onSelect={setMusic}
      />

      {/* Smart Stickers & Emojis Sheet */}
      <SmartStickerSheet
        visible={stickerOpen}
        onClose={() => setStickerOpen(false)}
        onSelectSticker={handleAddSticker}
        currentMusicTitle={music?.title}
      />
    </SafeAreaView>
  );
}

function StoryMediaPreview({
  uri,
  isVideo,
  filterColor,
}: {
  uri: string;
  isVideo: boolean;
  filterColor?: string;
}) {
  if (isVideo) {
    return <StoryVideoView uri={uri} filterColor={filterColor} />;
  }
  return (
    <View style={StyleSheet.absoluteFill}>
      <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="contain" />
      {filterColor && filterColor !== "transparent" && (
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: filterColor, pointerEvents: "none", zIndex: 5 },
          ]}
        />
      )}
    </View>
  );
}

function StoryVideoView({ uri, filterColor }: { uri: string; filterColor?: string }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.play();
  });
  return (
    <View style={StyleSheet.absoluteFill}>
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit="contain"
        nativeControls={false}
      />
      {filterColor && filterColor !== "transparent" && (
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: filterColor, pointerEvents: "none", zIndex: 5 },
          ]}
        />
      )}
    </View>
  );
}

function ToolButton({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.toolBtn} onPress={onPress} hitSlop={4}>
      <View style={styles.toolIconCircle}>
        <Ionicons name={icon} size={20} color="#fff" />
      </View>
      <Text style={styles.toolLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  shareBtn: {
    borderRadius: 8,
    paddingHorizontal: 18,
    paddingVertical: 8,
    minWidth: 72,
    alignItems: "center",
  },
  identityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  identityAvatar: { width: 30, height: 30, borderRadius: 15 },
  identityAvatarFallback: {
    backgroundColor: "#ffffff33",
    alignItems: "center",
    justifyContent: "center",
  },
  identityAvatarInitial: {
    color: "#fff",
    fontFamily: "Inter_700Bold",
    fontSize: 13,
  },
  identityName: {
    color: "#fff",
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    flexShrink: 1,
  },
  tabs: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#ffffff22",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  tabText: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 13 },
  audienceRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  audienceChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#ffffff22",
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  audienceChipText: {
    color: "#fff",
    fontFamily: "Inter_500Medium",
    fontSize: 11,
  },
  musicChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    backgroundColor: "#ffffff22",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginHorizontal: 16,
    marginBottom: 8,
    maxWidth: "80%",
  },
  musicChipText: {
    color: "#fff",
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    flexShrink: 1,
  },
  preview: { flex: 1, position: "relative" },
  textPreview: {
    flex: 1,
    marginHorizontal: 14,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    position: "relative",
    overflow: "hidden",
  },
  textStoryInput: {
    color: "#fff",
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    textAlign: "center",
    width: "100%",
    zIndex: 10,
  },
  fontStyleRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  fontChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: "#27272a",
  },
  fontChipActive: {
    backgroundColor: "#7c3aed",
  },
  fontChipText: {
    color: "#a1a1aa",
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },
  fontChipTextActive: {
    color: "#fff",
  },
  bgSection: {
    paddingBottom: 14,
    gap: 8,
  },
  bgCatRow: {
    gap: 6,
    paddingHorizontal: 14,
  },
  bgCatPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: "#18181b",
  },
  bgCatPillActive: {
    backgroundColor: "#3f3f46",
  },
  bgCatText: {
    color: "#71717a",
    fontFamily: "Inter_500Medium",
    fontSize: 11,
  },
  bgCatTextActive: {
    color: "#fff",
  },
  bgSwatch: { width: 34, height: 34, borderRadius: 17 },
  toolbar: {
    position: "absolute",
    top: 14,
    right: 12,
    gap: 14,
    alignItems: "center",
    zIndex: 35,
  },
  toolBtn: { alignItems: "center", gap: 3 },
  toolIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#00000066",
  },
  toolLabel: {
    color: "#fff",
    fontFamily: "Inter_500Medium",
    fontSize: 10,
  },
  videoBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#0009",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    zIndex: 20,
  },
  captionOverlay: {
    position: "absolute",
    top: "45%",
    left: 0,
    right: 0,
    alignItems: "center",
    paddingHorizontal: 24,
    zIndex: 10,
  },
  captionText: {
    color: "#fff",
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    textAlign: "center",
    textShadowColor: "#000",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  selectedControlsBar: {
    position: "absolute",
    top: 14,
    left: 14,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#000000bb",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    zIndex: 45,
    borderWidth: 1,
    borderColor: "#a855f766",
  },
  ctrlLabel: {
    color: "#ffffffaa",
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    marginRight: 6,
  },
  ctrlBtn: {
    backgroundColor: "#ffffff22",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginHorizontal: 2,
    flexDirection: "row",
    alignItems: "center",
  },
  ctrlBtnText: {
    color: "#fff",
    fontFamily: "Inter_700Bold",
    fontSize: 13,
  },
  filterStripContainer: {
    position: "absolute",
    bottom: 110,
    left: 12,
    right: 12,
    backgroundColor: "rgba(24, 24, 27, 0.95)",
    borderRadius: 18,
    padding: 12,
    zIndex: 45,
    borderWidth: 1,
    borderColor: "#3f3f46",
  },
  filterStripHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  filterStripTitle: {
    color: "#fff",
    fontFamily: "Inter_700Bold",
    fontSize: 12,
  },
  filterThumb: {
    alignItems: "center",
    gap: 4,
    padding: 4,
    borderRadius: 12,
  },
  filterThumbActive: {
    backgroundColor: "#ffffff15",
  },
  filterCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#ffffff44",
  },
  filterLabel: {
    color: "#a1a1aa",
    fontFamily: "Inter_500Medium",
    fontSize: 10,
  },
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: 14,
    gap: 10,
    backgroundColor: "#00000088",
    zIndex: 30,
  },
  captionInput: {
    color: "#fff",
    fontFamily: "Inter_500Medium",
    fontSize: 15,
    maxHeight: 90,
  },
  changeBtn: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 5,
    backgroundColor: "#ffffff22",
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  changeBtnText: { color: "#fff", fontFamily: "Inter_500Medium", fontSize: 12 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16, padding: 32 },
  pickBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    paddingHorizontal: 24,
    paddingVertical: 18,
  },
});
