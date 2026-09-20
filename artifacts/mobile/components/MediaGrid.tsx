import { useRef, useState } from "react";
import {
  Dimensions,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  Text,
  View,
  StyleSheet,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import { useVideoPlayer, VideoView } from "expo-video";
import { Ionicons } from "@expo/vector-icons";
import type { MediaItem } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";

function VideoTile({ uri, height }: { uri: string; height: number }) {
  const c = useColors();
  const [playing, setPlaying] = useState(false);
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
  });

  return (
    <View style={{ width: "100%", height, backgroundColor: "#000" }}>
      <VideoView
        player={player}
        style={{ width: "100%", height }}
        contentFit="contain"
        nativeControls={playing}
      />
      {!playing && (
        <Pressable
          style={styles.playOverlay}
          onPress={() => {
            setPlaying(true);
            player.play();
          }}
        >
          <View style={[styles.playBtn, { backgroundColor: c.primary }]}>
            <Ionicons name="play" size={26} color="#fff" />
          </View>
        </Pressable>
      )}
    </View>
  );
}

const SLIDE_HEIGHT = 320;

/** Fullscreen photo viewer with its own one-at-a-time carousel + back button. */
function FullscreenViewer({
  media,
  startIndex,
  onClose,
}: {
  media: MediaItem[];
  startIndex: number;
  onClose: () => void;
}) {
  const width = Dimensions.get("window").width;
  const [page, setPage] = useState(startIndex);
  const pageRef = useRef(startIndex);
  const scrollRef = useRef<ScrollView>(null);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    if (i !== pageRef.current && i >= 0 && i < media.length) {
      pageRef.current = i;
      setPage(i);
    }
  };
  const restoreOffset = () => {
    scrollRef.current?.scrollTo({ x: pageRef.current * width, animated: false });
  };

  return (
    <Modal visible animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.fsRoot}>
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          snapToInterval={width}
          snapToAlignment="start"
          decelerationRate="fast"
          disableIntervalMomentum
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          onLayout={restoreOffset}
          onContentSizeChange={restoreOffset}
          style={{ flex: 1 }}
        >
          {media.map((m, i) => (
            <View key={m.id ?? i} style={{ width, flex: 1, justifyContent: "center" }}>
              {m.type === "video" ? (
                <VideoTile uri={m.url} height={Dimensions.get("window").height * 0.7} />
              ) : (
                <Image
                  source={{ uri: m.url }}
                  style={{ width: "100%", height: "100%" }}
                  contentFit="contain"
                  transition={100}
                />
              )}
            </View>
          ))}
        </ScrollView>

        {/* Back button */}
        <Pressable style={styles.fsBack} onPress={onClose} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </Pressable>

        {media.length > 1 && (
          <View style={styles.fsCounter}>
            <Text style={styles.counterText}>
              {page + 1}/{media.length}
            </Text>
          </View>
        )}
      </View>
    </Modal>
  );
}

/**
 * 3D Fanned Photo Deck:
 * Displays multi-photo travel posts with left/right tilted cards and an elevated center card,
 * matching the exact Dribbble design reference.
 */
function FannedPhotoDeck({
  media,
  onOpenViewer,
}: {
  media: MediaItem[];
  onOpenViewer: (idx: number) => void;
}) {
  const c = useColors();
  const cardWidth = 220;
  const cardHeight = 260;

  if (media.length === 2) {
    return (
      <View style={styles.fannedContainer}>
        {/* Left Tilted Photo */}
        <Pressable
          style={[
            styles.fannedCard,
            {
              width: cardWidth,
              height: cardHeight,
              borderColor: c.card,
              transform: [{ rotate: "-6deg" }, { translateX: -32 }, { scale: 0.94 }],
              zIndex: 1,
            },
          ]}
          onPress={() => onOpenViewer(0)}
        >
          <Image source={{ uri: media[0].url }} style={StyleSheet.absoluteFill} contentFit="cover" />
        </Pressable>

        {/* Right Elevated Photo */}
        <Pressable
          style={[
            styles.fannedCard,
            {
              width: cardWidth,
              height: cardHeight,
              borderColor: c.card,
              transform: [{ rotate: "5deg" }, { translateX: 32 }, { scale: 1.0 }],
              zIndex: 2,
            },
          ]}
          onPress={() => onOpenViewer(1)}
        >
          <Image source={{ uri: media[1].url }} style={StyleSheet.absoluteFill} contentFit="cover" />
        </Pressable>
      </View>
    );
  }

  // 3 or 4 photos
  const leftItem = media[0];
  const rightItem = media[2] ?? media[1];
  const centerItem = media[1] ?? media[0];

  return (
    <View style={styles.fannedContainer}>
      {/* Left Tilted Photo */}
      <Pressable
        style={[
          styles.fannedCard,
          {
            width: cardWidth * 0.9,
            height: cardHeight * 0.92,
            borderColor: c.card,
            transform: [{ rotate: "-7deg" }, { translateX: -48 }, { scale: 0.92 }],
            zIndex: 1,
          },
        ]}
        onPress={() => onOpenViewer(0)}
      >
        <Image source={{ uri: leftItem.url }} style={StyleSheet.absoluteFill} contentFit="cover" />
      </Pressable>

      {/* Right Tilted Photo */}
      <Pressable
        style={[
          styles.fannedCard,
          {
            width: cardWidth * 0.9,
            height: cardHeight * 0.92,
            borderColor: c.card,
            transform: [{ rotate: "7deg" }, { translateX: 48 }, { scale: 0.92 }],
            zIndex: 2,
          },
        ]}
        onPress={() => onOpenViewer(media.length > 2 ? 2 : 1)}
      >
        <Image source={{ uri: rightItem.url }} style={StyleSheet.absoluteFill} contentFit="cover" />
      </Pressable>

      {/* Center Hero Photo */}
      <Pressable
        style={[
          styles.fannedCard,
          styles.fannedCenterCard,
          {
            width: cardWidth,
            height: cardHeight,
            borderColor: c.card,
            transform: [{ rotate: "0deg" }, { scale: 1.03 }],
            zIndex: 10,
          },
        ]}
        onPress={() => onOpenViewer(1)}
      >
        <Image source={{ uri: centerItem.url }} style={StyleSheet.absoluteFill} contentFit="cover" />
      </Pressable>
    </View>
  );
}

