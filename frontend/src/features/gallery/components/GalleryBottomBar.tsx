import { View, StyleSheet, TouchableOpacity } from "react-native"
import Icon from "react-native-vector-icons/Ionicons"

type GalleryBottomBarProps = {
   onPressUpload?: () => void;
   onPressCamera?: () => void;
};

const GalleryBottomBar = ({ onPressUpload, onPressCamera }: GalleryBottomBarProps) => {

   return (
      <>
         <TouchableOpacity style={[styles.floatingButton, styles.floatingLeft]} onPress={onPressUpload}>
            <Icon name="cloud-upload-outline" size={20} color="white" />
         </TouchableOpacity>
         <TouchableOpacity style={[styles.floatingButton, styles.floatingRight]} onPress={onPressCamera}>
            <Icon name="camera-outline" size={20} color="white" />
         </TouchableOpacity>
      </>
   )
}

export default GalleryBottomBar

const styles = StyleSheet.create({
   floatingButton: {
      position: 'absolute',
      bottom: 24,
      width: 60,
      height: 60,
      backgroundColor: 'rgba(50, 50, 50, 0.7)',
      borderRadius: 35,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 6,
   },
   floatingLeft: {
      left: 24,
   },
   floatingRight: {
      right: 24,
   },
})