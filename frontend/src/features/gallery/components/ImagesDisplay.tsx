import { ScrollView, useWindowDimensions, View, StyleSheet } from "react-native";
import type { ScrollView as RNScrollView } from "react-native";
import SingleImage from "./SingleImage";
import { useRef, useEffect } from "react";

type GalleryImage = any;

type ImagesDisplayProps = {
   images: GalleryImage[];
   onPressImage?: (index: number, images: GalleryImage[]) => void;
};

const ImagesDisplay = ({ images, onPressImage }: ImagesDisplayProps) => {
   const { width } = useWindowDimensions();
   const numColumns = 5;
   const gap = 2;
   const imageSize = (width - gap * (numColumns - 1)) / numColumns;
   const scrollViewRef = useRef<RNScrollView | null>(null);

   // Step 1: Reverse so most recent comes first
   const reversedImages = images;

   // Step 2: Chunk into rows
   const chunkArray = <T,>(array: T[], size: number): T[][] => {
      const chunks: T[][] = [];
      for (let i = 0; i < array.length; i += size) {
         chunks.push(array.slice(i, i + size));
      }
      return chunks;
   };

   const rows = chunkArray(reversedImages, numColumns);

   // Step 3: Flat version for index lookup
   const getIndex = (rowIndex: number, colIndex: number) => rowIndex * numColumns + colIndex;

   // Optional: Scroll to top if desired
   useEffect(() => {
      if (scrollViewRef.current) {
         scrollViewRef.current.scrollTo({ y: 0, animated: false });
      }
   }, [images]);

   return (
      <ScrollView style={styles.container} ref={scrollViewRef}>
         {rows.map((row: GalleryImage[], rowIndex: number) => (
            <View key={rowIndex} style={[styles.imageRow, { gap }]}>
               {row.map((item: GalleryImage, colIndex: number) => (
                  <SingleImage
                     key={colIndex}
                     index={getIndex(rowIndex, colIndex)}
                     images={reversedImages}
                     item={item}
                     imageSize={imageSize}
                     onPress={onPressImage}
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
