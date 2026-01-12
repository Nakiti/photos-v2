import { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Linking, Alert } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { Camera, useCameraDevice } from 'react-native-vision-camera';
import TopCameraBar from './components/TopCameraBar';
import BottomCameraBar from './components/BottomCameraBar';
import { useRoute } from '@react-navigation/native';
import { useUploadRateLimit } from '../../hooks/useUploadRateLimit';

type Facing = 'back' | 'front'
type FlashMode = 'on' | 'off'

type CameraScreenProps = {
   navigation: any
}

const CameraScreen = ({ navigation }: CameraScreenProps) => {
   const route = useRoute();
   const { galleryId } = route.params as { galleryId: string };
   const { canUpload, currentCount, limit, retryAfterMinutes } = useUploadRateLimit(galleryId);
   const [hasPermission, setHasPermission] = useState(false);
   const [permissionDenied, setPermissionDenied] = useState(false);

   useEffect(() => {
      const checkPermission = async () => {
         const status = await Camera.getCameraPermissionStatus();
         const isGranted = status === 'granted';
         setHasPermission(isGranted);
         setPermissionDenied(status === 'denied' || status === 'restricted');
      };
      checkPermission();
   }, []);

   const requestCameraPermission = async () => {
      const status = await Camera.requestCameraPermission();
      const isGranted = status === 'granted';
      if (isGranted) {
         setHasPermission(true);
         setPermissionDenied(false);
      } else {
         setHasPermission(false);
         setPermissionDenied(status === 'denied' || status === 'restricted');
         Alert.alert(
            'Permission required',
            'Please enable camera access in Settings to continue.',
            [
               { text: 'Not now', style: 'cancel' },
               { text: 'Open Settings', onPress: () => Linking.openSettings() },
            ]
         );
      }
   };
   // --- END OF REFACTORED LOGIC ---

   const [facing, setFacing] = useState<Facing>('back')
   const device = useCameraDevice(facing)
   const [zoom, setZoom] = useState<number>(0)
   const [flash, setFlash] = useState<FlashMode>('off')
   const [selectedTimer, setSelectedTimer] = useState<number>(0)
   const [countdown, setCountdown] = useState<number | null>(null)

   const cameraRef = useRef<Camera>(null)

   if (!hasPermission) {
      return (
         <View style={styles.permissionContainer}>
            <Text style={styles.permissionText}>We need your permission to use the camera</Text>
            {/* This button now calls our new request function */}
            <TouchableOpacity style={styles.permissionButton} onPress={requestCameraPermission}>
               <Text style={styles.permissionButtonText}>Grant Permission</Text>
            </TouchableOpacity>
            {permissionDenied && (
               <TouchableOpacity style={[styles.permissionButton, { marginTop: 12 }]} onPress={Linking.openSettings}>
                  <Text style={styles.permissionButtonText}>Open Settings</Text>
               </TouchableOpacity>
            )}
         </View>
      )
   }
   if (device == null) return <View><Text>No camera device found.</Text></View> // Added a message here

   // ... The rest of your component logic remains the same ...

   const onPinch = (event: any) => {
      const velocity = event.velocity / 5;
      let newZoom = velocity > 0
        ? zoom + event.scale * velocity * (Platform.OS === 'ios' ? 0.01 : 25)
        : zoom - event.scale * Math.abs(velocity) * (Platform.OS === 'ios' ? 0.02 : 50);

      if (newZoom < 0) newZoom = 0;
      else if (newZoom > 0.5) newZoom = 0.5;

      setZoom(newZoom);
   }

   const pinchGesture = Gesture.Pinch().onUpdate(onPinch).runOnJS(true)

   const handleToggleFacing = () => {
      setFacing((current) => (current === 'back' ? 'front' : 'back'))
   }

   const handleOpenGallery = () => {
      if (navigation.canGoBack()) {
         navigation.goBack()
         return
      }
      navigation.navigate('Gallery', { screen: 'Gallery', params: { galleryId } })
   }

   const handleCapture = async () => {
      if (!canUpload) {
         const message = retryAfterMinutes 
            ? `You've reached your upload limit (${currentCount}/${limit} photos this hour). Please wait ${retryAfterMinutes} minute${retryAfterMinutes !== 1 ? 's' : ''} before taking more photos.`
            : `You've reached your upload limit (${currentCount}/${limit} photos this hour).`;
         Alert.alert('Upload Limit Reached', message);
         return;
      }

      try {
         if (selectedTimer && selectedTimer > 0) {
            for (let i = selectedTimer; i > 0; i--) {
               setCountdown(i)
               // eslint-disable-next-line no-await-in-loop
               await new Promise<void>((resolve) => setTimeout(resolve, 1000))
            }
            setCountdown(null)
         }
         const photo = await cameraRef.current?.takePhoto({ flash })
         if (photo) {
            navigation.navigate('Preview', {
              photoUri: `file://${photo.path}`, 
              galleryId: galleryId,
            });
         }
      } catch (e) {
         console.error("Failed to take photo:", e);
         Alert.alert("Error", "Could not take picture. Please try again.");
      }
   }

   return (
      <GestureHandlerRootView style={{ flex: 1 }}>
         <View style={styles.container}>
            <TopCameraBar navigation={navigation} flash={flash} setFlash={setFlash} selectedTimer={selectedTimer} setSelectedTimer={setSelectedTimer} />
            <GestureDetector gesture={pinchGesture}>
               <Camera
                  ref={cameraRef}
                  style={styles.camera}
                  device={device}
                  isActive={true}
                  photo={true}
                  zoom={zoom}
               />
            </GestureDetector>
            <BottomCameraBar 
               onShutterPress={handleCapture} 
               onToggleFacing={handleToggleFacing} 
               onOpenGallery={handleOpenGallery}
               disabled={!canUpload}
               rateLimitInfo={!canUpload ? { currentCount, limit, retryAfterMinutes } : undefined}
            />
         </View>
      </GestureHandlerRootView>
   );
};

// ... your styles remain the same
export default CameraScreen;

const styles = StyleSheet.create({
   container: {
      flex: 1,
      backgroundColor: 'black',
   },
   topBar: {
      position: 'absolute',
      top: 50,
      left: 20,
      zIndex: 10,
   },
   camera: {
      flex: 1,
      borderRadius: 20,
      overflow: 'hidden',
   },
   bottomBar: {
      position: 'absolute',
      bottom: 30,
      width: '100%',
      flexDirection: 'row',
      justifyContent: 'space-evenly',
      alignItems: 'center',
   },
   iconButton: {
      width: 60,
      height: 60,
      justifyContent: 'center',
      alignItems: 'center',
   },
   shutterButton: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: 'white',
      borderWidth: 5,
      borderColor: 'rgba(255, 255, 255, 0.7)',
   },
   permissionContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'black',
   },
   permissionText: {
      color: 'white',
      fontSize: 18,
      textAlign: 'center',
      marginBottom: 20,
   },
   permissionButton: {
      backgroundColor: 'white',
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: 5,
      borderWidth: 2,
      borderColor: 'black',
   },
   permissionButtonText: {
      fontSize: 16,
      fontWeight: 'bold',
   },
});