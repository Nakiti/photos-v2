import React, { useMemo, useState, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import FriendsListItem from './components/FriendsListItem';
import { useFriendships, useRejectFriendRequest } from '../../hooks/useFriendshipData';

type Friend = {
  id: string;
  name: string;
  handle: string;
  avatar?: string;
};

const AddFriendsScreen = () => {
  const [value, setValue] = useState("");
  const [showOutgoing, setShowOutgoing] = useState(true);
  const [showIncoming, setShowIncoming] = useState(true);
  const [searchResult, setSearchResult] = useState<Friend | null>(null);

  const { pendingIncoming, pendingOutgoing, isLoading, isError, error } = useFriendships();
  const { mutate: rejectOrCancel } = useRejectFriendRequest();

  // Map hook data to presentational shape
  const outgoingRequests: Friend[] = useMemo(() => (
    pendingOutgoing.map(({ friendProfile }) => ({
      id: friendProfile.id,
      name: friendProfile.name || friendProfile.handle,
      handle: friendProfile.handle,
      avatar: friendProfile.avatarUrl || undefined,
    }))
  ), [pendingOutgoing]);

  const incomingRequests: Friend[] = useMemo(() => (
    pendingIncoming.map(({ friendProfile }) => ({
      id: friendProfile.id,
      name: friendProfile.name || friendProfile.handle,
      handle: friendProfile.handle,
      avatar: friendProfile.avatarUrl || undefined,
    }))
  ), [pendingIncoming]);

  const handleSearch = () => {
    if (!value.trim()) return;

  };

  const handleCancelOutgoing = useCallback((otherUserId: string) => {
    rejectOrCancel(otherUserId);
  }, [rejectOrCancel]);

  const handleRejectIncoming = useCallback((otherUserId: string) => {
    rejectOrCancel(otherUserId);
  }, [rejectOrCancel]);

  const toggleOutgoing = useCallback(() => setShowOutgoing((s) => !s), []);
  const toggleIncoming = useCallback(() => setShowIncoming((s) => !s), []);

  return (
    <View style={styles.container}>
      <ScrollView>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchBar}
            placeholder="Enter a handle"
            placeholderTextColor="gray"
            value={value}
            onChangeText={setValue}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            editable={!isLoading}
          />
          <TouchableOpacity style={styles.searchButton} onPress={handleSearch} disabled={isLoading}>
            {isLoading ? (
              <ActivityIndicator size="small" color="gray" />
            ) : (
              <Ionicons name='search-outline' size={16} />
            )}
          </TouchableOpacity>
        </View>

        {/* Loading indicator beneath search bar */}
        {isLoading ? <ActivityIndicator size="large" color="gray" style={{ marginTop: 10 }} /> : null}

        {/* Optional search result (presentational) */}
        {searchResult ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Search result</Text>
            <FriendsListItem
              id={searchResult.id}
              avatar={searchResult.avatar}
              name={searchResult.name}
              handle={searchResult.handle}
              icon="add"
              handleRemove={() => { /* presentational no-op */ }}
            />
          </View>
        ) : null}

        {/* Outgoing Friend Requests */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.sectionHeader} onPress={toggleOutgoing}>
            <Text style={styles.sectionTitle}>Outgoing requests</Text>
            <Ionicons name={showOutgoing ? 'chevron-down-outline' : 'chevron-forward-outline'} size={16} />
          </TouchableOpacity>
          {showOutgoing && (
            outgoingRequests.length === 0 ? (
              <Text style={styles.emptyRow}>No outgoing requests</Text>
            ) : (
              outgoingRequests.map((req) => (
                <FriendsListItem
                  key={req.id}
                  id={req.id}
                  avatar={req.avatar}
                  name={req.name}
                  handle={req.handle}
                  icon="close"
                  handleRemove={handleCancelOutgoing}
                />
              ))
            )
          )}
        </View>

        {/* Incoming Friend Requests */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.sectionHeader} onPress={toggleIncoming}>
            <Text style={styles.sectionTitle}>Incoming requests</Text>
            <Ionicons name={showIncoming ? 'chevron-down-outline' : 'chevron-forward-outline'} size={16} />
          </TouchableOpacity>
          {showIncoming && (
            incomingRequests.length === 0 ? (
              <Text style={styles.emptyRow}>No incoming requests</Text>
            ) : (
              incomingRequests.map((req) => (
                <FriendsListItem
                  key={req.id}
                  id={req.id}
                  avatar={req.avatar}
                  name={req.name}
                  handle={req.handle}
                  icon="remove"
                  handleRemove={handleRejectIncoming}
                />
              ))
            )
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
    paddingHorizontal: 16,
    // paddingTop: 16,
  },
  shareOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: "#f0f0f0",
    padding: 12,
    borderRadius: 8
  },
  shareButton: {
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
    borderRadius: 10,
    paddingHorizontal: 10,
    marginTop: 12
  },
  searchBar: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: "#333",
  },
  searchButton: {
    marginLeft: 10,
  },
  section: {
    marginTop: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  emptyRow: {
    fontSize: 13,
    color: '#999',
    paddingHorizontal: 2,
    marginBottom: 8,
  },
});

export default AddFriendsScreen;