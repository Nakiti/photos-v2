import React, { useState, useEffect } from "react";
import {
   View,
   Text,
   StyleSheet,
   TouchableOpacity,
   SafeAreaView,
   TextInput,
   ScrollView,
   Alert,
} from "react-native";
 

interface ChangeOwnerProps { galleryId: string | number }

const ChangeOwnerScreen = ({ galleryId }: ChangeOwnerProps) => {
   const [searchText, setSearchText] = useState("");
   type DummyUser = { id: number; first_name: string; last_name: string; handle: string; profile_picture?: string; role: 'owner' | 'member' };
   const [users, setUsers] = useState<DummyUser[]>([]);
   const [filteredUsers, setFilteredUsers] = useState<DummyUser[]>([]);
   const [prevOwner, setPrevOwner] = useState<number | null>(null)

   useEffect(() => {
      fetchUsers();
   }, [galleryId]);

   const fetchUsers = async () => {
      const response: DummyUser[] = Array.from({ length: 8 }).map((_, i) => ({
         id: i + 1,
         first_name: `User${i + 1}`,
         last_name: `Last${i + 1}`,
         handle: `user${i + 1}`,
         profile_picture: undefined,
         role: i === 0 ? 'owner' : 'member',
      }));
      setUsers(response);
      setFilteredUsers(response);
      setPrevOwner(response.find(item => item.role === 'owner')?.id ?? null);
   };

   const handleInputsChange = (text: string) => {
      setSearchText(text);
      const query = text.trim().toLowerCase();
      if (!query) {
         setFilteredUsers(users);
         return;
      }
      setFilteredUsers(
         users.filter((user: DummyUser) =>
            `${user.first_name} ${user.last_name}`.toLowerCase().includes(query)
         )
      );
   };

   const handlePressActive = (user: DummyUser) => {}

   const confirmChangeOwner = (event: any, userId: number, firstName: string, lastName: string) => {
      event.stopPropagation();
      Alert.alert(
         "Change Owner",
         `Pretend-changed owner to ${firstName} ${lastName} for Gallery ${galleryId}.`
      );
   };

   return (
      <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
               {/* Search Bar */}
               <TextInput
                  style={styles.searchBar}
                  placeholder="Search users"
                  placeholderTextColor="gray"
                  onChangeText={handleInputsChange}
                  value={searchText}
               />

               {/* Users List */}
               {filteredUsers.length > 0 ? (
                  filteredUsers.map((user, index) => (
                     <TouchableOpacity key={index} onPress={() => handlePressActive(user)} style={styles.userItem}>
                        <Text style={styles.userName}>{user.first_name} {user.last_name} {user.role === 'owner' ? '(Owner)' : ''}</Text>
                        <TouchableOpacity onPress={(e) => confirmChangeOwner(e, user.id, user.first_name, user.last_name)}>
                           <Text style={{ color: '#007AFF' }}>Make Owner</Text>
                        </TouchableOpacity>
                     </TouchableOpacity>
                  ))
               ) : (
                  <Text style={styles.noUsersText}>No Members found.</Text>
               )}
            </ScrollView>
         </SafeAreaView>
   );
};

const styles = StyleSheet.create({
   container: {
      flex: 1,
      backgroundColor: "white",
      paddingHorizontal: 16,
      paddingTop: 16,
   },
   scrollContainer: {
      flexGrow: 1,
      paddingHorizontal: 20,
   },
   searchBar: {
      backgroundColor: "#f0f0f0",
      borderRadius: 8,
      padding: 12,
      marginBottom: 10,
   },
   userItem: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      padding: 12,
      backgroundColor: "#f0f0f0",
      borderRadius: 8,
      marginBottom: 10,
   },
   userName: {
      fontSize: 16,
   },
   noUsersText: {
      textAlign: "center",
      color: "gray",
      marginTop: 20,
   },
});

export default ChangeOwnerScreen;
