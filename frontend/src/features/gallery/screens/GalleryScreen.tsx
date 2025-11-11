import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Text } from 'react-native';
import ImagesDisplay from '../components/ImagesDisplay';
import GalleryBottomBar from '../components/GalleryBottomBar';
import GalleryHeader from '../components/GalleryHeader';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useGallery } from '../../../hooks/useGalleryData';
import { useGalleryTags } from '../../../hooks/useGalleryTagData';
import apiClient from '../../../services/apiClient';


type GalleryImage = {
  local_filepath: string;
  is_uploaded: number;
};

const GalleryScreen = () => {
  const route = useRoute()
  console.log("params", route)
  const { galleryId } = route.params as { galleryId: string }

  // Tags state
  const { tags } = useGalleryTags(galleryId);
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null); // null means 'All'

  // Photos from local DB (observed)
  const { photos } = useGallery(galleryId);

  // When filtering by a specific tag, fetch filtered photos from API
  const [filteredImages, setFilteredImages] = useState<GalleryImage[] | null>(null);
  useEffect(() => {
    let active = true;
    async function run() {
      if (!selectedTagId) {
        if (active) setFilteredImages(null);
        return;
      }
      try {
        const res = await apiClient.get(`/api/v1/galleries/${galleryId}/photos`, {
          params: { tagId: selectedTagId },
        });
        const items = (res.data?.items ?? []) as Array<{ s3Url: string }>;
        if (!active) return;
        setFilteredImages(
          items.map(p => ({
            local_filepath: p.s3Url,
            is_uploaded: 1,
          }))
        );
      } catch (e) {
        if (active) setFilteredImages([]);
      }
    }
    run();
    return () => { active = false; };
  }, [galleryId, selectedTagId]);

  // Compute images to display
  const images: GalleryImage[] = useMemo(() => {
    if (selectedTagId && filteredImages) return filteredImages;
    return (photos || [])
      .map((p: any) => ({
        local_filepath: p.s3Url || '',
        is_uploaded: p.status === 'synced' ? 1 : 0,
      }))
      .filter(img => !!img.local_filepath);
  }, [photos, filteredImages, selectedTagId]);

  const navigation = useNavigation<any>();

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
    navigation.navigate("Camera", {galleryId})
  };

  return (
    <View style={styles.container}>
      <GalleryHeader galleryId={galleryId} onTitlePress={handlePressHeader} onBackPress={handleBackPress} />
      <ImagesDisplay images={images} onPressImage={handlePressImage} />
      <GalleryBottomBar 
        onPressUpload={handlePressUpload} 
        onPressCamera={handlePressCamera}
        tags={tags as any}
        selectedTagId={selectedTagId}
        onSelectTag={setSelectedTagId}
      />
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
