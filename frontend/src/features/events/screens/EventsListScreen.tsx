import React, { useCallback, useMemo, useState } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import EventsListHeader from '../components/EventsListHeader';
import SearchBar from '../../../components/SearchBar';
import EventListItem from '../components/EventListItem';
import JoinEventButton from '../components/JoinEventButton';
import ArchiveEventButton from '../components/ArchiveEventButton';


type Event = { id: string; title: string; lastUploadedBy: string; unseenCount: number; lastUpdated: string; icon: string };

const DUMMY_EVENTS: Event[] = [
  { id: '1', title: 'Family', lastUploadedBy: 'Alice', unseenCount: 5, lastUpdated: '2025-01-01', icon: 'https://www.shutterstock.com/image-vector/premium-picture-icon-logo-line-260nw-749843887.jpg' },
  { id: '2', title: 'Friends', lastUploadedBy: 'Bob', unseenCount: 0, lastUpdated: '2025-01-01', icon: 'https://www.shutterstock.com/image-vector/premium-picture-icon-logo-line-260nw-749843887.jpg' },
  { id: '3', title: 'Work', lastUploadedBy: 'Clara', unseenCount: 2, lastUpdated: '2025-01-01', icon: 'https://www.shutterstock.com/image-vector/premium-picture-icon-logo-line-260nw-749843887.jpg' },
];

const EventsListScreen = () => {
  const [query, setQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const filteredEvents = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return DUMMY_EVENTS;
    return DUMMY_EVENTS.filter(e =>
      e.title.toLowerCase().includes(q) || e.lastUploadedBy.toLowerCase().includes(q)
    );
  }, [query]);

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
      <View style={styles.actionRow}>
        <JoinEventButton style={styles.actionButtonLeft} />
        <ArchiveEventButton style={styles.actionButtonRight} />
      </View>
      <SearchBar onSearch={setQuery} placeholder="Search events" />
    </View>
  ), [query]);

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredEvents}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={ListHeaderComponent}
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
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  actionButtonLeft: {
    flex: 1,
    marginRight: 8,
  },
  actionButtonRight: {
    flex: 1,
  },
});

export default EventsListScreen;
