import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { View, FlatList, StyleSheet, Text, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useCommunities } from '../../../hooks/useCommunityData';
import CommunityListHeader from '../components/CommunityListHeader';
import { useQueryClient } from '@tanstack/react-query';
import GroupListItem from '../components/CommunityCard';

const CommunitiesListScreen = () => {
  const navigation = useNavigation<any>();
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const queryClient = useQueryClient();
  const { communities, isLoading, isSyncing } = useCommunities(search);

  const filtered = useMemo(() => communities, [communities]);

  const prevIsSyncing = useRef(isSyncing);
  useEffect(() => {
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
    <GroupListItem
      name={item.name}
      description={item.description}
      iconUrl={item.iconUrl}
      membersCount={item.memberCount}
      galleryCount={item.galleryCount}
      onPress={() =>
        navigation.navigate('CommunityFlow', {
          screen: 'Community',
          params: { communityId: item.id },
        })
      }
    />
  );

  return (
    <View style={styles.container}>
      <CommunityListHeader />
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#999"
            colors={['#999']}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              {isLoading ? 'Loading…' : 'No groups yet'}
            </Text>
          </View>
        }
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
    paddingBottom: 32,
  },
  emptyState: {
    paddingTop: 64,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#AAAAAA',
    fontWeight: '400',
  },
});

export default CommunitiesListScreen;