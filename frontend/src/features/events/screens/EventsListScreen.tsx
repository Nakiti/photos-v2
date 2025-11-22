import React, { useCallback, useMemo, useState } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, Text, TouchableOpacity } from 'react-native';
import EventsListHeader from '../components/EventsListHeader';
import SearchBar from '../../../components/SearchBar';
import EventListItem from '../components/EventListItem';


type Event = { id: string; title: string; lastUploadedBy: string; unseenCount: number; lastUpdated: string; icon: string };

const DUMMY_EVENTS: Event[] = [];

const EventsListScreen = () => {
  const [query, setQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<'ACTIVE' | 'ARCHIVED'>('ACTIVE');

  const filteredEvents = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return DUMMY_EVENTS;
    return DUMMY_EVENTS.filter(e =>
      e.title.toLowerCase().includes(q) || e.lastUploadedBy.toLowerCase().includes(q)
    );
  }, [query]);

  const displayEvents = useMemo(() => {
    // Presentational: using same dummy list for both tabs
    return tab === 'ACTIVE' ? filteredEvents : filteredEvents;
  }, [filteredEvents, tab]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  const renderItem = useCallback(({ item }: { item: Event }) => (
    <EventListItem
      id={item.id}
      icon={item.icon}
      title={item.title}
      lastUploadedBy={item.lastUploadedBy}
      unseenCount={item.unseenCount}
      lastUpdated={item.lastUpdated}
      onPress={() => {}}
    />
  ), []);

  const keyExtractor = useCallback((item: Event) => item.id, []);

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
        data={displayEvents}
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
