import React, { useMemo, useCallback } from 'react';
import { View, StyleSheet, Text, FlatList, TouchableOpacity, Image, Alert, ActivityIndicator, SafeAreaView, StatusBar, Platform } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { launchImageLibrary, ImagePickerResponse } from 'react-native-image-picker';
import FastImage from 'react-native-fast-image';

// Components
import GroupListItem from '../../groups/components/GroupListItem';

// Hooks
import { useCommunity, useCommunityGalleries, useUpdateCommunityIcon } from '../../../hooks/useCommunityData';
import { useCommunityMembers } from '../../../hooks/useCommunityMembershipData';
import { useAuth } from '../../../hooks/useAuth';

const CommunityScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { communityId } = (route.params as any) ?? { communityId: undefined };
  
  // Data Hooks
  const { community } = useCommunity(communityId);
  const { galleries, isLoading: isLoadingGalleries } = useCommunityGalleries(communityId);
  const { user } = useAuth();
  const { mutateAsync: updateIcon, isPending: isUpdatingIcon } = useUpdateCommunityIcon(communityId);

  // Derived State
  const headerTitle = useMemo(() => community?.name ?? 'Community', [community?.name]);
  const isOwner = community?.ownerId === user?.id;
  
  // --- Handlers ---
  const onPickImage = () => {
    if (!isOwner) {
      Alert.alert('Permission Denied', 'Only the community owner can change the cover image.');
      return;
    }
    
    launchImageLibrary({ mediaType: 'photo', quality: 0.8 }, async (response: ImagePickerResponse) => {
      if (response.assets && response.assets[0]?.uri) {
        try {
          await updateIcon(response.assets[0].uri);
        } catch (error) {
          Alert.alert('Error', 'Failed to update community icon.');
        }
      }
    });
  };

  const handleGalleryPress = useCallback((galleryId: string) => {
    navigation.navigate('Gallery', { screen: 'Gallery', params: { galleryId } });
  }, [navigation]);

  const onCreateEvent = () => {
    navigation.navigate("GroupFlow", {screen: "CreateGalleryChoice", params: {communityId}})
  }

  // --- Render Items ---
  const renderHeader = () => (
    <>
      {/* 1. Banner Image Section */}
      <View style={styles.bannerContainer}>
        <TouchableOpacity 
            activeOpacity={isOwner ? 0.8 : 1} 
            onPress={isOwner ? onPickImage : undefined}
            style={styles.bannerTouchable}
        >
            {community?.iconUrl ? (
                <FastImage 
                    source={{ uri: community.iconUrl }} 
                    style={styles.bannerImage} 
                    resizeMode={FastImage.resizeMode.cover}
                />
            ) : (
                <View style={styles.bannerPlaceholder}>
                    <Ionicons name="image-outline" size={48} color="rgba(255,255,255,0.5)" />
                    {isOwner && <Text style={styles.bannerPlaceholderText}>Add Cover Photo</Text>}
                </View>
            )}
            
            {/* Gradient Overlay for Text Readability */}
            <View style={styles.bannerOverlay}>
                <View style={styles.titleWrapper}>
                    <View style={styles.badgeContainer}>
                        <Text style={styles.badgeText}>COMMUNITY</Text>
                    </View>
                    <Text style={styles.heroTitle} numberOfLines={2}>{headerTitle}</Text>
                    <Text style={styles.heroMeta}>
                        {community?.memberCount} {community?.memberCount === 1 ? 'member' : 'members'} • {community?.galleryCount || 0} Events
                    </Text>
                </View>
            </View>

            {/* Loading Indicator for Image Upload */}
            {isUpdatingIcon && (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator color="#FFF" />
                </View>
            )}
        </TouchableOpacity>

        {/* Floating Navigation Header (Back/Settings) */}
        <SafeAreaView style={styles.floatingHeader}>
            <TouchableOpacity 
                style={styles.glassButton} 
                onPress={() => navigation.goBack()}
            >
                <Ionicons name="arrow-back" size={20} color="#FFF" />
            </TouchableOpacity>
            
            <View style={styles.headerActions}>
                <TouchableOpacity style={styles.glassButton} onPress={() => navigation.navigate("ShareCommunity")}>
                    <Ionicons name="share-outline" size={20} color="#FFF" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.glassButton} onPress={() => navigation.navigate("CommunityMembers")}>
                    <Ionicons name="people-outline" size={20} color="#FFF" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.glassButton} onPress={() => navigation.navigate("CommunityFlow", {
                    screen: "CommunitySettings",
                    params: {communityId}
                    }
                  )}>
                    <Ionicons name="settings-outline" size={20} color="#FFF" />
                </TouchableOpacity>
            </View>
        </SafeAreaView>
      </View>

      {/* 2. Action Bar (Sticky-ish look) */}
      <View style={styles.actionBar}>
          <Text style={styles.sectionTitle}>Galleries</Text>
          <TouchableOpacity style={styles.createButton} onPress={onCreateEvent}>
             <Ionicons name="add" size={16} color="#FFF" style={{marginRight: 4}}/>
             <Text style={styles.createButtonText}>Create</Text>
          </TouchableOpacity>
      </View>
    </>
  );

  const renderItem = useCallback(({ item }: { item: any }) => (
    <GroupListItem
      id={item.id}
      title={item.name}
      icon={item.iconUrl || ''}
      communityName={undefined} 
      lastUploadedBy=""
      unseenCount={0}
      lastUpdated={item.lastPhotoAt ? new Date(item.lastPhotoAt).toISOString() : new Date().toISOString()}
      onPress={() => handleGalleryPress(item.id)}
    />
  ), [handleGalleryPress]);


  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <FlatList
        data={galleries}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
            !isLoadingGalleries ? (
                <View style={styles.emptyContainer}>
                    <Ionicons name="calendar-outline" size={48} color="#E5E5EA" />
                    <Text style={styles.emptyText}>No Galleries yet</Text>
                    <Text style={styles.emptySubtext}>Start by creating a gallery for this community.</Text>
                </View>
            ) : (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator color="#000" />
                </View>
            )
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#FFFFFF' 
  },
  
  // --- Banner ---
  bannerContainer: {
    height: 300, // Tall Banner
    width: '100%',
    position: 'relative',
    backgroundColor: '#1C1C1E',
  },
  bannerTouchable: {
      flex: 1,
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  bannerPlaceholder: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#2C2C2E',
  },
  bannerPlaceholderText: {
      color: 'rgba(255,255,255,0.5)',
      marginTop: 8,
      fontSize: 12,
      fontWeight: '600',
  },
  bannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)', // Overall dim
    justifyContent: 'flex-end', // Text at bottom
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  loadingOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.5)',
      alignItems: 'center',
      justifyContent: 'center',
  },

  // --- Floating Header (Back Button) ---
  floatingHeader: {
      position: 'absolute',
      top: 0,
      left: 10,
      right: 10,
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingTop: Platform.OS === 'android' ? 16 : 0, // Extra padding for Android status bar
  },
  headerActions: {
      flexDirection: 'row',
      gap: 12,
  },
  glassButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: 'rgba(0,0,0,0.3)', // Glassy
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.1)',
  },

  // --- Typography ---
  titleWrapper: {
      gap: 6,
  },
  badgeContainer: {
      backgroundColor: 'rgba(255,255,255,0.2)',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
      alignSelf: 'flex-start',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.3)',
  },
  badgeText: {
      color: '#FFF',
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 0.8,
  },
  heroTitle: { 
    fontSize: 32, 
    fontWeight: '700', 
    color: '#FFFFFF',
    letterSpacing: -0.5,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: {width: 0, height: 2},
    textShadowRadius: 4,
  },
  heroMeta: { 
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
  },

  // --- Action Bar ---
  actionBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 16,
      backgroundColor: '#FFFFFF',
      borderBottomWidth: 1,
      borderBottomColor: '#F2F2F7',
  },
  sectionTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: '#000',
      letterSpacing: -0.4,
  },
  createButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#000',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
  },
  createButtonText: {
      color: '#FFF',
      fontSize: 13,
      fontWeight: '600',
  },

  // --- List & Empty State ---
  listContent: {
      paddingBottom: 40,
  },
  loadingContainer: {
      paddingTop: 40,
  },
  emptyContainer: {
    paddingTop: 60,
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    marginTop: 16,
    color: '#000',
    fontSize: 18,
    fontWeight: '600',
  },
  emptySubtext: {
    marginTop: 8,
    color: '#8E8E93',
    textAlign: 'center',
    fontSize: 15,
  },
});

export default CommunityScreen;