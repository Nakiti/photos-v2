import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

interface EditAddMembersPermissionProps { galleryId: string | number }

const EditAddMembersPermissionScreen = ({ galleryId }: EditAddMembersPermissionProps) => {
   const [selectedOption, setSelectedOption] = useState("admin");
   const [originalOption, setOriginalOption] = useState("admin");
   const [data, setData] = useState<any>(null)
   const [userInfo, setUserInfo] = useState<{ role: string } | null>(null)

   const options = [
      { id: "1", value: "all", title: "Anyone", subtitle: "Anyone can add members to the group" },
      { id: "2", value: "admin", title: "Admin", subtitle: "Only admins can add new members" },
   ];

   const handleSave = () => {
      setOriginalOption(selectedOption);
   }

   useEffect(() => {
      // Dummy data load
      const dummy = {
         name: `Gallery ${galleryId}`,
         description: "A sample gallery",
         add_permission: "admin",
         owner_id: 1,
         image: undefined,
      };
      setData(dummy);
      setSelectedOption(dummy.add_permission);
      setOriginalOption(dummy.add_permission);
      setUserInfo({ role: "owner" });
   }, [galleryId])

   return (
      <View style={styles.container}>
         <Text style={styles.title}>Who can add members?</Text>

         <View style={styles.optionsContainer}>
         {options.map((item, index) => (
            <TouchableOpacity
               key={item.id}
               style={[styles.option, index !== options.length - 1 && styles.optionBorder]}
               onPress={() => setSelectedOption(item.value)}
            >
               <View>
                  <Text style={styles.optionTitle}>{item.title}</Text>
                  <Text style={styles.optionSubtitle}>{item.subtitle}</Text>
               </View>
               {selectedOption === item.value && <Text style={{ color: 'green', fontSize: 18 }}>✓</Text>}
            </TouchableOpacity>
         ))}
         </View>

         {userInfo && (userInfo.role == "admin" || userInfo.role == "owner") && <TouchableOpacity
            style={[
               styles.saveButton,
               selectedOption !== originalOption ? styles.saveButtonActive : styles.saveButtonDisabled
            ]}
            disabled={selectedOption === originalOption}
            onPress={handleSave}
         >
            <Text style={styles.saveButtonText}>Save</Text>
         </TouchableOpacity>}
      </View>
   );
};

export default EditAddMembersPermissionScreen;

const styles = StyleSheet.create({
   container: {
     flex: 1,
     backgroundColor: "white",
     padding: 20,
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
});


