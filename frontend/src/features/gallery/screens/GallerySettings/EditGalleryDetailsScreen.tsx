import { useRoute } from "@react-navigation/native";
import React, { useState, useEffect, useMemo } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, TextInput,
  TouchableWithoutFeedback, Keyboard, Alert, ActivityIndicator,
  SafeAreaView, KeyboardAvoidingView, Platform,
} from "react-native";
import FastImage from "react-native-fast-image";
import { useImagePicker } from "../../../../hooks/useImagePicker";
import { useGallery, useUpdateGallery, useUpdateGalleryIcon } from "../../../../hooks/useGalleryData";
import { useQueryClient } from "@tanstack/react-query";
import Ionicons from "react-native-vector-icons/Ionicons";

const EditGalleryDetailsScreen = () => {
  const route = useRoute();
  const queryClient = useQueryClient();
  const { galleryId } = route.params as { galleryId: string };

  const { gallery } = useGallery(galleryId);
  const { mutate: updateGallery, isPending: isUpdating } = useUpdateGallery();
  const { mutate: updateGalleryIcon, isPending: isUploadingIcon } = useUpdateGalleryIcon(galleryId);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  // pendingIconUri: set while an icon upload is in-flight (drives isDirty)
  const [pendingIconUri, setPendingIconUri] = useState<string | null>(null);
  // displayLocalUri: the local file to show — persists after upload completes so
  // the avatar never goes blank waiting for FastImage to cache the new CloudFront URL
  const [displayLocalUri, setDisplayLocalUri] = useState<string | null>(null);
  const [initial, setInitial] = useState({ name: '', description: '', iconUrl: null as string | null });

  // Populate form fields whenever gallery data arrives or changes (e.g. after icon sync).
  // Intentionally does NOT reset displayLocalUri — that would cause the blank-avatar flash.
  useEffect(() => {
    if (gallery) {
      setName(gallery.name || '');
      setDescription('');
      setInitial({ name: gallery.name || '', description: '', iconUrl: gallery.iconUrl || null });
    }
  }, [galleryId, gallery]);

  // Reset local display state only when navigating to a different gallery.
  useEffect(() => {
    setPendingIconUri(null);
    setDisplayLocalUri(null);
  }, [galleryId]);

  const isDirty = useMemo(() =>
    name !== initial.name || description !== initial.description || pendingIconUri !== null,
    [name, description, pendingIconUri, initial]
  );

  const isLoading = isUpdating || isUploadingIcon;

  const { pickImages } = useImagePicker();

  const handleChangeImage = () => {
    pickImages({ quality: 0.7 }, ([asset]) => {
      if (!asset) return;
      const uri = asset.uri;
      setPendingIconUri(uri);
      setDisplayLocalUri(uri);
      updateGalleryIcon(uri, {
        onSuccess: () => {
          setPendingIconUri(null);
          queryClient.invalidateQueries({ queryKey: ['gallery', galleryId] });
        },
        onError: (err) => {
          setPendingIconUri(null);
          setDisplayLocalUri(null);
          Alert.alert('Upload Failed', (err as Error)?.message || 'Unable to update image');
        },
      });
    });
  };

  const handleSave = () => {
    if (!isDirty || isUpdating) return;
    updateGallery(
      { galleryId, data: { name: name.trim() || initial.name, description: description.trim() || undefined } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['gallery', galleryId] });
          queryClient.invalidateQueries({ queryKey: ['galleries'] });
          setInitial(prev => ({ ...prev, name: name.trim() || prev.name, description }));
        },
        onError: () => Alert.alert('Error', 'Failed to update gallery.'),
      }
    );
  };

  const coverUri = displayLocalUri || initial.iconUrl || undefined;

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.root}>
        <SafeAreaView style={{ flex: 1 }}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
          >
            <View style={styles.container}>

              {/* Avatar */}
              <View style={styles.avatarSection}>
                <TouchableOpacity
                  onPress={handleChangeImage}
                  disabled={isLoading}
                  activeOpacity={0.7}
                  style={styles.avatarWrap}
                >
                  {coverUri ? (
                    <FastImage
                      style={styles.avatar}
                      source={{ uri: coverUri, priority: FastImage.priority.high }}
                      resizeMode={FastImage.resizeMode.cover}
                    />
                  ) : (
                    <View style={styles.avatarPlaceholder} />
                  )}
                  <View style={styles.editBadge}>
                    {isUploadingIcon ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <Ionicons name="camera" size={13} color="#FFF" />
                    )}
                  </View>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleChangeImage} disabled={isLoading}>
                  <Text style={styles.changePhotoText}>Change photo</Text>
                </TouchableOpacity>
              </View>

              {/* Fields */}
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Details</Text>
                <View style={styles.card}>
                  <View style={styles.inputRow}>
                    <Text style={styles.inputLabel}>Name</Text>
                    <TextInput
                      style={styles.input}
                      value={name}
                      onChangeText={setName}
                      placeholder="Gallery name"
                      placeholderTextColor="#CCCCCC"
                      editable={!isLoading}
                    />
                  </View>
                  <View style={[styles.inputRow, styles.noBorder]}>
                    <Text style={styles.inputLabel}>Description</Text>
                    <TextInput
                      style={[styles.input, styles.multilineInput]}
                      value={description}
                      onChangeText={setDescription}
                      placeholder="Add a description…"
                      placeholderTextColor="#CCCCCC"
                      multiline
                      textAlignVertical="top"
                      editable={!isLoading}
                    />
                  </View>
                </View>
              </View>

              {/* Save */}
              <View style={styles.footer}>
                <TouchableOpacity
                  style={[styles.saveBtn, (!isDirty || isLoading) && styles.saveBtnDisabled]}
                  onPress={handleSave}
                  disabled={!isDirty || isLoading}
                  activeOpacity={0.7}
                >
                  {isUpdating ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={[styles.saveBtnText, (!isDirty || isLoading) && styles.saveBtnTextDisabled]}>
                      Save changes
                    </Text>
                  )}
                </TouchableOpacity>
              </View>

            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    </TouchableWithoutFeedback>
  );
};

export default EditGalleryDetailsScreen;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },

  // Avatar
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 28,
  },
  avatarWrap: {
    position: 'relative',
    marginBottom: 10,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 28,
    backgroundColor: '#EFEFEF',
  },
  avatarPlaceholder: {
    width: 88,
    height: 88,
    borderRadius: 28,
    backgroundColor: '#EFEFEF',
  },
  editBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#111111',
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: '#FAFAFA',
  },
  changePhotoText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#888888',
  },

  // Section
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#AAAAAA',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E5E5',
    overflow: 'hidden',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EBEBEB',
  },
  noBorder: {
    borderBottomWidth: 0,
  },
  inputLabel: {
    width: 90,
    fontSize: 14,
    fontWeight: '500',
    color: '#111111',
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#111111',
    padding: 0,
  },
  multilineInput: {
    minHeight: 72,
    paddingTop: 2,
  },

  // Footer
  footer: {
    marginTop: 'auto',
    paddingTop: 16,
    paddingBottom: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E5E5',
  },
  saveBtn: {
    backgroundColor: '#111111',
    height: 48,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnDisabled: {
    backgroundColor: '#EFEFEF',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  saveBtnTextDisabled: {
    color: '#BBBBBB',
  },
});