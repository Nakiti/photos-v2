import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  TextInput, 
  ScrollView, 
  ActivityIndicator, 
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView
} from 'react-native';
import FastImage from 'react-native-fast-image';
import { useUser, useUpdateAvatar, useUpdateMyProfile } from '../../../hooks/useUser';
import { launchImageLibrary, ImagePickerResponse } from 'react-native-image-picker';
import { useNavigation } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import Ionicons from 'react-native-vector-icons/Ionicons';

// --- Theme ---
const COLORS = {
    bg: '#FFFFFF',
    textPrimary: '#000000',
    textSecondary: '#8E8E93',
    border: '#E5E5EA',
    button: '#000000',
    buttonText: '#FFFFFF',
    disabledBtn: '#E5E5EA',
    danger: '#FF3B30',
};

const EditProfileScreen: React.FC = () => {
  const navigation = useNavigation();
  const queryClient = useQueryClient();

  // --- Data ---
  const { user } = useUser();
  const { mutate: updateAvatar, isPending: isUpdatingAvatar } = useUpdateAvatar();
  const { mutate: updateProfile, isPending: isUpdatingProfile } = useUpdateMyProfile();

  // --- State ---
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [localAvatarUri, setLocalAvatarUri] = useState<string | null>(null);

  // Sync state
  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setBio(user.bio || '');
      setLocalAvatarUri(null); 
    }
  }, [user]);

  // Dirty Check
  const isDirty = (
    (user && (name.trim() !== (user.name || '') || bio.trim() !== (user.bio || ''))) || 
    localAvatarUri !== null
  );

  // --- Handlers ---
   const handleChangeAvatar = () => {
      launchImageLibrary({ mediaType: 'photo', quality: 0.8 }, (response: ImagePickerResponse) => {
         if (response.didCancel) return;
         if (response.errorMessage) {
            Alert.alert('Error', response.errorMessage);
            return;
         } 
         if (response.assets && response.assets[0].uri) {
            const uri = response.assets[0].uri;
            setLocalAvatarUri(uri); // Optimistic UI
            
            updateAvatar(uri, {
               onSuccess: () => {
                  setLocalAvatarUri(null);
                  queryClient.invalidateQueries({queryKey: ['me']});
               },
               onError: () => {
                   setLocalAvatarUri(null);
                   Alert.alert("Upload Failed", "Could not update profile picture.");
               },
            });
         }
      });
   };

   const handleSave = () => {
      if (!isDirty || isUpdatingProfile) return;
      
      updateProfile({ name: name.trim(), bio: bio.trim() }, {
         onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['me'] });
            navigation.goBack();
         },
         onError: () => {
            Alert.alert('Error', 'Failed to update profile.');
         }
      });
   };

   const getInitials = () => {
      return (name || user?.handle || '?').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
   };

   const avatarUri = localAvatarUri || user?.avatarUrl;
   const isLoading = isUpdatingAvatar || isUpdatingProfile;

   return (
      <View style={styles.root}>
         <KeyboardAvoidingView 
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ flex: 1 }}
         >
            <ScrollView 
                contentContainerStyle={styles.scrollContent} 
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                
                {/* 1. Avatar Section */}
                <View style={styles.avatarSection}>
                    <TouchableOpacity 
                        style={styles.avatarWrapper}
                        onPress={handleChangeAvatar}
                        activeOpacity={0.8}
                        disabled={isLoading}
                    >
                        {avatarUri ? (
                            <FastImage
                                style={styles.avatar}
                                source={{ uri: avatarUri, priority: FastImage.priority.high }}
                                resizeMode={FastImage.resizeMode.cover}
                            />
                        ) : (
                            <View style={styles.avatarPlaceholder}>
                                <Text style={styles.avatarInitials}>{getInitials()}</Text>
                            </View>
                        )}
                        
                        {/* Edit Badge Overlay */}
                        <View style={styles.editBadge}>
                            {isUpdatingAvatar ? (
                                <ActivityIndicator size="small" color="#FFF" />
                            ) : (
                                <Ionicons name="camera" size={14} color="#FFF" />
                            )}
                        </View>
                    </TouchableOpacity>
                    <Text style={styles.changePhotoText} onPress={handleChangeAvatar}>
                        Change Profile Photo
                    </Text>
                </View>

                {/* 2. Public Profile Form */}
                <View style={styles.section}>
                    <Text style={styles.sectionHeader}>PUBLIC PROFILE</Text>
                    
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Name</Text>
                        <TextInput
                            style={styles.input}
                            value={name}
                            onChangeText={setName}
                            placeholder="Your Name"
                            placeholderTextColor={COLORS.textSecondary}
                            editable={!isLoading}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Bio</Text>
                        <TextInput
                            style={[styles.input, styles.multilineInput]}
                            placeholder="Tell us about yourself..."
                            placeholderTextColor={COLORS.textSecondary}
                            value={bio}
                            onChangeText={setBio}
                            multiline
                            textAlignVertical="top"
                            editable={!isLoading}
                        />
                    </View>
                </View>

                {/* 3. Private Info Form */}
                <View style={styles.section}>
                    <Text style={styles.sectionHeader}>PRIVATE INFORMATION</Text>
                    
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Handle</Text>
                        <TextInput
                            style={[styles.input, styles.readOnlyInput]}
                            value={`@${user?.handle || ''}`}
                            editable={false} 
                        />
                        <Ionicons name="lock-closed" size={14} color={COLORS.textSecondary} style={styles.lockIcon} />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Email</Text>
                        <TextInput
                            style={[styles.input, styles.readOnlyInput]}
                            value={user?.email || ''}
                            editable={false}
                        />
                        <Ionicons name="lock-closed" size={14} color={COLORS.textSecondary} style={styles.lockIcon} />
                    </View>
                </View>

            </ScrollView>

            {/* 4. Footer Action */}
            <SafeAreaView style={styles.footer}>
                <TouchableOpacity
                    style={[styles.saveButton, (!isDirty || isLoading) && styles.disabledButton]}
                    disabled={!isDirty || isLoading}
                    onPress={handleSave}
                >
                    {isUpdatingProfile ? (
                        <ActivityIndicator color="#FFF" />
                    ) : (
                        <Text style={styles.saveButtonText}>Save Changes</Text>
                    )}
                </TouchableOpacity>
            </SafeAreaView>

         </KeyboardAvoidingView>
      </View>
   );
};

