import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { useImagePicker } from '../../../hooks/useImagePicker';
import FastImage from 'react-native-fast-image';
import { useCreateGroup } from '../../../hooks/useGroupData';

// --- Theme ---
const COLORS = {
    bg: '#FFFFFF',
    textPrimary: '#000000',
    textSecondary: '#8E8E93',
    placeholder: '#C7C7CC',
    button: '#000000',
    buttonText: '#FFFFFF',
    border: '#E5E5EA',
    bannerPlaceholder: '#F2F2F7',
};

const CreateGroupDetailsScreen = () => {
  const navigation = useNavigation<any>();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [imageUri, setImageUri] = useState<string | undefined>(undefined);

  const { mutateAsync: createGroup, isPending: isCreating } = useCreateGroup();

  const { pickImages } = useImagePicker();

  const onPickImage = () => {
    pickImages({ quality: 0.8 }, ([asset]) => {
      if (asset) setImageUri(asset.uri);
    });
  };

  const onContinue = async () => {
    if (!name.trim()) return;
    try {
      const newGroup = await createGroup({
        data: { name: name.trim(), description: description.trim() || undefined },
        imageUri: imageUri ?? null,
      });
      navigation.navigate("ShareGroup", {
        groupId: newGroup.id,
        fromCreateFlow: true,
      });
    } catch (e: any) {
      Alert.alert('Failed to create group', e?.message ?? 'Please try again.');
    }
  };

  const isButtonDisabled = !name.trim() || isCreating;

  return (
    <View style={styles.root}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            
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
                      <Ionicons name="camera" size={24} color={COLORS.textPrimary} />
                    </View>
                    <Text style={styles.bannerText}>Add Group Cover</Text>
                </View>
              )}
              
              {imageUri && (
                <View style={styles.editBadge}>
                  <Ionicons name="pencil" size={14} color="#FFF" />
                </View>
              )}
            </TouchableOpacity>

            {/* 2. Form Inputs */}
            <View style={styles.formContainer}>
                
                {/* Name Input */}
                <View style={styles.titleInputWrapper}>
                  <Text style={styles.label}>GROUP NAME</Text>
                  <TextInput
                    style={styles.nameInput}
                    placeholder="Name your group"
                    placeholderTextColor={COLORS.placeholder}
                    value={name}
                    onChangeText={setName}
                    returnKeyType="next"
                    autoCorrect={false}
                    autoCapitalize="words"
                  />
                </View>

                {/* Description Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>DESCRIPTION</Text>
                  <TextInput
                    style={styles.descriptionInput}
                    placeholder="What is this group about? (Optional)"
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
                style={[styles.continueButton, isButtonDisabled && styles.buttonDisabled]}
                onPress={onContinue}
                disabled={isButtonDisabled}
                activeOpacity={0.8}
            >
                {isCreating ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <View style={styles.buttonContent}>
                      <Text style={styles.buttonText}>Create Group</Text>
                      <Ionicons name="arrow-forward" size={18} color="#FFF" />
                  </View>
                )}
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
  
  // --- Banner Picker ---
  bannerPicker: {
    height: 220,
    width: '100%',
    backgroundColor: COLORS.bannerPlaceholder,
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
    gap: 32,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
    letterSpacing: 1, // Uppercase Tracking
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

  // Description Input
  inputGroup: {
      gap: 0,
  },
  descriptionInput: {
    fontSize: 16,
    color: COLORS.textPrimary,
    minHeight: 100,
    lineHeight: 24,
    marginTop: 4,
  },

  // --- Footer ---
  footer: {
    backgroundColor: COLORS.bg,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F2',
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  continueButton: {
    backgroundColor: COLORS.button,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
  },
  buttonDisabled: {
    backgroundColor: '#E5E5EA',
  },
  buttonText: {
    color: COLORS.buttonText,
    fontSize: 17,
    fontWeight: '600',
  },
});

export default CreateGroupDetailsScreen;