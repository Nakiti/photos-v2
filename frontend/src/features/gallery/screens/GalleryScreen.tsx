import React from 'react';
import { View, StyleSheet } from 'react-native';
import ImagesDisplay from '../components/ImagesDisplay';
import GalleryBottomBar from '../components/GalleryBottomBar';
import GalleryHeader from '../components/GalleryHeader';
import { useRoute, useNavigation } from '@react-navigation/native';

type GalleryImage = {
  local_filepath: string;
  is_uploaded: number;
};

const GalleryScreen = () => {
  const route = useRoute()
  console.log("params", route)
  const { galleryId } = route.params as { galleryId: string }


  const images: GalleryImage[] = [
    { local_filepath: 'https://picsum.photos/seed/1/300/300', is_uploaded: 0 },
    { local_filepath: 'https://picsum.photos/seed/2/300/300', is_uploaded: 1 },
    { local_filepath: 'https://picsum.photos/seed/3/300/300', is_uploaded: 2 },
    { local_filepath: 'https://picsum.photos/seed/4/300/300', is_uploaded: 3 },
    { local_filepath: 'https://picsum.photos/seed/5/300/300', is_uploaded: 2 },
    { local_filepath: 'https://picsum.photos/seed/6/300/300', is_uploaded: 0 },
    { local_filepath: 'https://picsum.photos/seed/7/300/300', is_uploaded: 1 },
    { local_filepath: 'https://picsum.photos/seed/8/300/300', is_uploaded: 2 },
    { local_filepath: 'https://picsum.photos/seed/9/300/300', is_uploaded: 3 },
    { local_filepath: 'https://picsum.photos/seed/10/300/300', is_uploaded: 0 },
  ];

  const navigation = useNavigation();

  const handlePressHeader = () => {
    navigation.navigate('GalleryDetails', {galleryId});
  }

  const handleBackPress = () => {
    navigation.goBack();
  }

  const handlePressImage = (index: number, imgs: GalleryImage[]) => {
    // no-op handler for presentational component
  };

  const handlePressUpload = () => {
    // no-op handler for presentational component
  };

  const handlePressCamera = () => {
    // no-op handler for presentational component
  };

  return (
    <View style={styles.container}>
      <GalleryHeader onTitlePress={handlePressHeader} onBackPress={handleBackPress} />
      <ImagesDisplay images={images} onPressImage={handlePressImage} />
      <GalleryBottomBar onPressUpload={handlePressUpload} onPressCamera={handlePressCamera} />
    </View>
  );
};

const styles = StyleSheet.create({
   container: {
      flex: 1,
      backgroundColor: 'white',
   },
   flatListContent: {
      paddingTop: 37,
      backgroundColor: "green"
   },
   imageContainer: {
      margin: 1,
      overflow: 'hidden',
      backgroundColor: "green"
   },
   image: {
      flex: 1,
      width: '100%',
      height: '100%',
      resizeMode: 'cover',
   },
   iconButton: {
      marginHorizontal: 10,
   },
   floatingLeft: {
      position: 'absolute',
      bottom: 24,
      left: 24,
      width: 60,
      height: 60,
      borderRadius: 35,
      backgroundColor: '#333',
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 5,
   },
   floatingRight: {
      position: 'absolute',
      bottom: 24,
      right: 24,
      width: 60,
      height: 60,
      borderRadius: 35,
      backgroundColor: '#333',
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 5,
   },
});

export default GalleryScreen;
