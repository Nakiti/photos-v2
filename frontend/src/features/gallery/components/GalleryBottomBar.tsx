import { View, StyleSheet, TouchableOpacity } from "react-native"
import Icon from "react-native-vector-icons/Ionicons"

type GalleryBottomBarProps = {
   onPressUpload?: () => void;
   onPressCamera?: () => void;
};

const GalleryBottomBar = ({ onPressUpload, onPressCamera }: GalleryBottomBarProps) => {

   return (
      <View style={styles.bottomBar}>
         <TouchableOpacity onPress={onPressCamera}>
            <Icon name="camera-outline" size={18} color="white" />
         </TouchableOpacity>
      </View>
   )
}

export default GalleryBottomBar

const styles = StyleSheet.create({
   bottomBar: {
      position: 'absolute',
      bottom: 20,
      right: 20,
      alignSelf: 'center',
      width: 50, // you can adjust to 220 or so if needed
      height: 50,
      backgroundColor: 'rgba(50, 50, 50, 0.7)', // translucent gray
      borderRadius: 30,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 6,
   },
})