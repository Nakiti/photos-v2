import { ScrollView, useWindowDimensions, View, StyleSheet } from "react-native";
import type { ScrollView as RNScrollView } from "react-native";
import SingleImage from "./SingleImage";
import { useRef, useEffect } from "react";

type GalleryImage = any;

type ImagesDisplayProps = {
   images: GalleryImage[];
   galleryId: string;
   selectedTagId: string;
};

const ImagesDisplay = ({ images, galleryId, selectedTagId }: ImagesDisplayProps) => {
   const { width, height } = useWindowDimensions();
   const numColumns = 5;
   const gap = 2;
   const imageSize = (width - gap * (numColumns - 1)) / numColumns;
   const scrollViewRef = useRef<RNScrollView | null>(null);

   // Step 1: Order so oldest is first, newest last (ends bottom-right)
   const orderedImages = images.slice().reverse();

   // Step 2: Chunk into rows
   const chunkArray = <T,>(array: T[], size: number): T[][] => {
      const chunks: T[][] = [];
      for (let i = 0; i < array.length; i += size) {
         chunks.push(array.slice(i, i + size));
      }
      return chunks;
   };

   const rows = chunkArray(orderedImages, numColumns);

   // Determine if content fills the screen height. If not, start below header.
   // Keep this in sync with GalleryHeader gradient height.
   const HEADER_OVERLAY_HEIGHT = 120;
   const rowsCount = rows.length;
   const totalContentHeight = rowsCount > 0
      ? rowsCount * imageSize + Math.max(0, rowsCount - 1) * gap
      : 0;
   const needsPaddingBelowHeader = totalContentHeight < height;

   // Step 3: Flat version for index lookup
   const getIndex = (rowIndex: number, colIndex: number) => rowIndex * numColumns + colIndex;

   // Optional: Scroll to top if desired
   useEffect(() => {
      if (scrollViewRef.current) {
         scrollViewRef.current.scrollTo({ y: 0, animated: false });
      }
   }, [images]);

   return (
      <ScrollView
         style={styles.container}
         ref={scrollViewRef}
         contentContainerStyle={{ paddingTop: needsPaddingBelowHeader ? HEADER_OVERLAY_HEIGHT : 0 }}
      >
         {rows.map((row: GalleryImage[], rowIndex: number) => (
            <View key={rowIndex} style={[styles.imageRow, { gap }]}>
               {row.map((item: GalleryImage, colIndex: number) => (
                  <SingleImage
                     key={colIndex}
                     index={getIndex(rowIndex, colIndex)}
                     images={orderedImages}
                     item={item}
                     imageSize={imageSize}
                     galleryId={galleryId}
                     selectedTagId={selectedTagId}
                  />
               ))}
            </View>
         ))}
      </ScrollView>
   );
};

export default ImagesDisplay;

const styles = StyleSheet.create({
   container: {
      flex: 1,
   },
   imageRow: {
      flexDirection: "row",
      justifyContent: "flex-start",
      marginBottom: 2,
   },
});
