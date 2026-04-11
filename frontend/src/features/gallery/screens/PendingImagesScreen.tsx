import React, { useMemo, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Alert, SafeAreaView, ActivityIndicator } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useGallery } from '../../../hooks/useGalleryData';
import { useAuth } from '../../../hooks/useAuth';
import { useMyMembership } from '../../../hooks/useMembershipData';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { approveAllPhotos } from '../../../services/api/photos.service';
import { useGallerySocket } from '../../../hooks/useGallerySocket';
import ImagesDisplay from '../components/ImagesDisplay';
import Ionicons from 'react-native-vector-icons/Ionicons';

type GalleryImage = {
  id?: string;
  fullsize: string;
  thumbnail: string;
  is_uploaded: number;
  visible?: 'IN_REVIEW' | 'VISIBLE';
  uploaderId?: string;
};

const PendingImagesScreen = () => {
  const route = useRoute();
  const navigation = useNavigation<any>();
  const { galleryId } = route.params as { galleryId: string };
  const { user } = useAuth();
  const { data: myMembership } = useMyMembership(galleryId);
  const queryClient = useQueryClient();

  const { gallery, photos } = useGallery(galleryId);
  
  // Real-time updates
  useGallerySocket(galleryId);

  const isOwner = gallery?.ownerId === user?.id;
  const isAdmin = myMembership?.role === 'ADMIN';
  const canApprove = isOwner || isAdmin;

  // Filter to only show in-review photos
  const pendingImages: GalleryImage[] = useMemo(() => {
    return (photos || [])
      .filter((p: any) => p.visible === 'IN_REVIEW')
      .map((p: any) => ({
        id: p.id,
        fullsize: p.s3Url || '',
        thumbnail: p.thumbnailUrl || p.thumbnailUri || p.localThumbnailUri || '',
        is_uploaded: p.status === 'synced' ? 1 : 0,
        visible: p.visible || 'IN_REVIEW',
        uploaderId: p.uploaderId,
      }))
      .filter(img => !!img.fullsize || !!img.thumbnail);
  }, [photos]);

  const approveAllMutation = useMutation({
    mutationFn: () => approveAllPhotos(galleryId),
    onSuccess: (data: { count: number }) => {
      queryClient.invalidateQueries({ queryKey: ['gallery', galleryId] });
      Alert.alert('Success', `Approved ${data.count} photo${data.count !== 1 ? 's' : ''}!`);
    },
    onError: () => {
      Alert.alert('Error', 'Failed to approve photos');
    },
  });

  const handleApproveAll = () => {
    if (pendingImages.length === 0) {
      Alert.alert('Info', 'No pending photos to approve');
      return;
    }

    Alert.alert(
      'Approve All Photos',
      `Are you sure you want to approve all ${pendingImages.length} pending photo${pendingImages.length !== 1 ? 's' : ''}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve All',
          onPress: () => approveAllMutation.mutate(),
        },
      ]
    );
  };

  const handleBackPress = () => navigation.goBack();

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeAreaTop}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Pending Images</Text>
          {canApprove && pendingImages.length > 0 && (
            <TouchableOpacity
              onPress={handleApproveAll}
              style={styles.approveAllButton}
              disabled={approveAllMutation.isPending}
            >
              {approveAllMutation.isPending ? (
                <ActivityIndicator size="small" color="#22c55e" />
              ) : (
                <Text style={styles.approveAllText}>Approve All</Text>
              )}
            </TouchableOpacity>
          )}
          {!canApprove && <View style={styles.placeholder} />}
        </View>
      </SafeAreaView>

      <View style={styles.contentContainer}>
        {pendingImages.length === 0 ? (
          <View style={styles.emptyStateContainer}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="checkmark-circle-outline" size={40} color="#666" />
            </View>
            <Text style={styles.emptyTitle}>No Pending Images</Text>
            <Text style={styles.emptySubtext}>
              All photos have been reviewed and approved.
            </Text>
          </View>
        ) : (
          <ImagesDisplay
            images={pendingImages}
            galleryId={galleryId}
            selectedTagId=""
            contentContainerStyle={{ paddingBottom: 120 }}
          />
        )}
      </View>
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
    zIndex: 5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    textAlign: 'center',
  },
  approveAllButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#dcfce7',
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  approveAllText: {
    color: '#22c55e',
    fontSize: 14,
    fontWeight: '600',
  },
  placeholder: {
    width: 100,
  },
  contentContainer: {
    flex: 1,
  },
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

export default PendingImagesScreen;

