import { View, Text, TouchableOpacity, Image, StyleSheet, ActivityIndicator } from "react-native";
import { useGallery } from "../../../hooks/useGalleryData";
import FastImage from "react-native-fast-image";
import { useNavigation } from "@react-navigation/native";

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

   console.log(gallery)
   

   if (isLoading) {
      return (
        <View style={[styles.container, styles.center]}>
          <ActivityIndicator size="large" color="#0000ff" />
        </View>
      );
    }
  
    if (isError) {
      return (
        <View style={[styles.container, styles.center]}>
          <Text style={styles.errorText}>Failed to load groups: {error.message}</Text>
        </View>
      );
    }
    
   return (
      <View style={styles.header}>
         <TouchableOpacity onPress={onBackPress} style={styles.backButton} activeOpacity={0.7}>
            <Text style={{ fontSize: 26, color: "#333" }}>‹</Text>
         </TouchableOpacity>

         <TouchableOpacity style={styles.groupInfo} onPress={onTitlePress} activeOpacity={0.8} disabled={!onTitlePress}>

            <FastImage source={{uri: gallery?.iconUrl}} style={styles.image}/>

            <View style={styles.textContainer}>
               <Text style={styles.title} numberOfLines={1}>
                  {gallery?.name}
               </Text>
               {/* {subtitle ? <Text style={styles.subtext}>{g}</Text> : null} */}
            </View>
            <Text style={[styles.arrow, { fontSize: 18, color: "#888" }]}>›</Text>
         </TouchableOpacity>
      </View>
   );
};

export default GalleryHeader;

const styles = StyleSheet.create({
   header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingTop: 50,
      paddingBottom: 8,
      backgroundColor: "#fff",
      borderBottomWidth: 1,
      borderBottomColor: "#eee",
   },
   backButton: {
      paddingRight: 10,
   },
   groupInfo: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
   },
   image: {
      width: 48,
      height: 48,
      borderRadius: 12,
      marginRight: 12,
      backgroundColor: "#ddd",
   },
   textContainer: {
      flex: 1,
      justifyContent: "center",
   },
   title: {
      fontSize: 17,
      fontWeight: "600",
      color: "#222",
   },
   subtext: {
      fontSize: 12,
      color: "#888",
   },
   arrow: {
      marginLeft: 8,
   },
});
