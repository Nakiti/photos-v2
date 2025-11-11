import React, { useMemo, useState } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useDatabase } from '@nozbe/watermelondb/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useGalleryTags } from '../../../hooks/useGalleryTagData';
import { createTag as createTagApi, deleteTag as deleteTagApi, listTagsForGallery, type TagApi } from '../../../services/api/tags.service';
import { syncTags } from '../../../services/sync/tags.sync';
import Tag from '../../../db/models/Tag';
import { useRoute } from '@react-navigation/native';

const GalleryTagsScreen = () => {
  const route = useRoute()
  const { galleryId } = route.params as { galleryId: string };
  const database = useDatabase();
  const queryClient = useQueryClient();

  const { tags, isLoading, isSyncing } = useGalleryTags(galleryId);

  const [name, setName] = useState('');
  const [color, setColor] = useState('');

  const canCreate = useMemo(() => name.trim().length > 0, [name]);

  const refreshTags = async () => {
    const remote = await listTagsForGallery(galleryId);
    await syncTags(database, galleryId, remote);
    queryClient.invalidateQueries({ queryKey: ['gallery-tags', galleryId] });
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const payload: { name: string; color?: string } = { name: name.trim() };
      if (color.trim()) {
        payload.color = normalizeHex(color.trim());
      }
      await createTagApi(galleryId, payload);
    },
    onSuccess: async () => {
      setName('');
      setColor('');
      await refreshTags();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (tagId: string) => {
      await deleteTagApi(galleryId, tagId);
    },
    onSuccess: async () => {
      await refreshTags();
    },
  });

  const renderItem = ({ item }: { item: Tag }) => {
    return (
      <View style={styles.tagRow}>
        <View style={styles.tagLeft}>
          {!!(item as any).color && (
            <View style={[styles.colorDot, { backgroundColor: (item as any).color }]} />
          )}
          <Text style={styles.tagName}>{item.name}</Text>
        </View>
        <TouchableOpacity
          onPress={() => deleteMutation.mutate(item.id)}
          style={styles.deleteBtn}
          accessibilityRole="button"
          accessibilityLabel={`Delete tag ${item.name}`}
        >
          <Text style={styles.deleteText}>Delete</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.form}>
        <Text style={styles.label}>Create a new tag</Text>
        <TextInput
          placeholder="Name"
          value={name}
          onChangeText={setName}
          style={styles.input}
        />
        <TextInput
          placeholder="#RRGGBB (optional)"
          value={color}
          onChangeText={setColor}
          autoCapitalize="none"
          style={styles.input}
        />
        <TouchableOpacity
          disabled={!canCreate || createMutation.isPending}
          style={[styles.createBtn, (!canCreate || createMutation.isPending) && styles.btnDisabled]}
          onPress={() => createMutation.mutate()}
        >
          <Text style={styles.createText}>{createMutation.isPending ? 'Creating...' : 'Create Tag'}</Text>
        </TouchableOpacity>
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

function normalizeHex(input: string) {
  const v = input.startsWith('#') ? input : `#${input}`;
  if (/^#[0-9a-fA-F]{6}$/.test(v)) return v.toUpperCase();
  return input; // let server validation handle bad inputs
}

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
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 10,
    backgroundColor: '#fafafa',
  },
  createBtn: {
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111',
  },
  btnDisabled: {
    opacity: 0.5,
  },
  createText: {
    color: '#fff',
    fontWeight: '600',
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
  deleteText: {
    color: '#c62828',
    fontWeight: '600',
  },
  emptyText: {
    textAlign: 'center',
    paddingVertical: 40,
    color: '#666',
  },
});


