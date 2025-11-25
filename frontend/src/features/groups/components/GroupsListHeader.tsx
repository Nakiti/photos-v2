import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from "@react-navigation/native";

const GroupsHeader = ({}) => {
   const navigation = useNavigation()

   return (
      <View style={styles.header}>
         <Text style={styles.title}>Galleries</Text>
         <View style={styles.actionsRow}>
            <TouchableOpacity
               style={[styles.actionButton, styles.joinButton]}
               onPress={() => (navigation as any).navigate("JoinEvent")}
               accessibilityRole="button"
               accessibilityLabel="Join event with QR"
            >
               <Ionicons name="qr-code" size={20} color="black" />
            </TouchableOpacity>
            <TouchableOpacity
               style={[styles.actionButton, styles.addButton]}
               onPress={() => (navigation as any).navigate("CreateGalleryChoice")}
               accessibilityRole="button"
               accessibilityLabel="Create event"
            >
               <Ionicons name="add" size={20} color="black" />
            </TouchableOpacity>
         </View>    
      </View>
   );
};

export default GroupsHeader

const styles = StyleSheet.create({
   header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingTop: 52,
      paddingBottom: 8,
      backgroundColor: "#fff",
      // borderBottomWidth: 1,
      // borderBottomColor: "#f0f0f0",
   },
   title: {
      fontSize: 28,
      fontWeight: "600",
      color: "#111",
   },
   actionsRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
   },
   actionButton: {
      backgroundColor: "#f4f4f4",
      borderRadius: 8,
      padding: 4,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
   },
   addButton: {},
   joinButton: {
      marginRight: 8,
   },
});

