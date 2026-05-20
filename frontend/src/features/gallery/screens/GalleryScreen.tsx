import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useImagePicker } from '../../../hooks/useImagePicker';
import ImagesDisplay from '../components/ImagesDisplay';
import GalleryBottomBar from '../components/GalleryBottomBar';
import GalleryHeader from '../components/GalleryHeader';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
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

// safe area top (e.g. 47px) + 8px gap + 38px buttons + 10px bottom padding = top + 56
const NAV_CONTENT_HEIGHT = 56;
// bottom bar: bottom:20 + height:46 + 12px gap above bar
const BOTTOM_CLEARANCE = 78;

const GalleryScreen = () => {
  const route = useRoute();
  const { galleryId } = route.params as { galleryId: string };
  const navigation = useNavigation<any>();
  const { top: safeTop } = useSafeAreaInsets();
  const headerHeight = safeTop + NAV_CONTENT_HEIGHT;

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
  
  // Record last-viewed timestamp + photo count snapshot for unseen-count tracking
  useFocusEffect(
    useCallback(() => {
      if (!gallery) return;
      database.write(async () => {
        await gallery.update(g => {
          g.lastViewedAt = Date.now();
          g.lastViewedPhotoCount = gallery.photoCount;
        });
      });
    }, [database, gallery])
  );

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
    const real = (photos || [])
      .map((p: any) => ({
        id: p.id,
        fullsize: p.s3Url || p.localUri || '',
        thumbnail: p.thumbnailUri || p.localThumbnailUri || '',
        localThumbnailUri: p.localThumbnailUri || '',
        is_uploaded: p.status === 'synced' ? 1 : 0,
        uploaderId: p.uploaderId,
        uploaderInitials: initialsMap.get(p.uploaderId) ?? '',
      }))
      .filter((img: GalleryImage) => !!img.fullsize || !!img.thumbnail);

    // if (__DEV__) {
    //   const dummies: GalleryImage[] = Array.from({ length: 80 }, (_, i) => ({
    //     id: `__dummy__${i}`,
    //     fullsize: 'dummy',
    //     thumbnail: 'dummy',
    //     localThumbnailUri: '',
    //     is_uploaded: 1,
    //     uploaderId: undefined,
    //     uploaderInitials: '',
    //   }));
    //   return [...real, ...dummies];
    // }

    return real;
  }, [photos, initialsMap]);

  // Handlers
  const handlePressHeader = () => navigation.navigate('GalleryDetails', { galleryId });
  const handleBackPress = () => navigation.goBack();

  const { pickImages } = useImagePicker();

  const handlePressUpload = () => {
    pickImages({ quality: 1.0, selectionLimit: 0 }, assets => {
      const uris = assets.map(a => a.uri);
      createOptimisticPhotos({ galleryId, localUris: uris, tagIds: [] });
    });
  };

  const handlePressCamera = () => {
    navigation.navigate("Camera", { screen: "Camera", params: { galleryId } });
  };

  return (
    <View style={styles.container}>
      {/* Content fills the entire screen; header/bottom-bar overlay on top */}
      {images.length === 0 ? (
        <View style={[styles.emptyStateContainer, { paddingTop: headerHeight }]}>
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
          contentContainerStyle={{ paddingBottom: headerHeight, paddingTop: BOTTOM_CLEARANCE }}
          scrollIndicatorInsets={{ top: headerHeight, bottom: BOTTOM_CLEARANCE }}
        />
      )}

      {/* Header overlays the content (position:absolute in GalleryHeader) */}
      <GalleryHeader
        galleryId={galleryId}
        onTitlePress={handlePressHeader}
        onBackPress={handleBackPress}
      />

      {/* Bottom bar overlays the content */}
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

  // --- Empty State ---
  emptyStateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
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