import { View, TouchableOpacity, Text, StyleSheet } from "react-native";
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from "@react-navigation/native";

const DefaultHeader = ({ title } : { title: string }) => {
   const navigation = useNavigation();

   return (
      <View style={styles.header}>
         <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backContainer}>
            <Ionicons name="chevron-back" size={24}  />
            {title && <Text style={styles.title}>{title}</Text>}
         </TouchableOpacity>
      </View>
   );
};

export default DefaultHeader;

const styles = StyleSheet.create({
   header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingTop: 56,
      paddingBottom: 8,
      backgroundColor: "#fff",
      // borderBottomWidth: 1,
      // borderBottomColor: "#f0f0f0",
   },
   backContainer: {
      flexDirection: "row",
      alignItems: "center",
   },
   title: {
      fontSize: 20,
      fontWeight: "600",
      marginLeft: 6,
      color: "#111",
   },
});
