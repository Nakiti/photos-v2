import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
} from 'react-native';
import FastImage from 'react-native-fast-image';
import { useUser, useUpdateAvatar, useUpdateMyProfile } from '../../../hooks/useUser';
import { launchImageLibrary, ImagePickerResponse } from 'react-native-image-picker';
import { useNavigation } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import Ionicons from 'react-native-vector-icons/Ionicons';

const EditProfileScreen: React.FC = () => {
  const navigation = useNavigation();
  const queryClient = useQueryClient();

  const { user } = useUser();
  const { mutate: updateAvatar, isPending: isUpdatingAvatar } = useUpdateAvatar();
  const { mutate: updateProfile, isPending: isUpdatingProfile } = useUpdateMyProfile();

  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [localAvatarUri, setLocalAvatarUri] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setBio(user.bio || '');
      setLocalAvatarUri(null);
    }
  }, [user]);

  const isDirty =
    (user && (name.trim() !== (user.name || '') || bio.trim() !== (user.bio || ''))) ||
    localAvatarUri !== null;

  const handleChangeAvatar = () => {
    launchImageLibrary({ mediaType: 'photo', quality: 0.8 }, (response: ImagePickerResponse) => {
      if (response.didCancel) return;
      if (response.errorMessage) { Alert.alert('Error', response.errorMessage); return; }
      if (response.assets?.[0]?.uri) {
        const uri = response.assets[0].uri;
        setLocalAvatarUri(uri);
        updateAvatar(uri, {
          onSuccess: () => { setLocalAvatarUri(null); queryClient.invalidateQueries({ queryKey: ['me'] }); },
          onError: () => { setLocalAvatarUri(null); Alert.alert('Upload Failed', 'Could not update profile picture.'); },
        });
      }
    });
  };

  const handleSave = () => {
    if (!isDirty || isUpdatingProfile) return;
    updateProfile({ name: name.trim(), bio: bio.trim() }, {
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['me'] }); navigation.goBack(); },
      onError: () => Alert.alert('Error', 'Failed to update profile.'),
    });
  };

  const getInitials = () =>
    (name || user?.handle || '?').split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase();

  const avatarUri = localAvatarUri || user?.avatarUrl;
  const isLoading = isUpdatingAvatar || isUpdatingProfile;

  return (
    <View style={styles.root}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

          {/* Avatar */}
          <View style={styles.avatarSection}>
            <TouchableOpacity
              style={styles.avatarWrapper}
              onPress={handleChangeAvatar}
              activeOpacity={0.7}
              disabled={isLoading}
            >
              {avatarUri ? (
                <FastImage
                  style={styles.avatar}
                  source={{ uri: avatarUri, priority: FastImage.priority.high }}
                  resizeMode={FastImage.resizeMode.cover}
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarInitials}>{getInitials()}</Text>
                </View>
              )}
              <View style={styles.editBadge}>
                {isUpdatingAvatar ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Ionicons name="camera" size={13} color="#FFF" />
                )}
              </View>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleChangeAvatar} disabled={isLoading}>
              <Text style={styles.changePhotoText}>Change photo</Text>
            </TouchableOpacity>
          </View>

          {/* Public Profile */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Public profile</Text>
            <View style={styles.card}>
              <View style={styles.inputRow}>
                <Text style={styles.inputLabel}>Name</Text>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Your name"
                  placeholderTextColor="#CCCCCC"
                  editable={!isLoading}
                />
              </View>
              <View style={[styles.inputRow, styles.noBorder]}>
                <Text style={styles.inputLabel}>Bio</Text>
                <TextInput
                  style={[styles.input, styles.multilineInput]}
                  value={bio}
                  onChangeText={setBio}
                  placeholder="Tell us about yourself…"
                  placeholderTextColor="#CCCCCC"
                  multiline
                  textAlignVertical="top"
                  editable={!isLoading}
                />
              </View>
            </View>
          </View>

          {/* Private Info */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Private information</Text>
            <View style={styles.card}>
              <View style={styles.inputRow}>
                <Text style={styles.inputLabel}>Handle</Text>
                <TextInput
                  style={[styles.input, styles.readOnly]}
                  value={`@${user?.handle || ''}`}
                  editable={false}
                />
                <Ionicons name="lock-closed" size={13} color="#CCCCCC" />
              </View>
              <View style={[styles.inputRow, styles.noBorder]}>
                <Text style={styles.inputLabel}>Email</Text>
                <TextInput
                  style={[styles.input, styles.readOnly]}
                  value={user?.email || ''}
                  editable={false}
                />
                <Ionicons name="lock-closed" size={13} color="#CCCCCC" />
              </View>
            </View>
          </View>

        </ScrollView>

        {/* Footer */}
        <SafeAreaView style={styles.footer}>
          <TouchableOpacity
            style={[styles.saveButton, (!isDirty || isLoading) && styles.saveButtonDisabled]}
            disabled={!isDirty || isLoading}
            onPress={handleSave}
            activeOpacity={0.7}
          >
            {isUpdatingProfile ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={[styles.saveButtonText, (!isDirty || isLoading) && styles.saveButtonTextDisabled]}>
                Save changes
              </Text>
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
    backgroundColor: '#FAFAFA',
  },
  scrollContent: {
    paddingBottom: 40,
  },

  // Avatar
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 28,
  },
  avatarWrapper: {
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: 28,
    fontWeight: '600',
    color: '#AAAAAA',
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

  // Sections
  section: {
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#AAAAAA',
    letterSpacing: 0.4,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E5E5',
    overflow: 'hidden',
  },

  // Inputs
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
    width: 68,
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
    minHeight: 56,
    paddingTop: 2,
  },
  readOnly: {
    color: '#AAAAAA',
  },

  // Footer
  footer: {
    backgroundColor: '#FAFAFA',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E5E5',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  saveButton: {
    backgroundColor: '#111111',
    height: 48,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#EFEFEF',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  saveButtonTextDisabled: {
    color: '#BBBBBB',
  },
});

export default EditProfileScreen;