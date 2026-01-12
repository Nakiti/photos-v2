import React, { useCallback, useEffect, useState, useRef } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, Text, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { useGalleries } from '../../../hooks/useGalleryData';
import Gallery from '../../../db/models/Gallery';
import Ionicons from 'react-native-vector-icons/Ionicons';

// Components
import GroupsHeader from '../components/GroupsListHeader';
import SearchBar from '../../../components/SearchBar';
import GroupListItem from '../components/GroupListItem';

const GroupsListScreen = () => {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  
  // Debounce
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(handler);
  }, [query]);
  
  const { galleries, isLoading, isSyncing, isError, error } = useGalleries(undefined, debouncedQuery);

  // Sync Logic
  const prevIsSyncing = useRef(isSyncing);
  useEffect(() => {
    if (refreshing && prevIsSyncing.current && !isSyncing) {
      setRefreshing(false);
    }
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
  }

  const renderItem = useCallback(({ item }: { item: Gallery }) => (
    <GroupListItem
      id={item.id}
      title={item.name}
      icon={item.iconUrl || ''}
      communityName={item.communityName ?? undefined} // Pass community context
      lastUploadedBy="" // Will trigger fallback in component
      unseenCount={0} // Logic to be connected later
      lastUpdated={item.lastPhotoAt ? new Date(item.lastPhotoAt).toISOString() : new Date(item.createdAt).toISOString()}
      photoCount={item.photoCount}
      memberCount={item.memberCount}
      onPress={() => handleGroupPress(item.id)}
    />
  ), []);

  const keyExtractor = useCallback((item: Gallery) => item.id, []);

  // Minimalist Empty State
  const ListEmptyComponent = useCallback(() => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconCircle}>
        <Ionicons name="albums-outline" size={48} color="#C7C7CC" />
      </View>
      <Text style={styles.emptyTitle}>No galleries found</Text>
      <Text style={styles.emptySubtext}>
        {query.length > 0 
          ? "Try adjusting your search terms." 
          : "Tap the + button to create a new gallery."}
      </Text>
    </View>
  ), [query]);

  // Loading State
  // if (isLoading && galleries.length === 0) {
  //   return (
  //     <View style={styles.centerContainer}>
  //       <ActivityIndicator size="small" color="#000" />
  //     </View>
  //   );
  // }

  // Error State
  // if (isError && galleries.length === 0) {
  //   return (
  //     <View style={styles.centerContainer}>
  //       <Ionicons name="alert-circle-outline" size={48} color="#FF3B30" />
  //       <Text style={styles.errorText}>
  //           {error?.message || 'Unable to load galleries'}
  //       </Text>
  //     </View>
  //   );
  // }

  return (
    <View style={styles.container}>
      {/* 1. Header (Fixed at top) */}
      <GroupsHeader />
      
      {/* 2. Search (Fixed below header) */}
      <SearchBar 
        value={query} 
        onChangeText={setQuery} 
        placeholder="Search galleries" 
      />
      
      {/* 3. List */}
      <FlatList
        data={galleries}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor="#000000" // Black spinner
          />
        }
        ListEmptyComponent={ListEmptyComponent}
        // Removed ItemSeparatorComponent because GroupListItem now has its own bottom border
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 40,
  },
  listContent: {
    paddingBottom: 40,
  },
  
  // Empty State Styles
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 80, // Push down nicely
    paddingHorizontal: 40,
  },
  emptyIconCircle: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: '#F9F9F9',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 15,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
  },

  // Error Styles
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
  },
});

export default GroupsListScreen;