const styles = StyleSheet.create({
   root: {
      flex: 1,
      backgroundColor: COLORS.bg,
   },
   scrollContent: {
      paddingBottom: 40,
   },

   // --- Avatar ---
   avatarSection: {
      alignItems: 'center',
      paddingVertical: 24,
   },
   avatarWrapper: {
      position: 'relative',
      marginBottom: 12,
   },
   avatar: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: '#F2F2F7',
   },
   avatarPlaceholder: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: '#F2F2F7',
      justifyContent: 'center',
      alignItems: 'center',
   },
   avatarInitials: {
       fontSize: 32,
       fontWeight: '600',
       color: '#8E8E93',
   },
   editBadge: {
       position: 'absolute',
       bottom: 0,
       right: 0,
       backgroundColor: COLORS.button, // Black
       width: 32,
       height: 32,
       borderRadius: 16,
       alignItems: 'center',
       justifyContent: 'center',
       borderWidth: 3,
       borderColor: COLORS.bg,
   },
   changePhotoText: {
       fontSize: 13,
       fontWeight: '600',
       color: '#007AFF', // Standard action blue
   },

   // --- Sections ---
   section: {
       marginBottom: 24,
   },
   sectionHeader: {
       fontSize: 12,
       fontWeight: '700',
       color: COLORS.textSecondary,
       letterSpacing: 1,
       marginBottom: 8,
       marginLeft: 24,
   },
   
   // --- Inputs ---
   inputGroup: {
       backgroundColor: '#FFFFFF',
       paddingHorizontal: 24,
       paddingVertical: 12,
       borderBottomWidth: 1,
       borderBottomColor: COLORS.border,
       flexDirection: 'row',
       alignItems: 'center',
   },
   label: {
       width: 80,
       fontSize: 16,
       fontWeight: '600',
       color: COLORS.textPrimary,
   },
   input: {
       flex: 1,
       fontSize: 16,
       color: COLORS.textPrimary,
       padding: 0, // Remove default padding
   },
   multilineInput: {
       minHeight: 60,
       paddingTop: 4, 
   },
   readOnlyInput: {
       color: COLORS.textSecondary,
   },
   lockIcon: {
       marginLeft: 8,
   },

   // --- Footer ---
   footer: {
       backgroundColor: COLORS.bg,
       borderTopWidth: 1,
       borderTopColor: COLORS.border,
       paddingHorizontal: 24,
       paddingVertical: 12,
   },
   saveButton: {
       backgroundColor: COLORS.button,
       height: 50,
       borderRadius: 25,
       alignItems: 'center',
       justifyContent: 'center',
   },
   disabledButton: {
       backgroundColor: COLORS.disabledBtn,
   },
   saveButtonText: {
       color: COLORS.buttonText,
       fontSize: 16,
       fontWeight: '600',
   },
});

export default EditProfileScreen;