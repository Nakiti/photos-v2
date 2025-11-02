import { useRoute } from "@react-navigation/native";
import React, { useState, useEffect } from "react";
import { 
    View, Text, Image, TouchableOpacity, StyleSheet, TextInput, 
    TouchableWithoutFeedback, Keyboard, 
    Alert
} from "react-native";
import { useGallery } from "../../../../hooks/useGalleryData";
import { ActivityIndicator } from "react-native-paper";
// Presentational: no external image picker

interface EditGalleryDetailsProps { galleryId: string | number }

const EditGalleryDetailsScreen = () => {
   const [inputs, setInputs] = useState<any>({});
   const [initialInputs, setInitialInputs] = useState<any>({});
   const [isDisabled, setIsDisabled] = useState(true);
   const [image, setImage] = useState<string | null>(null);
   const [userInfo, setUserInfo] = useState<{ role: string } | null>(null)
   const route = useRoute()
   const { galleryId } = route.params as { galleryId: string }

   const handleInputsChange = (key: string, value: any) => {
      setInputs((prev: any) => ({ ...prev, [key]: value }));
   };

   const {gallery, isError, isLoading, error} = useGallery(galleryId)

   useEffect(() => {
      const parsed = {
         name: gallery?.name,
         description: gallery?.description,
         image: gallery?.iconUrl,
         editPermission: 'all',
         addPermission: 'admin',
         ownerId: 1
      };
      setInputs(parsed);
      setInitialInputs({ name: parsed.name, description: parsed.description, image: parsed.image });
      setUserInfo({ role: 'owner' });
   }, [galleryId, gallery]);


   useEffect(() => {
      const hasChanged = Object.keys(initialInputs).some(
         (key) => inputs[key] !== initialInputs[key]
      );
      setIsDisabled(!hasChanged);
   }, [inputs]);

   const fetchData = async () => {};

   const handleSave = async () => {
      if (isDisabled) return;
      setIsDisabled(true);
      Alert.alert('Success', `Saved changes for Gallery ${galleryId}`);
   };

   const pickImage = () => {
      const placeholder = "https://placehold.co/150x150/f2f2f2/333?text=Group";
      const next = image ? null : placeholder;
      setImage(next);
      handleInputsChange("image", next);
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
          <Text style={styles.errorText}>Failed to load groups: {error.message}</Text>
        </View>
      );
    }

   return (
      <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
         <View style={styles.container}>
            <View style={styles.avatarContainer}>
               <TouchableOpacity onPress={pickImage}>
                  <Image
                        source={{ uri: inputs.iconUrl || "https://placehold.co/150x150/f2f2f2/333?text=Group" }}
                        style={styles.avatar}
                  />
               </TouchableOpacity>
            </View>

            {/* Alias Input */}
            <View style={styles.infoContainer}>
               <Text style={styles.label}>Group Name</Text>
               <TextInput
                  style={styles.input}
                  value={inputs.name}
                  onChangeText={(text) => handleInputsChange("name", text)}
                  placeholder="Enter Name"
                  placeholderTextColor="gray"
                  editable={true}
               />
            </View>

            {/* Description Input */}
            <TextInput
               style={styles.description}
               value={inputs.description}
               onChangeText={(text) => handleInputsChange("description", text)}
               placeholder="Add Description"
               placeholderTextColor="gray"
               numberOfLines={12}
               multiline
               editable={true}
            />

            {/* Save Button */}
            <TouchableOpacity 
               style={[styles.saveButton, isDisabled && styles.disabledButton]} 
               onPress={handleSave}
               disabled={isDisabled}
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
});

