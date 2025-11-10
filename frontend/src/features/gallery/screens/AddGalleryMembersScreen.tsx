import React, { useMemo, useState, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useRoute } from '@react-navigation/native';
import FriendsListItem from '../../profile/components/FriendsListItem';
import { useMemberships, useInviteMember, useDenyOrRemoveMember } from '../../../hooks/useMembershipData';
import { useSearchUsers } from '../../../hooks/useUser';

type DisplayUser = {
  id: string;
  name: string;
  handle: string;
  avatar?: string;
};

const AddGalleryMembersScreen = () => {
  const route = useRoute();
  const { galleryId } = route.params as { galleryId: string };

  const [value, setValue] = useState('');
  const [showMembers, setShowMembers] = useState(true);
  const [showPending, setShowPending] = useState(true);
  const [showSearchResults, setShowSearchResults] = useState(false);

  const { acceptedMembers, pendingMembers } = useMemberships(galleryId);
  const { mutate: inviteMember, isPending: isInviting } = useInviteMember();
  const { mutate: denyOrRemove, isPending: isRemoving } = useDenyOrRemoveMember();

  // Search users hook (manual trigger)
  const { users: searchResults, isLoading: isSearching, search, pagination } = useSearchUsers({}, false);

  const members: DisplayUser[] = useMemo(
    () =>
      acceptedMembers.map(({ user }) => ({
        id: user.id,
        name: user.name || user.handle,
        handle: user.handle,
        avatar: user.avatarUrl || undefined,
      })),
    [acceptedMembers]
  );

  const pending: DisplayUser[] = useMemo(
    () =>
      pendingMembers.map(({ user }) => ({
        id: user.id,
        name: user.name || user.handle,
        handle: user.handle,
        avatar: user.avatarUrl || undefined,
      })),
    [pendingMembers]
  );

  const handleSearch = useCallback(async () => {
    if (!value.trim()) {
      setShowSearchResults(false);
      return;
    }
    await search({
      search: value.trim(),
      limit: 20,
    });
    setShowSearchResults(true);
  }, [value, search]);

  const handleInvite = useCallback(
    (userId: string) => {
      inviteMember(
        { galleryId, userId },
        {
          onSuccess: () => {
            // No-op; queries invalidate in hook
          },
          onError: () => {
            Alert.alert('Error', 'Failed to send invite.');
          },
        }
      );
    },
    [inviteMember, galleryId]
  );

  const handleRemove = useCallback(
    (userId: string) => {
      denyOrRemove(
        { galleryId, userId },
        {
          onError: () => {
            Alert.alert('Error', 'Failed to remove member.');
          },
        }
      );
    },
    [denyOrRemove, galleryId]
  );

  const toggleMembers = useCallback(() => setShowMembers((s) => !s), []);
  const togglePending = useCallback(() => setShowPending((s) => !s), []);

  return (
    <View style={styles.container}>
      <ScrollView>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={16} color="#999" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchBar}
            placeholder="Search users by name or handle"
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
                setValue('');
                setShowSearchResults(false);
              }}
            >
              <Ionicons name="close-circle" size={18} color="#999" />
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
              <Ionicons name="arrow-forward" size={16} color={value.trim() ? '#333' : '#ccc'} />
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
                <Ionicons name="close-outline" size={20} color="#666" />
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
                  handleRemove={handleInvite}
                />
              ))
            )}
          </View>
        )}

        {/* Pending */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.sectionHeader} onPress={togglePending}>
            <Text style={styles.sectionTitle}>Pending</Text>
            <Ionicons
              name={showPending ? 'chevron-down-outline' : 'chevron-forward-outline'}
              size={16}
            />
          </TouchableOpacity>
          {showPending &&
            (pending.length === 0 ? (
              <Text style={styles.emptyRow}>No pending requests</Text>
            ) : (
              pending.map((p) => (
                <FriendsListItem
                  key={p.id}
                  id={p.id}
                  avatar={p.avatar}
                  name={p.name}
                  handle={p.handle}
                  icon="remove"
                  handleRemove={handleRemove}
                />
              ))
            ))}
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
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    paddingHorizontal: 10,
    marginTop: 12,
  },
  searchBar: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: '#333',
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

export default AddGalleryMembersScreen;

