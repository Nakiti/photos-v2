import React, { useMemo, useCallback } from 'react';
import { View, StyleSheet, Text, FlatList, TouchableOpacity, Image, Alert, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { launchImageLibrary, ImagePickerResponse } from 'react-native-image-picker';

// Components
import CommunityHeader from '../components/CommunityHeader';
import GroupListItem from '../../groups/components/GroupListItem';

// Hooks
import { useCommunity, useCommunityGalleries, useUpdateCommunityIcon } from '../../../hooks/useCommunityData';
import { useCommunityMembers } from '../../../hooks/useCommunityMembershipData';
import { useAuth } from '../../../hooks/useAuth';

const COLORS = {
  black: '#000000',
  white: '#FFFFFF',
  lightGray: '#F5F5F5',
  gray: '#8E8E93',
  border: '#E0E0E0',
  darkGray: '#1C1C1E',
  blue: '#007aff',
};

const CommunityScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { communityId } = (route.params as any) ?? { communityId: undefined };
  
  // Hooks
  const { community, isSyncing } = useCommunity(communityId);
  const { members } = useCommunityMembers(communityId);
  const { galleries, isLoading: isLoadingGalleries, isSyncing: isSyncingGalleries } = useCommunityGalleries(communityId);
  const { user } = useAuth();
  const { mutateAsync: updateIcon, isPending: isUpdatingIcon } = useUpdateCommunityIcon(communityId);

  // Derived State
  const headerTitle = useMemo(() => community?.name ?? 'Community', [community?.name]);
  const memberCount = members?.length ?? 0;
  const isOwner = community?.ownerId === user?.id;
  
  const onPickImage = () => {
    if (!isOwner) {
      Alert.alert('Permission Denied', 'Only the community owner can change the icon.');
      return;
    }
    
    launchImageLibrary({ mediaType: 'photo', quality: 0.7 }, async (response: ImagePickerResponse) => {
      if (response.didCancel) {
        return;
      } else if (response.errorMessage) {
        Alert.alert('Error', response.errorMessage);
        return;
      } else if (response.assets && response.assets[0]?.uri) {
        try {
          await updateIcon(response.assets[0].uri);
        } catch (error) {
          console.error('Failed to update community icon:', error);
          Alert.alert('Error', 'Failed to update community icon. Please try again.');
        }
      }
    });
  };

  const onCreateEvent = () => {
    navigation.navigate("Events", {screen: "CreateEventDetails", params: {communityId}})
  }

  const handleGalleryPress = useCallback((galleryId: string) => {
    navigation.navigate('Gallery', {
      screen: 'Gallery',
      params: { galleryId },
    });
  }, [navigation]);

  const renderItem = useCallback(({ item }: { item: any }) => (
    <GroupListItem
      id={item.id}
      title={item.name}
      icon={item.iconUrl || ''}
      communityName={undefined} // Already in a community, no need to show community name
      lastUploadedBy=""
      unseenCount={0}
      lastUpdated={item.lastPhotoAt ? new Date(item.lastPhotoAt).toISOString() : (item.createdAt ? new Date(item.createdAt).toISOString() : new Date().toISOString())}
      onPress={() => handleGalleryPress(item.id)}
    />
  ), [handleGalleryPress]);

  const keyExtractor = useCallback((item: any) => item.id, []);

  const isLoading = isLoadingGalleries || isSyncing;

  return (
    <View style={styles.container}>
      <CommunityHeader 
        onBack={() => navigation.goBack()}
        onOpenMembers={() => {}} // Handled internally by CommunityHeader
        onShare={() => {}} // Handled internally by CommunityHeader
        onOpenSettings={() => {}} // Handled internally by CommunityHeader
        communityId={communityId}
      />

      <View style={styles.hero}>
        <TouchableOpacity 
          style={styles.imagePicker} 
          onPress={onPickImage} 
          activeOpacity={0.8}
          disabled={!isOwner || isUpdatingIcon}
        >
          {community?.iconUrl ? (
            <Image source={{ uri: community.iconUrl }} style={styles.image} />
          ) : (
            <View style={styles.imagePlaceholder}>
              {isUpdatingIcon ? (
                <ActivityIndicator size="small" color={COLORS.gray} />
              ) : (
                <>
                  <Ionicons name="camera-outline" size={32} color={COLORS.gray} />
                  <Text style={styles.imagePlaceholderText}>Add Photo</Text>
                </>
              )}
            </View>
          )}
        </TouchableOpacity>
        
        <Text style={styles.heroTitle}>{headerTitle}</Text>
        <Text style={styles.heroMeta}>
          {memberCount} {memberCount === 1 ? 'member' : 'members'}
        </Text>
        <TouchableOpacity 
            style={styles.createButton} 
            onPress={onCreateEvent}
            activeOpacity={0.8}
        >
            <Ionicons name="add" size={18} color="#FFF" style={{ marginRight: 4 }} />
            <Text style={styles.createButtonText}>Create Event</Text>
        </TouchableOpacity>
      </View>


      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.black} />
        </View>
      ) : (
        <FlatList
          data={galleries}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                No galleries or events yet
              </Text>
              <Text style={styles.emptySubtext}>
                Tap "Create Event" above to create your first event in this community.
              </Text>
            </View>
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: COLORS.white 
  },
  
  // Hero Section (Centered)
  hero: { 
    alignItems: 'center', // Centers children horizontally
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  imagePicker: {
    width: 100, // Slightly smaller for a cleaner look
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderText: {
    marginTop: 4,
    color: COLORS.gray,
    fontSize: 10,
    fontWeight: '600',
  },
  heroTitle: { 
    fontSize: 24, 
    fontWeight: '700', 
    color: COLORS.black,
    textAlign: 'center', // Ensures text centers if it wraps
    marginBottom: 4,
  },
  heroMeta: { 
    fontSize: 15,
    color: COLORS.gray,
    textAlign: 'center',
  },
  createButton: {
    backgroundColor: COLORS.black,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 30, // High border radius for pill shape
    marginTop: 8
  },
  createButtonText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
  },

  // Section Header
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1, // Optional: Adds slight separation
    borderBottomColor: COLORS.lightGray, // Optional
  },
  sectionTitle: { 
    fontSize: 18, 
    fontWeight: '600', 
    color: COLORS.black 
  },
  link: { 
    color: COLORS.blue, 
    fontWeight: '600',
    fontSize: 16,
  },

  // List
  listContent: { 
    paddingHorizontal: 16, 
    paddingTop: 16,
    paddingBottom: 40,
    flexGrow: 1,
  },
  emptyContainer: {
    marginTop: 40,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyText: {
    color: COLORS.gray,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    color: COLORS.gray,
    textAlign: 'center',
    fontSize: 14,
    opacity: 0.7,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 40,
  },
  separator: {
    height: 1,
    backgroundColor: '#f1f1f1',
    marginLeft: 72,
  },
});

export default CommunityScreen;