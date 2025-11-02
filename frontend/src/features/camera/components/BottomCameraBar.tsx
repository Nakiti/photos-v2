import { View, TouchableOpacity, StyleSheet } from "react-native"
import Ionicons from "react-native-vector-icons/Ionicons"

type BottomCameraBarProps = {
   onShutterPress: () => void
   onToggleFacing: () => void
   onOpenGallery: () => void
}

const BottomCameraBar = ({ onShutterPress, onToggleFacing, onOpenGallery }: BottomCameraBarProps) => {
   return (
      <View style={styles.bottomBar}>
         <View style={styles.leftButton}>
            <TouchableOpacity style={styles.iconButton} onPress={onOpenGallery}>
               <Ionicons name="images-outline" size={35} color="white" />
            </TouchableOpacity>
         </View>
         <View style={styles.shutterContainer}>
            <TouchableOpacity style={styles.shutterOuter} onPress={onShutterPress}>
               <View style={styles.shutterInner} />
            </TouchableOpacity>
         </View>

         <View style={styles.rightButton}>
            <TouchableOpacity style={styles.iconButton} onPress={onToggleFacing}>
               <Ionicons name="camera-reverse" size={35} color="white" />
            </TouchableOpacity>
         </View>
      </View>
   )
}

export default BottomCameraBar

const styles = StyleSheet.create({
   bottomBar: {
      position: 'absolute',
      bottom: 30,
      width: '100%',
      height: 100,
      justifyContent: 'center',
      alignItems: 'center',
   },
   leftButton: {
      position: 'absolute',
      left: 60,
      bottom: 30,
   },
   shutterContainer: {
      position: 'absolute',
      alignSelf: 'center',
   },
   shutterOuter: {
      width: 80,
      height: 80,
      borderRadius: 40,
      borderWidth: 4,
      borderColor: '#d9d9d9',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#fff',
   },
   shutterInner: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: '#fff',
   },
   rightButton: {
      position: 'absolute',
      right: 60,
      bottom: 30,
   },
   iconButton: {
      width: 50,
      height: 50,
      justifyContent: 'center',
      alignItems: 'center',
   },
});