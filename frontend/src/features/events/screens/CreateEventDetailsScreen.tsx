import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  TouchableWithoutFeedback,
  Keyboard,
  SafeAreaView,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { launchImageLibrary, ImagePickerResponse } from 'react-native-image-picker';
import { useCreateGallery } from '../../../hooks/useGalleryData';
import { useNavigation, useRoute } from '@react-navigation/native';

// iOS Standard Design System
const COLORS = {
  background: '#FFFFFF',
  inputBg: '#F2F2F7', // System Gray 6
  textPrimary: '#000000',
  textSecondary: '#8E8E93', // System Gray
  placeholder: '#C7C7CC',
  button: '#000000',
  buttonText: '#FFFFFF',
  tint: '#007AFF', // Apple Blue
  danger: '#FF3B30', // System Red
  border: '#E5E5EA',
};

const CreateEventDetailsScreen = () => {
   const navigation = useNavigation<any>();
   const route = useRoute()

   const { communityId } = route.params 

   const { mutateAsync: createGallery, isPending } = useCreateGallery();
   
   const [eventName, setEventName] = useState('');
   const [description, setDescription] = useState('');
   const [imageUri, setImageUri] = useState<string | undefined>(undefined);
   const [eventStart, setEventStart] = useState<string>('');
   const [eventEnd, setEventEnd] = useState<string>('');
   const [locationName, setLocationName] = useState<string>('');
   const [attemptedSubmit, setAttemptedSubmit] = useState(false);

   // --- Logic Helpers ---
   const toIsoFromMmDdYyyy = (value: string): string | null => {
     const trimmed = value.trim();
     const parts = trimmed.split(/[\/\-]/);
     if (parts.length !== 3) return null;
     const [mmStr, ddStr, yyyyStr] = parts;
     const month = parseInt(mmStr, 10);
     const day = parseInt(ddStr, 10);
     const year = parseInt(yyyyStr, 10);
     if (
       Number.isNaN(month) || Number.isNaN(day) || Number.isNaN(year) ||
       month < 1 || month > 12 || day < 1 || day > 31 || year < 1900
     ) return null;
     
     const iso = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0)).toISOString();
     const d = new Date(iso);
     if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) {
       return null;
     }
     return iso;
   };

   const startIso = toIsoFromMmDdYyyy(eventStart);
   const endIso = toIsoFromMmDdYyyy(eventEnd);
   const datesValid = !!startIso && !!endIso && new Date(startIso) <= new Date(endIso);

   const areRequiredFilled =
     !!eventName.trim() && !!eventStart.trim() && !!eventEnd.trim() && !!locationName.trim();
   const isButtonDisabled = isPending; // Allow click to show errors, or strictly disable

   // --- Handlers ---
   const onPickImage = () => {
      launchImageLibrary({ mediaType: 'photo', quality: 0.7 }, (response: ImagePickerResponse) => {
         if (response.didCancel || response.errorMessage) return;
         if (response.assets && response.assets[0]?.uri) {
            setImageUri(response.assets[0].uri);
         }
      });
   };

   const onSave = async () => {
      setAttemptedSubmit(true);
      if (!areRequiredFilled) {
         Alert.alert('Missing Info', 'Please fill in all required fields.');
         return;
      }
      if (!datesValid) {
         Alert.alert('Invalid Dates', 'End date must be after Start date.');
         return;
      }
      
      Keyboard.dismiss();
      try {
         const newGallery = await createGallery({
           galleryData: {
             name: eventName.trim(),
             type: 'EVENT',
             startDate: startIso,
             endDate: endIso,
             location: locationName?.trim() || null,
             communityId: communityId || null
           },
           imageUri: imageUri ?? null,
         });
         navigation.navigate('CreateEventSettings', { galleryId: newGallery.id });
      } catch (e: any) {
         Alert.alert('Error', e?.message ?? 'Failed to create event.');
      }
   };

   // Helper to determine if a specific field has an error
   const hasError = (condition: boolean) => attemptedSubmit && condition;

   return (
      <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
         <KeyboardAvoidingView 
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.keyboardAvoiding}
            keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
         >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
               <View style={styles.container}>
                  <ScrollView 
                     contentContainerStyle={styles.scrollContent} 
                     showsVerticalScrollIndicator={false}
                     keyboardShouldPersistTaps="handled"
                  >

                     {/* --- Image Picker --- */}
                     <View style={styles.imageSection}>
                        <TouchableOpacity 
                           style={styles.imagePicker} 
                           onPress={onPickImage}
                           activeOpacity={0.8}
                        >
                           {imageUri ? (
                              <Image source={{ uri: imageUri }} style={styles.image} />
                           ) : (
                              <Ionicons name="camera" size={32} color={COLORS.textSecondary} />
                           )}
                           {/* Edit Badge */}
                           {imageUri && (
                              <View style={styles.editBadge}>
                                 <Ionicons name="pencil" size={12} color="#FFF" />
                              </View>
                           )}
                        </TouchableOpacity>
                        <Text style={styles.photoLabel}>
                           {imageUri ? 'Edit Photo' : 'Add Cover Photo'}
                        </Text>
                     </View>

                     {/* --- Form Fields --- */}
                     <View style={styles.inputContainer}>
                        
                        {/* Event Name */}
                        <View style={styles.field}>
                           <Text style={styles.label}>Event Name</Text>
                           <TextInput
                              style={[
                                 styles.input, 
                                 hasError(!eventName.trim()) && styles.inputError
                              ]}
                              placeholder="e.g. Summer Kickoff"
                              placeholderTextColor={COLORS.placeholder}
                              value={eventName}
                              onChangeText={setEventName}
                              returnKeyType="next"
                              autoCorrect={false}
                           />
                        </View>

                        {/* Location */}
                        <View style={styles.field}>
                           <Text style={styles.label}>Location</Text>
                           <TextInput
                              style={[
                                 styles.input, 
                                 hasError(!locationName.trim()) && styles.inputError
                              ]}
                              placeholder="e.g. Central Park"
                              placeholderTextColor={COLORS.placeholder}
                              value={locationName}
                              onChangeText={setLocationName}
                              returnKeyType="next"
                           />
                        </View>

                        {/* Dates Row */}
                        <View style={styles.row}>
                           <View style={[styles.field, styles.halfField]}>
                              <Text style={styles.label}>Start Date</Text>
                              <TextInput
                                 style={[
                                    styles.input, 
                                    hasError(!eventStart.trim() || !startIso) && styles.inputError
                                 ]}
                                 placeholder="mm/dd/yyyy"
                                 placeholderTextColor={COLORS.placeholder}
                                 value={eventStart}
                                 onChangeText={setEventStart}
                                 keyboardType="numbers-and-punctuation"
                                 returnKeyType="next"
                              />
                           </View>
                           <View style={[styles.field, styles.halfField]}>
                              <Text style={styles.label}>End Date</Text>
                              <TextInput
                                 style={[
                                    styles.input, 
                                    hasError(!eventEnd.trim() || !endIso) && styles.inputError
                                 ]}
                                 placeholder="mm/dd/yyyy"
                                 placeholderTextColor={COLORS.placeholder}
                                 value={eventEnd}
                                 onChangeText={setEventEnd}
                                 keyboardType="numbers-and-punctuation"
                                 returnKeyType="next"
                              />
                           </View>
                        </View>
                        {hasError(!!startIso && !!endIso && new Date(endIso) < new Date(startIso)) && (
                           <Text style={styles.errorText}>End date cannot be before start date.</Text>
                        )}

                        {/* Description */}
                        <View style={styles.field}>
                           <Text style={styles.label}>
                              Description <Text style={styles.optionalLabel}>(Optional)</Text>
                           </Text>
                           <TextInput
                              style={[styles.input, styles.descriptionInput]}
                              placeholder="Add details about your event..."
                              placeholderTextColor={COLORS.placeholder}
                              multiline
                              value={description}
                              onChangeText={setDescription}
                              textAlignVertical="top"
                           />
                        </View>
                     </View>

                  </ScrollView>

                  {/* --- Footer Button --- */}
                  <View style={styles.footer}>
                     <TouchableOpacity
                        style={[
                           styles.button, 
                           (isButtonDisabled || (attemptedSubmit && (!areRequiredFilled || !datesValid))) && styles.buttonDisabled
                        ]}
                        onPress={onSave}
                        disabled={isPending}
                        activeOpacity={0.8}
                     >
                        {isPending ? (
                           <ActivityIndicator color={COLORS.buttonText} />
                        ) : (
                           <Text style={styles.buttonText}>Continue</Text>
                        )}
                     </TouchableOpacity>
                  </View>
               </View>
            </TouchableWithoutFeedback>
         </KeyboardAvoidingView>
      </SafeAreaView>
   );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  keyboardAvoiding: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 40,
  },
  
  // Header
  headerTitle: {
    fontSize: 34,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 24,
    letterSpacing: -0.5,
  },

  // Image Picker
  imageSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  imagePicker: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.inputBg,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 60,
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: COLORS.textSecondary,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.background,
  },
  photoLabel: {
    marginTop: 12,
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.tint,
  },

  // Inputs
  inputContainer: {
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  field: {
    marginBottom: 20,
  },
  halfField: {
    flex: 1,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 8,
    marginLeft: 4,
  },
  optionalLabel: {
    fontWeight: '400',
    color: COLORS.textSecondary,
  },
  input: {
    backgroundColor: COLORS.inputBg,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16, // Taller touch target
    fontSize: 17,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: 'transparent', // Hidden border for error state toggling
  },
  inputError: {
    borderColor: COLORS.danger,
    backgroundColor: '#FFF0F0', // Very light red tint
  },
  descriptionInput: {
    height: 100,
    paddingTop: 16,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 13,
    marginTop: -12,
    marginBottom: 16,
    marginLeft: 4,
  },

  // Footer
  footer: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F2',
    backgroundColor: COLORS.background, // Ensure opaque background
  },
  button: {
    backgroundColor: COLORS.button,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#E5E5EA',
  },
  buttonText: {
    color: COLORS.buttonText,
    fontSize: 17,
    fontWeight: '700',
  },
});

export default CreateEventDetailsScreen;