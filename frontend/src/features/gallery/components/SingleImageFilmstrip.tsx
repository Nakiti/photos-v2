import React, { useCallback, useEffect, useRef } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import type {
  NativeScrollEvent,
  NativeSyntheticEvent,
} from "react-native";
import FastImage from "react-native-fast-image";

export type FilmstripItem = { id: string; thumbnailUri?: string };

type Props = {
  items: FilmstripItem[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
  visible: boolean;
  bottomOffset: number;
};

const ITEM = 48;
const GAP = 4;
const INTERVAL = ITEM + GAP;

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

type FilmstripCellProps = {
  item: FilmstripItem;
  selected: boolean;
  onPress: () => void;
};

const FilmstripCell = ({ item, selected, onPress }: FilmstripCellProps) => (
  <Pressable
    onPress={onPress}
    style={styles.slot}
    hitSlop={4}
    accessibilityRole="imagebutton"
  >
    <View style={[styles.thumbWrap, selected && styles.thumbWrapSelected]}>
      {item.thumbnailUri ? (
        <FastImage
          style={styles.thumb}
          source={{ uri: item.thumbnailUri, priority: FastImage.priority.low }}
          resizeMode={FastImage.resizeMode.cover}
        />
      ) : (
        <View style={[styles.thumb, styles.thumbPlaceholder]} />
      )}
    </View>
  </Pressable>
);

const SingleImageFilmstrip = ({
  items,
  currentIndex,
  onIndexChange,
  visible,
  bottomOffset,
}: Props) => {
  const listRef = useRef<FlatList<FilmstripItem> | null>(null);
  const isScrubbing = useRef(false);
  const { width } = useWindowDimensions();
  const sidePadding = (width - ITEM) / 2;

  // External sync: when the main carousel changes currentIndex, re-center the
  // strip — but never while the user is actively dragging it.
  useEffect(() => {
    if (isScrubbing.current) return;
    if (!listRef.current || items.length === 0) return;
    try {
      listRef.current.scrollToIndex({ index: currentIndex, animated: true });
    } catch {
      // ignore scroll errors while the list is in transition
    }
  }, [currentIndex, items.length]);

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const x = e.nativeEvent.contentOffset.x;
      const centered = clamp(Math.round(x / INTERVAL), 0, items.length - 1);
      // Only emit on a real change so the programmatic re-center (which also
      // fires onScroll) can't re-emit the same index and loop.
      if (centered !== currentIndex) onIndexChange(centered);
    },
    [currentIndex, items.length, onIndexChange],
  );

  const handlePress = useCallback(
    (index: number) => {
      if (index !== currentIndex) onIndexChange(index);
      try {
        listRef.current?.scrollToIndex({ index, animated: true });
      } catch {
        // ignore
      }
    },
    [currentIndex, onIndexChange],
  );

  if (items.length <= 1) return null;

  return (
    <View
      style={[styles.container, { bottom: bottomOffset, opacity: visible ? 1 : 0 }]}
      pointerEvents={visible ? "auto" : "none"}
    >
      <FlatList
        ref={listRef}
        data={items}
        horizontal
        keyExtractor={(it) => it.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: sidePadding }}
        initialScrollIndex={currentIndex}
        getItemLayout={(_, index) => ({
          length: INTERVAL,
          offset: INTERVAL * index,
          index,
        })}
        snapToInterval={INTERVAL}
        decelerationRate="fast"
        scrollEventThrottle={16}
        onScroll={handleScroll}
        onScrollBeginDrag={() => {
          isScrubbing.current = true;
        }}
        onScrollEndDrag={() => {
          // Momentum may follow; onMomentumScrollEnd clears the flag if so.
          isScrubbing.current = false;
        }}
        onMomentumScrollBegin={() => {
          isScrubbing.current = true;
        }}
        onMomentumScrollEnd={() => {
          isScrubbing.current = false;
        }}
        renderItem={({ item, index }) => (
          <FilmstripCell
            item={item}
            selected={index === currentIndex}
            onPress={() => handlePress(index)}
          />
        )}
        removeClippedSubviews
        windowSize={9}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 0,
    right: 0,
    paddingVertical: 10,
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  slot: {
    width: ITEM,
    marginHorizontal: GAP / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  thumbWrap: {
    width: ITEM,
    height: ITEM,
    borderRadius: 6,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "transparent",
  },
  thumbWrapSelected: {
    transform: [{ scale: 1.25 }],
    borderColor: "#fff",
  },
  thumb: {
    width: "100%",
    height: "100%",
  },
  thumbPlaceholder: {
    backgroundColor: "#222",
  },
});

export default SingleImageFilmstrip;
