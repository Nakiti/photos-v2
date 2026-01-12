import React, { useState, useEffect, useMemo } from "react";
import { 
    View, Text, TouchableOpacity, StyleSheet, Alert, Platform, ScrollView 
} from "react-native";
import { useRoute } from "@react-navigation/native";
import { useGallery, useUpdateGallery } from "../../../../hooks/useGalleryData";
import { useMyMembership } from "../../../../hooks/useMembershipData";
import { ActivityIndicator } from "react-native-paper";
import { useQueryClient } from "@tanstack/react-query";

interface EditGalleryEventProps { galleryId: string | number }

const EditGalleryEventScreen = () => {
   const route = useRoute();
   const queryClient = useQueryClient();
   const { galleryId } = route.params as { galleryId: string };

   // Fetch gallery data and user's membership
   const { gallery, isLoading, isError, error } = useGallery(galleryId);
   const { data: myMembership } = useMyMembership(galleryId);
   const { mutate: updateGallery, isPending: isUpdating } = useUpdateGallery();

   const [startDate, setStartDate] = useState(new Date());
   const [endDate, setEndDate] = useState(new Date());
   
   const [initialStartDate, setInitialStartDate] = useState(new Date());
   const [initialEndDate, setInitialEndDate] = useState(new Date());

   const [pickerMode, setPickerMode] = useState('start');
   const [isPickerVisible, setIsPickerVisible] = useState(false);

   // Load initial dates from gallery
   useEffect(() => {
      if (gallery) {
         const start = gallery.startDate ? new Date(gallery.startDate) : new Date();
         const end = gallery.endDate ? new Date(gallery.endDate) : new Date(start.getTime() + 2 * 60 * 60 * 1000);
         setStartDate(start);
         setEndDate(end);
         setInitialStartDate(start);
         setInitialEndDate(end);
      }
   }, [gallery]);

   const isDirty = useMemo(() => {
      return startDate.toISOString() !== initialStartDate.toISOString() || 
             endDate.toISOString() !== initialEndDate.toISOString();
   }, [startDate, endDate, initialStartDate, initialEndDate]);

   const handleSave = () => {
      if (!isDirty || isUpdating) return;
      
      if (startDate >= endDate) {
         Alert.alert("Invalid Dates", "The start date must be before the end date.");
         return;
      }

      updateGallery(
         { 
            galleryId, 
            data: { 
               startDate: startDate.toISOString(), 
               endDate: endDate.toISOString() 
            } 
         },
         {
            onSuccess: () => {
               Alert.alert('Success', 'Event dates updated!');
               queryClient.invalidateQueries({ queryKey: ['gallery', galleryId] });
               // Update initial dates to reflect saved state
               setInitialStartDate(startDate);
               setInitialEndDate(endDate);
            },
            onError: () => {
               Alert.alert('Error', 'Failed to update event dates.');
            },
         }
      );
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
         <ScrollView contentContainerStyle={styles.scrollContainer}>
               <TouchableOpacity 
                  style={styles.dateButton} 
                  onPress={() => showPicker('start')}
                  disabled={!canEdit}
               >
                  <Text style={styles.dateButtonLabel}>Starts</Text>
                  <Text style={styles.dateButtonValue}>{formatDate(startDate)}</Text>
               </TouchableOpacity>

               <TouchableOpacity 
                  style={styles.dateButton} 
                  onPress={() => showPicker('end')}
                  disabled={!canEdit}
               >
                  <Text style={styles.dateButtonLabel}>Ends</Text>
                  <Text style={styles.dateButtonValue}>{formatDate(endDate)}</Text>
               </TouchableOpacity>

               {/* Dummy: omit real picker in presentational mode */}
         </ScrollView>

         {canEdit && <View style={styles.buttonContainer}>
               <TouchableOpacity 
                  style={[styles.saveButton, (!isDirty || isUpdating) && styles.disabledButton]} 
                  onPress={handleSave}
                  disabled={!isDirty || isUpdating}
               >
                  <Text style={styles.saveButtonText}>
                     {isUpdating ? 'Saving...' : 'Save Changes'}
                  </Text>
               </TouchableOpacity>
         </View>}
      </View>
   );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        justifyContent: 'space-between',
    },
    center: {
        justifyContent: 'center',
        alignItems: 'center',
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
    errorText: {
        color: 'red',
    },
});

export default EditGalleryEventScreen;