import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, Alert } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useDatabase } from '@nozbe/watermelondb/react';
import { useQueryClient } from '@tanstack/react-query';
import { createTag as createTagApi, listTagsForGallery } from '../../../services/api/tags.service';
import { syncTags } from '../../../services/sync/tags.sync';
import Ionicons from 'react-native-vector-icons/Ionicons';

type PendingTag = {
  id: string; // local temp id for list rendering only
  name: string;
};

const AddGroupTagsScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { galleryId } = route.params as { galleryId: string };

  const database = useDatabase();
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [pendingTags, setPendingTags] = useState<PendingTag[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const canAddTag = useMemo(() => name.trim().length > 0, [name]);

  const handleAddTag = () => {
    if (!canAddTag) return;
    const payload: PendingTag = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: name.trim(),
    };
    setPendingTags(prev => [payload, ...prev]);
    setName('');
  };

  const handleRemovePending = (id: string) => {
    setPendingTags(prev => prev.filter(t => t.id !== id));
  };

  const handleContinue = async () => {
    if (pendingTags.length === 0) {
      (navigation as any).navigate('Gallery', {
        screen: 'Gallery',
        params: { galleryId },
      });
      return;
    }
    try {
      setIsSaving(true);
      await Promise.all(
        pendingTags.map(t => createTagApi(galleryId, { name: t.name }))
      );
      const remote = await listTagsForGallery(galleryId);
      await syncTags(database, galleryId, remote);
      queryClient.invalidateQueries({ queryKey: ['gallery-tags', galleryId] });
      (navigation as any).navigate('Gallery', {
        screen: 'Gallery',
        params: { galleryId },
      });
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to create tags');
    } finally {
      setIsSaving(false);
    }
  };

  const renderPending = ({ item }: { item: PendingTag }) => {
    return (
      <View style={styles.tagRow}>
        <View style={styles.tagLeft}>
          <Text style={styles.tagName}>{item.name}</Text>
        </View>
        <TouchableOpacity
          onPress={() => handleRemovePending(item.id)}
          style={styles.deleteBtn}
          accessibilityRole="button"
          accessibilityLabel={`Remove tag ${item.name}`}
        >
          <Text style={styles.deleteText}>Remove</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerArea}>
        <Text style={styles.description}>
          Tags help categorize your group’s photos. Members can apply tags like "Hiking",
          "Birthday", or "Work" so it’s easy to find moments later.
        </Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Create a tag</Text>
        <View style={styles.inputRow}>
          <TextInput
            placeholder="Tag name (e.g. Hiking)"
            value={name}
            onChangeText={setName}
            style={styles.inputField}
            returnKeyType="done"
            onSubmitEditing={handleAddTag}
          />
          <TouchableOpacity
            disabled={!canAddTag}
            style={[styles.plusBtn, !canAddTag && styles.btnDisabled]}
            onPress={handleAddTag}
            accessibilityRole="button"
            accessibilityLabel="Add tag to list"
          >
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.listHeader}>
        <Text style={styles.listHeaderText}>
          {pendingTags.length > 0 ? 'Pending tags to add' : 'No tags added yet'}
        </Text>
      </View>

      <FlatList
        data={pendingTags}
        keyExtractor={(t) => t.id}
        renderItem={renderPending}
        contentContainerStyle={styles.list}
      />

      <TouchableOpacity
        style={[styles.continueButton, isSaving && styles.btnDisabled]}
        onPress={handleContinue}
        disabled={isSaving}
      >
        <Text style={styles.continueButtonText}>{isSaving ? 'Saving…' : 'Continue'}</Text>
      </TouchableOpacity>
    </View>
  );
};

export default AddGroupTagsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  headerArea: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111',
    marginBottom: 6,
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  form: {
    paddingHorizontal: 16,
    paddingTop: 12,
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
    paddingBottom: 100,
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
  continueButton: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 20,
    backgroundColor: '#111',
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});


