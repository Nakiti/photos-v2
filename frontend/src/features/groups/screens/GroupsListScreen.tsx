import React, { useCallback, useMemo, useState } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, Text } from 'react-native';
import GroupsListHeader from '../components/GroupsListHeader';
import SearchBar from '../../../components/SearchBar';
import GroupListItem from '../components/GroupListItem';
import { useNavigation } from '@react-navigation/native';
import { useGalleries } from '../../../hooks/useGalleryData';
import { useQueryClient } from '@tanstack/react-query';
import { ActivityIndicator } from 'react-native';

type Group = { id: string; title: string; lastUploadedBy: string; unseenCount: number; lastUpdated: string };

const GroupsListScreen = () => {
  const [query, setQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const { galleries, isLoading, isSyncing, isError, error } = useGalleries('GROUP');
  
  const filteredGroups = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return galleries;
    
    return galleries.filter(g =>
      g.name.toLowerCase().includes(q)
    );
  }, [query, galleries]);

  const onRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['galleries'] });
  }, [queryClient]);

  const handleGroupPress = (galleryId: string) => {
    console.log(galleryId)
    navigation.navigate('Gallery', {
      screen: 'Gallery',
      params: { galleryId },
    })
    // navigation.navigate('Camera', { galleryId })
  }

  const renderItem = useCallback(({ item }: { item: Group }) => (
    <GroupListItem
      id={item.id}
      title={item.name}
      lastUploadedBy={item.lastUploadedBy}
      unseenCount={item.unseenCount}
      onPress={() => handleGroupPress(item.id)}
    />
  ), []);

  const keyExtractor = useCallback((item: Group) => item.id, []);

  const ListHeaderComponent = useCallback(() => (
    <View>
      <GroupsListHeader />
      <SearchBar value={query} onChangeText={setQuery} placeholder="Search groups" />
    </View>
  ), [query]);

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
        <Text style={styles.errorText}>Failed to load groups: {error.message}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredGroups}
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
});

export default GroupsListScreen;
