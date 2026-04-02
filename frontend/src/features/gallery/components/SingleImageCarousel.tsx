import React, { useEffect, useRef, useState } from "react";
import { FlatList, useWindowDimensions, View, StyleSheet } from "react-native";
import FastImage from "react-native-fast-image";
import { Pressable } from "react-native";
import Icon from "react-native-vector-icons/Ionicons";

type Item = { id: string; uri: string; thumbnailUri?: string };

type Props = {
  items: Item[];
  currentIndex: number;
  initialIndex: number;
  onIndexChange: (index: number) => void;
  onImageTap: () => void;
  topInset?: number;
  bottomInset?: number;
};

type CarouselItemProps = {
  item: Item;
  width: number;
  height: number;
  topInset: number;
  bottomInset: number;
  onImageTap: () => void;
};

const CarouselItem = ({ item, width, height, topInset, bottomInset, onImageTap }: CarouselItemProps) => {
  const [fullLoaded, setFullLoaded] = useState(false);
  const [fullFailed, setFullFailed] = useState(false);
  const hasThumbnail = !!item.thumbnailUri;

  // Show the error state only when the full-size failed AND there is no
  // thumbnail to keep showing as a fallback.
  const showError = fullFailed && !hasThumbnail;

  return (
    <View style={{ width, height, backgroundColor: "#000", paddingTop: topInset, paddingBottom: bottomInset }}>
      <Pressable style={{ flex: 1 }} android_ripple={undefined} onPress={onImageTap}>
        {showError ? (
          <View style={styles.errorPlaceholder}>
            <Icon name="image-outline" size={48} color="#444" />
          </View>
        ) : (
          <>
            {/* Thumbnail — high priority, shown instantly as the base layer while the
                full-size image downloads. Stays visible until full-size is ready. */}
            {hasThumbnail && (
              <FastImage
                style={[StyleSheet.absoluteFill, styles.image]}
                source={{ uri: item.thumbnailUri!, priority: FastImage.priority.high }}
                resizeMode={FastImage.resizeMode.contain}
              />
            )}

            {/* Full-size — normal priority, loads in the background. Hidden (opacity 0)
                until loaded so the thumbnail shows through, then snaps to full quality. */}
            {!fullFailed && (
              <FastImage
                style={[
                  StyleSheet.absoluteFill,
                  styles.image,
                  { opacity: fullLoaded ? 1 : 0 },
                ]}
                source={{ uri: item.uri, priority: FastImage.priority.normal }}
                resizeMode={FastImage.resizeMode.contain}
                onLoad={() => setFullLoaded(true)}
                onError={() => setFullFailed(true)}
              />
            )}
          </>
        )}
      </Pressable>
    </View>
  );
};

const SingleImageCarousel = ({
  items,
  currentIndex,
  initialIndex,
  onIndexChange,
  onImageTap,
  topInset = 0,
  bottomInset = 0,
}: Props) => {
  const listRef = useRef<FlatList<Item> | null>(null);
  const { width, height } = useWindowDimensions();

  useEffect(() => {
    if (listRef.current && items.length > 0) {
      try {
        listRef.current.scrollToIndex({ index: currentIndex, animated: false });
      } catch {
        // ignore scroll errors when list is in transition
      }
    }
  }, [items, currentIndex]);

  if (items.length === 0) return null;

  return (
    <FlatList
      ref={listRef}
      data={items}
      horizontal
      pagingEnabled
      showsHorizontalScrollIndicator={false}
      keyExtractor={(it) => it.id}
      initialScrollIndex={initialIndex}
      getItemLayout={(_, index) => ({
        length: width,
        offset: width * index,
        index,
      })}
      renderItem={({ item }) => (
        <CarouselItem
          item={item}
          width={width}
          height={height}
          topInset={topInset}
          bottomInset={bottomInset}
          onImageTap={onImageTap}
        />
      )}
      onMomentumScrollEnd={(e) => {
        const x = e.nativeEvent.contentOffset.x;
        const next = Math.round(x / width);
        if (next !== currentIndex) onIndexChange(next);
      }}
      // Keep only the current photo plus 1 neighbour on each side decoded in memory.
      // Default windowSize=21 would hold ~20 full-size images simultaneously.
      windowSize={3}
      maxToRenderPerBatch={1}
      initialNumToRender={1}
      removeClippedSubviews
    />
  );
};

const styles = StyleSheet.create({
  image: {
    backgroundColor: "#000",
  },
  errorPlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
  },
});

export default SingleImageCarousel;
