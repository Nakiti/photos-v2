import { FlatList, View, useWindowDimensions, StyleSheet, RefreshControl, StyleProp, ViewStyle } from "react-native";
import SingleImage from "./SingleImage";

type GalleryImage = any;

type ImagesDisplayProps = {
  images: GalleryImage[];
  galleryId: string;
  selectedTagId: string;
  refreshing?: boolean;
  onRefresh?: () => void;
  contentContainerStyle?: StyleProp<ViewStyle>;
  scrollIndicatorInsets?: { top?: number; bottom?: number; left?: number; right?: number };
};

const NUM_COLUMNS = 5;
const GAP = 2;

const ImagesDisplay = ({ images, galleryId, selectedTagId, refreshing, onRefresh, contentContainerStyle, scrollIndicatorInsets }: ImagesDisplayProps) => {
  const { width } = useWindowDimensions();
  const imageSize = (width - GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS;

  // Reverse within each row-chunk so the newest photo in each row lands at the rightmost column.
  // With inverted=true the first chunk is the visual bottom row, so the very newest photo
  // ends up at bottom-right and the grid snakes upward.
  const orderedImages: GalleryImage[] = [];
  for (let i = 0; i < images.length; i += NUM_COLUMNS) {
    const chunk = images.slice(i, i + NUM_COLUMNS).reverse();
    orderedImages.push(...chunk);
  }

  return (
    <FlatList
      data={orderedImages}
      numColumns={NUM_COLUMNS}
      keyExtractor={(item, index) => item.id ?? String(index)}
      columnWrapperStyle={styles.row}
      ItemSeparatorComponent={() => <View style={{ height: GAP }} />}
      renderItem={({ item, index }) => (
        <SingleImage
          index={index}
          images={orderedImages}
          item={item}
          imageSize={imageSize}
          galleryId={galleryId}
          selectedTagId={selectedTagId}
        />
      )}
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={refreshing ?? false} onRefresh={onRefresh} tintColor="#999" colors={['#999']} />
        ) : undefined
      }
      inverted
      removeClippedSubviews
      windowSize={5}
      maxToRenderPerBatch={15}
      initialNumToRender={25}
      style={styles.list}
      contentContainerStyle={contentContainerStyle}
      scrollIndicatorInsets={scrollIndicatorInsets}
    />
  );
};

export default ImagesDisplay;

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
  row: {
    gap: GAP,
  },
});
