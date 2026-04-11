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
};

const NUM_COLUMNS = 5;
const GAP = 2;

const ImagesDisplay = ({ images, galleryId, selectedTagId, refreshing, onRefresh, contentContainerStyle }: ImagesDisplayProps) => {
  const { width } = useWindowDimensions();
  const imageSize = (width - GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS;

  // Oldest first so the newest photo lands at the bottom-right of the grid.
  const orderedImages = images.slice().reverse();

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
      removeClippedSubviews
      windowSize={5}
      maxToRenderPerBatch={15}
      initialNumToRender={25}
      style={styles.list}
      contentContainerStyle={contentContainerStyle}
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
