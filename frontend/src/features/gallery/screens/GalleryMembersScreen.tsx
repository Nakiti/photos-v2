import React, { useMemo, useState } from 'react';
import {
   View,
   StyleSheet,
   SafeAreaView,
   TextInput,
   FlatList,
   ActivityIndicator,
   Text,
   TouchableOpacity
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useRoute } from '@react-navigation/native';

// Hooks
import { useMemberships } from '../../../hooks/useMembershipData';

// Components
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

   // Map Data
   const displayMembers = useMemo(() => {
      return acceptedMembers.map(m => ({
         id: m.user.id,
         name: m.user.name || m.user.handle || 'Unknown',
         handle: m.user.handle,
         avatarUri: m.user.avatarUrl,
         role: m.membership.role,
         // Mock data for card example - connect real bio/groups if available in schema
         bio: "No bio available.",
         groups: ["React Native", "Photography"]
      }));
   }, [acceptedMembers]);

   // Filter
   const filteredMembers = useMemo(() => {
      const q = searchText.trim().toLowerCase();
      if (!q) return displayMembers;
      return displayMembers.filter(m =>
         (m.name || '').toLowerCase().includes(q) ||
         (m.handle || '').toLowerCase().includes(q)
      );
   }, [displayMembers, searchText]);

   // Handlers
   const handleMemberPress = (member: DisplayUser) => {
      setSelectedMember(member);
   };

   // Header Component
   const ListHeader = () => (
      <View style={styles.headerContainer}>
         <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color="#8E8E93" style={styles.searchIcon} />
            <TextInput
                style={styles.searchInput}
                placeholder="Search members"
                placeholderTextColor="#8E8E93"
                value={searchText}
                onChangeText={setSearchText}
                autoCorrect={false}
            />
            {searchText.length > 0 && (
                <TouchableOpacity onPress={() => setSearchText('')}>
                    <Ionicons name="close-circle" size={18} color="#C7C7CC" />
                </TouchableOpacity>
            )}
         </View>
      </View>
   );

   return (
      <View style={styles.root}>
         {/* Assuming MembersListHeader is your nav header. If not, swap with DefaultHeader */}
         
         <SafeAreaView style={styles.safeArea}>
            {isLoading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="small" color="#000" />
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
                            onPressLeft={() => handleMemberPress(item)}
                        />
                    )}
                    ListHeaderComponent={ListHeader}
                    contentContainerStyle={styles.listContent}
                    keyboardShouldPersistTaps="handled"
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>No members found.</Text>
                        </View>
                    }
                />
            )}

            {/* Modal Overlay */}
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
      backgroundColor: '#FFFFFF',
   },
   safeArea: {
       flex: 1,
   },
   center: {
       flex: 1, 
       justifyContent: 'center', 
       alignItems: 'center'
   },
   
   // Search Header
   headerContainer: {
       paddingHorizontal: 16,
       paddingVertical: 12,
       backgroundColor: '#FFFFFF',
       borderBottomWidth: 1,
       borderBottomColor: '#F2F2F7',
   },
   searchBar: {
       flexDirection: 'row',
       alignItems: 'center',
       backgroundColor: '#F2F2F7', // System Gray 6
       borderRadius: 10,
       height: 40,
       paddingHorizontal: 12,
   },
   searchIcon: {
       marginRight: 8,
   },
   searchInput: {
       flex: 1,
       height: '100%',
       fontSize: 16,
       color: '#000',
   },

   // List
   listContent: {
       paddingBottom: 40,
   },
   
   // Empty State
   emptyContainer: {
       paddingTop: 60,
       alignItems: 'center',
   },
   emptyText: {
       fontSize: 16,
       color: '#8E8E93',
   },
});