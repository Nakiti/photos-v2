import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, Alert, KeyboardAvoidingView, Platform, ScrollView,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { launchImageLibrary, ImagePickerResponse } from "react-native-image-picker";
import FastImage from "react-native-fast-image";

const CreateGroupDetailsScreen = () => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [imageUri, setImageUri] = useState<string | undefined>(undefined);
  const route = useRoute();
  const { communityId } = route.params as any || {};
  const navigation = useNavigation();

  const onPickImage = () => {
    launchImageLibrary({ mediaType: 'photo', quality: 0.8 }, (response: ImagePickerResponse) => {
      if (response.didCancel) return;
      if (response.errorMessage) { Alert.alert('Error', response.errorMessage); return; }
      if (response.assets?.[0]?.uri) setImageUri(response.assets[0].uri);
    });
  };

  const onContinue = () => {
    if (!name.trim()) return;
    (navigation as any).navigate("CreateGroupSettings", {
      name: name.trim(),
      description: description.trim(),
      imageUri: imageUri ?? null,
      communityId,
    });
  };

  const isDisabled = !name.trim();

  return (
    <View style={styles.root}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">

          {/* Banner */}
          <TouchableOpacity style={styles.banner} onPress={onPickImage} activeOpacity={0.85}>
            {imageUri ? (
              <FastImage
                source={{ uri: imageUri }}
                style={StyleSheet.absoluteFill}
                resizeMode={FastImage.resizeMode.cover}
              />
            ) : (
              <View style={styles.bannerEmpty}>
                <View style={styles.cameraWrap}>
                  <Ionicons name="camera" size={20} color="#555555" />
                </View>
                <Text style={styles.bannerHint}>Add cover photo</Text>
              </View>
            )}
            {imageUri && (
              <View style={styles.editBadge}>
                <Ionicons name="pencil" size={12} color="#FFF" />
              </View>
            )}
          </TouchableOpacity>

          {/* Form */}
          <View style={styles.form}>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Group name</Text>
              <TextInput
                style={styles.nameInput}
                placeholder="Name your group"
                placeholderTextColor="#CCCCCC"
                value={name}
                onChangeText={setName}
                returnKeyType="next"
                autoFocus
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Description</Text>
              <TextInput
                style={styles.descriptionInput}
                placeholder="What's this group about? (Optional)"
                placeholderTextColor="#CCCCCC"
                multiline
                value={description}
                onChangeText={setDescription}
                textAlignVertical="top"
              />
            </View>

          </View>
        </ScrollView>

        {/* Footer */}
        <SafeAreaView style={styles.footer}>
          <TouchableOpacity
            style={[styles.continueBtn, isDisabled && styles.continueBtnDisabled]}
            onPress={onContinue}
            disabled={isDisabled}
            activeOpacity={0.7}
          >
            <Text style={[styles.continueBtnText, isDisabled && styles.continueBtnTextDisabled]}>
              Continue
            </Text>
            {!isDisabled && (
              <Ionicons name="arrow-forward" size={16} color="#FFF" style={{ marginLeft: 6 }} />
            )}
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
    backgroundColor: '#FAFAFA',
  },
  scrollContent: {
    paddingBottom: 40,
  },

  // Banner
  banner: {
    height: 200,
    width: '100%',
    backgroundColor: '#EFEFEF',
    position: 'relative',
    overflow: 'hidden',
  },
  bannerEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  cameraWrap: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  bannerHint: {
    fontSize: 13,
    fontWeight: '500',
    color: '#AAAAAA',
  },
  editBadge: {
    position: 'absolute',
    bottom: 14,
    right: 14,
    backgroundColor: 'rgba(0,0,0,0.55)',
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Form
  form: {
    paddingHorizontal: 20,
    paddingTop: 28,
    gap: 28,
  },
  fieldGroup: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#AAAAAA',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  nameInput: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111111',
    paddingVertical: 0,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5E5',
    letterSpacing: -0.4,
  },
  descriptionInput: {
    fontSize: 15,
    color: '#111111',
    minHeight: 72,
    lineHeight: 22,
  },

  // Footer
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E5E5',
    backgroundColor: '#FAFAFA',
  },
  continueBtn: {
    backgroundColor: '#111111',
    height: 48,
    borderRadius: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueBtnDisabled: {
    backgroundColor: '#EFEFEF',
  },
  continueBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  continueBtnTextDisabled: {
    color: '#BBBBBB',
  },
});