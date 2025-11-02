import { View, TouchableOpacity, StyleSheet, Text } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useState } from "react";

type FlashMode = 'on' | 'off'

type TopCameraBarProps = {
   navigation: any
   flash: FlashMode
   setFlash: (mode: FlashMode | ((prev: FlashMode) => FlashMode)) => void
   selectedTimer: number
   setSelectedTimer: (seconds: number) => void
}

const TopCameraBar = ({ navigation, setFlash, flash, selectedTimer, setSelectedTimer }: TopCameraBarProps) => {
   const [showTimerOptions, setShowTimerOptions] = useState(false)

   const toggleFlash = () => {
      setFlash((prev) => (prev === 'off' ? 'on' : 'off'))
   };

   const isFlashOn = flash === 'on'

   return (
      <View style={styles.topBar}>
         {/* Back Button */}
         <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconWrapper}>
            <Ionicons name="chevron-back" size={28} color={"rgba(255, 255, 255, 0.6)"} />
         </TouchableOpacity>

         {/* Flash & Timer */}
         <View style={styles.buttonsContainer}>
            <TouchableOpacity style={{...styles.roundButton, borderColor: `${!isFlashOn ? 'rgba(255, 255, 255, 0.6)' : 'orange' }`}} onPress={toggleFlash}>
               {isFlashOn ? <Ionicons name="flash-outline" size={14} color={!isFlashOn ? 'rgba(255, 255, 255, 0.6)' : 'orange' } /> : <Ionicons name="flash-off-outline" size={14} color="white" />}
            </TouchableOpacity>
            <View>

               {showTimerOptions ? (
                  <View style={styles.timerOptionsInline}>
                     {[0, 3, 10].map((sec) => (
                        <TouchableOpacity
                           key={sec}
                           onPress={() => {
                              setSelectedTimer(sec);
                              setShowTimerOptions(false);
                           }}
                           style={[
                              styles.timerOptionInline,
                              selectedTimer === sec && styles.timerOptionSelected
                           ]}
                        >
                           <Text style={styles.timerOptionText}>
                              {sec === 0 ? 'Off' : `${sec}s`}
                           </Text>
                        </TouchableOpacity>
                     ))}
                  </View>
               ) : (
                  <TouchableOpacity style={{...styles.roundButton, borderColor: `${selectedTimer === 0 ? "rgba(255, 255, 255, 0.6)" : "orange"}`}} onPress={() => setShowTimerOptions(true)}>
                     <Ionicons name="timer-outline" size={18} color={`${selectedTimer === 0 ? "rgba(255, 255, 255, 0.6)" : "orange"}`} />
                  </TouchableOpacity>
               )}
            </View>
         </View>
      </View>
   );
};

export default TopCameraBar;

const styles = StyleSheet.create({
   topBar: {
      position: 'absolute',
      top: 40,
      left: 0,
      right: 0,
      paddingHorizontal: 20,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      zIndex: 10,
   },
   iconWrapper: {
      width: 30,
      height: 30,
      borderRadius: 18,
      justifyContent: 'center',
      alignItems: 'center',
      // backgroundColor: 'rgba(0, 0, 0, 0.4)',
   },
   buttonsContainer: {
      flexDirection: 'row',
      gap: 10,
   },
   roundButton: {
      width: 24,
      height: 24,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.6)',
      backgroundColor: 'rgba(0, 0, 0, 0.4)',
      justifyContent: 'center',
      alignItems: 'center',
   },
   timerButton: {
      borderColor: 'rgba(228, 172, 18, 0.6)',
   },
   timerOptionsInline: {
      flexDirection: 'row',
      backgroundColor: 'rgba(0,0,0,0.5)',
      borderRadius: 20,
      paddingHorizontal: 6,
      paddingVertical: 4,
      marginLeft: 10,
   },
   timerOptionInline: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
      marginHorizontal: 2,
   },
   timerOptionSelected: {
      backgroundColor: 'rgba(255,255,255,0.2)',
   },
   timerOptionText: {
      color: 'white',
      fontSize: 14,
      fontWeight: '500',
   },
});
