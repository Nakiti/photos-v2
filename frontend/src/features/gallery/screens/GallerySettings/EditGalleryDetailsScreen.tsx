import { useRoute } from "@react-navigation/native";
import React, { useState, useEffect, useMemo } from "react";
import { 
    View, Text, TouchableOpacity, StyleSheet, TextInput, 
    TouchableWithoutFeedback, Keyboard, 
    Alert
} from "react-native";
import FastImage from "react-native-fast-image";
import { launchImageLibrary, ImagePickerResponse } from "react-native-image-picker";
import { useGallery, useUpdateGallery, useUpdateGalleryIcon } from "../../../../hooks/useGalleryData";
import { ActivityIndicator } from "react-native-paper";
import { useQueryClient } from "@tanstack/react-query";
// Image upload handled via `useUpdateGalleryIcon`

interface EditGalleryDetailsProps { galleryId: string | number }

const EditGalleryDetailsScreen = () => {
   const route = useRoute();
   const queryClient = useQueryClient();
   const { galleryId } = route.params as { galleryId: string };

   // --- Data Fetching ---
   const { gallery, isError, isLoading, error } = useGallery(galleryId);

   // --- Mutations ---
   const { mutate: updateGallery, isPending: isUpdating } = useUpdateGallery();
   const { mutate: updateGalleryIcon, isPending: isUploadingIcon } = useUpdateGalleryIcon(galleryId);

   // --- Local State for Editing ---
   const [name, setName] = useState<string>('');
   const [description, setDescription] = useState<string>('');
   const [localImageUri, setLocalImageUri] = useState<string | null>(null);
   const [initial, setInitial] = useState<{ name: string; description: string; iconUrl: string | null }>({ name: '', description: '', iconUrl: null });

   // Populate local state once gallery data is loaded
   useEffect(() => {
      if (gallery) {
         setName(gallery.name || '');
         // Description is not part of the Gallery model yet; keep local-only for now
         setDescription('');
         setLocalImageUri(null);
         setInitial({ name: gallery.name || '', description: '', iconUrl: gallery.iconUrl || null });
      }
   }, [galleryId, gallery]);

   // Dirty tracking (similar to profile screen)
   const isDirty = useMemo(() => {
      return (
         name !== initial.name ||
         description !== initial.description ||
         localImageUri !== null
      );
   }, [name, description, localImageUri, initial]);

   // --- Handlers ---
   const handleChangeImage = () => {
      launchImageLibrary({ mediaType: 'photo', quality: 0.7 }, (response: ImagePickerResponse) => {
         if (response.didCancel) {
           return;
         }
         if (response.errorMessage) {
           Alert.alert('Error', response.errorMessage);
           return;
         }
         if (response.assets && response.assets[0]?.uri) {
           const uri = response.assets[0].uri;
           setLocalImageUri(uri); // Local preview
           // Upload immediately and sync
           updateGalleryIcon(uri, {
             onSuccess: () => {
               setLocalImageUri(null);
               queryClient.invalidateQueries({queryKey: ['gallery', galleryId]})
             },
             onError: (err) => {
               Alert.alert('Upload Failed', (err as Error)?.message || 'Unable to update image');
             },
           });
         }
      });
   };

   const handleSave = () => {
      if (!isDirty || isUpdating) return;

      // Only update fields supported today (name). Image upload will be added later via TODO hook.
      updateGallery(
         { galleryId, data: { name: name.trim() || initial.name } },
         {
            onSuccess: () => {
               Alert.alert('Success', 'Gallery updated!');
               queryClient.invalidateQueries({ queryKey: ['gallery', galleryId] });
               queryClient.invalidateQueries({ queryKey: ['galleries'] });
               // Reset local state to reflect saved data (description kept local-only for now)
               setInitial((prev) => ({ ...prev, name: name.trim() || prev.name, description }));
               setLocalImageUri(null);
            },
            onError: () => {
               Alert.alert('Error', 'Failed to update gallery.');
            },
         }
      );
   };

   if (isLoading) {
      return (
        <View style={[styles.container, styles.center]}>
          <ActivityIndicator size="large" color="#0000ff" />
        </View>
      );
    }
  
   if (isError) {
      return (
        <View style={[styles.container, styles.center]}>
          <Text style={styles.errorText}>Failed to load groups: {error?.message || 'Unknown error'}</Text>
        </View>
      );
    }

   return (
      <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
         <View style={styles.container}>
            <View style={styles.avatarContainer}>
               {(() => {
                  const coverUri = localImageUri || initial.iconUrl || undefined;
                  return (
                     <TouchableOpacity onPress={handleChangeImage} disabled={isUpdating || isUploadingIcon}>
                        {coverUri ? (
                           <FastImage
                              style={styles.avatar}
                              source={{ uri: coverUri, priority: FastImage.priority.high }}
                              resizeMode={FastImage.resizeMode.cover}
                           />
                        ) : (
                           <View style={styles.avatarPlaceholder} />
                        )}
                     </TouchableOpacity>
                  );
               })()}
               <TouchableOpacity 
                  style={styles.changeImageButton}
                  onPress={handleChangeImage}
                  disabled={isUpdating || isUploadingIcon}
               >
                  <Text style={styles.changeImageText}>Change Image</Text>
               </TouchableOpacity>
            </View>

            {/* Name Input */}
            <View style={styles.infoContainer}>
               <Text style={styles.label}>Group Name</Text>
               <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Enter Name"
                  placeholderTextColor="gray"
                  editable={!isUpdating}
               />
            </View>

            {/* Description Input */}
            <TextInput
               style={styles.description}
               value={description}
               onChangeText={setDescription}
               placeholder="Add Description"
               placeholderTextColor="gray"
               numberOfLines={12}
               multiline
               editable={!isUpdating}
            />

            {/* Save Button */}
            <TouchableOpacity 
               style={[styles.saveButton, (!isDirty || isUpdating || isUploadingIcon) && styles.disabledButton]} 
               onPress={handleSave}
               disabled={!isDirty || isUpdating || isUploadingIcon}
            >
               <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
         </View>
      </TouchableWithoutFeedback>
   );
};

