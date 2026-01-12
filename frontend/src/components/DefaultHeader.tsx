import { View, TouchableOpacity, Text, StyleSheet, SafeAreaView } from "react-native";
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from "@react-navigation/native";

const DefaultHeader = ({ title } : { title?: string }) => {
   const navigation = useNavigation();

   return (
      <View style={styles.root}>
         <SafeAreaView>
            <View style={styles.container}>
               
               <TouchableOpacity 
                  onPress={() => navigation.goBack()} 
                  style={styles.backButton}
                  hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
                  activeOpacity={0.6}
               >
                  <Ionicons name="arrow-back" size={24} color="#000" />
               </TouchableOpacity>

               {title && (
                  <Text style={styles.title} numberOfLines={1}>
                     {title}
                  </Text>
               )}
               
            </View>
         </SafeAreaView>
      </View>
   );
};

export default DefaultHeader;

const styles = StyleSheet.create({
   root: {
      backgroundColor: "#FFFFFF",
      borderBottomWidth: 1,
      borderBottomColor: "#F9F9F9", // Very subtle hairline divider
   },
   container: {
      height: 48, // Standard comfortable touch height
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
   },
   backButton: {
      marginRight: 16, // Consistent gap between arrow and title
      justifyContent: 'center',
      alignItems: 'center',
   },
   title: {
      fontSize: 20, // Heading size
      fontWeight: "600",
      color: "#000000",
      letterSpacing: -0.4, // Tight tracking for modern look
      flex: 1, // Ensures title doesn't push arrow off screen if too long
   },
});