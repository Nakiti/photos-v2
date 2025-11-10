import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import FriendsListItem from './components/FriendsListItem';
import { useFriendships, useRejectFriendRequest, useSendFriendRequest } from '../../hooks/useFriendshipData';
import { useSearchUsers } from '../../hooks/useUser';

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
  const [showSearchResults, setShowSearchResults] = useState(false);

  const { pendingIncoming, pendingOutgoing, isLoading: friendshipsLoading, isError, error } = useFriendships();
  const { mutate: rejectOrCancel } = useRejectFriendRequest();
  const { mutate: sendRequest, isPending: isSendingRequest } = useSendFriendRequest();
  
  // Search users hook (manual trigger)
  const { users: searchResults, isLoading: isSearching, search, pagination } = useSearchUsers({}, false);

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

  // Search handler (triggered by search button or Enter key)
  const handleSearch = useCallback(async () => {
    if (!value.trim()) {
      setShowSearchResults(false);
      return;
    }

    // Perform case-insensitive search (backend handles this)
    await search({ 
      search: value.trim(),
      limit: 20 
    });
    setShowSearchResults(true);
  }, [value, search]);

  const handleSendRequest = useCallback((userId: string) => {
    sendRequest(userId, {
      onSuccess: () => {
        console.log('Friend request sent successfully');
        // Optionally clear search or show a success message
      },
      onError: (error) => {
        console.error('Failed to send friend request:', error);
        // Optionally show an error message
      },
    });
  }, [sendRequest]);

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
          <Ionicons name='search-outline' size={16} color="#999" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchBar}
            placeholder="Search by name or handle"
            placeholderTextColor="gray"
            value={value}
            onChangeText={setValue}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {value.length > 0 && (
            <TouchableOpacity 
              style={styles.clearButton} 
              onPress={() => {
                setValue("");
                setShowSearchResults(false);
              }}
            >
              <Ionicons name='close-circle' size={18} color="#999" />
            </TouchableOpacity>
          )}
          <TouchableOpacity 
            style={styles.searchButton} 
            onPress={handleSearch} 
            disabled={isSearching || !value.trim()}
          >
            {isSearching ? (
              <ActivityIndicator size="small" color="gray" />
            ) : (
              <Ionicons name='arrow-forward' size={16} color={value.trim() ? "#333" : "#ccc"} />
            )}
          </TouchableOpacity>
        </View>

        {/* Search Results */}
        {showSearchResults && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                Search results {pagination ? `(${pagination.total})` : ''}
              </Text>
              <TouchableOpacity onPress={() => setShowSearchResults(false)}>
                <Ionicons name='close-outline' size={20} color="#666" />
              </TouchableOpacity>
            </View>
            {isSearching ? (
              <ActivityIndicator size="large" color="gray" style={{ marginVertical: 10 }} />
            ) : searchResults.length === 0 ? (
              <Text style={styles.emptyRow}>No users found</Text>
            ) : (
              searchResults.map((user) => (
                <FriendsListItem
                  key={user.id}
                  id={user.id}
                  avatar={user.avatarUrl}
                  name={user.name || user.handle}
                  handle={user.handle}
                  icon="add"
                  handleRemove={handleSendRequest}
                />
              ))
            )}
          </View>
        )}

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
  clearButton: {
    padding: 4,
    marginRight: 8,
  },
  searchButton: {
    padding: 4,
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