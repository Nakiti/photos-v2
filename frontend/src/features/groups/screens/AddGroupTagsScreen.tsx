import React, { useMemo, useState } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  KeyboardAvoidingView, 
  Platform, 
  SafeAreaView,
  ActivityIndicator
} from 'react-native';
import { useDatabase } from '@nozbe/watermelondb/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRoute, useNavigation, CommonActions } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';

// Hooks & Services
import { useGalleryTags } from '../../../hooks/useGalleryTagData';
import { createTag as createTagApi, deleteTag as deleteTagApi, listTagsForGallery } from '../../../services/api/tags.service';
import { syncTags } from '../../../services/sync/tags.sync';
import { useGallery, useUpdateGallery } from '../../../hooks/useGalleryData';
import Tag from '../../../db/models/Tag';

// Components

const AddGroupTagsScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { galleryId } = route.params as { galleryId: string };
  const database = useDatabase();
  const queryClient = useQueryClient();

  // Data
  const { tags, isLoading } = useGalleryTags(galleryId);
  const { gallery } = useGallery(galleryId);
  const updateGalleryMutation = useUpdateGallery();

  // State
  const [name, setName] = useState('');

  const canCreate = useMemo(() => name.trim().length > 0, [name]);

  // Actions
  const refreshTags = async () => {
    const remote = await listTagsForGallery(galleryId);
    await syncTags(database, galleryId, remote);
    queryClient.invalidateQueries({ queryKey: ['gallery-tags', galleryId] });
  };

  const deleteMutation = useMutation({
    mutationFn: async (tagId: string) => {
      await deleteTagApi(galleryId, tagId);
    },
    onSuccess: async () => {
      await refreshTags();
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const tagName = name.trim();
      if (!tagName) return;
      await createTagApi(galleryId, { name: tagName });
    },
    onSuccess: async () => {
      setName('');
      await refreshTags();
    },
  });

  const handleCreate = () => {
    if (!canCreate || createMutation.isPending) return;
    createMutation.mutate();
  };

  const handleFinish = () => {
    // Reset navigation stack to Main Tabs -> Community Flow -> Gallery
    // Or just navigate to the Gallery if simple stack
    navigation.dispatch(
      CommonActions.reset({
        index: 1,
        routes: [
          { name: 'TabNavigator' },
          // Optional: Navigate directly to the new gallery
          // { name: 'CommunityFlow', params: { screen: 'Gallery', params: { galleryId } } } 
        ],
      })
    );
  };

  const renderItem = ({ item }: { item: Tag }) => {
    const isDefault = gallery?.defaultTagId === item.id;
    
    return (
      <View style={styles.tagRow}>
        <View style={styles.tagLeft}>
          <Text style={[styles.tagName, isDefault && styles.tagNameSelected]}>
            {item.name}
          </Text>
          {isDefault && (
            <View style={styles.defaultBadge}>
              <Text style={styles.defaultBadgeText}>Default</Text>
            </View>
          )}
        </View>

        <View style={styles.tagRight}>
          {!isDefault && (
            <>
              <TouchableOpacity
                onPress={() => updateGalleryMutation.mutate({ galleryId, data: { defaultTagId: item.id } })}
                disabled={updateGalleryMutation.isPending}
                style={styles.textActionBtn}
              >
                <Text style={styles.actionText}>Set Default</Text>
              </TouchableOpacity>
              
              <View style={styles.verticalDivider} />

              <TouchableOpacity
                onPress={() => deleteMutation.mutate(item.id)}
                disabled={updateGalleryMutation.isPending}
                style={styles.iconActionBtn}
              >
                <Ionicons name="trash-outline" size={18} color="#FF3B30" />
              </TouchableOpacity>
            </>
          )}
          {isDefault && (
             <Ionicons name="checkmark-circle" size={20} color="#000" />
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.root}>
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        
        {/* List of Tags */}
        <FlatList
            data={tags}
            keyExtractor={(t) => t.id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
            !isLoading ? (
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>No tags added yet</Text> 
                    <Text style={styles.emptySubText}>
                        Tags help organize photos (e.g., "Food", "Selfies", "Scenery").
                    </Text>
                </View>
            ) : (
                <ActivityIndicator style={{ marginTop: 40 }} color="#000" />
            )
            }
        />

        {/* Footer Section: Input + Finish Button */}
        <SafeAreaView style={styles.footerContainer}>
            
            {/* Input Row */}
            <View style={styles.inputRow}>
                <TextInput
                    placeholder="Tag Name (e.g. Vacation)"
                    placeholderTextColor="#8E8E93"
                    value={name}
                    onChangeText={setName}
                    style={styles.inputField}
                    returnKeyType="done"
                    onSubmitEditing={handleCreate}
                    autoCorrect={false}
                />
                <TouchableOpacity
                    disabled={!canCreate || createMutation.isPending}
                    onPress={handleCreate}
                    style={[styles.addBtn, (!canCreate || createMutation.isPending) && styles.addBtnDisabled]}
                    activeOpacity={0.8}
                >
                    {createMutation.isPending ? (
                        <ActivityIndicator color="#FFF" size="small" />
                    ) : (
                        <Ionicons name="arrow-up" size={20} color="#FFF" />
                    )}
                </TouchableOpacity>
            </View>

            {/* Finish Button */}
            <TouchableOpacity 
                style={styles.finishButton} 
                onPress={handleFinish}
                activeOpacity={0.8}
            >
                <Text style={styles.finishButtonText}>Finish Setup</Text>
            </TouchableOpacity>

        </SafeAreaView>

      </KeyboardAvoidingView>
    </View>
  );
};

export default AddGroupTagsScreen;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  
  // --- List ---
  listContent: {
    paddingVertical: 16,
    paddingBottom: 20,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  tagLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tagName: {
    fontSize: 16,
    color: '#000000',
    fontWeight: '500',
  },
  tagNameSelected: {
      fontWeight: '700',
  },
  defaultBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#F2F2F7',
  },
  defaultBadgeText: {
    color: '#000',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  
  // --- Actions ---
  tagRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  textActionBtn: {
      paddingVertical: 4,
  },
  iconActionBtn: {
      padding: 4,
  },
  actionText: {
    color: '#000000',
    fontSize: 13,
    fontWeight: '600',
  },
  verticalDivider: {
      width: 1,
      height: 12,
      backgroundColor: '#E5E5EA',
  },

  // --- Empty State ---
  emptyContainer: {
      alignItems: 'center',
      marginTop: 60,
      paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  emptySubText: {
      fontSize: 14,
      color: '#8E8E93',
      textAlign: 'center',
      lineHeight: 20,
  },

  // --- Footer ---
  footerContainer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 16,
  },
  
  // Input Row
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  inputField: {
    flex: 1,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 20,
    fontSize: 16,
    color: '#000',
  },
  addBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnDisabled: {
    backgroundColor: '#E5E5EA',
  },

  // Finish Button
  finishButton: {
      backgroundColor: '#000000',
      height: 56,
      borderRadius: 28,
      alignItems: 'center',
      justifyContent: 'center',
  },
  finishButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
  },
});