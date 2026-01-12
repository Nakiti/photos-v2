import React, { useMemo, useState, useCallback } from "react";
import { 
  View, 
  Text, 
  TextInput, 
  StyleSheet, 
  FlatList, 
  ActivityIndicator, 
  TouchableOpacity, 
  Alert, 
  SafeAreaView, 
  KeyboardAvoidingView, 
  Platform,
  ScrollView
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useRoute, useNavigation } from "@react-navigation/native";

// Hooks
import { useFriendships } from "../../../hooks/useFriendshipData";
import { useInviteMember, useMemberships, useAddCommunityMembersToGallery } from "../../../hooks/useMembershipData";
import { useSearchUsers } from "../../../hooks/useUser";
import { useCommunityMembers } from "../../../hooks/useCommunityMembershipData";

// Components
import AddMemberListItem, { FriendStatus } from "../components/AddMemberListItem";

const AddGroupMembersScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { galleryId, communityId } = route.params as { galleryId: string, communityId?: string };

  const [searchText, setSearchText] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Data
  const { friends, isLoading: isLoadingFriends } = useFriendships();
  const { acceptedMembers, pendingMembers, isLoading: isLoadingMembers } = useMemberships(galleryId);
  const { mutate: inviteMember, isPending: isInviting } = useInviteMember();
  const { users: searchResults, isLoading: isSearching, search } = useSearchUsers({}, false);
  
  // Community members (only when communityId is available)
  const { members: communityMembers, isLoading: isLoadingCommunityMembers } = useCommunityMembers(communityId || null);
  const { mutateAsync: addAllCommunityMembers, isPending: isAddingAllMembers } = useAddCommunityMembersToGallery();

  // Fast Lookups
  const acceptedMemberIds = useMemo(() => new Set(acceptedMembers.map(m => m.user.id)), [acceptedMembers]);
  const pendingMemberIds = useMemo(() => new Set(pendingMembers.map(m => m.user.id)), [pendingMembers]);

  // Community Members List (when communityId is available)
  const communityMembersList = useMemo(() => {
    if (!communityId) return [];
    return communityMembers.map(({ user }) => {
      const userId = user.id;
      let status: FriendStatus = 'can_add';
      
      if (acceptedMemberIds.has(userId)) status = 'member';
      else if (pendingMemberIds.has(userId)) status = 'pending';
      
      return { 
        user: {
          id: user.id,
          name: user.name || user.handle || 'Unknown User',
          handle: user.handle,
          avatarUrl: user.avatarUrl,
        }, 
        status 
      };
    });
  }, [communityMembers, acceptedMemberIds, pendingMemberIds, communityId]);

  // Friends List (not filtered by search)
  const friendsList = useMemo(() => {
    return friends.map(friendship => {
      const friendId = friendship.friendProfile.id;
      let status: FriendStatus = 'can_add';
      
      if (acceptedMemberIds.has(friendId)) status = 'member';
      else if (pendingMemberIds.has(friendId)) status = 'pending';
      
      return { 
        user: {
          id: friendship.friendProfile.id,
          name: friendship.friendProfile.name || friendship.friendProfile.handle || 'Unknown User',
          handle: friendship.friendProfile.handle,
          avatarUrl: friendship.friendProfile.avatarUrl,
        }, 
        status 
      };
    });
  }, [friends, acceptedMemberIds, pendingMemberIds]);

  // Search Results with status
  const searchResultsWithStatus = useMemo(() => {
    return searchResults.map(user => {
      const userId = user.id;
      let status: FriendStatus = 'can_add';
      
      if (acceptedMemberIds.has(userId)) status = 'member';
      else if (pendingMemberIds.has(userId)) status = 'pending';
      
      return { 
        user: {
          id: user.id,
          name: user.name || user.handle || 'Unknown User',
          handle: user.handle,
          avatarUrl: user.avatarUrl,
        }, 
        status 
      };
    });
  }, [searchResults, acceptedMemberIds, pendingMemberIds]);

  // Handlers
  const handleInvite = useCallback((userId: string) => {
    inviteMember({ galleryId, userId }, {
      onError: () => Alert.alert("Error", "Failed to send invite.")
    });
  }, [galleryId, inviteMember]);

  const handleSearch = useCallback(async () => {
    if (!searchText.trim()) {
      setShowSearchResults(false);
      return;
    }
    await search({
      search: searchText.trim(),
      limit: 20,
    });
    setShowSearchResults(true);
  }, [searchText, search]);

  const handleSearchChange = useCallback((text: string) => {
    setSearchText(text);
    if (text.trim().length > 0) {
      // Auto-search as user types (with debounce would be better, but keeping it simple)
      handleSearch();
    } else {
      setShowSearchResults(false);
    }
  }, [handleSearch]);

  const handleContinue = () => {
    navigation.navigate('AddGroupTags', { galleryId, communityId });
  };

  const handleAddAllCommunityMembers = async () => {
    if (!communityId) return;
    try {
      await addAllCommunityMembers({ galleryId, communityId });
      Alert.alert('Success', 'All community members have been added to the gallery.');
    } catch (error) {
      Alert.alert('Error', 'Failed to add all community members.');
    }
  };

  const isLoading = communityId 
    ? isLoadingCommunityMembers || isLoadingMembers
    : isLoadingFriends || isLoadingMembers;

  return (
    <View style={styles.root}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView 
          style={{ flex: 1 }}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
        >
          {communityId ? (
            /* Community Members Mode */
            <View style={styles.communitySection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Community Members</Text>
                <Text style={styles.sectionSubtitle}>
                  {communityMembersList.length} {communityMembersList.length === 1 ? 'member' : 'members'}
                </Text>
              </View>

              {/* Add All Button */}
              <TouchableOpacity
                style={[styles.addAllButton, isAddingAllMembers && styles.addAllButtonDisabled]}
                onPress={handleAddAllCommunityMembers}
                disabled={isAddingAllMembers}
                activeOpacity={0.8}
              >
                {isAddingAllMembers ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <Ionicons name="people" size={18} color="#FFF" />
                    <Text style={styles.addAllButtonText}>Add All Community Members</Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Community Members List */}
              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#000" />
                </View>
              ) : communityMembersList.length > 0 ? (
                communityMembersList.map((item) => (
                  <AddMemberListItem
                    key={item.user.id}
                    user={item.user}
                    status={item.status}
                    onInvite={() => handleInvite(item.user.id)}
                    isInviting={isInviting}
                  />
                ))
              ) : (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No community members</Text>
                  <Text style={styles.emptySubtext}>This community has no members yet.</Text>
                </View>
              )}
            </View>
          ) : (
            /* Search + Friends Mode */
            <>
              {/* Search Section */}
              <View style={styles.searchSection}>
                <View style={styles.searchContainer}>
                  <View style={styles.searchBar}>
                    <Ionicons name="search" size={18} color="#8E8E93" style={styles.searchIcon} />
                    <TextInput
                      style={styles.searchInput}
                      placeholder="Search users by name or handle"
                      placeholderTextColor="#8E8E93"
                      value={searchText}
                      onChangeText={handleSearchChange}
                      onSubmitEditing={handleSearch}
                      returnKeyType="search"
                      autoCorrect={false}
                      autoCapitalize="none"
                    />
                    {searchText.length > 0 && (
                      <TouchableOpacity onPress={() => {
                        setSearchText('');
                        setShowSearchResults(false);
                      }}>
                        <Ionicons name="close-circle" size={18} color="#C7C7CC" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {/* Search Results */}
                {showSearchResults && (
                  <View style={styles.searchResultsContainer}>
                    {isSearching ? (
                      <View style={styles.loadingContainer}>
                        <ActivityIndicator size="small" color="#000" />
                      </View>
                    ) : searchResultsWithStatus.length > 0 ? (
                      searchResultsWithStatus.map((item) => (
                        <AddMemberListItem
                          key={item.user.id}
                          user={item.user}
                          status={item.status}
                          onInvite={() => handleInvite(item.user.id)}
                          isInviting={isInviting}
                        />
                      ))
                    ) : (
                      <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>No users found</Text>
                        <Text style={styles.emptySubtext}>Try a different search term</Text>
                      </View>
                    )}
                  </View>
                )}
              </View>

              {/* Divider */}
              {showSearchResults && friendsList.length > 0 && (
                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>OR</Text>
                  <View style={styles.dividerLine} />
                </View>
              )}

              {/* Friends Section */}
              <View style={styles.friendsSection}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Your Friends</Text>
                  <Text style={styles.sectionSubtitle}>{friendsList.length} {friendsList.length === 1 ? 'friend' : 'friends'}</Text>
                </View>

                {isLoading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color="#000" />
                  </View>
                ) : friendsList.length > 0 ? (
                  friendsList.map((item) => (
                    <AddMemberListItem
                      key={item.user.id}
                      user={item.user}
                      status={item.status}
                      onInvite={() => handleInvite(item.user.id)}
                      isInviting={isInviting}
                    />
                  ))
                ) : (
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>No friends available</Text>
                    <Text style={styles.emptySubtext}>Add friends from your profile to invite them here.</Text>
                  </View>
                )}
              </View>
            </>
          )}
        </ScrollView>

        {/* Footer */}
        <SafeAreaView style={styles.footer}>
          <TouchableOpacity 
            style={styles.continueButton} 
            onPress={handleContinue}
            activeOpacity={0.8}
          >
            <Text style={styles.continueButtonText}>Continue</Text>
            <Ionicons name="arrow-forward" size={18} color="#FFF" />
          </TouchableOpacity>
        </SafeAreaView>

      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollContent: {
    paddingBottom: 20,
  },
  
  // Search Section
  searchSection: {
    backgroundColor: "#FFFFFF",
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F2F2F7",
    borderRadius: 10,
    height: 40,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#000",
    height: '100%',
  },
  searchResultsContainer: {
    backgroundColor: "#FFFFFF",
  },

  // Divider
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E5EA',
  },
  dividerText: {
    paddingHorizontal: 16,
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Community Section
  communitySection: {
    backgroundColor: "#FFFFFF",
  },
  
  // Friends Section
  friendsSection: {
    backgroundColor: "#FFFFFF",
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#8E8E93',
  },
  
  // Add All Button
  addAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  addAllButtonDisabled: {
    backgroundColor: '#8E8E93',
  },
  addAllButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Loading & Empty States
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyContainer: {
    paddingTop: 40,
    paddingBottom: 20,
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 20,
  },

  // Footer
  footer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  continueButton: {
    backgroundColor: '#000000',
    height: 50,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AddGroupMembersScreen;