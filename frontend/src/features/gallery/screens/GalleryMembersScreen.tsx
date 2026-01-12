import React, { useMemo, useState } from 'react';
import {
   View,
   StyleSheet,
   SafeAreaView,
   TextInput,
   useWindowDimensions,
   FlatList,
   ActivityIndicator,
   Text
} from 'react-native';
import MemberItem from '../components/MemberItem';
import { useMemberships } from '../../../hooks/useMembershipData';
import { useRoute } from '@react-navigation/native';
import UserInfoCard from '../../../components/UserInfoCard';
import MembersListHeader from '../components/MembersListHeader';
import { useGallery } from '../../../hooks/useGalleryData';

type DisplayUser = {
   id: string;
   name: string;
   handle: string;
   avatarUri?: string;
   bio?: string; // <-- Add fields the card needs
   groups?: any[]; // <-- Add fields the card needs
};

const GalleryMembersScreen = () => {
   const [searchText, setSearchText] = useState('');
   const { width } = useWindowDimensions();

   const route = useRoute();
   const { galleryId } = route.params as { galleryId: string };

   const { acceptedMembers, isLoading, isSyncing, isError, error } = useMemberships(galleryId);
   const [selectedMember, setSelectedMember] = useState<DisplayUser | null>(null)

   console.log("accepted members ", acceptedMembers)

   const displayMembers = useMemo(() => {
      return acceptedMembers.map(m => ({
         id: m.user.id,
         name: m.user.name || m.user.handle,
         handle: m.user.handle,
         avatarUri: m.user.avatarUrl,
         role: m.membership.role
      }));
   }, [acceptedMembers]);

   const filteredMembers = useMemo(() => {
      const q = searchText.trim().toLowerCase();
      if (!q) return displayMembers;
      return displayMembers.filter(m =>
         (m.name || '').toLowerCase().includes(q) ||
         (m.handle || '').toLowerCase().includes(q)
      );
   }, [displayMembers, searchText]);

   const handleMemberPress = (member: DisplayUser) => {
      setSelectedMember(member);
   };

   const handleDismiss = () => {
      setSelectedMember(null);
   };

   const handleInputsChange = (text: string) => {
      setSearchText(text);
   };

   const ListHeader = () => (
      <View>
         <TextInput
            style={styles.searchBar}
            placeholder="Search members"
            placeholderTextColor="#999"
            onChangeText={handleInputsChange}
            value={searchText}
         />
      </View>
   );


   // if (isLoading) {
   //    return (
   //      <View style={[styles.container, styles.center]}>
   //        <ActivityIndicator size="large" color="#0000ff" />
   //      </View>
   //    );
   //  }
  
   //  if (isError) {
   //    return (
   //      <View style={[styles.container, styles.center]}>
   //        <Text style={styles.errorText}>Failed to load groups: {error.message}</Text>
   //      </View>
   //    );
   //  }

   return (
      <SafeAreaView style={styles.container}>
         <MembersListHeader galleryId={galleryId} />
         <FlatList
            data={filteredMembers}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => (
               <MemberItem name={item.name} role={item.role} handle={item.handle} avatarUri={item.avatarUri} onPressLeft={() => handleMemberPress(item)}/>
            )}
            ListHeaderComponent={ListHeader}
            contentContainerStyle={[
               styles.scrollContainer,
               width < 400 ? styles.smallScreenPadding : {},
            ]}
            keyboardShouldPersistTaps="handled"
         />
         {selectedMember && (
            <UserInfoCard
               onDismiss={handleDismiss}
               profilePicture={selectedMember.avatarUri}
               name={selectedMember.name}
               handle={selectedMember.handle}
               bio={"No bio available."} // Pass data
               groups={[]} // Pass data
            />
         )}
      </SafeAreaView>
   );
};

const styles = StyleSheet.create({
   container: {
      flex: 1,
      backgroundColor: '#fff',
   },
   scrollContainer: {
      paddingHorizontal: 20,
      paddingTop: 6,
      paddingBottom: 40,
   },
   smallScreenPadding: {
      paddingHorizontal: 14,
   },
   title: {
      fontSize: 22,
      fontWeight: '700',
      color: '#111',
      marginBottom: 16,
   },
   searchBar: {
      backgroundColor: '#f1f1f1',
      borderRadius: 10,
      paddingVertical: 10,
      paddingHorizontal: 14,
      fontSize: 15,
      color: '#333',
      marginBottom: 14,
      shadowColor: '#000',
      shadowOpacity: 0.04,
      shadowOffset: { width: 0, height: 1 },
      shadowRadius: 2,
      elevation: 1,
   },
   inviteButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'center',
      backgroundColor: '#fff',
      borderWidth: 1,
      borderColor: '#007AFF',
      borderRadius: 20,
      paddingVertical: 8,
      paddingHorizontal: 16,
      marginBottom: 24,
      shadowColor: '#000',
      shadowOpacity: 0.05,
      shadowOffset: { width: 0, height: 1 },
      shadowRadius: 2,
      elevation: 1,
   },
   inviteButtonText: {
      fontSize: 14,
      fontWeight: '500',
      color: '#007AFF',
      marginLeft: 6,
   }
});

export default GalleryMembersScreen;
