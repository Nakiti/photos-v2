import React, { useMemo, useState } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, SafeAreaView } from 'react-native';
import { useDatabase } from '@nozbe/watermelondb/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useGalleryTags } from '../../../hooks/useGalleryTagData';
import { createTag as createTagApi, deleteTag as deleteTagApi, listTagsForGallery } from '../../../services/api/tags.service';
import { syncTags } from '../../../services/sync/tags.sync';
import Tag from '../../../db/models/Tag';
import { useRoute } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useGallery } from '../../../hooks/useGalleryData';
import { useUpdateGallery } from '../../../hooks/useGalleryData';

const GalleryTagsScreen = () => {
  const route = useRoute()
  const { galleryId } = route.params as { galleryId: string };
  const database = useDatabase();
  const queryClient = useQueryClient();

  const { tags, isLoading } = useGalleryTags(galleryId);
  const { gallery } = useGallery(galleryId);
  const updateGalleryMutation = useUpdateGallery();

  const [name, setName] = useState('');

  const canCreate = useMemo(() => name.trim().length > 0, [name]);

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

  const renderItem = ({ item }: { item: Tag }) => {
    const isDefault = gallery?.defaultTagId === item.id;
    
    return (
      <View style={styles.tagRow}>
        {/* Left Side: Name + Badge */}
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

        {/* Right Side: Actions */}
        <View style={styles.tagRight}>
          {!isDefault && (
            <>
              <TouchableOpacity
                onPress={() => updateGalleryMutation.mutate({ galleryId, data: { defaultTagId: item.id } })}
                disabled={updateGalleryMutation.isPending}
                style={styles.actionBtn}
              >
                <Text style={styles.makeDefaultText}>Set Default</Text>
              </TouchableOpacity>
              
              <View style={styles.verticalDivider} />

              <TouchableOpacity
                onPress={() => deleteMutation.mutate(item.id)}
                disabled={updateGalleryMutation.isPending}
                style={styles.actionBtn}
              >
                <Ionicons name="trash-outline" size={18} color="#FF3B30" />
              </TouchableOpacity>
            </>
          )}
          
          {/* If it is default, we can't delete it easily, maybe show a checkmark instead */}
          {isDefault && (
             <Ionicons name="checkmark-circle" size={20} color="#000" />
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>

      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView 
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ flex: 1 }}
            keyboardVerticalOffset={100}
        >
            
            {/* 2. List */}
            <FlatList
                data={tags}
                keyExtractor={(t) => t.id}
                renderItem={renderItem}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                !isLoading ? (
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>No tags yet.</Text> 
                        <Text style={styles.emptySubText}>Create one to start organizing.</Text>
                    </View>
                ) : null
                }
            />

            {/* 3. Input Form (Sticks to bottom of safe area) */}
            <View style={styles.formContainer}>
                <TextInput
                    placeholder="New Tag Name..."
                    placeholderTextColor="#999"
                    value={name}
                    onChangeText={setName}
                    style={styles.inputField}
                    returnKeyType="done"
                    onSubmitEditing={handleCreate}
                />
                <TouchableOpacity
                    disabled={!canCreate || createMutation.isPending}
                    onPress={handleCreate}
                    style={[styles.addBtn, (!canCreate || createMutation.isPending) && styles.addBtnDisabled]}
                    activeOpacity={0.8}
                >
                    {createMutation.isPending ? (
                        <Ionicons name="ellipsis-horizontal" size={24} color="#FFF" />
                    ) : (
                        <Ionicons name="arrow-up" size={24} color="#FFF" />
                    )}
                </TouchableOpacity>
            </View>

        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
};

export default GalleryTagsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  safeArea: {
    flex: 1,
  },
  
  // --- List Styles ---
  listContent: {
    paddingTop: 16,
    paddingBottom: 40,
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
    fontWeight: '400',
  },
  tagNameSelected: {
      fontWeight: '600',
  },
  defaultBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#000000', // Black Badge
  },
  defaultBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  
  // --- Right Actions ---
  tagRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionBtn: {
      padding: 8,
  },
  makeDefaultText: {
    color: '#000000',
    fontSize: 13,
    fontWeight: '600',
  },
  verticalDivider: {
      width: 1,
      height: 14,
      backgroundColor: '#E5E5EA',
      marginHorizontal: 4,
  },
  
  // --- Empty State ---
  emptyContainer: {
      alignItems: 'center',
      marginTop: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  emptySubText: {
      fontSize: 14,
      color: '#8E8E93',
  },

  // --- Input Form ---
  formContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F9F9F9',
    backgroundColor: '#FFFFFF', // Ensure opaque background
  },
  inputField: {
    flex: 1,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F5F5F5', // Light grey input
    paddingHorizontal: 20,
    fontSize: 16,
    color: '#000',
    marginRight: 12,
  },
  addBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#000000', // Solid Black Button
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnDisabled: {
    backgroundColor: '#E5E5EA', // Grey when disabled
  },
});