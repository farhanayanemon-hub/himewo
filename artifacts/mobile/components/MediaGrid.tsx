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
 * Post media: single item renders full width; multiple items become a
 * swipeable, paged carousel with dot indicators (Facebook/Instagram style).
 * Tapping a photo opens a fullscreen viewer with a back button.
 */
export function MediaGrid({ media }: { media: MediaItem[] }) {
  const c = useColors();
  const width = Dimensions.get("window").width;
  const [page, setPage] = useState(0);
  const pageRef = useRef(0);
  const scrollRef = useRef<ScrollView>(null);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  if (!media || media.length === 0) return null;

  if (media.length === 1) {
    const m = media[0];
    const h = m.type === "video" ? 240 : SLIDE_HEIGHT;
    if (m.type === "video") return <VideoTile uri={m.url} height={h} />;
    return (
      <>
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
      </>
    );
  }

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    if (i !== pageRef.current && i >= 0 && i < media.length) {
      pageRef.current = i;
      setPage(i);
    }
  };

  // When the screen re-lays-out (e.g. after navigating back), the ScrollView
  // resets its offset to 0 and visibly "rewinds" through the slides. Snap
  // straight back to the current page without animation instead.
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
