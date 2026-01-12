import React, { useEffect, useState, useMemo } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { useRoute } from "@react-navigation/native";
import { useGallery } from "../../../../hooks/useGalleryData";
import { useMyMembership } from "../../../../hooks/useMembershipData";
import { ActivityIndicator } from "react-native-paper";

interface EditPermissionProps { galleryId: string | number }

// NOTE: This screen manages "edit permission" which is not yet implemented in the backend schema.
// The UI is functional but saving is disabled until the backend adds support for this field.
const GroupEditScreen = () => {
   const route = useRoute();
   const { galleryId } = route.params as { galleryId: string };

   // Fetch gallery data and user's membership
   const { gallery, isLoading, isError, error } = useGallery(galleryId);
   const { data: myMembership } = useMyMembership(galleryId);

   // Local state (not persisted to backend yet)
   const [selectedOption, setSelectedOption] = useState<'all' | 'admin'>('all');

   const options = [
      { id: "1", value: "all" as const, title: "Anyone", subtitle: "Anyone can edit the group" },
      { id: "2", value: "admin" as const, title: "Admin", subtitle: "Only admins can edit the group" },
   ];

   const handleSave = () => {
      // TODO: Implement once backend supports editPermission field
      Alert.alert(
         "Not Implemented", 
         "Edit permission is not yet supported by the backend. This feature will be available in a future update."
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
         {/* Title */}
         <Text style={styles.title}>Who can edit the group?</Text>
         
         {/* Info banner */}
         <View style={styles.infoBanner}>
            <Text style={styles.infoText}>
               ⚠️ This feature is not yet implemented in the backend
            </Text>
         </View>

         {/* Options */}
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

         {/* Save Button */}
         {canEdit && <TouchableOpacity
            style={[styles.saveButton, styles.saveButtonDisabled]}
            onPress={handleSave}
         >
            <Text style={styles.saveButtonText}>Save</Text>
         </TouchableOpacity>}
      </View>
   );
};

export default GroupEditScreen;

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
   infoBanner: {
     backgroundColor: "#fff3cd",
     padding: 12,
     borderRadius: 8,
     marginBottom: 15,
     borderWidth: 1,
     borderColor: "#ffc107",
   },
   infoText: {
     color: "#856404",
     fontSize: 14,
     textAlign: "center",
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
