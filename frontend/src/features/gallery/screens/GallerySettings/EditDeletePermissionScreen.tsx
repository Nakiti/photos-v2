import React, { useEffect, useState, useMemo } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { useRoute } from "@react-navigation/native";
import { useGallery, useUpdateGallery } from "../../../../hooks/useGalleryData";
import { useMyMembership } from "../../../../hooks/useMembershipData";
import { ActivityIndicator } from "react-native-paper";
import { useQueryClient } from "@tanstack/react-query";

interface EditDeletePermissionProps { galleryId: string | number }

const EditDeletePermissionScreen = () => {
   const route = useRoute();
   const queryClient = useQueryClient();
   const { galleryId } = route.params as { galleryId: string };

   // Fetch gallery data and user's membership
   const { gallery, isLoading, isError, error } = useGallery(galleryId);
   const { data: myMembership } = useMyMembership(galleryId);
   const { mutate: updateGallery, isPending: isUpdating } = useUpdateGallery();

   const [selectedOption, setSelectedOption] = useState<'ADMINS_AUTHORS' | 'ADMINS_AUTHORS'>('ADMINS_AUTHORS');

   const options = [
      { id: "1", value: "ADMINS_AUTHORS" as const, title: "Admins and Authors", subtitle: "Admins and photo authors can delete pictures" },
      { id: "2", value: "ADMIN" as const, title: "Admins", subtitle: "Only admins can delete pictures" },
   ];

   // Set initial value when gallery loads
   useEffect(() => {
      if (gallery?.deletePermission) {
         console.log("delete permission ", gallery.deletePermission)
         setSelectedOption(gallery.deletePermission);
      }
   }, [gallery]);

   const isDirty = useMemo(() => {
      return gallery?.deletePermission !== selectedOption;
   }, [gallery?.deletePermission, selectedOption]);

   const handleSave = () => {
      if (!isDirty || isUpdating) return;

      updateGallery(
         { galleryId, data: { deletePermission: selectedOption } },
         {
            onSuccess: () => {
               Alert.alert('Success', 'Delete permission updated!');
               queryClient.invalidateQueries({ queryKey: ['gallery', galleryId] });
            },
            onError: () => {
               Alert.alert('Error', 'Failed to update permission.');
            },
         }
      );
   };

   // if (isLoading) {
   //    return (
   //       <View style={[styles.container, styles.center]}>
   //          <ActivityIndicator size="large" color="#0000ff" />
   //       </View>
   //    );
   // }

   // if (isError) {
   //    return (
   //       <View style={[styles.container, styles.center]}>
   //          <Text style={styles.errorText}>Failed to load gallery: {error?.message || 'Unknown error'}</Text>
   //       </View>
   //    );
   // }

   const userRole = myMembership?.role;
   const canEdit = userRole === 'ADMIN' || gallery?.ownerId === myMembership?.userId;

   return (
      <View style={styles.container}>
         <Text style={styles.title}>Who can delete pictures?</Text>

         <View style={styles.optionsContainer}>
         {options.map((item, index) => (
            <TouchableOpacity
               key={item.id}
               style={[styles.option, index !== options.length - 1 && styles.optionBorder]}
               onPress={() => setSelectedOption(item.value)}
               disabled={!canEdit}
            >
               <View>
                  <Text style={styles.optionTitle}>{item.title}</Text>
                  <Text style={styles.optionSubtitle}>{item.subtitle}</Text>
               </View>
               {selectedOption === item.value && <Text style={{ color: 'green', fontSize: 18 }}>✓</Text>}
            </TouchableOpacity>
         ))}
         </View>

         {canEdit && <TouchableOpacity
            style={[
               styles.saveButton,
               (!isDirty || isUpdating) ? styles.saveButtonDisabled : styles.saveButtonActive
            ]}
            disabled={!isDirty || isUpdating}
            onPress={handleSave}
         >
            <Text style={styles.saveButtonText}>{isUpdating ? 'Saving...' : 'Save'}</Text>
         </TouchableOpacity>}
      </View>
   );
};

export default EditDeletePermissionScreen;

const styles = StyleSheet.create({
   container: {
     flex: 1,
     backgroundColor: "white",
     padding: 20,
   },
   center: {
     justifyContent: 'center',
     alignItems: 'center',
   },
   title: {
     color: "black",
     fontSize: 16,
     marginBottom: 10,
     paddingHorizontal: 2,
     fontWeight: "600",
   },
   optionsContainer: {
     backgroundColor: "#f2f2f2",
     borderRadius: 10,
   },
   option: {
     padding: 15,
     flexDirection: "row",
     justifyContent: "space-between",
     alignItems: "center",
   },
   optionBorder: {
     borderBottomWidth: 1,
     borderBottomColor: "#ddd",
   },
   optionTitle: {
     color: "black",
     fontSize: 16,
   },
   optionSubtitle: {
     color: "#666",
     fontSize: 14,
   },
   saveButton: {
     marginTop: 20,
     paddingVertical: 12,
     borderRadius: 8,
     alignItems: "center",
   },
   saveButtonDisabled: {
     backgroundColor: "#ccc",
   },
   saveButtonActive: {
     backgroundColor: "#007bff",
   },
   saveButtonText: {
     color: "white",
     fontSize: 16,
     fontWeight: "bold",
   },
   errorText: {
     color: 'red',
   },
});


