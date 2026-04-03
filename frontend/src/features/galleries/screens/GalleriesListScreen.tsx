import React, { useCallback, useEffect, useState, useRef } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { useGalleries } from '../../../hooks/useGalleryData';
import Gallery from '../../../db/models/Gallery';
import Ionicons from 'react-native-vector-icons/Ionicons';

import GalleriesHeader from '../components/GalleriesListHeader';
import SearchBar from '../../../components/SearchBar';
import GalleryListItem from '../components/GalleryListItem';

const GalleriesListScreen = () => {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const navigation = useNavigation();
  const queryClient = useQueryClient();

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(handler);
  }, [query]);

  const { galleries, isLoading, isSyncing, isError, error } = useGalleries(undefined, debouncedQuery);

  const prevIsSyncing = useRef(isSyncing);
  useEffect(() => {
    if (refreshing && prevIsSyncing.current && !isSyncing) setRefreshing(false);
    prevIsSyncing.current = isSyncing;
  }, [refreshing, isSyncing]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    queryClient.invalidateQueries({ queryKey: ['galleries'] });
  }, [queryClient]);

  const handleGroupPress = (galleryId: string) => {
    (navigation as any).navigate('Gallery', {
      screen: 'Gallery',
      params: { galleryId },
    });
  };

  const renderItem = useCallback(({ item }: { item: Gallery }) => (
    <GalleryListItem
      id={item.id}
      title={item.name}
      icon={item.iconUrl || ''}
      communityName={item.communityName ?? undefined}
      lastUploadedBy=""
      unseenCount={0}
      lastUpdated={item.lastPhotoAt
        ? new Date(item.lastPhotoAt).toISOString()
        : new Date(item.createdAt).toISOString()}
      photoCount={item.photoCount}
      memberCount={item.memberCount}
      onPress={() => handleGroupPress(item.id)}
    />
  ), []);

  const keyExtractor = useCallback((item: Gallery) => item.id, []);

  const ListEmptyComponent = useCallback(() => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconWrap}>
        <Ionicons name="albums-outline" size={28} color="#CCCCCC" />
      </View>
      <Text style={styles.emptyTitle}>No galleries</Text>
      <Text style={styles.emptySubtext}>
        {query.length > 0
          ? "Try a different search term."
          : "Tap + to create your first gallery."}
      </Text>
    </View>
  ), [query]);

  return (
    <View style={styles.container}>
      <GalleriesHeader />
      <FlatList
        data={galleries}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#999"
            colors={['#999']}
          />
        }
        ListEmptyComponent={ListEmptyComponent}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  listContent: {
    paddingBottom: 40,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 72,
    paddingHorizontal: 40,
  },
  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#F2F2F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111111',
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  emptySubtext: {
    fontSize: 13.5,
    color: '#AAAAAA',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default GalleriesListScreen;