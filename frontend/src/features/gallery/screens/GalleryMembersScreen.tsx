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
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useRoute } from '@react-navigation/native';
import { useMemberships } from '../../../hooks/useMembershipData';
import MemberItem from '../components/MemberItem';
import UserInfoCard from '../../../components/UserInfoCard';
import MembersListHeader from '../components/MembersListHeader';

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

  const displayMembers = useMemo(() =>
    acceptedMembers.map(m => ({
      id: m.user.id,
      name: m.user.name || m.user.handle || 'Unknown',
      handle: m.user.handle,
      avatarUri: m.user.avatarUrl,
      role: m.membership.role,
      bio: "No bio available.",
      groups: ["React Native", "Photography"],
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
            renderItem={({ item }) => (
              <MemberItem
                name={item.name}
                role={item.role}
                handle={item.handle}
                avatarUri={item.avatarUri}
                onPressLeft={() => setSelectedMember(item)}
              />
            )}
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