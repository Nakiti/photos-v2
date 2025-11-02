import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from "@react-navigation/native";

const EventsHeader = ({}) => {
   const navigation = useNavigation()

   return (
      <View style={styles.header}>
         <Text style={styles.title}>Events</Text>
         <TouchableOpacity style={styles.addButton} onPress={() => navigation.navigate("CreateEventDetails")}>
            <Ionicons name="add" size={20} color="black" />
         </TouchableOpacity>    
      </View>
   );
};

export default EventsHeader

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
   addButton: {
      backgroundColor: "#f4f4f4",
      borderRadius: 8,
      padding: 4,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
   },
});

