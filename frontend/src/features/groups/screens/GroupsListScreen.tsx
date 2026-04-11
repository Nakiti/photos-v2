import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { View, FlatList, StyleSheet, Text, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useGroups } from '../../../hooks/useGroupData';
import GroupListHeader from '../components/GroupListHeader';
import { useQueryClient } from '@tanstack/react-query';
import GroupCard from '../components/GroupCard';

const GroupsListScreen = () => {
  const navigation = useNavigation<any>();
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const queryClient = useQueryClient();
  const { groups, isLoading, isSyncing } = useGroups(search);

  const filtered = useMemo(() => groups, [groups]);

  const prevIsSyncing = useRef(isSyncing);
  useEffect(() => {
    if (refreshing && prevIsSyncing.current && !isSyncing) {
      setRefreshing(false);
    }
    prevIsSyncing.current = isSyncing;
  }, [refreshing, isSyncing]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    queryClient.invalidateQueries({ queryKey: ['groups'] });
  }, [queryClient]);

  const renderItem = ({ item }: any) => (
    <GroupCard
      name={item.name}
      membersCount={item.memberCount}
      onPress={() =>
        navigation.navigate('GroupFlow', {
          screen: 'Group',
          params: { groupId: item.id },
        })
      }
    />
  );

  return (
    <View style={styles.container}>
      <GroupListHeader />
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

export default GroupsListScreen;
