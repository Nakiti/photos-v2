import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from "react-native";
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from "@react-navigation/native";

const CommunityListHeader = () => {
   const navigation = useNavigation();

   return (
      <View style={styles.root}>
         <SafeAreaView>
            <View style={styles.container}>
               
               {/* Large Title */}
               <Text style={styles.title}>Communities</Text>
               
               {/* Action Buttons */}
               <View style={styles.actionsRow}>
                  {/* Scan Button (New) */}
                  <TouchableOpacity
                     style={styles.circleButton}
                     onPress={() => (navigation as any).navigate("JoinCommunity")} // Assuming you have/will have this route
                     activeOpacity={0.7}
                     accessibilityRole="button"
                     accessibilityLabel="Scan QR Code"
                  >
                     <Ionicons name="scan-outline" size={20} color="#000" />
                  </TouchableOpacity>

                  {/* Add Button */}
                  <TouchableOpacity
                     style={styles.circleButton}
                     onPress={() => (navigation as any).navigate("CommunityFlow", {screen: "CreateCommunityDetails"})}
                     activeOpacity={0.7}
                     accessibilityRole="button"
                     accessibilityLabel="Create Community"
                  >
                     <Ionicons name="add" size={24} color="#000" />
                  </TouchableOpacity>
               </View>    

            </View>
         </SafeAreaView>
      </View>
   );
};

export default CommunityListHeader

const styles = StyleSheet.create({
   root: {
      backgroundColor: "#FFFFFF",
   },
   container: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingVertical: 12,
   },
   title: {
      fontSize: 34, // Standard Large Title
      fontWeight: "700",
      color: "#000000",
      letterSpacing: -0.5,
   },
   actionsRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
   },
   circleButton: {
      width: 40,
      height: 40,
      borderRadius: 20, // Perfect Circle
      backgroundColor: "#F2F2F7", // System Gray 6
      alignItems: "center",
      justifyContent: "center",
   },
});