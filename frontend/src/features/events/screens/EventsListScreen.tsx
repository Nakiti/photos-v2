import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, Text, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import EventsListHeader from '../components/EventsListHeader';
import SearchBar from '../../../components/SearchBar';
import EventListItem from '../components/EventListItem';
import { useGalleries } from '../../../hooks/useGalleryData';
import Gallery from '../../../db/models/Gallery';

const EventsListScreen = () => {
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<'ACTIVE' | 'ARCHIVED'>('ACTIVE');

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(handler);
  }, [query]);

  const { galleries, isSyncing } = useGalleries('EVENT', debouncedQuery);

  const prevIsSyncing = useRef(isSyncing);
  useEffect(() => {
    if (refreshing && prevIsSyncing.current && !isSyncing) setRefreshing(false);
    prevIsSyncing.current = isSyncing;
  }, [refreshing, isSyncing]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    queryClient.invalidateQueries({ queryKey: ['galleries'] });
  }, [queryClient]);

  const now = Date.now();
  const displayGalleries = useMemo(() => {
    return galleries.filter((g) => {
      if (tab === 'ACTIVE') return !g.endDate || g.endDate >= now;
      return !!g.endDate && g.endDate < now;
    });
  }, [galleries, tab, now]);

  const renderItem = useCallback(({ item }: { item: Gallery }) => (
    <EventListItem
      id={item.id}
      icon={item.iconUrl || ''}
      title={item.name}
      lastUploadedBy=""
      unseenCount={0}
      lastUpdated={
        item.lastPhotoAt
          ? new Date(item.lastPhotoAt).toISOString()
          : new Date(item.createdAt).toISOString()
      }
      onPress={() =>
        navigation.navigate('Gallery', {
          screen: 'Gallery',
          params: { galleryId: item.id },
        })
      }
    />
  ), [navigation]);

  const keyExtractor = useCallback((item: Gallery) => item.id, []);

  const ListHeaderComponent = useCallback(() => (
    <View>
      <EventsListHeader />
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          onPress={() => setTab('ACTIVE')}
          style={[styles.tabButton, tab === 'ACTIVE' && styles.tabButtonActive]}
          accessibilityRole="button"
          accessibilityLabel="Show active events"
        >
          <Text style={[styles.tabText, tab === 'ACTIVE' && styles.tabTextActive]}>Active</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setTab('ARCHIVED')}
          style={[styles.tabButton, tab === 'ARCHIVED' && styles.tabButtonActive]}
          accessibilityRole="button"
          accessibilityLabel="Show archived events"
        >
          <Text style={[styles.tabText, tab === 'ARCHIVED' && styles.tabTextActive]}>Archived</Text>
        </TouchableOpacity>
      </View>
      <SearchBar value={query} onChangeText={setQuery} placeholder="Search events" />
    </View>
  ), [query, tab]);

  const ListEmptyComponent = useCallback(() => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>
        {tab === 'ACTIVE' ? 'No active events yet' : 'No archived events'}
      </Text>
      {tab === 'ACTIVE' && (
        <Text style={styles.emptySubtext}>
          Join an event with the QR button above or create a new one.
        </Text>
      )}
    </View>
  ), [tab]);

  return (
    <View style={styles.container}>
      <FlatList
        data={displayGalleries}
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
  listContent: {
    backgroundColor: '#fff',
    paddingBottom: 24,
  },
  separator: {
    height: 1,
    backgroundColor: '#f1f1f1',
    marginLeft: 72,
  },
  tabsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    marginBottom: 12,
    gap: 8,
  },
  tabButton: {
    flex: 1,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
  },
  tabButtonActive: {
    backgroundColor: '#111',
  },
  tabText: {
    color: '#333',
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#fff',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 12,
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

export default EventsListScreen;
