import React, { useState } from "react";
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, 
  TouchableWithoutFeedback, Keyboard, SafeAreaView, 
  Alert, KeyboardAvoidingView, Platform, ScrollView 
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { launchImageLibrary, ImagePickerResponse } from "react-native-image-picker";
import FastImage from "react-native-fast-image";

const COLORS = {
  black: '#000000',
  white: '#FFFFFF',
  bg: '#FFFFFF', // Pure white background
  placeholder: '#F2F2F7', // System Gray 6
  textSecondary: '#8E8E93',
  border: '#E5E5EA',
};

const CreateGroupDetailsScreen = () => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [imageUri, setImageUri] = useState<string | undefined>(undefined);
  const route = useRoute()
  const {communityId} = route.params as any

  const navigation = useNavigation();

  const onPickImage = () => {
    launchImageLibrary({ mediaType: 'photo', quality: 0.8 }, (response: ImagePickerResponse) => {
      if (response.didCancel) return;
      if (response.errorMessage) {
        Alert.alert('Error', response.errorMessage);
        return;
      } 
      if (response.assets && response.assets[0]?.uri) {
        setImageUri(response.assets[0].uri);
      }
    });
  };

  const onContinue = () => {
    if (!name.trim()) return;

    (navigation as any).navigate("CreateGroupSettings", {
      name: name.trim(),
      description: description.trim(),
      imageUri: imageUri ?? null,
      communityId: communityId
    });
  };

  const isButtonDisabled = !name.trim();

  return (
    <View style={styles.root}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0} // Adjust for header height
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          
          {/* 1. Cover Photo Picker */}
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
                <Text style={styles.bannerText}>Add Cover Photo</Text>
              </View>
            )}

            {/* Edit Badge (Only shows if image exists) */}
            {imageUri && (
                <View style={styles.editBadge}>
                    <Ionicons name="pencil" size={14} color="#FFF" />
                </View>
            )}
          </TouchableOpacity>

          {/* 2. Form Fields */}
          <View style={styles.formContainer}>
            
            <View style={styles.inputGroup}>
                <Text style={styles.label}>GROUP NAME</Text>
                <TextInput
                    style={styles.nameInput}
                    placeholder="Name your group"
                    placeholderTextColor="#C7C7CC"
                    value={name}
                    onChangeText={setName}
                    returnKeyType="next"
                    autoFocus
                />
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.label}>DESCRIPTION</Text>
                <TextInput
                    style={styles.descriptionInput}
                    placeholder="What is this group about? (Optional)"
                    placeholderTextColor="#C7C7CC"
                    multiline
                    value={description}
                    onChangeText={setDescription}
                    textAlignVertical="top"
                />
            </View>

          </View>
        </ScrollView>

        {/* 3. Footer Action */}
        <SafeAreaView style={styles.footer}>
            <TouchableOpacity
                style={[styles.continueButton, isButtonDisabled && styles.buttonDisabled]}
                onPress={onContinue}
                disabled={isButtonDisabled}
            >
                <Text style={styles.buttonText}>Continue</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFF" style={{marginLeft: 8}} />
            </TouchableOpacity>
        </SafeAreaView>

      </KeyboardAvoidingView>
    </View>
  );
};

export default CreateGroupDetailsScreen;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  scrollContent: {
      paddingBottom: 40,
  },

  // --- Banner Picker ---
  bannerPicker: {
    height: 220,
    width: '100%',
    backgroundColor: COLORS.placeholder,
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
    gap: 32, // Space between input groups
  },
  inputGroup: {
      gap: 12,
  },
  label: {
      fontSize: 11,
      fontWeight: '700',
      color: COLORS.textSecondary,
      letterSpacing: 1, // Uppercase tracking
  },
  nameInput: {
    fontSize: 28, // Large Title Style
    fontWeight: '700',
    color: COLORS.black,
    paddingVertical: 0, // Tighten up
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: 12,
  },
  descriptionInput: {
    fontSize: 17, // Body Style
    color: COLORS.black,
    minHeight: 80,
    lineHeight: 24,
  },

  // --- Footer ---
  footer: {
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderTopWidth: 1,
      borderTopColor: COLORS.placeholder,
      backgroundColor: COLORS.white,
  },
  continueButton: {
    backgroundColor: COLORS.black,
    height: 56, // Taller touch target
    borderRadius: 28, // Pill shape
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#E5E5EA', // Disabled Grey
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 17,
    fontWeight: '600',
  },
});