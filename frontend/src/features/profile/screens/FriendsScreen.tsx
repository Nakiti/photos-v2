import React, { useCallback, useState, useMemo, useEffect, useRef } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, Text, ActivityIndicator } from 'react-native';
import FriendsListItem from './../components/FriendsListItem';
import FriendsListHeader from '../components/FriendsListHeader';
import SearchBar from '../../../components/SearchBar';
import { useFriendships, useRemoveFriend } from '../../../hooks/useFriendshipData';
import { useQueryClient } from '@tanstack/react-query';

type Friend = {
  id: string;
  name: string;
  handle: string;
  avatar: string;
}

const FriendsScreen = () => {
  const [query, setQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const queryClient = useQueryClient();
  const { friends, isError, isLoading, error, isSyncing } = useFriendships();
  const { mutate: removeFriendMutate } = useRemoveFriend();

  // Track when sync completes after a manual refresh
  const prevIsSyncing = useRef(isSyncing);
  useEffect(() => {
    // When sync completes (transitions from true to false) and we're refreshing
    if (refreshing && prevIsSyncing.current && !isSyncing) {
      setRefreshing(false);
    }
    prevIsSyncing.current = isSyncing;
  }, [refreshing, isSyncing]);

  const displayFriends: Friend[] = useMemo(() => {
    return friends.map(({ friendProfile }) => ({
      id: friendProfile.id,
      name: friendProfile.name || friendProfile.handle,
      handle: friendProfile.handle,
      avatar: friendProfile.avatarUrl || 'https://upload.wikimedia.org/wikipedia/commons/a/ac/Default_pfp.jpg',
    }));
  }, [friends]);

  const filteredFriends = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return displayFriends;
    return displayFriends.filter(e =>
      (e.name?.toLowerCase().includes(q)) || e.handle.toLowerCase().includes(q)
    );
  }, [query, displayFriends]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    queryClient.invalidateQueries({ queryKey: ['friendships'] });
  }, [queryClient]);

  const ListEmpty = useCallback(() => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>No friends found</Text>
      <Text style={styles.emptySubtext}>Try adjusting your search or add some friends!</Text>
    </View>
  ), []);

  const handleRemove = useCallback((friendId: string) => {
    removeFriendMutate(friendId);
  }, [removeFriendMutate]);

  const renderItem = useCallback(({ item }: { item: Friend }) => (
    <FriendsListItem  
      id={item.id}
      name={item.name}
      handle={item.handle}
      avatar={item.avatar}
      handleRemove={handleRemove}
      icon="close"
    />
  ), [handleRemove]);

  const keyExtractor = useCallback((item: Friend) => item.id, [])

  // if (isLoading) {
  //   return (
  //     <View style={[styles.container, styles.center]}>
  //       <ActivityIndicator size="large" color="#0000ff" />
  //     </View>
  //   );
  //  }
  
  // if (isError) {
  //   return (
  //     <View style={[styles.container, styles.center]}>
  //       <Text style={styles.errorText}>Failed to load friends: {error?.message}</Text>
  //     </View>
  //   );
  //  }

  return (
    <View style={styles.container}>
      <FriendsListHeader />
      <SearchBar value={query} onChangeText={setQuery} placeholder="Search Friends" />
      <FlatList
        data={filteredFriends}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListEmptyComponent={ListEmpty}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor="#007AFF"
            colors={['#007AFF']}
          />
        }
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
    color: '#d00',
  },
  listContent: {
    paddingBottom: 24,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
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

export default FriendsScreen;
