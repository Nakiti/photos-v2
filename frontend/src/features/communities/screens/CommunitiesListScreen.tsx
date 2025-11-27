// list of communities that the user is in
// similar to groups list screen; presentational only with dummy data
import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { View, FlatList, StyleSheet, TextInput, Text, TouchableOpacity, RefreshControl } from 'react-native';
import CommunityCard from '../components/CommunityCard';
import { useNavigation } from '@react-navigation/native';
import { useCommunities } from '../../../hooks/useCommunityData';
import CommunityListHeader from '../components/CommunityListHeader';
import SearchBar from '../../../components/SearchBar';
import { useQueryClient } from '@tanstack/react-query';

const CommunitiesListScreen = () => {
  const navigation = useNavigation<any>();
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const queryClient = useQueryClient();
  const { communities, isLoading, isSyncing } = useCommunities(search);

  console.log(communities)

  const filtered = useMemo(() => {
    // useCommunities already filters by search; return as-is
    return communities;
  }, [communities]);

  // Track when sync completes after a manual refresh
  const prevIsSyncing = useRef(isSyncing);
  useEffect(() => {
    // When sync completes (transitions from true to false) and we're refreshing
    if (refreshing && prevIsSyncing.current && !isSyncing) {
      setRefreshing(false);
    }
    prevIsSyncing.current = isSyncing;
  }, [refreshing, isSyncing]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    queryClient.invalidateQueries({ queryKey: ['communities'] });
  }, [queryClient]);

  const renderItem = ({ item }: any) => (
    <CommunityCard
      name={(item as any).name}
      description={(item as any).description}
      iconUrl={(item as any).iconUrl}
      onPress={() => navigation.navigate('Community', { communityId: (item as any).id })}
    />
  );

  return (
    <View style={styles.container}>
        <CommunityListHeader />
        <SearchBar value={search} onChangeText={setSearch} placeholder='Search Communities'/>
        <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={renderItem}
            refreshControl={
              <RefreshControl 
                refreshing={refreshing} 
                onRefresh={onRefresh}
                tintColor="#007AFF"
                colors={['#007AFF']}
              />
            }
            ListEmptyComponent={
            <View style={{ padding: 24 }}>
                <Text style={{ color: '#666', textAlign: 'center' }}>
                {isLoading ? 'Loading...' : 'No communities yet'}
                </Text>
            </View>
            }
        />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 6,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f4f4f4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: { color: '#111', fontSize: 20, fontWeight: '700' },
  title: { fontSize: 20, fontWeight: '700', color: '#111' },
  createBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#111',
    borderRadius: 10,
  },
  createText: { color: '#fff', fontWeight: '600' },
  searchWrap: { paddingHorizontal: 16, paddingVertical: 8 },
  search: {
    height: 44,
    borderRadius: 12,
    backgroundColor: '#f4f4f4',
    paddingHorizontal: 12,
    fontSize: 15,
    color: '#111',
  },
  listContent: { padding: 0 },
});

export default CommunitiesListScreen;