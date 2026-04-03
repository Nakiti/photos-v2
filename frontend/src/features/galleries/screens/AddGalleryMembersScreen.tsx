import React, { useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
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

import { useInviteMember, useMemberships, useAddCommunityMembersToGallery } from "../../../hooks/useMembershipData";
import { useSearchUsers } from "../../../hooks/useUser";
import { useGroupMembers } from "../../../hooks/useGroupMembershipData";
import AddMemberListItem, { FriendStatus } from "../components/AddMemberListItem";

const AddGalleryMembersScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { galleryId, groupId } = route.params as { galleryId: string, groupId?: string };

  const [searchText, setSearchText] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);

  const { acceptedMembers, pendingMembers, isLoading: isLoadingMembers } = useMemberships(galleryId);
  const { mutate: inviteMember, isPending: isInviting } = useInviteMember();
  const { users: searchResults, isLoading: isSearching, search } = useSearchUsers({}, false);

  // Group members (only when groupId is available)
  const { members: groupMembers, isLoading: isLoadingGroupMembers } = useGroupMembers(groupId || null);
  const { mutateAsync: addAllGroupMembers, isPending: isAddingAllMembers } = useAddCommunityMembersToGallery();

  const acceptedMemberIds = useMemo(() => new Set(acceptedMembers.map(m => m.user.id)), [acceptedMembers]);
  const pendingMemberIds = useMemo(() => new Set(pendingMembers.map(m => m.user.id)), [pendingMembers]);

  const groupMembersList = useMemo(() => {
    if (!groupId) return [];
    return groupMembers.map(({ user }) => {
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
        status,
      };
    });
  }, [groupMembers, acceptedMemberIds, pendingMemberIds, groupId]);

  const searchResultsWithStatus = useMemo(() => {
    return searchResults.map(user => {
      let status: FriendStatus = 'can_add';
      if (acceptedMemberIds.has(user.id)) status = 'member';
      else if (pendingMemberIds.has(user.id)) status = 'pending';
      return {
        user: {
          id: user.id,
          name: user.name || user.handle || 'Unknown User',
          handle: user.handle,
          avatarUrl: user.avatarUrl,
        },
        status,
      };
    });
  }, [searchResults, acceptedMemberIds, pendingMemberIds]);

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
    await search({ search: searchText.trim(), limit: 20 });
    setShowSearchResults(true);
  }, [searchText, search]);

  const handleSearchChange = useCallback((text: string) => {
    setSearchText(text);
    if (text.trim().length > 0) {
      handleSearch();
    } else {
      setShowSearchResults(false);
    }
  }, [handleSearch]);

  const handleContinue = () => {
    navigation.navigate('AddGalleryTags', { galleryId, groupId });
  };

  const handleAddAllGroupMembers = async () => {
    if (!groupId) return;
    try {
      await addAllGroupMembers({ galleryId, groupId });
      Alert.alert('Success', 'All group members have been added to the gallery.');
    } catch {
      Alert.alert('Error', 'Failed to add all group members.');
    }
  };

  const isLoading = groupId
    ? isLoadingGroupMembers || isLoadingMembers
    : isLoadingMembers;

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
          {groupId ? (
            /* Group Members Mode */
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Group Members</Text>
                <Text style={styles.sectionSubtitle}>
                  {groupMembersList.length} {groupMembersList.length === 1 ? 'member' : 'members'}
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.addAllButton, isAddingAllMembers && styles.addAllButtonDisabled]}
                onPress={handleAddAllGroupMembers}
                disabled={isAddingAllMembers}
                activeOpacity={0.8}
              >
                {isAddingAllMembers ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <Ionicons name="people" size={18} color="#FFF" />
                    <Text style={styles.addAllButtonText}>Add All Group Members</Text>
                  </>
                )}
              </TouchableOpacity>

              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#000" />
                </View>
              ) : groupMembersList.length > 0 ? (
                groupMembersList.map((item) => (
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
                  <Text style={styles.emptyText}>No group members</Text>
                  <Text style={styles.emptySubtext}>This group has no members yet.</Text>
                </View>
              )}
            </View>
          ) : (
            /* Search Mode */
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
                    <TouchableOpacity onPress={() => { setSearchText(''); setShowSearchResults(false); }}>
                      <Ionicons name="close-circle" size={18} color="#C7C7CC" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

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
          )}
        </ScrollView>

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
  root: { flex: 1, backgroundColor: "#FFFFFF" },
  scrollContent: { paddingBottom: 20 },
  searchSection: { backgroundColor: "#FFFFFF" },
  section: { backgroundColor: "#FFFFFF" },
  searchContainer: {
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1, borderBottomColor: '#F2F2F7',
  },
  searchBar: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#F2F2F7", borderRadius: 10, height: 40, paddingHorizontal: 12,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 16, color: "#000", height: '100%' },
  searchResultsContainer: { backgroundColor: "#FFFFFF" },
  sectionHeader: {
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#F2F2F7',
  },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: '#000', marginBottom: 2 },
  sectionSubtitle: { fontSize: 13, color: '#8E8E93' },
  addAllButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#000000', marginHorizontal: 16, marginVertical: 12,
    paddingVertical: 14, borderRadius: 12, gap: 8,
  },
  addAllButtonDisabled: { backgroundColor: '#8E8E93' },
  addAllButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  loadingContainer: { paddingVertical: 40, alignItems: 'center' },
  emptyContainer: { paddingTop: 40, paddingBottom: 20, alignItems: 'center', paddingHorizontal: 32 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#000', marginBottom: 8 },
  emptySubtext: { fontSize: 14, color: '#8E8E93', textAlign: 'center', lineHeight: 20 },
  footer: {
    backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#F2F2F7',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  continueButton: {
    backgroundColor: '#000000', height: 50, borderRadius: 25,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  continueButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});

export default AddGalleryMembersScreen;
