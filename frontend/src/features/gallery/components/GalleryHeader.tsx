import { View, Text, TouchableOpacity, Image, StyleSheet } from "react-native";

interface GalleryHeaderProps {
   title?: string;
   imageUri?: string;
   subtitle?: string;
   onBackPress?: () => void;
   onTitlePress?: () => void;
}

const GalleryHeader = ({
   title = "Group",
   imageUri,
   subtitle = "Tap for details",
   onBackPress,
   onTitlePress,
}: GalleryHeaderProps) => {
    
   return (
      <View style={styles.header}>
         <TouchableOpacity onPress={onBackPress} style={styles.backButton} activeOpacity={0.7}>
            <Text style={{ fontSize: 26, color: "#333" }}>‹</Text>
         </TouchableOpacity>

         <TouchableOpacity style={styles.groupInfo} onPress={onTitlePress} activeOpacity={0.8} disabled={!onTitlePress}>
            <Image
               source={{
                  uri:
                     imageUri ||
                     "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS0Wr3oWsq6KobkPqznhl09Wum9ujEihaUT4Q&s",
               }}
               style={styles.image}
            />
            <View style={styles.textContainer}>
               <Text style={styles.title} numberOfLines={1}>
                  {title}
               </Text>
               {subtitle ? <Text style={styles.subtext}>{subtitle}</Text> : null}
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
