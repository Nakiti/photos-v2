import React, { useEffect, useRef } from "react";
import { FlatList, useWindowDimensions, View } from "react-native";
import FastImage from "react-native-fast-image";
import { Pressable } from "react-native";

type Item = { id: string; uri: string };

type Props = {
  items: Item[];
  currentIndex: number;
  initialIndex: number;
  onIndexChange: (index: number) => void;
  onImageTap: () => void;
  topInset?: number;
  bottomInset?: number;
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
        console.log("current photo ", items[currentIndex])

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
      getItemLayout={(data, index) => ({
        length: width,
        offset: width * index,
        index,
      })}
      renderItem={({ item }) => (
        <View style={{ width, height, backgroundColor: "#000", paddingTop: topInset, paddingBottom: bottomInset }}>
          <Pressable style={{ flex: 1 }} android_ripple={undefined} onPress={onImageTap}>
            <FastImage
              style={{ flex: 1, width: "100%", height: "100%", backgroundColor: "#000" }}
              source={{ uri: item.uri, priority: FastImage.priority.normal }}
              resizeMode={FastImage.resizeMode.contain}
            />
          </Pressable>
        </View>
      )}
      onMomentumScrollEnd={(e) => {
        const x = e.nativeEvent.contentOffset.x;
        const next = Math.round(x / width);
        if (next !== currentIndex) onIndexChange(next);
      }}
    />
  );
};

export default SingleImageCarousel;



