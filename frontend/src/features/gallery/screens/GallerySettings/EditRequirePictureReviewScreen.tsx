import React, { useEffect, useState, useMemo } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { useRoute } from "@react-navigation/native";
import { useGallery, useUpdateGallery } from "../../../../hooks/useGalleryData";
import { useMyMembership } from "../../../../hooks/useMembershipData";
import { useQueryClient } from "@tanstack/react-query";

const EditRequirePictureReviewScreen = () => {
   const route = useRoute();
   const queryClient = useQueryClient();
   const { galleryId } = route.params as { galleryId: string };

   // Fetch gallery data and user's membership
   const { gallery, isLoading, isError, error } = useGallery(galleryId);
   const { data: myMembership } = useMyMembership(galleryId);
   const { mutate: updateGallery, isPending: isUpdating } = useUpdateGallery();

   // Local state: false = pictures visible immediately, true = require review
   const [requirePictureReview, setRequirePictureReview] = useState(false);

   const options = [
      { id: "1", value: false, title: "Off", subtitle: "Pictures are visible to everyone immediately" },
      { id: "2", value: true, title: "On", subtitle: "Pictures require review before being visible to all members" },
   ];

   // Set initial value when gallery loads
   useEffect(() => {
      if (gallery?.requirePictureReview !== undefined) {
         setRequirePictureReview(Boolean(gallery.requirePictureReview));
      }
   }, [gallery]);

   const isDirty = useMemo(() => {
      if (gallery?.requirePictureReview === undefined) return false;
      return Boolean(gallery.requirePictureReview) !== requirePictureReview;
   }, [gallery?.requirePictureReview, requirePictureReview]);

   const handleSave = () => {
      if (!isDirty || isUpdating) return;

      updateGallery(
         { galleryId, data: { requirePictureReview: requirePictureReview } },
         {
            onSuccess: () => {
               Alert.alert('Success', 'Require picture review setting updated!');
               queryClient.invalidateQueries({ queryKey: ['gallery', galleryId] });
            },
            onError: () => {
               Alert.alert('Error', 'Failed to update setting.');
            },
         }
      );
   };

   const userRole = myMembership?.role;
   const canEdit = userRole === 'ADMIN' || gallery?.ownerId === myMembership?.userId;

   return (
      <View style={styles.container}>
         <Text style={styles.title}>Require picture review?</Text>

         <View style={styles.optionsContainer}>
         {options.map((item, index) => (
            <TouchableOpacity
               key={item.id}
               style={[styles.option, index !== options.length - 1 && styles.optionBorder]}
               onPress={() => setRequirePictureReview(item.value)}
               disabled={!canEdit}
            >
               <View>
                  <Text style={styles.optionTitle}>{item.title}</Text>
                  <Text style={styles.optionSubtitle}>{item.subtitle}</Text>
               </View>
               {requirePictureReview === item.value && <Text style={{ color: 'green', fontSize: 18 }}>✓</Text>}
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

export default EditRequirePictureReviewScreen;

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


