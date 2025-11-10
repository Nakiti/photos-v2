import { View, TouchableOpacity, Text, StyleSheet } from "react-native";
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from "@react-navigation/native";


const DefaultNoBackHeader = ({ title, } : { title: string }) => {

    return (
        <View style={styles.header}>
            <View style={styles.backContainer}>
            {title && <Text style={styles.title}>{title}</Text>}
            </View>
        </View>
    );
};

export default DefaultNoBackHeader;

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
