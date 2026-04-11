import { useRoute, useNavigation } from "@react-navigation/native";
import React, { useState, useEffect, useMemo, useLayoutEffect } from "react";
import { 
    View, Text, TouchableOpacity, StyleSheet, TextInput, 
    TouchableWithoutFeedback, Keyboard, 
    Alert, ActivityIndicator, SafeAreaView, ScrollView, Platform, KeyboardAvoidingView
} from "react-native";
import FastImage from "react-native-fast-image";
import { launchImageLibrary, ImagePickerResponse } from "react-native-image-picker";
import { useGroup, useUpdateGroup, useUpdateGroupIcon } from "../../../../hooks/useGroupData";
import { useQueryClient } from "@tanstack/react-query";
import Ionicons from 'react-native-vector-icons/Ionicons';

// Components

const EditGroupDetailsScreen = () => {
   const route = useRoute();
   const navigation = useNavigation();
   const queryClient = useQueryClient();
   const { groupId } = route.params as { groupId: string };

   // --- Hooks ---
   const { group } = useGroup(groupId);
   const { mutate: updateGroup, isPending: isUpdating } = useUpdateGroup();
   const { mutate: updateGroupIcon, isPending: isUploadingIcon } = useUpdateGroupIcon(groupId);

   // --- State ---
   const [name, setName] = useState<string>('');
   const [description, setDescription] = useState<string>('');
   const [localImageUri, setLocalImageUri] = useState<string | null>(null);
   const [initial, setInitial] = useState<{ name: string; description: string; iconUrl: string | null }>({ name: '', description: '', iconUrl: null });

   // Populate State
   useEffect(() => {
      if (group) {
         setName(group.name || '');
         setDescription(group.description || '');
         setLocalImageUri(null);
         setInitial({ name: group.name || '', description: group.description || '', iconUrl: group.iconUrl || null });
      }
   }, [group]);

   const isDirty = useMemo(() => {
      return (
         name.trim() !== initial.name ||
         description.trim() !== initial.description
      );
   }, [name, description, initial]);

   // --- Handlers ---
   const handleChangeImage = () => {
      launchImageLibrary({ mediaType: 'photo', quality: 0.8 }, (response: ImagePickerResponse) => {
         if (response.didCancel || response.errorCode || !response.assets?.[0]?.uri) return;

         const uri = response.assets[0].uri;
         setLocalImageUri(uri); // Optimistic UI
         
         // Upload Immediately
         updateGroupIcon(uri, {
             onSuccess: () => {
                 setLocalImageUri(null);
                 queryClient.invalidateQueries({queryKey: ['group', groupId]})
                 Alert.alert("Updated", "Group cover photo updated successfully.");
             },
             onError: () => {
                 setLocalImageUri(null); // Revert
                 Alert.alert("Error", "Failed to upload image.");
             }
         });
      });
   };

   const handleSave = () => {
      if (!isDirty || isUpdating) return;

      updateGroup(
         { groupId, data: { name: name.trim(), description: description.trim() || undefined } },
         {
            onSuccess: () => {
               queryClient.invalidateQueries({ queryKey: ['group', groupId] });
               queryClient.invalidateQueries({ queryKey: ['groups'] });
               navigation.goBack();
            },
            onError: () => Alert.alert('Error', 'Failed to update group details.'),
         }
      );
   };

   // Render Loading for Image
   const isLoadingImage = isUploadingIcon;

   return (
      <View style={styles.root}>
         
         <KeyboardAvoidingView 
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ flex: 1 }}
         >
            <ScrollView contentContainerStyle={styles.scrollContent}>
                
                {/* 1. Banner Image Section */}
                <Text style={styles.sectionLabel}>COVER PHOTO</Text>
                <TouchableOpacity 
                    style={styles.bannerContainer} 
                    onPress={handleChangeImage}
                    disabled={isLoadingImage}
                    activeOpacity={0.8}
                >
                    {localImageUri || initial.iconUrl || group?.iconUrl ? (
                        <FastImage
                            style={styles.bannerImage}
                            source={{ uri: localImageUri || initial.iconUrl || group?.iconUrl || '' }}
                            resizeMode={FastImage.resizeMode.cover}
                        />
                    ) : (
                        <View style={styles.bannerPlaceholder}>
                             <Ionicons name="image-outline" size={40} color="#C7C7CC" />
                             <Text style={styles.placeholderText}>Add Cover Photo</Text>
                        </View>
                    )}

                    {/* Overlay Icon */}
                    <View style={styles.editIconOverlay}>
                        {isLoadingImage ? (
                            <ActivityIndicator size="small" color="#FFF" />
                        ) : (
                            <Ionicons name="camera" size={18} color="#FFF" />
                        )}
                    </View>
                </TouchableOpacity>

                {/* 2. Form Fields */}
                <View style={styles.formContainer}>
                    
                    {/* Name Input */}
                    <Text style={styles.sectionLabel}>DETAILS</Text>
                    <View style={styles.inputWrapper}>
                        <Text style={styles.inputLabel}>Name</Text>
                        <TextInput
                            style={styles.textInput}
                            value={name}
                            onChangeText={setName}
                            placeholder="Group Name"
                            placeholderTextColor="#C7C7CC"
                        />
                    </View>

                    {/* Description Input */}
                    <View style={[styles.inputWrapper, styles.textAreaWrapper]}>
                         <TextInput
                            style={styles.textArea}
                            value={description}
                            onChangeText={setDescription}
                            placeholder="Description (Optional)"
                            placeholderTextColor="#C7C7CC"
                            multiline
                            textAlignVertical="top"
                         />
                    </View>

                </View>

            </ScrollView>

            {/* 3. Sticky Save Button */}
            <SafeAreaView style={styles.footer}>
                <TouchableOpacity 
                    style={[styles.saveButton, (!isDirty && !isUpdating) && styles.disabledButton]} 
                    onPress={handleSave}
                    disabled={!isDirty || isUpdating}
                >
                    {isUpdating ? (
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

export default EditGroupDetailsScreen;

const styles = StyleSheet.create({
   root: {
      flex: 1,
      backgroundColor: "#F2F2F7", // System Gray 6 Background for Form feel
   },
   scrollContent: {
       paddingBottom: 100, // Space for footer
   },

   // --- Banner Image ---
   sectionLabel: {
       fontSize: 12,
       fontWeight: '600',
       color: '#8E8E93',
       marginTop: 24,
       marginBottom: 8,
       marginLeft: 16,
       letterSpacing: 0.5,
   },
   bannerContainer: {
       height: 180,
       width: '100%',
       backgroundColor: '#E5E5EA',
       position: 'relative',
       marginBottom: 8,
   },
   bannerImage: {
       width: '100%',
       height: '100%',
   },
   bannerPlaceholder: {
       flex: 1,
       alignItems: 'center',
       justifyContent: 'center',
       gap: 8,
   },
   placeholderText: {
       color: '#8E8E93',
       fontWeight: '500',
   },
   editIconOverlay: {
       position: 'absolute',
       bottom: 12,
       right: 12,
       backgroundColor: 'rgba(0,0,0,0.6)',
       padding: 8,
       borderRadius: 20,
   },

   // --- Form ---
   formContainer: {
       marginTop: 0,
   },
   inputWrapper: {
       backgroundColor: '#FFFFFF',
       paddingHorizontal: 16,
       paddingVertical: 12,
       borderBottomWidth: StyleSheet.hairlineWidth,
       borderBottomColor: '#C6C6C8',
       flexDirection: 'row',
       alignItems: 'center',
   },
   inputLabel: {
       width: 80,
       fontSize: 16,
       fontWeight: '500',
       color: '#000',
   },
   textInput: {
       flex: 1,
       fontSize: 16,
       color: '#000',
   },
   
   // Text Area
   textAreaWrapper: {
       alignItems: 'flex-start',
       paddingVertical: 12,
       minHeight: 120,
   },
   textArea: {
       flex: 1,
       fontSize: 16,
       color: '#000',
       height: '100%',
   },

   // --- Footer ---
   footer: {
       backgroundColor: '#FFFFFF',
       borderTopWidth: 1,
       borderTopColor: '#F2F2F7',
       paddingHorizontal: 16,
       paddingVertical: 12,
   },
   saveButton: {
       backgroundColor: '#000000',
       height: 50,
       borderRadius: 25,
       alignItems: 'center',
       justifyContent: 'center',
   },
   disabledButton: {
       backgroundColor: '#C7C7CC', // Disabled Grey
   },
   saveButtonText: {
       color: '#FFFFFF',
       fontSize: 16,
       fontWeight: '600',
   },
});