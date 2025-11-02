import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Image } from 'react-native';

type DummyUser = {
   firstName: string;
   lastName: string;
   bio: string;
   profilePicture: string | null;
   email: string;
   phoneNumber: string;
};

const dummyUser: DummyUser = {
   firstName: 'Alex',
   lastName: 'Johnson',
   bio: 'Photographer. Coffee enthusiast. Traveler. Lover of golden hour shots and candid moments.',
   profilePicture: null,
   email: 'alex.johnson@example.com',
   phoneNumber: '+1 (555) 123-4567',
};

const EditProfileScreen: React.FC = () => {
   const initials = `${dummyUser.firstName.slice(0, 1)}${dummyUser.lastName.slice(0, 1)}`;

   return (
      <ScrollView style={styles.scrollContainer}>
         <View style={styles.container}>
            <View style={styles.avatarContainer}>
               {dummyUser.profilePicture ? (
                  <Image
                     source={{ uri: dummyUser.profilePicture }}
                     style={styles.avatar}
                  />
               ) : (
                  <Text style={styles.avatarText}>{initials}</Text>
               )}
               <TouchableOpacity style={styles.changeAvatarButton}>
                  <Text style={styles.changeAvatarText}>Change Avatar</Text>
               </TouchableOpacity>
            </View>

            <View style={styles.bioContainer}>
               <Text style={styles.bioHeader}>First Name</Text>
               <TextInput
                  style={styles.bioInput}
                  value={dummyUser.firstName}
                  editable={false}
               />
            </View>

            <View style={styles.bioContainer}>
               <Text style={styles.bioHeader}>Last Name</Text>
               <TextInput
                  style={styles.bioInput}
                  value={dummyUser.lastName}
                  editable={false}
               />
            </View>

            <View style={styles.bioContainer}>
               <Text style={styles.bioHeader}>Bio</Text>
               <TextInput
                  style={styles.bioInput}
                  placeholder='Tell a little about yourself'
                  numberOfLines={8}
                  value={dummyUser.bio}
                  multiline
                  editable={false}
               />
            </View>

            <TouchableOpacity
               style={[styles.saveButton, styles.disabledButton]}
               disabled
            >
               <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>

            <View style={styles.accountInfoContainer}>
               <Text style={styles.accountTitle}>Account Info</Text>
               <Text style={styles.accountDescription}>Only visible to you</Text>
            </View>

            <View style={styles.bioContainer}>
               <Text style={styles.bioHeader}>Email</Text>
               <TextInput
                  style={styles.bioInput}
                  value={dummyUser.email}
                  editable={false}
               />
            </View>

            <View style={styles.bioContainer}>
               <Text style={styles.bioHeader}>Phone Number</Text>
               <TextInput
                  style={styles.bioInput}
                  value={dummyUser.phoneNumber}
                  editable={false}
               />
            </View>
         </View>
      </ScrollView>
   );
};

const styles = StyleSheet.create({
   container: {
      flex: 1,
      backgroundColor: '#fff',
      paddingHorizontal: 20,
      paddingTop: 20,
   },
   scrollContainer: {
      flexGrow: 1,
      backgroundColor: "#fff",
      paddingBottom: 24
   },
   avatarContainer: {
      alignItems: "center",
   },
   avatar: {
      width: 140,
      height: 140,
      borderRadius: 100,
      backgroundColor: "#f2f2f2",
   },
   avatarText: {
      width: 140,
      height: 140,
      borderRadius: 100,
      backgroundColor: "#f2f2f2",
      textAlign: 'center',
      lineHeight: 140,
      fontSize: 48,
      fontWeight: '700',
      color: '#555',
   },
   changeAvatarButton: {
      marginTop: 10,
      backgroundColor: "#007bff",
      paddingVertical: 8,
      paddingHorizontal: 15,
      borderRadius: 8,
      marginBottom: 20
   },
   changeAvatarText: {
      color: "#fff",
      fontSize: 14,
      fontWeight: "bold",
   },
   bioContainer: {
      backgroundColor: "#F3F3F3",
      borderRadius: 10,
      padding: 12,
      marginBottom: 12,
   },
   bioHeader: {
      fontSize: 14,
      color: "#A1A1A1",
      marginBottom: 8, // Spacing between label and input
   },
   bioInput: {
      fontSize: 14,
      color: "#000",
      textAlignVertical: "top", // Aligns text properly for multiline inputs
      // height: 30, // Height to accommodate multiline text
      padding: 4, // Internal padding
   },
   accountInfoContainer: {
      marginTop: 36,
   },
   accountTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: '#333',
      marginBottom: 4,
   },
   accountDescription: {
      fontSize: 14,
      color: '#757575',
      marginBottom: 12
   },
   saveButton: {
      backgroundColor: "#007bff",
      paddingVertical: 12,
      borderRadius: 10,
      alignItems: "center",
      marginTop: 20,
   },
   disabledButton: {
      backgroundColor: "#b0c4de",
   },
   saveButtonText: {
      color: "#fff",
      fontSize: 16,
      fontWeight: "bold",
   },
});

export default EditProfileScreen;
