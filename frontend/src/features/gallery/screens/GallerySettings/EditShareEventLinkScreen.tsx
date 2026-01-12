import React, { useEffect, useState, useMemo } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { useRoute } from "@react-navigation/native";
import { useGallery, useUpdateGallery } from "../../../../hooks/useGalleryData";
import { useMyMembership } from "../../../../hooks/useMembershipData";
import { ActivityIndicator } from "react-native-paper";
import { useQueryClient } from "@tanstack/react-query";

interface EditShareEventLinkProps { galleryId: string | number }

const EditShareEventLinkScreen = () => {
   const route = useRoute();
   const queryClient = useQueryClient();
   const { galleryId } = route.params as { galleryId: string };

   // Fetch gallery data and user's membership
   const { gallery, isLoading, isError, error } = useGallery(galleryId);
   const { data: myMembership } = useMyMembership(galleryId);
   const { mutate: updateGallery, isPending: isUpdating } = useUpdateGallery();

   // Local state: true = public (link enabled), false = private (link disabled)
   const [isPublic, setIsPublic] = useState(true);

   const options = [
      { id: "1", value: true, title: "Public", subtitle: "Anyone with the link can join" },
      { id: "2", value: false, title: "Private", subtitle: "Link is disabled" },
   ];

   // Set initial value when gallery loads
   useEffect(() => {
      if (gallery?.shareableLink !== undefined) {
         // If shareableLink exists, it's public; if null/undefined, it's private
         setIsPublic(Boolean(gallery.shareableLink));
      }
   }, [gallery]);

   const isDirty = useMemo(() => {
      const currentValue = Boolean(gallery?.shareableLink);
      return currentValue !== isPublic;
   }, [gallery?.shareableLink, isPublic]);

   const handleSave = () => {
      if (!isDirty || isUpdating) return;

      // Note: shareableLink update may need backend support
      // For enabling: if link doesn't exist, backend should generate UUID
      // For disabling: set shareableLink to null
      const updateData: any = {};
      
      if (isPublic && !gallery?.shareableLink) {
         // Enabling: Request backend to generate a new shareable link
         // Backend should handle UUID generation when shareableLink is set to a special value
         // or when it's missing and we want to enable it
         updateData.shareableLink = 'enable'; // Signal to backend to generate UUID
      } else if (!isPublic && gallery?.shareableLink) {
         // Disabling: Set to null to disable the link
         updateData.shareableLink = null;
      }

      updateGallery(
         { galleryId, data: updateData },
         {
            onSuccess: () => {
               Alert.alert('Success', 'Share event link setting updated!');
               queryClient.invalidateQueries({ queryKey: ['gallery', galleryId] });
            },
            onError: (error: any) => {
               console.error('Failed to update shareable link:', error);
               Alert.alert('Error', 'Failed to update setting. The backend may need to support shareableLink updates.');
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

   // Only show for EVENT type galleries
   if (gallery?.type !== 'EVENT') {
      return (
         <View style={[styles.container, styles.center]}>
            <Text style={styles.errorText}>This setting is only available for events.</Text>
         </View>
      );
   }

   return (
      <View style={styles.container}>
         <Text style={styles.title}>Share event link?</Text>

         <View style={styles.optionsContainer}>
         {options.map((item, index) => (
            <TouchableOpacity
               key={item.id}
               style={[styles.option, index !== options.length - 1 && styles.optionBorder]}
               onPress={() => setIsPublic(item.value)}
               disabled={!canEdit}
            >
               <View>
                  <Text style={styles.optionTitle}>{item.title}</Text>
                  <Text style={styles.optionSubtitle}>{item.subtitle}</Text>
               </View>
               {isPublic === item.value && <Text style={{ color: 'green', fontSize: 18 }}>✓</Text>}
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

export default EditShareEventLinkScreen;

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

