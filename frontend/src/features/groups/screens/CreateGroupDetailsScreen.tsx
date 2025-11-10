import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, TouchableWithoutFeedback, Keyboard, SafeAreaView, ActivityIndicator, Alert } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";
import { useCreateGallery } from "../../../hooks/useGalleryData";
import { launchImageLibrary, ImagePickerResponse } from "react-native-image-picker";

const CreateGroupDetailsScreen = () => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [imageUri, setImageUri] = useState<string | undefined>(undefined);

  const { mutateAsync, isPending, isError } = useCreateGallery()
  const navigation = useNavigation()

  const onPickImage = () => {
    launchImageLibrary({ mediaType: 'photo', quality: 0.7 }, (response: ImagePickerResponse) => {
      if (response.didCancel) {
        return;
      } else if (response.errorMessage) {
        Alert.alert('Error', response.errorMessage);
        return;
      } else if (response.assets && response.assets[0]?.uri) {
        setImageUri(response.assets[0].uri);
      }
    });
  };

  const onContinue = async () => {
    if (!name.trim() || isPending) return;

    try {
      const gallery = await mutateAsync({
        galleryData: {
          name: name.trim(),
          type: "GROUP",
        },
        imageUri: imageUri ?? null,
      });

      (navigation as any).navigate("AddGroupMembers", {galleryId: gallery.id});
    } catch (error) {
      console.error("Failed to create group:", error);
      Alert.alert(
        "Creation Failed",
        "Could not create the group. Please try again."
      );
    }
  };

  const isButtonDisabled = !name.trim();

  return (
    <SafeAreaView style={styles.safeArea}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.container}>
          <TouchableOpacity style={styles.imagePicker} onPress={onPickImage}>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.image} />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Ionicons name="camera-outline" size={40} color={COLORS.gray} />
                <Text style={styles.imagePlaceholderText}>Add Photo</Text>
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Group Name"
              placeholderTextColor={COLORS.gray}
              value={name}
              onChangeText={setName}
              returnKeyType="next"
            />
            <TextInput
              style={[styles.input, styles.descriptionInput]}
              placeholder="Description (Optional)"
              placeholderTextColor={COLORS.gray}
              multiline
              value={description}
              onChangeText={setDescription}
            />
          </View>

          <TouchableOpacity
            style={[styles.button, (isButtonDisabled || isPending) && styles.buttonDisabled]}
            onPress={onContinue}
            disabled={isButtonDisabled || isPending}
          >
            {isPending ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.buttonText}>Continue</Text>
            )}
          </TouchableOpacity>
        </View>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
};

export default CreateGroupDetailsScreen;

const COLORS = {
  black: '#000000',
  white: '#FFFFFF',
  lightGray: '#F5F5F5',
  gray: '#8E8E93',
  border: '#E0E0E0',
  darkGray: '#1C1C1E',
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    backgroundColor: COLORS.white,
  },
  imagePicker: {
    width: 150,
    height: 150,
    borderRadius: 75,
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.lightGray,
    marginBottom: 40,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderText: {
    marginTop: 8,
    color: COLORS.gray,
    fontSize: 14,
  },
  inputContainer: {
    width: '100%',
  },
  input: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: COLORS.black,
    marginBottom: 16,
  },
  descriptionInput: {
    height: 100,
    textAlignVertical: 'top',
    paddingTop: 14,
  },
  permissionsSection: {
    borderColor: COLORS.border,
    borderRadius: 12,
  },
  button: {
    backgroundColor: COLORS.black,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 'auto',
    marginBottom: 20,
  },
  buttonDisabled: {
    backgroundColor: COLORS.gray,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 17,
    fontWeight: '600',
  },
});