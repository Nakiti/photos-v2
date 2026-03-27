import React, { useMemo, useCallback } from 'react';
import {
  View, StyleSheet, Text, FlatList, TouchableOpacity,
  Alert, ActivityIndicator, SafeAreaView, StatusBar, Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { launchImageLibrary, ImagePickerResponse } from 'react-native-image-picker';
import FastImage from 'react-native-fast-image';
import LinearGradient from 'react-native-linear-gradient';

import GroupListItem from '../../groups/components/GroupListItem';
import { useCommunity, useCommunityGalleries, useUpdateCommunityIcon } from '../../../hooks/useCommunityData';
import { useAuth } from '../../../hooks/useAuth';

const CommunityScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { communityId } = (route.params as any) ?? {};

  const { community } = useCommunity(communityId);
  const { galleries, isLoading: isLoadingGalleries } = useCommunityGalleries(communityId);
  const { user } = useAuth();
  const { mutateAsync: updateIcon, isPending: isUpdatingIcon } = useUpdateCommunityIcon(communityId);

  const headerTitle = useMemo(() => community?.name ?? 'Community', [community?.name]);
  const isOwner = community?.ownerId === user?.id;

  const onPickImage = () => {
    if (!isOwner) return;
    launchImageLibrary({ mediaType: 'photo', quality: 0.8 }, async (response: ImagePickerResponse) => {
      if (response.assets?.[0]?.uri) {
        try {
          await updateIcon(response.assets[0].uri);
        } catch {
          Alert.alert('Error', 'Failed to update community icon.');
        }
      }
    });
  };

  const handleGalleryPress = useCallback((galleryId: string) => {
    navigation.navigate('Gallery', { screen: 'Gallery', params: { galleryId } });
  }, [navigation]);

  const onCreateGallery = () => {
    navigation.navigate('GroupFlow', { screen: 'CreateGroupDetails', params: { communityId } });
  };

  const renderHeader = () => (
    <>
      {/* Banner */}
      <TouchableOpacity
        style={styles.banner}
        activeOpacity={isOwner ? 0.85 : 1}
        onPress={isOwner ? onPickImage : undefined}
      >
        {community?.iconUrl ? (
          <FastImage
            source={{ uri: community.iconUrl }}
            style={StyleSheet.absoluteFill}
            resizeMode={FastImage.resizeMode.cover}
          />
        ) : (
          <View style={styles.bannerPlaceholder}>
            <Ionicons name="image-outline" size={36} color="rgba(255,255,255,0.3)" />
            {isOwner && <Text style={styles.bannerPlaceholderText}>Add cover photo</Text>}
          </View>
        )}

        <LinearGradient
          pointerEvents="none"
          colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.18)', 'rgba(0,0,0,0.55)']}
          locations={[0, 0.5, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        {/* Identity */}
        <View style={styles.bannerIdentity}>
          <Text style={styles.bannerTitle} numberOfLines={2}>{headerTitle}</Text>
          <Text style={styles.bannerMeta}>
            {community?.memberCount ?? 0} {community?.memberCount === 1 ? 'member' : 'members'} · {community?.galleryCount ?? 0} galleries
          </Text>
        </View>

        {/* Upload overlay */}
        {isUpdatingIcon && (
          <View style={styles.uploadOverlay}>
            <ActivityIndicator color="#FFF" />
          </View>
        )}

        {/* Floating nav */}
        <SafeAreaView style={styles.floatingNav}>
          <TouchableOpacity
            style={styles.glassBtn}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="chevron-back" size={20} color="#FFF" />
          </TouchableOpacity>

          <View style={styles.floatingNavRight}>
            <TouchableOpacity
              style={styles.glassBtn}
              onPress={() => navigation.navigate('ShareCommunity')}
            >
              <Ionicons name="share-outline" size={18} color="#FFF" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.glassBtn}
              onPress={() => navigation.navigate('CommunityMembers')}
            >
              <Ionicons name="people-outline" size={18} color="#FFF" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.glassBtn}
              onPress={() => navigation.navigate('CommunityFlow', {
                screen: 'CommunitySettings',
                params: { communityId },
              })}
            >
              <Ionicons name="settings-outline" size={18} color="#FFF" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </TouchableOpacity>

      {/* Action bar */}
      <View style={styles.actionBar}>
        <Text style={styles.actionBarTitle}>Galleries</Text>
        <TouchableOpacity style={styles.createBtn} onPress={onCreateGallery} activeOpacity={0.7}>
          <Ionicons name="add" size={15} color="#FFF" style={{ marginRight: 4 }} />
          <Text style={styles.createBtnText}>Create</Text>
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
    <View style={styles.root}>
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
            <View style={styles.empty}>
              <Ionicons name="images-outline" size={36} color="#DDDDDD" />
              <Text style={styles.emptyTitle}>No galleries yet</Text>
              <Text style={styles.emptySub}>Create the first gallery for this community.</Text>
            </View>
          ) : (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color="#999" />
            </View>
          )
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },

  // Banner
  banner: {
    height: 280,
    width: '100%',
    backgroundColor: '#1A1A1A',
    position: 'relative',
    overflow: 'hidden',
  },
  bannerPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  bannerPlaceholderText: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 12,
    fontWeight: '500',
  },
  uploadOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerIdentity: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    gap: 4,
  },
  bannerTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  bannerMeta: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '400',
  },

  // Floating nav
  floatingNav: {
    position: 'absolute',
    top: 0,
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 16 : 0,
  },
  floatingNavRight: {
    flexDirection: 'row',
    gap: 10,
  },
  glassBtn: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.15)',
  },

  // Action bar
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#FAFAFA',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5E5',
  },
  actionBarTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111111',
    letterSpacing: -0.3,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111111',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 9,
  },
  createBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },

  // List
  listContent: {
    paddingBottom: 40,
  },
  loadingWrap: {
    paddingTop: 40,
    alignItems: 'center',
  },
  empty: {
    paddingTop: 60,
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111111',
  },
  emptySub: {
    fontSize: 13,
    color: '#AAAAAA',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default CommunityScreen;