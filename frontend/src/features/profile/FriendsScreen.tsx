import React, { useCallback, useState, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, FlatList, RefreshControl, Text } from 'react-native';
import FriendsListItem from './components/FriendsListItem';
import FriendsListHeader from './components/FriendsListHeader';
import SearchBar from '../../components/SearchBar';

type Friend = {
  id: string;
  name: string;
  handle: string;
  avatar: string;
}

const FriendsScreen = () => {
  const [query, setQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const DUMMY_FRIENDS: Friend[] = [
    {
      id: '1',
      name: 'John',
      handle: 'johndoe',
      avatar: 'https://via.placeholder.com/150'
    }
  ]

  const filteredFriends = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return DUMMY_FRIENDS;
    return DUMMY_FRIENDS.filter(e =>
      e.handle.toLowerCase().includes(q)
    );
  }, [query]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

    const ListHeader = useCallback(() => (
        <View>
            <FriendsListHeader />
            <SearchBar onSearch={setQuery} placeholder="Search Friends" />
        </View>
    ), []);

    const ListEmpty = useCallback(() => (
        <Text>No friends found</Text>
    ), []);

    const renderItem = useCallback(({ item }: { item: Friend }) => (
      <FriendsListItem  
        id={item.id}
        name={item.name}
        handle={item.handle}
        avatar={item.avatar}
        handleRemove={() => {}}
        icon="close"
      />
    ), []);

    const keyExtractor = useCallback((item: Friend) => item.id, [])

  return (
    <View style={styles.container}>
            <FlatList
            data={filteredFriends}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            ListHeaderComponent={ListHeader}
            ListEmptyComponent={ListEmpty}
            contentContainerStyle={styles.container}
            keyboardShouldPersistTaps="handled"
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
         />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});

export default FriendsScreen;
