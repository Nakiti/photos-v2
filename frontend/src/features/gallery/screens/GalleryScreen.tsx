import React, { useMemo, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Alert, SafeAreaView } from 'react-native';
import { launchImageLibrary, ImagePickerResponse } from 'react-native-image-picker';
import ImagesDisplay from '../components/ImagesDisplay';
import GalleryBottomBar from '../components/GalleryBottomBar';
import GalleryHeader from '../components/GalleryHeader';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useGallery } from '../../../hooks/useGalleryData';
import { useGalleryTags } from '../../../hooks/useGalleryTagData';
import { useCreateOptimisticPhotos } from '../../../hooks/usePhotoData';
import { useGallerySocket } from '../../../hooks/useGallerySocket';
import { useAuth } from '../../../hooks/useAuth';
import { useMyMembership } from '../../../hooks/useMembershipData';
import Ionicons from 'react-native-vector-icons/Ionicons';

type GalleryImage = {
  id?: string;
  fullsize: string;
  thumbnail: string;
  is_uploaded: number;
  visible?: 'IN_REVIEW' | 'VISIBLE';
  uploaderId?: string;
};

const GalleryScreen = () => {
  const route = useRoute();
  const { galleryId } = route.params as { galleryId: string };
  const navigation = useNavigation<any>();

  // Data Hooks
  const { tags } = useGalleryTags(galleryId);
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const { gallery, photos } = useGallery(galleryId, { tagId: selectedTagId });
  const { mutate: createOptimisticPhotos } = useCreateOptimisticPhotos();
  const { user } = useAuth();
  const { data: myMembership } = useMyMembership(galleryId);
  
  // Real-time
  useGallerySocket(galleryId);

  // Compute images with visibility filtering
  const images: GalleryImage[] = useMemo(() => {
    const isOwner = gallery?.ownerId === user?.id;
    const isAdmin = myMembership?.role === 'ADMIN';
    
    return (photos || [])
      .filter((p: any) => {
        // Server already filters, but we do client-side filtering for consistency
        // Show VISIBLE to all, IN_REVIEW only to uploader, owner, or admin
        if (p.visible === 'VISIBLE') return true;
        if (p.visible === 'IN_REVIEW') {
          return isOwner || isAdmin || p.uploaderId === user?.id;
        }
        // Default to showing if visibility is not set (backward compatibility)
        return true;
      })
      .map((p: any) => ({
        id: p.id,
        fullsize: p.s3Url || '',
        thumbnail: p.thumbnailUrl || p.thumbnailUri || p.localThumbnailUri || '',
        is_uploaded: p.status === 'synced' ? 1 : 0,
        visible: p.visible || 'VISIBLE',
        uploaderId: p.uploaderId,
      }))
      .filter(img => !!img.fullsize || !!img.thumbnail);
  }, [photos, gallery, user, myMembership]);

  // Handlers
  const handlePressHeader = () => navigation.navigate('GalleryDetails', { galleryId });
  const handleBackPress = () => navigation.goBack();

  const handlePressUpload = () => {
    launchImageLibrary(
      { mediaType: 'photo', quality: 1.0, selectionLimit: 0 }, 
      async (response: ImagePickerResponse) => {
        if (response.didCancel || response.errorCode) return;
        const assets = response.assets || [];
        const uris = assets.map(asset => asset.uri).filter((uri): uri is string => !!uri);
        if (uris.length > 0) createOptimisticPhotos({ galleryId, localUris: uris, tagIds: [] });
      }
    );
  };

  const handlePressCamera = () => {
    navigation.navigate("Camera", { screen: "Camera", params: { galleryId } });
  };

  return (
    <View style={styles.container}>
      {/* 1. Header sits at the top (Safe Area)
      */}
      <SafeAreaView style={styles.safeAreaTop}>
          <GalleryHeader 
            galleryId={galleryId} 
            onTitlePress={handlePressHeader} 
            onBackPress={handleBackPress} 
          />
      </SafeAreaView>

      {/* 2. Main Content Area
        We allow this to take full height. The BottomBar will float ON TOP of this.
      */}
      <View style={styles.contentContainer}>
          {images.length === 0 ? (
            <View style={styles.emptyStateContainer}>
                <View style={styles.emptyIconCircle}>
                   <Ionicons name="images" size={40} color="#666" />
                </View>
                <Text style={styles.emptyTitle}>Empty Gallery</Text>
                <Text style={styles.emptySubtext}>
                   Use the controls below to add your first photo.
                </Text>
            </View>
          ) : (
            <ImagesDisplay 
                images={images} 
                galleryId={galleryId} 
                selectedTagId={selectedTagId ?? ''}
                // IMPT: Add padding to bottom of list so photos aren't hidden behind the floating bar
                contentContainerStyle={{ paddingBottom: 120 }} 
            />
          )}
      </View>

      {/* 3. Floating Overlay Controls 
      */}
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
      backgroundColor: '#FFFFFF',
   },
   safeAreaTop: {
      backgroundColor: '#FFFFFF',
      zIndex: 5, // Ensures header stays above content while scrolling
   },
   contentContainer: {
      flex: 1,
      // If you want content to scroll BEHIND the header, remove 'zIndex' from header 
      // and adjust paddingTop here. For now, we stack them vertically.
   },
   
   // --- Empty State ---
   emptyStateContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 40,
      marginTop: -60, // Visual offset to center perfectly above the bottom bar
   },
   emptyIconCircle: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: '#F5F5F5',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 20,
   },
   emptyTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: '#222',
      marginBottom: 8,
   },
   emptySubtext: {
      fontSize: 15,
      color: '#999',
      textAlign: 'center',
      lineHeight: 22,
   },
});

export default GalleryScreen;