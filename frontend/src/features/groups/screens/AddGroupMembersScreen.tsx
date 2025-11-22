import React from "react";
import { View, Text, TextInput, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Alert } from "react-native";
import FriendsListItem from "../../profile/components/FriendsListItem";
import { useFriendships } from "../../../hooks/useFriendshipData";
import { useInviteMember, useMemberships } from "../../../hooks/useMembershipData";
import { useRoute, useNavigation } from "@react-navigation/native";
import { useMemo, useState } from "react";
import Ionicons from "react-native-vector-icons/Ionicons";
import AddMemberListItem from "../components/AddMemberListItem";

export type GroupCandidate = {
  id: string;
  name: string;
  handle?: string;
  avatar?: string; // icon URI
  image?: string;  // profile picture URI
  status?: number;
};

export type AddGroupMembersScreenProps = {
  data: GroupCandidate[];
  loading?: boolean;
  searchText: string;
  onChangeSearchText: (text: string) => void;
  onAddMember?: (id: string, image?: string) => void;
  onSelectItem?: (item: GroupCandidate) => void;
  activeUserContent?: React.ReactNode; // optional overlay/content provided by parent
};

type FriendStatus = 'member' | 'pending' | 'can_add';

const AddGroupMembersScreen = () => {
  const [searchText, setSearchText] = useState('')

  const route = useRoute()
  const navigation = useNavigation()
  const { galleryId } = route.params as { galleryId: string }
  console.log("galleryId", galleryId)

  const { friends, isLoading: isLoadingFriends } = useFriendships();
  const { acceptedMembers, pendingMembers, isLoading: isLoadingMembers } = useMemberships(galleryId);
  const { mutate: inviteMember, isPending: isInviting } = useInviteMember();

  const acceptedMemberIds = useMemo(() => 
    new Set(acceptedMembers.map(m => m.user.id))
  , [acceptedMembers]);
  
  const pendingMemberIds = useMemo(() => 
    new Set(pendingMembers.map(m => m.user.id))
  , [pendingMembers]);

  console.log("galleryId in add", galleryId)
  console.log("friends ", friends)


  const displayList = useMemo(() => {
    return friends
      .filter(friendship => 
        friendship.friendProfile.name?.toLowerCase().includes(searchText.toLowerCase()) ||
        friendship.friendProfile.handle?.toLowerCase().includes(searchText.toLowerCase())
      )
      .map(friendship => {
        const friendId = friendship.friendProfile.id;
        let status: FriendStatus = 'can_add';
        
        if (acceptedMemberIds.has(friendId)) {
          status = 'member';
        } else if (pendingMemberIds.has(friendId)) {
          status = 'pending';
        }
        
        return {
          user: friendship.friendProfile,
          status: status,
        };
      });
  }, [friends, searchText, acceptedMemberIds, pendingMemberIds]);

  // 4. Handle the invite action
  const handleInvite = (userId: string) => {
    inviteMember({ galleryId, userId: userId }, {
      onSuccess: () => {
        // TanStack Query's invalidation will handle the UI update
        console.log(`Invited user ${userId}`);
      },
      onError: (err) => {
        Alert.alert("Error", "Failed to send invite.");
      }
    });
  };

  const renderItemContent = (item: { user: any; status: FriendStatus }) => {
    switch (item.status) {
      case 'member':
        return <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />;
      case 'pending':
        return <Text style={styles.statusText}>Pending</Text>;
      case 'can_add':
        return (
          <TouchableOpacity 
            style={styles.addButton} 
            onPress={() => handleInvite(item.user.id)}
            disabled={isInviting}
          >
            <Ionicons name="add" size={24} color="#007AFF" />
          </TouchableOpacity>
        );
      default:
        return null;
    }
  };

  const renderHeader = () => (
    <TextInput
      style={styles.searchInput}
      placeholder="Type a name"
      placeholderTextColor="#888"
      value={searchText}
      onChangeText={setSearchText}
    />
  );

  const handleContinue = () => {
    (navigation as any).navigate('AddGroupTags', { galleryId });
  };

  return (
    <View style={styles.container}>
      {(isLoadingFriends || isLoadingMembers) ? (
        <ActivityIndicator size="large" style={{ marginTop: 50 }} />
      ) : friends.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No friends available</Text>
          <Text style={styles.emptySubtext}>
            Add some friends first, then you can add members to this group later.
          </Text>
        </View>
      ) : (
        <FlatList
          data={displayList}
          keyExtractor={(item) => item.user.id}
          renderItem={({ item }) => (
            <AddMemberListItem
              user={item.user}
              onInvite={() => handleInvite(item.user.id)}
              isInviting={isInviting}
              status={item.status}
            />
          )}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={styles.listContentContainer}
          keyboardShouldPersistTaps="handled"
        />
        
      )}
      <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
        <Text style={styles.continueButtonText}>Continue</Text>
      </TouchableOpacity>
      
    </View>
  );
};

const COLORS = {
  black: '#000000',
  white: '#FFFFFF',
  lightGray: '#F5F5F5', 
  gray: '#8E8E93',      
  border: '#E0E0E0',    
  darkGray: '#1C1C1E',
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#000",
  },
  skip: {
    fontSize: 16,
    color: "#000",
  },
  searchInput: {
    backgroundColor: "#f0f0f0",
    padding: 12,
    borderRadius: 10,
    color: "#333",
    marginBottom: 12,
  },
  listContentContainer: {
    paddingBottom: 120,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
  statusText: {
    color: COLORS.gray,
    fontSize: 14,
  },
  addButton: {
    padding: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
    backgroundColor: 'transparent',
  },
  tabs: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
    paddingBottom: 10,
    marginBottom: 10,
  },
  tabText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#555",
    marginRight: 20,
  },
  activeTab: {
    color: "#007AFF",
    borderBottomWidth: 2,
    borderBottomColor: "#007AFF",
    paddingBottom: 5,
  },
  continueButton: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 20,
    backgroundColor: '#111',
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AddGroupMembersScreen;