export default EditGalleryDetailsScreen;

const styles = StyleSheet.create({
   container: {
      flex: 1,
      backgroundColor: "#fff",
      paddingHorizontal: 20,
   },
   center: {
      justifyContent: 'center',
      alignItems: 'center',
   },
   avatarContainer: {
      alignItems: "center",
      marginTop: 20,
      marginBottom: 30, // Added margin for spacing
   },
   avatar: {
      width: 150,
      height: 150,
      borderRadius: 75, // Made into a perfect circle
      backgroundColor: "#f2f2f2",
   },
   avatarPlaceholder: {
      width: 150,
      height: 150,
      borderRadius: 75,
      backgroundColor: '#f2f2f2',
   },
   changeImageButton: {
      marginTop: 10,
      backgroundColor: "#007bff",
      paddingVertical: 8,
      paddingHorizontal: 15,
      borderRadius: 8,
      marginBottom: 20,
      minWidth: 140,
      alignItems: 'center',
   },
   changeImageText: {
      color: "#fff",
      fontSize: 14,
      fontWeight: "bold",
   },
   // Style for the camera icon overlay
   editOverlay: {
      position: 'absolute',
      bottom: 5,
      right: 5,
      backgroundColor: 'rgba(0,0,0,0.6)',
      padding: 8,
      borderRadius: 20,
   },
   infoContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
      backgroundColor: "#f9f9f9",
      padding: 15,
      borderRadius: 10,
      alignItems: "center",
   },
   label: {
      fontSize: 16,
      fontWeight: "bold",
   },
   input: {
      fontSize: 16,
      color: "#000",
      flex: 1,
      textAlign: "right", 
   },
   description: {
      backgroundColor: "#f9f9f9",
      padding: 15,
      borderRadius: 10,
      marginTop: 15,
      height: 150,
      textAlignVertical: "top",
   },
   saveButton: {
      backgroundColor: "#007bff",
      paddingVertical: 12,
      borderRadius: 10,
      alignItems: "center",
      marginTop: 30,
   },
   disabledButton: {
      backgroundColor: "#b0c4de",
   },
   saveButtonText: {
      color: "#fff",
      fontSize: 16,
      fontWeight: "bold",
   },
   errorText: {
      color: 'red',
   },
});

