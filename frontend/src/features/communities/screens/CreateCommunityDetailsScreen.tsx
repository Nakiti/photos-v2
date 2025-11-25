import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  Image, 
  TouchableWithoutFeedback, 
  Keyboard, 
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { useCreateCommunity } from '../../../hooks/useCommunityData';
import { launchImageLibrary, ImagePickerResponse } from 'react-native-image-picker';

// iOS Standard Colors
const COLORS = {
    background: '#FFFFFF',
    inputBg: '#F2F2F7', // System Gray 6 - softer than borders
    textPrimary: '#000000',
    textSecondary: '#8E8E93',
    placeholder: '#C7C7CC',
    button: '#000000',
    buttonText: '#FFFFFF',
    tint: '#007AFF', // Apple Blue
    danger: '#FF3B30',
};

const CreateCommunityDetailsScreen = () => {
  const navigation = useNavigation<any>();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [imageUri, setImageUri] = useState<string | undefined>(undefined);
  
  const { mutateAsync, isPending, isError } = useCreateCommunity();
  
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
      const community = await mutateAsync({
        data: {
          name: name.trim(),
          description: description.trim() || undefined,
        },
        imageUri: imageUri ?? null,
      });

      navigation.navigate("CreateCommunitySettings", { communityId: community.id });
    } catch (error) {
      console.error("Failed to create community:", error);
      Alert.alert(
        "Creation Failed",
        "Could not create the community. Please try again."
      );
    }
  };

  const isButtonDisabled = !name.trim();

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
                    <View style={styles.imagePlaceholder}>
                      <Ionicons name="camera" size={32} color={COLORS.textSecondary} />
                    </View>
                  )}
                  
                  {/* Overlay icon for "Edit" affordance */}
                  {imageUri && (
                    <View style={styles.editBadge}>
                      <Ionicons name="pencil" size={12} color="#FFF" />
                    </View>
                  )}
                </TouchableOpacity>
                <Text style={styles.photoLabel}>
                  {imageUri ? 'Edit Photo' : 'Add Photo'}
                </Text>
              </View>

              {/* --- Form Inputs --- */}
              <View style={styles.inputContainer}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Name</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Hiking Club"
                    placeholderTextColor={COLORS.placeholder}
                    value={name}
                    onChangeText={setName}
                    returnKeyType="next"
                    autoCorrect={false}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Description <Text style={styles.optionalLabel}>(Optional)</Text></Text>
                  <TextInput
                    style={[styles.input, styles.descriptionInput]}
                    placeholder="What is this community about?"
                    placeholderTextColor={COLORS.placeholder}
                    multiline
                    value={description}
                    onChangeText={setDescription}
                    textAlignVertical="top" // Android fix
                  />
                </View>
              </View>
            </ScrollView>

            {/* --- Footer Button --- */}
            <View style={styles.footer}>
              <TouchableOpacity
                style={[styles.button, (isButtonDisabled || isPending) && styles.buttonDisabled]}
                onPress={onContinue}
                disabled={isButtonDisabled || isPending}
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
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 20,
  },
  
  // Image Picker Styles
  imageSection: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 10,
  },
  imagePicker: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.inputBg,
    justifyContent: 'center',
    alignItems: 'center',
    // Subtle shadow for depth
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
  imagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
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

  // Input Styles
  inputContainer: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: 20,
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
    borderRadius: 12, // Modern soft roundness
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 17,
    color: COLORS.textPrimary,
    // No border - cleaner look
  },
  descriptionInput: {
    height: 120,
    paddingTop: 16,
  },

  // Footer / Button Styles
  footer: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F2', // Very subtle separator
  },
  button: {
    backgroundColor: COLORS.button,
    paddingVertical: 16,
    borderRadius: 14, // Slightly rounder
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#E5E5EA', // Disabled gray
  },
  buttonText: {
    color: COLORS.buttonText,
    fontSize: 17,
    fontWeight: '700',
  },
});

export default CreateCommunityDetailsScreen;