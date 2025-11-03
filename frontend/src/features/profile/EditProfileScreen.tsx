import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, ActivityIndicator, Alert 
} from 'react-native';
// 1. Import FastImage
import FastImage from 'react-native-fast-image';
import { useUser, useUpdateAvatar, useUpdateMyProfile } from '../../hooks/useUser';
import { launchImageLibrary, ImagePickerResponse } from 'react-native-image-picker';
import { useNavigation } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';

const EditProfileScreen: React.FC = () => {
  const navigation = useNavigation();
  const queryClient = useQueryClient()

  // --- Data Fetching ---
  const { user, isLoading: isLoadingProfile } = useUser();

  // --- Mutations ---
  const { mutate: updateAvatar, isPending: isUpdatingAvatar } = useUpdateAvatar();
  const { mutate: updateProfile, isPending: isUpdatingProfile } = useUpdateMyProfile();

  // --- Local State for Editing ---
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [localAvatarUri, setLocalAvatarUri] = useState<string | null>(null);

  // Populate local state once user data is loaded
  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setBio(user.bio || '');
      setLocalAvatarUri(null); 
    }
  }, [user]);

  // Check if any changes have been made
  const isDirty = (
    (user && (name !== user.name || bio !== (user.bio || ''))) || 
    localAvatarUri !== null
  );

  // --- Handlers ---
   const handleChangeAvatar = () => {
      console.log("clcik image picker")

      launchImageLibrary({ mediaType: 'photo', quality: 0.7 }, (response: ImagePickerResponse) => {
         if (response.didCancel) {
         console.log('User cancelled image picker');
         } else if (response.errorMessage) {
         Alert.alert('Error', response.errorMessage);
         } else if (response.assets && response.assets[0].uri) {
         const uri = response.assets[0].uri;
         setLocalAvatarUri(uri); // Show a local preview
         updateAvatar(uri, {
            onSuccess: () => {
               setLocalAvatarUri(null)
               queryClient.invalidateQueries({queryKey: ['me']})
               
            }, // Clear preview on success
            onError: () => setLocalAvatarUri(null), // Clear preview on error
         });
         }
      });
   };

   const handleSave = () => {
      if (!isDirty || isUpdatingProfile) return;
      
      updateProfile({ name, bio }, {
         onSuccess: () => {
         Alert.alert('Success', 'Profile updated!');
         queryClient.invalidateQueries({ queryKey: ['me'] })
         navigation.goBack();
         },
         onError: () => {
         Alert.alert('Error', 'Failed to update profile.');
         }
      });
   };

   const getInitials = () => {
      return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
   };

   // --- Render ---
   if (isLoadingProfile) {
      return <ActivityIndicator size="large" style={styles.loadingContainer} />;
   }

  // 2. Determine the URI for FastImage
   const avatarUri = localAvatarUri || user?.avatarUrl;

   return (
      <ScrollView style={styles.scrollContainer} keyboardShouldPersistTaps="handled">
         <View style={styles.container}>
         <View style={styles.avatarContainer}>
            {avatarUri ? (
               // 3. Use FastImage instead of Image
               <FastImage
               style={styles.avatar}
               source={{
                  uri: avatarUri,
                  // 4. Set priority to 'high' for avatars
                  priority: FastImage.priority.high,
               }}
               resizeMode={FastImage.resizeMode.cover}
               />
            ) : (
               <View style={styles.avatarTextContainer}>
               <Text style={styles.avatarText}>{getInitials()}</Text>
               </View>
            )}
            <TouchableOpacity 
               style={styles.changeAvatarButton}
               onPress={handleChangeAvatar}
               disabled={isUpdatingAvatar}
            >
               {isUpdatingAvatar ? (
               <ActivityIndicator color="#fff" />
               ) : (
               <Text style={styles.changeAvatarText}>Change Avatar</Text>
               )}
            </TouchableOpacity>
         </View>

         <View style={styles.bioContainer}>
            <Text style={styles.bioHeader}>Name</Text>
            <TextInput
               style={styles.bioInput}
               value={name}
               onChangeText={setName}
               editable={!isUpdatingProfile}
            />
         </View>

         <View style={styles.bioContainer}>
            <Text style={styles.bioHeader}>Bio</Text>
            <TextInput
               style={[styles.bioInput, styles.multilineInput]}
               placeholder='Tell a little about yourself'
               numberOfLines={4}
               value={bio}
               onChangeText={setBio}
               multiline
               editable={!isUpdatingProfile}
            />
         </View>

         <TouchableOpacity
            style={[styles.saveButton, (!isDirty || isUpdatingProfile) && styles.disabledButton]}
            disabled={!isDirty || isUpdatingProfile}
            onPress={handleSave}
         >
            {isUpdatingProfile ? (
               <ActivityIndicator color="#fff" />
            ) : (
               <Text style={styles.saveButtonText}>Save</Text>
            )}
         </TouchableOpacity>

         <View style={styles.accountInfoContainer}>
            <Text style={styles.accountTitle}>Account Info</Text>
            <Text style={styles.accountDescription}>Only visible to you</Text>
         </View>

         <View style={styles.bioContainer}>
            <Text style={styles.bioHeader}>Handle</Text>
            <TextInput
               style={styles.bioInput}
               value={user?.handle || ''}
               editable={false} // Handles are unique and not editable
            />
         </View>

         <View style={styles.bioContainer}>
            <Text style={styles.bioHeader}>Email</Text>
            <TextInput
               style={styles.bioInput}
               value={user?.email || ''}
               editable={false}
            />
         </View>
         </View>
      </ScrollView>
   );
};

const styles = StyleSheet.create({
   loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
   },
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
      borderRadius: 70,
      backgroundColor: "#f2f2f2",
   },
   avatarTextContainer: {
      width: 140,
      height: 140,
      borderRadius: 70,
      backgroundColor: "#f2f2f2",
      justifyContent: 'center',
      alignItems: 'center',
   },
   avatarText: {
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
      marginBottom: 20,
      minWidth: 120,
      alignItems: 'center',
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
      marginBottom: 8,
   },
   bioInput: {
      fontSize: 14,
      color: "#000",
      padding: 4,
   },
   multilineInput: {
      textAlignVertical: "top",
      height: 80,
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

