import React, { useMemo, useState } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, SafeAreaView,
} from 'react-native';
import { useDatabase } from '@nozbe/watermelondb/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useGalleryTags } from '../../../hooks/useGalleryTagData';
import { createTag as createTagApi, deleteTag as deleteTagApi, listTagsForGallery } from '../../../services/api/tags.service';
import { syncTags } from '../../../services/sync/tags.sync';
import Tag from '../../../db/models/Tag';
import { useRoute } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useGallery, useUpdateGallery } from '../../../hooks/useGalleryData';

const GalleryTagsScreen = () => {
  const route = useRoute();
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
    mutationFn: async (tagId: string) => { await deleteTagApi(galleryId, tagId); },
    onSuccess: refreshTags,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const tagName = name.trim();
      if (!tagName) return;
      await createTagApi(galleryId, { name: tagName });
    },
    onSuccess: async () => { setName(''); await refreshTags(); },
  });

  const handleCreate = () => {
    if (!canCreate || createMutation.isPending) return;
    createMutation.mutate();
  };

  const renderItem = ({ item, index }: { item: Tag; index: number }) => {
    const isDefault = gallery?.defaultTagId === item.id;
    const isLast = index === (tags?.length ?? 0) - 1;

    return (
      <View style={[styles.row, isLast && styles.rowLast]}>
        <View style={styles.rowLeft}>
          <Text style={[styles.tagName, isDefault && styles.tagNameDefault]}>
            {item.name}
          </Text>
          {isDefault && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Default</Text>
            </View>
          )}
        </View>

        <View style={styles.rowRight}>
          {isDefault ? (
            <Ionicons name="checkmark-circle" size={18} color="#111111" />
          ) : (
            <>
              <TouchableOpacity
                onPress={() => updateGalleryMutation.mutate({ galleryId, data: { defaultTagId: item.id } })}
                disabled={updateGalleryMutation.isPending}
                style={styles.textBtn}
              >
                <Text style={styles.setDefaultText}>Set default</Text>
              </TouchableOpacity>

              <View style={styles.vDivider} />

              <TouchableOpacity
                onPress={() => deleteMutation.mutate(item.id)}
                disabled={deleteMutation.isPending}
                style={styles.iconBtn}
              >
                <Ionicons name="trash-outline" size={16} color="#CC3333" />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
          keyboardVerticalOffset={100}
        >

          {/* Input Header */}
          <View style={styles.inputHeader}>
            <TextInput
              placeholder="New tag name…"
              placeholderTextColor="#CCCCCC"
              value={name}
              onChangeText={setName}
              style={styles.input}
              returnKeyType="done"
              onSubmitEditing={handleCreate}
            />
            <TouchableOpacity
              disabled={!canCreate || createMutation.isPending}
              onPress={handleCreate}
              style={[styles.addBtn, (!canCreate || createMutation.isPending) && styles.addBtnDisabled]}
              activeOpacity={0.7}
            >
              {createMutation.isPending ? (
                <Ionicons name="ellipsis-horizontal" size={20} color="#FFF" />
              ) : (
                <Ionicons name="arrow-up" size={20} color="#FFF" />
              )}
            </TouchableOpacity>
          </View>

          {/* Tag List */}
          <FlatList
            data={tags}
            keyExtractor={(t) => t.id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              !isLoading ? (
                <View style={styles.empty}>
                  <Text style={styles.emptyTitle}>No tags yet</Text>
                  <Text style={styles.emptySub}>Create one to start organizing.</Text>
                </View>
              ) : null
            }
          />

        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
};

export default GalleryTagsScreen;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },

  // Input header
  inputHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5E5',
    backgroundColor: '#FAFAFA',
  },
  input: {
    flex: 1,
    height: 44,
    borderRadius: 11,
    backgroundColor: '#EFEFEF',
    paddingHorizontal: 14,
    fontSize: 14,
    color: '#111111',
    marginRight: 10,
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: '#111111',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnDisabled: {
    backgroundColor: '#EFEFEF',
  },

  // List
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },

  // Rows
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EBEBEB',
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: '#E5E5E5',
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: '#E5E5E5',
  },
  rowLast: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5E5',
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
  },

  // Tag name + badge
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  tagName: {
    fontSize: 15,
    color: '#111111',
    fontWeight: '400',
    letterSpacing: -0.1,
  },
  tagNameDefault: {
    fontWeight: '600',
  },
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#111111',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Row actions
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  textBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  setDefaultText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#555555',
  },
  vDivider: {
    width: StyleSheet.hairlineWidth,
    height: 14,
    backgroundColor: '#DDDDDD',
    marginHorizontal: 4,
  },
  iconBtn: {
    padding: 8,
  },

  // Empty state
  empty: {
    alignItems: 'center',
    marginTop: 60,
    gap: 4,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111111',
  },
  emptySub: {
    fontSize: 13,
    color: '#AAAAAA',
  },
});