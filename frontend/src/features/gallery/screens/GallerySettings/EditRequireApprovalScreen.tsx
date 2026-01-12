import React, { useEffect, useState, useMemo } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { useRoute } from "@react-navigation/native";
import { useGallery, useUpdateGallery } from "../../../../hooks/useGalleryData";
import { useMyMembership } from "../../../../hooks/useMembershipData";
import { ActivityIndicator } from "react-native-paper";
import { useQueryClient } from "@tanstack/react-query";

interface EditRequireApprovalProps { galleryId: string | number }

const EditRequireApprovalScreen = () => {
   const route = useRoute();
   const queryClient = useQueryClient();
   const { galleryId } = route.params as { galleryId: string };

   // Fetch gallery data and user's membership
   const { gallery, isLoading, isError, error } = useGallery(galleryId);
   const { data: myMembership } = useMyMembership(galleryId);
   const { mutate: updateGallery, isPending: isUpdating } = useUpdateGallery();

   // Local state: false = anyone can join, true = requires approval
   const [requiresApproval, setRequiresApproval] = useState(false);

   const options = [
      { id: "1", value: false, title: "Anyone", subtitle: "Anyone with the link can join" },
      { id: "2", value: true, title: "Require Admin Approval", subtitle: "Requests must be approved by an admin" },
   ];

   // Set initial value when gallery loads
   useEffect(() => {
      if (gallery?.joinRequiresApproval !== undefined) {
         // Map frontend "all" | "admin_approval" to boolean, or use boolean directly
         if (typeof gallery.joinRequiresApproval === 'string') {
            setRequiresApproval(gallery.joinRequiresApproval === 'admin_approval');
         } else {
            setRequiresApproval(Boolean(gallery.joinRequiresApproval));
         }
      }
   }, [gallery]);

   const isDirty = useMemo(() => {
      if (gallery?.joinRequiresApproval === undefined) return false;
      const currentValue = typeof gallery.joinRequiresApproval === 'string' 
         ? gallery.joinRequiresApproval === 'admin_approval'
         : Boolean(gallery.joinRequiresApproval);
      return currentValue !== requiresApproval;
   }, [gallery?.joinRequiresApproval, requiresApproval]);

   const handleSave = () => {
      if (!isDirty || isUpdating) return;

      updateGallery(
         { galleryId, data: { joinRequiresApproval: requiresApproval } },
         {
            onSuccess: () => {
               Alert.alert('Success', 'Require approval setting updated!');
               queryClient.invalidateQueries({ queryKey: ['gallery', galleryId] });
            },
            onError: () => {
               Alert.alert('Error', 'Failed to update setting.');
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
         <Text style={styles.title}>Require approval to join?</Text>

         <View style={styles.optionsContainer}>
         {options.map((item, index) => (
            <TouchableOpacity
               key={item.id}
               style={[styles.option, index !== options.length - 1 && styles.optionBorder]}
               onPress={() => setRequiresApproval(item.value)}
               disabled={!canEdit}
            >
               <View>
                  <Text style={styles.optionTitle}>{item.title}</Text>
                  <Text style={styles.optionSubtitle}>{item.subtitle}</Text>
               </View>
               {requiresApproval === item.value && <Text style={{ color: 'green', fontSize: 18 }}>✓</Text>}
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

export default EditRequireApprovalScreen;

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

