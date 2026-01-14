import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from "react-native";
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from "@react-navigation/native";

const GroupsHeader = () => {
   const navigation = useNavigation();

   return (
      <View style={styles.root}>
         <SafeAreaView>
            <View style={styles.container}>
               
               {/* Large Title */}
               <Text style={styles.title}>Galleries</Text>
               
               {/* Action Buttons */}
               <View style={styles.actionsRow}>
                  <TouchableOpacity
                     style={styles.circleButton}
                     onPress={() => (navigation as any).navigate("GroupFlow", {screen: "NotificationsHub"})}
                     activeOpacity={0.7}
                     accessibilityRole="button"
                     accessibilityLabel="Scan QR Code"
                  >
                     <Ionicons name="notifications-outline" size={20} color="#000" />
                  </TouchableOpacity>

                  <TouchableOpacity
                     style={styles.circleButton}
                     onPress={() => (navigation as any).navigate("GroupFlow", {screen: "CreateGalleryChoice"})}
                     activeOpacity={0.7}
                     accessibilityRole="button"
                     accessibilityLabel="Create Gallery"
                  >
                     <Ionicons name="add" size={24} color="#000" />
                  </TouchableOpacity>
               </View>    

            </View>
         </SafeAreaView>
      </View>
   );
};

export default GroupsHeader

const styles = StyleSheet.create({
   root: {
      backgroundColor: "#FFFFFF",
      // Optional: Add a bottom border if you want a divider, 
      // but modern apps often leave it open for a cleaner look.
      // borderBottomWidth: 1,
      // borderBottomColor: "#F2F2F7",
   },
   container: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingVertical: 12, // Reduced top padding because SafeArea handles it
   },
   title: {
      fontSize: 34, // iOS Large Title Standard
      fontWeight: "700",
      color: "#000000",
      letterSpacing: -0.5, // Tight tracking for headers
   },
   actionsRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12, // Consistent gap
   },
   circleButton: {
      width: 40,
      height: 40,
      borderRadius: 20, // Perfect Circle
      backgroundColor: "#F2F2F7", // System Gray 6 (Subtle contrast)
      alignItems: "center",
      justifyContent: "center",
      
      // Minimalist Shadow (Optional - remove for flat look)
      // shadowColor: "#000",
      // shadowOffset: { width: 0, height: 2 },
      // shadowOpacity: 0.05,
      // shadowRadius: 4,
   },
});