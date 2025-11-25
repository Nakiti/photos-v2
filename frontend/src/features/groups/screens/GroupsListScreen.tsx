import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, Text } from 'react-native';
import GroupsListHeader from '../components/GroupsListHeader';
import SearchBar from '../../../components/SearchBar';
import GroupListItem from '../components/GroupListItem';
import { useNavigation } from '@react-navigation/native';
import { useGalleries } from '../../../hooks/useGalleryData';
import { useQueryClient } from '@tanstack/react-query';
import { ActivityIndicator } from 'react-native';
import Gallery from '../../../db/models/Gallery';

const GroupsListScreen = () => {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  
  // Debounce the search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300); // 300ms debounce delay

    return () => {
      clearTimeout(handler);
    };
  }, [query]);
  
  const { galleries, isLoading, isSyncing, isError, error } = useGalleries(undefined, debouncedQuery);


  console.log("galleries ", galleries)

  const onRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['galleries'] });
  }, [queryClient]);

  const handleGroupPress = (galleryId: string) => {
    console.log(galleryId);
    (navigation as any).navigate('Gallery', {
      screen: 'Gallery',
      params: { galleryId },
    });
    // navigation.navigate('Camera', { galleryId })
  }

  const renderItem = useCallback(({ item }: { item: Gallery }) => (
    <GroupListItem
      id={item.id}
      title={item.name}
      icon={item.iconUrl || ''}
      communityName={item.communityName}
      lastUploadedBy=""
      unseenCount={0}
      lastUpdated={new Date(item.updatedAt).toISOString()}
      onPress={() => handleGroupPress(item.id)}
    />
  ), []);

  const keyExtractor = useCallback((item: Gallery) => item.id, []);

  const ListHeaderComponent = useCallback(() => (
    <View>
      <GroupsListHeader />
      <SearchBar value={query} onChangeText={setQuery} placeholder="Search groups" />
    </View>
  ), [query]);

  const ListEmptyComponent = useCallback(() => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>No groups yet</Text>
      <Text style={styles.emptySubtext}>
        Tap the + button above to create your first group.
      </Text>
    </View>
  ), []);

  if (isLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.errorText}>Failed to load groups: {error?.message || 'Unknown error'}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={galleries}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={ListHeaderComponent}
        ListEmptyComponent={ListEmptyComponent}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#d32f2f',
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  listContent: {
    backgroundColor: '#fff',
    paddingBottom: 24,
  },
  separator: {
    height: 1,
    backgroundColor: '#f1f1f1',
    marginLeft: 72,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 24,
  },
  emptyText: {
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
  },
});

export default GroupsListScreen;
