import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Alert, SafeAreaView } from 'react-native';
import { launchImageLibrary, ImagePickerResponse } from 'react-native-image-picker';
import ImagesDisplay from '../components/ImagesDisplay';
import GalleryBottomBar from '../components/GalleryBottomBar';
import GalleryHeader from '../components/GalleryHeader';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useGallery } from '../../../hooks/useGalleryData';
import { useQueryClient } from '@tanstack/react-query';
import { useGalleryTags } from '../../../hooks/useGalleryTagData';
import { useCreateOptimisticPhotos } from '../../../hooks/usePhotoData';
import { useGallerySocket } from '../../../hooks/useGallerySocket';
import { useDatabase } from '@nozbe/watermelondb/react';
import { Q } from '@nozbe/watermelondb';
import Ionicons from 'react-native-vector-icons/Ionicons';
import User from '../../../db/models/User';

type GalleryImage = {
  id?: string;
  fullsize: string;
  thumbnail: string;
  localThumbnailUri: string;
  is_uploaded: number;
  uploaderId?: string;
  uploaderInitials: string;
};

const GalleryScreen = () => {
  const route = useRoute();
  const { galleryId } = route.params as { galleryId: string };
  const navigation = useNavigation<any>();

  // Data Hooks
  const database = useDatabase();
  const queryClient = useQueryClient();
  const { tags } = useGalleryTags(galleryId);
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [selectedUploaderId, setSelectedUploaderId] = useState<string | null>(null);
  const likedOnly = selectedTagId === '__liked__';
  const { gallery, photos, isSyncing } = useGallery(galleryId, {
    tagId: likedOnly ? null : selectedTagId,
    uploaderId: selectedUploaderId,
    likedOnly,
  });
  const { mutate: createOptimisticPhotos } = useCreateOptimisticPhotos();

  // Pull-to-refresh
  const [refreshing, setRefreshing] = useState(false);
  const prevIsSyncing = useRef(isSyncing);
  useEffect(() => {
    if (refreshing && prevIsSyncing.current && !isSyncing) setRefreshing(false);
    prevIsSyncing.current = isSyncing;
  }, [refreshing, isSyncing]);
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    queryClient.invalidateQueries({ queryKey: ['gallery', galleryId, 'photos'] });
  }, [queryClient, galleryId]);
  
  // Real-time
  useGallerySocket(galleryId);

  // Extract unique users from photos
  const users = useMemo(() => {
    const uploaderIds = new Set<string>();
    (photos || []).forEach((p: any) => {
      if (p.uploaderId) {
        uploaderIds.add(p.uploaderId);
      }
    });
    return Array.from(uploaderIds);
  }, [photos]);

  // Fetch user names for display
  const [usersWithNames, setUsersWithNames] = useState<Array<{ id: string; name: string }>>([]);
  
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (users.length === 0) {
        if (!cancelled) setUsersWithNames([]);
        return;
      }
      try {
        const usersCollection = database.collections.get<User>('users');
        // Single batch query instead of N individual find() calls.
        const userRecords = await usersCollection
          .query(Q.where('id', Q.oneOf(users)))
          .fetch();
        const nameMap = new Map(
          userRecords.map(u => [u.id, u.name || u.handle || 'Unknown'])
        );
        const loadedUsers = users.map(id => ({ id, name: nameMap.get(id) ?? 'Unknown' }));
        if (!cancelled) setUsersWithNames(loadedUsers);
      } catch {
        if (!cancelled) setUsersWithNames([]);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [database, users]);

  // Build a fast lookup: uploaderId → display initials
  const initialsMap = useMemo(() => {
    const map = new Map<string, string>();
    usersWithNames.forEach(({ id, name }) => {
      const initials = name
        .split(' ')
        .map((w: string) => w[0] ?? '')
        .join('')
        .slice(0, 2)
        .toUpperCase();
      map.set(id, initials || '?');
    });
    return map;
  }, [usersWithNames]);

  const images: GalleryImage[] = useMemo(() => {
    return (photos || [])
      .map((p: any) => ({
        id: p.id,
        fullsize: p.s3Url || p.localUri || '',
        thumbnail: p.thumbnailUri || p.localThumbnailUri || '',
        localThumbnailUri: p.localThumbnailUri || '',
        is_uploaded: p.status === 'synced' ? 1 : 0,
        uploaderId: p.uploaderId,
        uploaderInitials: initialsMap.get(p.uploaderId) ?? '',
      }))
      .filter(img => !!img.fullsize || !!img.thumbnail);
  }, [photos, initialsMap]);

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
                refreshing={refreshing}
                onRefresh={onRefresh}
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
        users={usersWithNames}
        selectedUploaderId={selectedUploaderId}
        onSelectUploader={setSelectedUploaderId}
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