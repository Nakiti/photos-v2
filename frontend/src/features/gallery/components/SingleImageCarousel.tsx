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
  const [uri, setUri] = useState(item.uri);
  const [failed, setFailed] = useState(false);

  const handleError = () => {
    if (item.thumbnailUri && uri !== item.thumbnailUri) {
      setUri(item.thumbnailUri);
    } else {
      setFailed(true);
    }
  };

  return (
    <View style={{ width, height, backgroundColor: "#000", paddingTop: topInset, paddingBottom: bottomInset }}>
      <Pressable style={{ flex: 1 }} android_ripple={undefined} onPress={onImageTap}>
        {failed ? (
          <View style={styles.errorPlaceholder}>
            <Icon name="image-outline" size={48} color="#444" />
          </View>
        ) : (
          <FastImage
            style={{ flex: 1, width: "100%", height: "100%", backgroundColor: "#000" }}
            source={{ uri, priority: FastImage.priority.normal }}
            resizeMode={FastImage.resizeMode.contain}
            onError={handleError}
          />
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
    />
  );
};

const styles = StyleSheet.create({
  errorPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
});

export default SingleImageCarousel;



