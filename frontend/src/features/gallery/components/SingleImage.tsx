import { Image, Text, TouchableOpacity, View, StyleSheet } from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import FastImage from "react-native-fast-image";

type GalleryImage = any;

type SingleImageProps = {
   imageSize: number;
   images: GalleryImage[];
   item: GalleryImage;
   index: number;
   onPress?: (index: number, images: GalleryImage[]) => void;
};

const SingleImage = ({ imageSize, images, item, index, onPress }: SingleImageProps) => {

    /**
     * Renders the appropriate icon based on the upload status.
     * - 0: Queued for upload (offline)
     * - 1: Currently uploading
     * - 2: Upload successful (no icon)
     * - -1: Upload failed
     */
   const renderUploadStatusIcon = () => {
   // Don't render any icon if the upload was successful
      if (item.is_uploaded === 3) {
         return null;
      }

      let iconComponent;

      switch (item.is_uploaded) {
      case 0: // Queued / Offline
         iconComponent = <Icon name="cloud-offline-outline" size={10} color="#fff" />;
         break;
      case 1: // Uploading
         iconComponent = <Icon name="cloud-upload-outline" size={10} color="#fff" />; // Gold color for warning
         break;
      case 2:
         iconComponent = <Icon name="cloud-upload-outline" size={10} color="#fff" />; // Gold color for warning
      default:
         // Render nothing if the state is unhandled
         return null;
      }

      return (
         <View style={styles.iconOverlay}>
            {iconComponent}
         </View>
      );
   };

   const handlePress = () => {
      if (onPress) {
         onPress(index, images);
      }
   };

   return (
      <TouchableOpacity style={[styles.imageContainer, { width: imageSize, height: imageSize }]} onPress={handlePress}>
         <FastImage 
            style={styles.image} 
            source={{
               uri: item.thumbnail,
               priority: FastImage.priority.normal
            }}
            resizeMode={FastImage.resizeMode.cover}
         />
         {/* <Text>{item.thumbnail}</Text> */}
         
         {/* Render the status icon */}
         {renderUploadStatusIcon()}

         {/* This part remains the same */}
         <View style={styles.profileTag}>
            <Text style={styles.profileText}>NA</Text>
         </View>
      </TouchableOpacity>
   );
};

export default SingleImage;

const styles = StyleSheet.create({
   imageContainer: {
      overflow: 'hidden',
   },
   image: {
      flex: 1, 
      width: '100%',
      height: '100%',
      resizeMode: 'cover', 
   },
   iconOverlay: {
      position: "absolute",
      top: 2,
      right: 2,
      backgroundColor: "rgba(0,0,0,0.5)",
      borderRadius: 12,
      padding: 1,
      justifyContent: 'center',
      alignItems: 'center',
      width: 16, // Fixed size for consistency
      height: 16,
   },
   profileTag: {
      position: 'absolute',
      top: 2,
      left: 2,
      backgroundColor: 'rgba(0,0,0,0.5)',
      borderRadius: 8,
      paddingHorizontal: 5,
      paddingVertical: 2,
   },
   profileText: {
      color: '#fff',
      fontSize: 10,
      fontWeight: '600',
   },
});
