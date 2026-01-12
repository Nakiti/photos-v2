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
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { launchImageLibrary, ImagePickerResponse } from 'react-native-image-picker';
import { useNavigation, useRoute } from '@react-navigation/native';
import FastImage from 'react-native-fast-image';

// Modern Monochrome Theme
const COLORS = {
  bg: '#FFFFFF',
  textPrimary: '#000000',
  textSecondary: '#8E8E93',
  placeholder: '#C7C7CC',
  border: '#E5E5EA',
  danger: '#FF3B30',
  black: '#000000',
  white: '#FFFFFF',
};

const CreateEventDetailsScreen = () => {
   const navigation = useNavigation<any>();
   const route = useRoute();
   const routeParams = route.params as { communityId?: string } | undefined;
   const communityId = routeParams?.communityId;
   
   // State
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
   const areRequiredFilled = !!eventName.trim() && !!eventStart.trim() && !!eventEnd.trim() && !!locationName.trim();

   // --- Handlers ---
   const onPickImage = () => {
      launchImageLibrary({ mediaType: 'photo', quality: 0.8 }, (response: ImagePickerResponse) => {
         if (response.didCancel || response.errorMessage) return;
         if (response.assets && response.assets[0]?.uri) {
            setImageUri(response.assets[0].uri);
         }
      });
   };

   const onContinue = () => {
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
      
      navigation.navigate('CreateEventSettings', { 
         name: eventName.trim(),
         description: description.trim(),
         imageUri: imageUri ?? null,
         startDate: startIso!,
         endDate: endIso!,
         location: locationName.trim(),
         communityId: communityId,
      });
   };

   const hasError = (condition: boolean) => attemptedSubmit && condition;

   return (
      <View style={styles.root}>
         <KeyboardAvoidingView 
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ flex: 1 }}
            keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0} 
         >
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
               
               {/* 1. Banner Photo Picker */}
               <TouchableOpacity 
                  style={styles.bannerPicker} 
                  onPress={onPickImage}
                  activeOpacity={0.9}
               >
                  {imageUri ? (
                     <FastImage 
                        source={{ uri: imageUri }} 
                        style={styles.bannerImage} 
                        resizeMode={FastImage.resizeMode.cover} 
                     />
                  ) : (
                     <View style={styles.bannerPlaceholder}>
                        <View style={styles.iconCircle}>
                           <Ionicons name="camera" size={24} color={COLORS.black} />
                        </View>
                        <Text style={styles.bannerText}>Add Event Photo</Text>
                     </View>
                  )}
                  {imageUri && (
                     <View style={styles.editBadge}>
                        <Ionicons name="pencil" size={14} color="#FFF" />
                     </View>
                  )}
               </TouchableOpacity>

               {/* 2. Main Form */}
               <View style={styles.formContainer}>
                  
                  {/* Event Name (Big Title Input) */}
                  <View style={styles.titleInputWrapper}>
                     <Text style={styles.label}>EVENT NAME</Text>
                     <TextInput
                        style={[styles.nameInput, hasError(!eventName.trim()) && styles.textError]}
                        placeholder="Name your event"
                        placeholderTextColor={COLORS.placeholder}
                        value={eventName}
                        onChangeText={setEventName}
                        autoCapitalize="words"
                     />
                  </View>

                  {/* Location */}
                  <View style={styles.inputGroup}>
                     <Text style={styles.label}>LOCATION</Text>
                     <TextInput
                        style={[styles.stdInput, hasError(!locationName.trim()) && styles.borderError]}
                        placeholder="Where is it happening?"
                        placeholderTextColor={COLORS.placeholder}
                        value={locationName}
                        onChangeText={setLocationName}
                     />
                  </View>

                  {/* Dates Row */}
                  <View style={styles.row}>
                     <View style={[styles.inputGroup, { flex: 1 }]}>
                        <Text style={styles.label}>START (MM/DD/YYYY)</Text>
                        <TextInput
                           style={[styles.stdInput, hasError(!startIso) && styles.borderError]}
                           placeholder="01/01/2024"
                           placeholderTextColor={COLORS.placeholder}
                           value={eventStart}
                           onChangeText={setEventStart}
                           keyboardType="numbers-and-punctuation"
                           maxLength={10}
                        />
                     </View>
                     <View style={styles.spacer} />
                     <View style={[styles.inputGroup, { flex: 1 }]}>
                        <Text style={styles.label}>END (MM/DD/YYYY)</Text>
                        <TextInput
                           style={[styles.stdInput, hasError(!endIso) && styles.borderError]}
                           placeholder="01/02/2024"
                           placeholderTextColor={COLORS.placeholder}
                           value={eventEnd}
                           onChangeText={setEventEnd}
                           keyboardType="numbers-and-punctuation"
                           maxLength={10}
                        />
                     </View>
                  </View>

                  {/* Description */}
                  <View style={styles.inputGroup}>
                     <Text style={styles.label}>DESCRIPTION</Text>
                     <TextInput
                        style={styles.descriptionInput}
                        placeholder="Add details about your event... (Optional)"
                        placeholderTextColor={COLORS.placeholder}
                        multiline
                        value={description}
                        onChangeText={setDescription}
                        textAlignVertical="top"
                     />
                  </View>
               </View>

            </ScrollView>

            {/* 3. Sticky Footer */}
            <SafeAreaView style={styles.footer}>
               <TouchableOpacity
                  style={styles.continueButton}
                  onPress={onContinue}
                  activeOpacity={0.8}
               >
                  <Text style={styles.buttonText}>Continue</Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFF" style={{ marginLeft: 8 }} />
               </TouchableOpacity>
            </SafeAreaView>

         </KeyboardAvoidingView>
      </View>
   );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  scrollContent: {
    paddingBottom: 40,
  },

  // --- Banner ---
  bannerPicker: {
    height: 220,
    width: '100%',
    backgroundColor: '#F2F2F7', // System Gray 6
    position: 'relative',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  bannerPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  iconCircle: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: '#FFF',
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
  },
  bannerText: {
      fontSize: 14,
      fontWeight: '600',
      color: COLORS.textSecondary,
  },
  editBadge: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 8,
    borderRadius: 20,
  },

  // --- Form ---
  formContainer: {
    paddingHorizontal: 24,
    paddingTop: 32,
    gap: 28,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
    letterSpacing: 1,
    marginBottom: 8,
  },
  
  // Title Input
  titleInputWrapper: {
      gap: 0,
  },
  nameInput: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.textPrimary,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  // Standard Inputs
  inputGroup: {
     gap: 0,
  },
  stdInput: {
     fontSize: 17,
     color: COLORS.textPrimary,
     paddingVertical: 12,
     borderBottomWidth: 1,
     borderBottomColor: COLORS.border,
  },
  descriptionInput: {
    fontSize: 16,
    color: COLORS.textPrimary,
    minHeight: 100,
    lineHeight: 24,
    marginTop: 4,
  },
  
  // Layout Helpers
  row: {
     flexDirection: 'row',
     alignItems: 'center',
  },
  spacer: {
     width: 20,
  },
  
  // Errors
  borderError: {
     borderBottomColor: COLORS.danger,
  },
  textError: {
     color: COLORS.danger,
  },

  // --- Footer ---
  footer: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
    backgroundColor: COLORS.bg,
  },
  continueButton: {
    backgroundColor: COLORS.black,
    height: 56,
    borderRadius: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 17,
    fontWeight: '600',
  },
});

export default CreateEventDetailsScreen;