import React, { useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  TextInput,
  FlatList,
  ActivityIndicator,
  Text,
  TouchableOpacity,
  ActionSheetIOS,
  Alert,
  Platform,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useRoute } from '@react-navigation/native';
import { useMemberships, useMyMembership, useDenyOrRemoveMember } from '../../../hooks/useMembershipData';
import { useGallery } from '../../../hooks/useGalleryData';
import { useAuth } from '../../../hooks/useAuth';
import MemberItem from '../components/MemberItem';
import UserInfoCard from '../../../components/UserInfoCard';

type DisplayUser = {
  id: string;
  name: string;
  handle: string;
  avatarUri?: string;
  role: string;
  bio?: string;
  groups?: string[];
};

const GalleryMembersScreen = () => {
  const route = useRoute();
  const { galleryId } = route.params as { galleryId: string };

  const [searchText, setSearchText] = useState('');
  const [selectedMember, setSelectedMember] = useState<DisplayUser | null>(null);

  const { acceptedMembers, isLoading } = useMemberships(galleryId);
  const { data: myMembership } = useMyMembership(galleryId);
  const { gallery } = useGallery(galleryId);
  const { user: currentUser } = useAuth();
  const { mutate: removeMember } = useDenyOrRemoveMember();

  const isAdminOrOwner = useMemo(() => {
    if (!currentUser || !gallery) return false;
    if (gallery.ownerId === currentUser.id) return true;
    return myMembership?.role === 'ADMIN';
  }, [currentUser, gallery, myMembership]);

  const displayMembers = useMemo(() =>
    acceptedMembers.map(m => ({
      id: m.user.id,
      name: m.user.name || m.user.handle || 'Unknown',
      handle: m.user.handle,
      avatarUri: m.user.avatarUrl,
      role: m.membership.role,
      bio: undefined,
      groups: undefined,
    })),
    [acceptedMembers]
  );

  const filteredMembers = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return displayMembers;
    return displayMembers.filter(m =>
      m.name.toLowerCase().includes(q) || m.handle.toLowerCase().includes(q)
    );
  }, [displayMembers, searchText]);

  const handleRightPress = (member: DisplayUser) => {
    const isSelf = member.id === currentUser?.id;
    const isOwner = member.id === gallery?.ownerId;

    // Can't remove yourself (use "Leave gallery") or the owner
    if (isSelf || isOwner) return;

    const memberName = member.name;

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Remove from gallery'],
          destructiveButtonIndex: 1,
          cancelButtonIndex: 0,
          title: memberName,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            removeMember({ galleryId, userId: member.id });
          }
        }
      );
    } else {
      Alert.alert(
        'Remove Member',
        `Remove ${memberName} from this gallery?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: () => removeMember({ galleryId, userId: member.id }),
          },
        ]
      );
    }
  };

  const ListHeader = () => (
    <View style={styles.searchWrap}>
      <View style={styles.searchBar}>
        <Ionicons name="search" size={16} color="#BBBBBB" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search members"
          placeholderTextColor="#CCCCCC"
          value={searchText}
          onChangeText={setSearchText}
          autoCorrect={false}
        />
        {searchText.length > 0 && (
          <TouchableOpacity onPress={() => setSearchText('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={16} color="#CCCCCC" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }}>
        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="small" color="#999" />
          </View>
        ) : (
          <FlatList
            data={filteredMembers}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => {
              const isSelf = item.id === currentUser?.id;
              const isOwner = item.id === gallery?.ownerId;
              const canRemove = isAdminOrOwner && !isSelf && !isOwner;
              return (
                <MemberItem
                  name={item.name}
                  role={item.role}
                  handle={item.handle}
                  avatarUri={item.avatarUri}
                  onPressLeft={() => setSelectedMember(item)}
                  onPressRight={canRemove ? () => handleRightPress(item) : undefined}
                />
              );
            }}
            ListHeaderComponent={ListHeader}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyText}>No members found</Text>
              </View>
            }
          />
        )}

        {selectedMember && (
          <UserInfoCard
            onDismiss={() => setSelectedMember(null)}
            profilePicture={selectedMember.avatarUri}
            name={selectedMember.name}
            handle={selectedMember.handle}
            bio={selectedMember.bio}
            groups={selectedMember.groups}
          />
        )}
      </SafeAreaView>
    </View>
  );
};

export default GalleryMembersScreen;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Search
  searchWrap: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#FAFAFA',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFEFEF',
    borderRadius: 11,
    height: 38,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 14,
    color: '#111111',
    padding: 0,
  },

  // List
  listContent: {
    paddingBottom: 40,
  },

  // Empty
  empty: {
    paddingTop: 60,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#AAAAAA',
    fontWeight: '400',
  },
});
