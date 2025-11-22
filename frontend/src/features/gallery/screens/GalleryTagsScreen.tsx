import React, { useMemo, useState } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useDatabase } from '@nozbe/watermelondb/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useGalleryTags } from '../../../hooks/useGalleryTagData';
import { createTag as createTagApi, deleteTag as deleteTagApi, listTagsForGallery, type TagApi } from '../../../services/api/tags.service';
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

  const { tags, isLoading, isSyncing } = useGalleryTags(galleryId);
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
        <View style={styles.tagLeft}>
          {!!(item as any).color && (
            <View style={[styles.colorDot, { backgroundColor: (item as any).color }]} />
          )}
          <Text style={styles.tagName}>{item.name}</Text>
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
                style={[styles.makeDefaultBtn, updateGalleryMutation.isPending && styles.btnDisabled]}
                disabled={updateGalleryMutation.isPending}
                accessibilityRole="button"
                accessibilityLabel={`Make ${item.name} default`}
              >
                <Text style={styles.makeDefaultText}>Make default</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => deleteMutation.mutate(item.id)}
                style={[styles.deleteBtn, updateGalleryMutation.isPending && styles.btnDisabled]}
                disabled={updateGalleryMutation.isPending}
                accessibilityRole="button"
                accessibilityLabel={`Delete tag ${item.name}`}
              >
                <Text style={styles.deleteText}>Delete</Text>
              </TouchableOpacity>
            </>
          )}
          {isDefault && (
            <View style={[styles.deleteBtn, styles.disabledDeleteBtn]}>
              <Text style={[styles.deleteText, styles.disabledDeleteText]}>Delete</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.form}>
        <Text style={styles.label}>Create a tag</Text>
        <View style={styles.inputRow}>
          <TextInput
            placeholder="Tag name (e.g. Hiking)"
            value={name}
            onChangeText={setName}
            style={styles.inputField}
            returnKeyType="done"
            onSubmitEditing={handleCreate}
          />
          <TouchableOpacity
            disabled={!canCreate || createMutation.isPending}
            onPress={handleCreate}
            style={[styles.plusBtn, (!canCreate || createMutation.isPending) && styles.btnDisabled]}
            accessibilityRole="button"
            accessibilityLabel="Add tag to list"
          >
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.listHeader}>
        <Text style={styles.listHeaderText}>
          {isLoading ? 'Loading tags...' : 'Existing tags'}
          {isSyncing ? ' (syncing...)' : ''}
        </Text>
      </View>

      <FlatList
        data={tags}
        keyExtractor={(t) => t.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          !isLoading ? <Text style={styles.emptyText}>No tags yet</Text> : null
        }
      />
    </View>
  );
};

export default GalleryTagsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  form: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  inputField: {
    height: 44,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: '#fafafa',
    flex: 1,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  plusBtn: {
    width: 44,
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111',
  },
  listHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  listHeaderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
  },
  list: {
    paddingHorizontal: 8,
    paddingBottom: 24,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f2f2f2',
  },
  tagLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  colorDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 8,
    backgroundColor: '#ccc',
  },
  tagName: {
    fontSize: 16,
    color: '#111',
  },
  deleteBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: '#fbe9e9',
  },
  tagRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  disabledDeleteBtn: {
    opacity: 0.5,
  },
  deleteText: {
    color: '#c62828',
    fontWeight: '600',
  },
  disabledDeleteText: {
    color: '#c62828',
  },
  makeDefaultBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#c7d8ff',
    backgroundColor: '#eef5ff',
  },
  makeDefaultText: {
    color: '#1651c5',
    fontWeight: '600',
  },
  emptyText: {
    textAlign: 'center',
    paddingVertical: 40,
    color: '#666',
  },
  defaultBadge: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: '#eef5ff',
  },
  defaultBadgeText: {
    color: '#1651c5',
    fontSize: 12,
    fontWeight: '600',
  },
});


