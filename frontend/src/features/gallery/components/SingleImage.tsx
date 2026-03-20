import { Text, TouchableOpacity, View, StyleSheet } from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import FastImage from "react-native-fast-image";
import { useNavigation } from "@react-navigation/native";
import { useState } from "react";

type GalleryImage = any;

type SingleImageProps = {
   imageSize: number;
   images: GalleryImage[];
   item: GalleryImage;
   index: number;
   galleryId: string;
   selectedTagId: string;
   onPress?: (index: number, images: GalleryImage[]) => void;
};

const SingleImage = ({ imageSize, images, item, index, galleryId, selectedTagId }: SingleImageProps) => {
   const navigation = useNavigation()
   const [imageError, setImageError] = useState(false);

    /**
     * Renders the appropriate icon based on the upload status.
     * - 0: Queued for upload (offline)
     * - 1: Currently uploading
     * - 2: Upload successful (no icon)
     * - -1: Upload failed
     */
   const renderUploadStatusIcon = () => {
      // 1 means 'synced' in your GalleryScreen logic, so we hide the icon
      if (item.is_uploaded === 1) {
         return null;
      }

      // 0 means not synced (offline, pending, or uploading)
      if (item.is_uploaded === 0) {
          return (
             <View style={styles.iconOverlay}>
                {/* using cloud-upload because '0' covers both queued and uploading right now */}
                <Icon name="cloud-upload-outline" size={10} color="#fff" />
             </View>
          );
      }
      
      return null;
   };

   const handlePress = () => {
      navigation.navigate("SingleImage", {
         galleryId,
         initialPhotoId: item.id,
         selectedTagId
      })

   };

   return (
      <TouchableOpacity style={[styles.imageContainer, { width: imageSize, height: imageSize }]} onPress={handlePress}>
         {imageError ? (
            <View style={styles.errorPlaceholder}>
               <Icon name="image-outline" size={20} color="#555" />
            </View>
         ) : (
            <FastImage
               style={styles.image}
               source={{
                  uri: item.thumbnail,
                  priority: FastImage.priority.normal
               }}
               resizeMode={FastImage.resizeMode.cover}
               onError={() => setImageError(true)}
            />
         )}
         
         {/* Gray overlay for in-review photos */}
         {item.visible === 'IN_REVIEW' && (
            <View style={styles.reviewOverlay} />
         )}
         
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
   reviewOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(128, 128, 128, 0.5)', // Gray overlay with 50% opacity
   },
   errorPlaceholder: {
      flex: 1,
      width: '100%',
      height: '100%',
      backgroundColor: '#1a1a1a',
      justifyContent: 'center',
      alignItems: 'center',
   },
});
