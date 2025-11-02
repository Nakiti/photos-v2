import { useRef } from "react"
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import { View, StyleSheet } from "react-native";

type ZoomSliderProps = {
   zoom: number
   setZoom: (value: number) => void
}

const ZoomSlider = ({ zoom, setZoom }: ZoomSliderProps) => {
   const manualZoom = useRef(zoom);
   const SLIDER_HEIGHT = 200;
   const HANDLE_HEIGHT = 24;
   const MAX_ZOOM = 0.5;

   const manualZoomGesture = Gesture.Pan()
      .onBegin(() => {
         manualZoom.current = zoom;
      })
      .onUpdate((e) => {
         const delta = -e.translationY / SLIDER_HEIGHT;
         let newZoom = manualZoom.current + delta;
         newZoom = Math.min(MAX_ZOOM, Math.max(0, newZoom));
         setZoom(newZoom);
      })
      .runOnJS(true);

   const handleTravelRange = SLIDER_HEIGHT - HANDLE_HEIGHT;
   const handleY = SLIDER_HEIGHT * (0.5 - zoom / MAX_ZOOM)

   return (
      <GestureDetector gesture={manualZoomGesture}>
         <View style={[styles.zoomSliderWrapper, { height: SLIDER_HEIGHT }]}>
            <View style={styles.zoomTrack} />
            <View
               style={[
                  styles.zoomHandle,
                  { transform: [{ translateY: handleY }] }
               ]}
            />
         </View>
      </GestureDetector>
   );
};

export default ZoomSlider

const styles = StyleSheet.create({
   zoomSliderWrapper: {
      position: 'absolute',
      right: 0,
      top: '35%',
      width: 40,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 100,
   },
   zoomTrack: {
      width: 4,
      height: '100%',
      borderRadius: 2,
      backgroundColor: 'rgba(255,255,255,0.3)',
      position: 'absolute',
   },
   zoomHandle: {
      width: 20,
      height: 20,
      borderRadius: 12,
      backgroundColor: 'white',
      borderWidth: 2,
      borderColor: '#aaa',
      zIndex: 2,
   },
});