/**
 * Post media:
 * - Single item renders full width with 22px rounded corners.
 * - 2 to 4 photos render the 3D fanned photo deck (exact Dribbble presentation).
 * - Multi-item with video or > 4 items becomes a swipeable carousel.
 */
export function MediaGrid({ media }: { media: MediaItem[] }) {
  const c = useColors();
  const width = Dimensions.get("window").width;
  const [page, setPage] = useState(0);
  const pageRef = useRef(0);
  const scrollRef = useRef<ScrollView>(null);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  if (!media || media.length === 0) return null;

  // Single Item
  if (media.length === 1) {
    const m = media[0];
    const h = m.type === "video" ? 240 : SLIDE_HEIGHT;
    if (m.type === "video") return <VideoTile uri={m.url} height={h} />;
    return (
      <View style={{ marginHorizontal: 12, borderRadius: 24, overflow: "hidden" }}>
        <Pressable onPress={() => setViewerIndex(0)}>
          <Image
            source={{ uri: m.url }}
            style={{ width: "100%", height: h }}
            contentFit="cover"
            transition={150}
          />
        </Pressable>
        {viewerIndex !== null && (
          <FullscreenViewer media={media} startIndex={0} onClose={() => setViewerIndex(null)} />
        )}
      </View>
    );
  }

  // Multi-photo 3D Fanned Deck (2 to 4 photos, no video)
  const isAllPhotos = media.every((m) => m.type !== "video");
  if (isAllPhotos && media.length <= 4) {
    return (
      <View style={{ width: "100%" }}>
        <FannedPhotoDeck media={media} onOpenViewer={(i) => setViewerIndex(i)} />
        {viewerIndex !== null && (
          <FullscreenViewer media={media} startIndex={viewerIndex} onClose={() => setViewerIndex(null)} />
        )}
      </View>
    );
  }

  // Fallback to Swipeable Carousel
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    if (i !== pageRef.current && i >= 0 && i < media.length) {
      pageRef.current = i;
      setPage(i);
    }
  };

  const restoreOffset = () => {
    scrollRef.current?.scrollTo({ x: pageRef.current * width, animated: false });
  };

  return (
    <View>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        snapToInterval={width}
        snapToAlignment="start"
        decelerationRate="fast"
        disableIntervalMomentum
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onLayout={restoreOffset}
        onContentSizeChange={restoreOffset}
        style={{ width }}
      >
        {media.map((m, i) => (
          <View key={m.id ?? i} style={{ width, height: SLIDE_HEIGHT, backgroundColor: "#000" }}>
            {m.type === "video" ? (
              <VideoTile uri={m.url} height={SLIDE_HEIGHT} />
            ) : (
              <Pressable style={{ flex: 1 }} onPress={() => setViewerIndex(i)}>
                <Image
                  source={{ uri: m.url }}
                  style={{ width: "100%", height: "100%" }}
                  contentFit="contain"
                  transition={150}
                />
              </Pressable>
            )}
          </View>
        ))}
      </ScrollView>

      {/* Photo counter (top-right) */}
      <View style={styles.counter}>
        <Text style={styles.counterText}>
          {page + 1}/{media.length}
        </Text>
      </View>

      {/* Dot indicators */}
      <View style={styles.dots}>
        {media.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              {
                backgroundColor: i === page ? c.primary : c.mutedForeground,
                width: i === page ? 8 : 6,
                height: i === page ? 8 : 6,
              },
            ]}
          />
        ))}
      </View>

      {viewerIndex !== null && (
        <FullscreenViewer
          media={media}
          startIndex={viewerIndex}
          onClose={() => setViewerIndex(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fannedContainer: {
    height: 290,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 10,
    overflow: "hidden",
  },
  fannedCard: {
    position: "absolute",
    borderRadius: 24,
    borderWidth: 2.5,
    overflow: "hidden",
    ...Platform.select({
      web: {
        boxShadow: "0 10px 24px -4px rgba(0,0,0,0.18)",
      } as object,
      default: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.22,
        shadowRadius: 12,
        elevation: 8,
      },
    }),
  },
  fannedCenterCard: {
    ...Platform.select({
      web: {
        boxShadow: "0 18px 36px -4px rgba(0,0,0,0.28)",
      } as object,
      default: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.32,
        shadowRadius: 18,
        elevation: 14,
      },
    }),
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  playBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    opacity: 0.92,
  },
  counter: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "#0009",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  counterText: {
    color: "#fff",
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 5,
    paddingVertical: 8,
  },
  dot: {
    borderRadius: 4,
  },
  fsRoot: {
    flex: 1,
    backgroundColor: "#000",
  },
  fsBack: {
    position: "absolute",
    top: 48,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#0008",
    alignItems: "center",
    justifyContent: "center",
  },
  fsCounter: {
    position: "absolute",
    top: 56,
    alignSelf: "center",
    backgroundColor: "#0009",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
});
