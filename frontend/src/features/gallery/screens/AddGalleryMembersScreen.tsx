import React, { useMemo, useState, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useRoute } from '@react-navigation/native';
import { useMemberships, useAddGalleryMember } from '../../../hooks/useMembershipData';
import { useSearchUsers } from '../../../hooks/useUser';
import AddMemberListItem from '../../galleries/components/AddMemberListItem';

const AddGalleryMembersScreen = () => {
  const route = useRoute();
  const { galleryId } = route.params as { galleryId: string };

  const [value, setValue] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);

  const { acceptedMembers } = useMemberships(galleryId);
  const { mutate: addMember, isPending: isInviting } = useAddGalleryMember();

  // Search users hook (manual trigger)
  const { users: searchResults, isLoading: isSearching, search, pagination } = useSearchUsers({}, false);

  const acceptedMemberIds = useMemo(
    () => new Set(acceptedMembers.map((m) => m.user.id)),
    [acceptedMembers]
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
    (user: any) => {
      const userId = user.id;
      addMember(
        { galleryId, userId },
        {
          onError: () => {
            Alert.alert('Error', 'Failed to add member.');
          },
        }
      );
    },
    [addMember, galleryId]
  );

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
              searchResults.map((user) => {
                const status = acceptedMemberIds.has(user.id) ? 'member' : 'can_add';
                return (
                  <AddMemberListItem
                    key={user.id}
                    user={user as any}
                    status={status}
                    onInvite={() => handleInvite(user)}
                    isInviting={isInviting}
                  />
                );
              })
            )}
          </View>
        )}
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

