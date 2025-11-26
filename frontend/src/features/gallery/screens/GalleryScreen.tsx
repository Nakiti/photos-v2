import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Text, Alert } from 'react-native';
import { launchImageLibrary, ImagePickerResponse } from 'react-native-image-picker';
import ImagesDisplay from '../components/ImagesDisplay';
import GalleryBottomBar from '../components/GalleryBottomBar';
import GalleryHeader from '../components/GalleryHeader';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useGallery } from '../../../hooks/useGalleryData';
import { useGalleryTags } from '../../../hooks/useGalleryTagData';
import { useCreateOptimisticPhotos } from '../../../hooks/usePhotoData';
import { useGallerySocket } from '../../../hooks/useGallerySocket';

type GalleryImage = {
  id?: string;
  fullsize: string;
  thumbnail: string;
  is_uploaded: number;
};

const GalleryScreen = () => {
  const route = useRoute()
  const { galleryId } = route.params as { galleryId: string }

  // Tags state
  const { tags } = useGalleryTags(galleryId);
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null); // null means 'All'

  // Photos from local DB (observed)
  const { photos } = useGallery(galleryId, { tagId: selectedTagId });
  // Batch photo upload hook
  const { mutate: createOptimisticPhotos } = useCreateOptimisticPhotos();
  // Join gallery room for real-time updates
  useGallerySocket(galleryId);

  // Compute images to display
  const images: GalleryImage[] = useMemo(() => {
    return (photos || [])
      .map((p: any) => ({
        id: p.id,
        fullsize: p.s3Url || '',
        thumbnail: p.thumbnailUrl || p.thumbnailUri || p.localThumbnailUri || '',
        is_uploaded: p.status === 'synced' ? 1 : 0,
      }))
      .filter(img => !!img.fullsize || !!img.thumbnail);
  }, [photos]);


  console.log("images ", images)

  const navigation = useNavigation<any>();

  const handlePressHeader = () => {
    navigation.navigate('GalleryDetails', {galleryId});
  }

  const handleBackPress = () => {
    navigation.goBack();
  }


  const handlePressUpload = () => {
    launchImageLibrary(
      { 
        mediaType: 'photo', 
        quality: 1.0, // Full quality since we resize anyway
        selectionLimit: 0, // 0 = unlimited selection
        includeBase64: false, // Not needed since we use URIs
      }, 
      async (response: ImagePickerResponse) => {
        if (response.didCancel) {
          return;
        }
        
        if (response.errorCode) {
          Alert.alert('Error', response.errorMessage || 'Failed to pick images');
          return;
        }

        const assets = response.assets || [];
        
        if (assets.length === 0) {
          return;
        }

        // Extract URIs from selected assets
        const uris = assets
          .map(asset => asset.uri)
          .filter((uri): uri is string => !!uri);

        if (uris.length > 0) {
          createOptimisticPhotos(
            { 
              galleryId, 
              localUris: uris, 
              tagIds: [] // Can add tag selection UI later if needed
            },
            {
              onSuccess: (result) => {
                console.log(`Successfully queued ${result.count} photos for upload`);
              },
              onError: (error) => {
                console.error("Failed to create photos:", error);
                Alert.alert("Error", "Failed to add photos. Please try again.");
              }
            }
          );
        }
      }
    );
  };

  const handlePressCamera = () => {
    navigation.navigate("Camera", {
      screen: "Camera", 
      params: {galleryId}
    })
  };

  return (
    <View style={styles.container}>
      <GalleryHeader galleryId={galleryId} onTitlePress={handlePressHeader} onBackPress={handleBackPress} />
      {images.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>No photos yet</Text>
          <Text style={styles.emptySubtext}>
            Upload some photos or open the camera to take new ones.
          </Text>
          <View style={styles.ctaRow}>
            <TouchableOpacity style={[styles.ctaBtn, styles.ctaBtnSecondary]} onPress={handlePressUpload}>
              <Text style={styles.ctaTextSecondary}>Upload photos</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.ctaBtn, styles.ctaBtnPrimary]} onPress={handlePressCamera}>
              <Text style={styles.ctaTextPrimary}>Open camera</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <ImagesDisplay images={images} galleryId={galleryId} selectedTagId={selectedTagId ?? ''}/>
      )}
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
   emptyContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 24,
   },
   emptyTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: '#666',
      marginBottom: 8,
      textAlign: 'center',
   },
   emptySubtext: {
      fontSize: 14,
      color: '#999',
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: 16,
   },
   ctaRow: {
      flexDirection: 'row',
      gap: 8,
   },
   ctaBtn: {
      flex: 1,
      height: 44,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 12,
   },
   ctaBtnPrimary: {
      backgroundColor: '#111',
   },
   ctaBtnSecondary: {
      backgroundColor: '#f4f4f4',
   },
   ctaTextPrimary: {
      color: '#fff',
      fontWeight: '600',
   },
   ctaTextSecondary: {
      color: '#111',
      fontWeight: '600',
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
