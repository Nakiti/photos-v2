import React, { useState, useEffect } from "react";
import { 
    View, Text, TouchableOpacity, StyleSheet, Alert, Platform, ScrollView 
} from "react-native";
// Presentational: avoid external datetime picker dependency

interface EditGalleryEventProps { galleryId: string | number }

const EditGalleryEventScreen = ({ galleryId }: EditGalleryEventProps) => {

   const [startDate, setStartDate] = useState(new Date());
   const [endDate, setEndDate] = useState(new Date());
   
   const [initialStartDate, setInitialStartDate] = useState(new Date());
   const [initialEndDate, setInitialEndDate] = useState(new Date());

   const [pickerMode, setPickerMode] = useState('start');
   const [isPickerVisible, setIsPickerVisible] = useState(false);
   const [isDisabled, setIsDisabled] = useState(true);

   useEffect(() => {
      // Dummy load
      const now = new Date();
      const later = new Date(now.getTime() + 2 * 60 * 60 * 1000);
      setStartDate(now);
      setEndDate(later);
      setInitialStartDate(now);
      setInitialEndDate(later);
   }, [galleryId]);

   useEffect(() => {
      const hasChanged = startDate.toISOString() !== initialStartDate.toISOString() || endDate.toISOString() !== initialEndDate.toISOString();
      setIsDisabled(!hasChanged);
   }, [startDate, endDate, initialStartDate, initialEndDate]);

   const handleSave = () => {
      if (isDisabled) return;
      setIsDisabled(true);
      if (startDate >= endDate) {
         Alert.alert("Invalid Dates", "The start date must be before the end date.");
         setIsDisabled(false);
         return;
      }
      Alert.alert("Success", `Event dates saved for Gallery ${galleryId}.`);
   };

   const showPicker = (mode: 'start' | 'end') => {
      setPickerMode(mode);
      setIsPickerVisible(true);
   };

   const onDateChange = (event: any, selectedDate?: Date) => {
      setIsPickerVisible(false); // Hide picker on selection or dismissal
      if (selectedDate) {
         if (pickerMode === 'start') {
               setStartDate(selectedDate);
         } else {
               setEndDate(selectedDate);
         }
      }
   };

   const formatDate = (date: Date) => {
      return date.toLocaleString('en-US', {
         month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit'
      });
   };

   return (
      <View style={styles.container}>
         <ScrollView contentContainerStyle={styles.scrollContainer}>
               <TouchableOpacity style={styles.dateButton} onPress={() => showPicker('start')}>
                  <Text style={styles.dateButtonLabel}>Starts</Text>
                  <Text style={styles.dateButtonValue}>{formatDate(startDate)}</Text>
               </TouchableOpacity>

               <TouchableOpacity style={styles.dateButton} onPress={() => showPicker('end')}>
                  <Text style={styles.dateButtonLabel}>Ends</Text>
                  <Text style={styles.dateButtonValue}>{formatDate(endDate)}</Text>
               </TouchableOpacity>

               {/* Dummy: omit real picker in presentational mode */}
         </ScrollView>

         <View style={styles.buttonContainer}>
               <TouchableOpacity 
                  style={[styles.saveButton, isDisabled && styles.disabledButton]} 
                  onPress={handleSave}
                  disabled={isDisabled}
               >
                  <Text style={styles.saveButtonText}>Save Changes</Text>
               </TouchableOpacity>
         </View>
      </View>
   );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        justifyContent: 'space-between',
    },
    scrollContainer: {
        paddingTop: 30,
        paddingHorizontal: 20,
    },
    dateButton: {
        width: '100%',
        backgroundColor: '#F5F5F5',
        borderRadius: 14,
        paddingHorizontal: 20,
        minHeight: 56,
        marginBottom: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    dateButtonLabel: {
        fontSize: 16,
        color: '#000000',
        fontWeight: '500',
    },
    dateButtonValue: {
        fontSize: 16,
        color: '#8A8A8E', // A slightly dimmer color for the value
    },
    buttonContainer: {
        paddingHorizontal: 20,
        paddingBottom: 40, // Padding for home bar
        paddingTop: 20,
    },
    saveButton: {
        backgroundColor: '#007AFF',
        paddingVertical: 16,
        borderRadius: 14,
        alignItems: 'center',
    },
    disabledButton: {
        backgroundColor: '#C7C7CC',
    },
    saveButtonText: {
        color: '#FFFFFF',
        fontSize: 17,
        fontWeight: '600',
    },
});

export default EditGalleryEventScreen;