import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { useGallery } from "../../../hooks/useGalleryData";
import { useNavigation } from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons";
import LinearGradient from "react-native-linear-gradient";

interface GalleryHeaderProps {
   galleryId: string;
   onBackPress?: () => void;
   onTitlePress?: () => void;
}

const GalleryHeader = ({galleryId,
   onBackPress,
   onTitlePress,
}: GalleryHeaderProps) => {
   const navigation = useNavigation()
   const {gallery, isLoading, isError, error} = useGallery(galleryId)
   

   if (isLoading) {
      return (
        <View style={[styles.header, styles.center]}>
          <ActivityIndicator size="large" color="#0000ff" />
        </View>
      );
    }
  
    if (isError) {
      return (
        <View style={[styles.header, styles.center]}>
          <Text style={styles.errorText}>Failed to load groups: {error?.message ?? 'Unknown error'}</Text>
        </View>
      );
    }
   
   const handleNavigateDetails = () => {
      if (onTitlePress) {
         onTitlePress()
         return
      }
      (navigation as any).navigate('GalleryDetails', {galleryId})
   }
    
   return (
      <View style={styles.overlayContainer}>
         <LinearGradient
            pointerEvents="none"
            colors={["rgba(0,0,0,0.55)", "rgba(0,0,0,0.26)", "rgba(0,0,0,0.06)", "rgba(0,0,0,0.00)"]}
            locations={[0, 0.35, 0.7, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.gradientOverlay}
         />
         <View style={styles.header}>
            <TouchableOpacity onPress={onBackPress} style={styles.sideButton} activeOpacity={0.7}>
               <Ionicons name="chevron-back" size={24} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.titleContainer} onPress={handleNavigateDetails} activeOpacity={0.8}>
               <Text style={styles.title} numberOfLines={1}>
                  {gallery?.name}
               </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleNavigateDetails} style={styles.sideButton} activeOpacity={0.7}>
               <Ionicons name="settings-outline" size={20} color="#fff" />
            </TouchableOpacity>
         </View>
      </View>
   );
};

export default GalleryHeader;

const styles = StyleSheet.create({
   overlayContainer: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      zIndex: 10,
   },
   gradientOverlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      height: 160,
   },
   header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 12,
      paddingTop: 36,
      paddingBottom: 8,
      backgroundColor: "transparent",
   },
   center: {
      justifyContent: "center",
   },
   sideButton: {
      width: 40,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
   },
   titleContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
   },
   title: {
      fontSize: 24,
      fontWeight: "600",
      color: "#fff",
   },
   errorText: {
      color: "#e11d48",
   }
});
