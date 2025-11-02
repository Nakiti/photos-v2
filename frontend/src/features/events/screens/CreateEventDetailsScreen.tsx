import React, { useState } from 'react';
import { 
   View, 
   Text, 
   StyleSheet, 
   Image, 
   ScrollView, 
   SafeAreaView,
   TouchableOpacity,
   TextInput,
} from "react-native";
import Ionicons from 'react-native-vector-icons/Ionicons';

const CreateEventDetailsScreen = () => {
   const [eventName, setEventName] = useState("");
   const [description, setDescription] = useState("");
   const [coverImage, setCoverImage] = useState<string | undefined>(undefined);
   const [eventStart, setEventStart] = useState<string>(""); // e.g., 2025-10-25 4:00 PM
   const [eventEnd, setEventEnd] = useState<string>("");
   const [locationName, setLocationName] = useState<string>("");

   const isButtonDisabled = !eventName.trim();

   const onPickImage = () => {
      // Presentational: toggle a placeholder image
      setCoverImage(prev => prev ? undefined : 'https://placehold.co/600x400/a2d2ff/ffffff?text=Event+Photo');
   };

   const onSave = () => {
      // Presentational no-op
   };

   return (
      <SafeAreaView style={styles.safeArea}>
         <ScrollView style={styles.container} contentContainerStyle={styles.contentPadding}>
               <TouchableOpacity style={styles.headerImagePicker} onPress={onPickImage}>
                  {coverImage ? (
                     <Image source={{ uri: coverImage }} style={styles.headerImage} />
                  ) : (
                     <View style={styles.imagePlaceholder}>
                        <Ionicons name="camera-outline" size={40} color="#8E8E93" />
                        <Text style={styles.imagePlaceholderText}>Add Cover Photo</Text>
                     </View>
                  )}
               </TouchableOpacity>
               
               <View style={styles.inputGroup}>
                  <TextInput
                     style={styles.input}
                     placeholder="Event Name"
                     placeholderTextColor="#8E8E93"
                     value={eventName}
                     onChangeText={setEventName}
                     returnKeyType="next"
                  />
                  <TextInput
                     style={[styles.input, styles.descriptionInput]}
                     placeholder="Description (Optional)"
                     placeholderTextColor="#8E8E93"
                     multiline
                     value={description}
                     onChangeText={setDescription}
                  />
               </View>

               {/* --- Core Event Details Section (editable) --- */}
               <Text style={styles.sectionTitle}>Event Details</Text>
               <View style={styles.sectionBox}>
                  <TextInput
                     style={styles.input}
                     placeholder="Start (e.g., 2025-10-25 4:00 PM)"
                     placeholderTextColor="#8E8E93"
                     value={eventStart}
                     onChangeText={setEventStart}
                  />
                  <View style={styles.divider} />
                  <TextInput
                     style={styles.input}
                     placeholder="End (e.g., 2025-10-25 10:00 PM)"
                     placeholderTextColor="#8E8E93"
                     value={eventEnd}
                     onChangeText={setEventEnd}
                  />
                  <View style={styles.divider} />
                  <TextInput
                     style={styles.input}
                     placeholder="Location"
                     placeholderTextColor="#8E8E93"
                     value={locationName}
                     onChangeText={setLocationName}
                  />
               </View>

               <TouchableOpacity
                  style={[styles.saveButton, isButtonDisabled && styles.saveButtonDisabled]}
                  onPress={onSave}
                  disabled={isButtonDisabled}
               >
                  <Text style={styles.saveButtonText}>Save</Text>
               </TouchableOpacity>
         </ScrollView>
      </SafeAreaView>
   );
};

const styles = StyleSheet.create({
   safeArea: {
      flex: 1,
      backgroundColor: '#FFFFFF',
   },
   container: {
      flex: 1,
   },
   contentPadding: {
      padding: 16,
   },
   headerImagePicker: {
      width: '100%',
      height: 200,
      borderRadius: 12,
      backgroundColor: '#F0F0F0',
      marginBottom: 16,
      overflow: 'hidden',
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: '#E0E0E0',
   },
   headerImage: {
      width: '100%',
      height: '100%',
   },
   imagePlaceholder: {
      justifyContent: 'center',
      alignItems: 'center',
   },
   imagePlaceholderText: {
      marginTop: 8,
      color: '#8E8E93',
      fontSize: 14,
   },
   inputGroup: {
      marginBottom: 20,
   },
   input: {
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: '#E0E0E0',
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 16,
      color: '#1C1C1E',
      marginBottom: 12,
   },
   descriptionInput: {
      height: 100,
      textAlignVertical: 'top',
      paddingTop: 14,
   },
   sectionTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: '#1C1C1E',
      marginBottom: 12,
   },
   sectionBox: {
      backgroundColor: '#F7F7F7',
      borderRadius: 12,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: '#E0E0E0',
      overflow: 'hidden',
      paddingHorizontal: 12,
      paddingVertical: 6,
   },
   divider: {
      height: 1,
      backgroundColor: '#E0E0E0',
      marginLeft: 6,
      marginVertical: 6,
   },
   saveButton: {
      backgroundColor: '#000',
      paddingVertical: 16,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 20,
   },
   saveButtonDisabled: {
      backgroundColor: '#8E8E93',
   },
   saveButtonText: {
      color: '#FFFFFF',
      fontSize: 17,
      fontWeight: '600',
   },
});

export default CreateEventDetailsScreen;