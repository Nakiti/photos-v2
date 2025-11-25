import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useGallery, useUpdateGallery } from '../../../hooks/useGalleryData';

type RouteParams = { galleryId?: string };

const Segment = <T extends string,>({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: T }[];
  value: T;
  onChange: (next: T) => void;
}) => {
  return (
    <View style={styles.segmentContainer}>
      {options.map((opt) => {
        const isActive = opt.value === value;
        return (
          <TouchableOpacity
            key={opt.value}
            activeOpacity={0.8}
            style={[styles.segmentItem, isActive && styles.segmentItemActive]}
            onPress={() => onChange(opt.value)}
          >
            <Text style={[styles.segmentText, isActive && styles.segmentTextActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const CreateEventSettingsScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { galleryId } = (route.params || {}) as RouteParams;

  const { gallery } = useGallery(galleryId || null);
  const { mutateAsync: updateGallery, isPending } = useUpdateGallery();

  const [joinRequiresApproval, setJoinRequiresApproval] = useState<boolean>(false);
  const [addPermission, setAddPermission] = useState<'ANYONE' | 'ADMIN'>('ADMIN');
  const [deletePermission, setDeletePermission] = useState<'ADMINS_AUTHORS' | 'ADMIN'>('ADMINS_AUTHORS');

  useEffect(() => {
    if (gallery) {
      const g: any = gallery;
      setJoinRequiresApproval(g.joinRequiresApproval ?? false);
      setAddPermission((g.addPermission as 'ANYONE' | 'ADMIN') ?? 'ADMIN');
      setDeletePermission((g.deletePermission as 'ADMINS_AUTHORS' | 'ADMIN') ?? 'ADMINS_AUTHORS');
    }
  }, [gallery]);

  const hasChanges = useMemo(() => {
    if (!gallery) return true;
    const g: any = gallery;
    return (
      (g.joinRequiresApproval ?? false) !== joinRequiresApproval ||
      (g.addPermission ?? 'ADMIN') !== addPermission ||
      (g.deletePermission ?? 'ADMINS_AUTHORS') !== deletePermission
    );
  }, [gallery, joinRequiresApproval, addPermission, deletePermission]);

  const onSave = async () => {
    if (!galleryId) {
      Alert.alert('Missing gallery', 'Could not determine which event to update.');
      return;
    }
    try {
      await updateGallery({
        galleryId,
        data: {
          joinRequiresApproval,
          addPermission,
          deletePermission,
        } as any,
      });
      navigation.navigate('ShareEvent', { galleryId });
    } catch (e: any) {
      Alert.alert('Failed to save', e?.message ?? 'Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Membership</Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.title}>Require Approval to Join</Text>
          </View>
          <Switch value={joinRequiresApproval} onValueChange={setJoinRequiresApproval} />
        </View>
      </View>

      <Text style={styles.header}>Permissions</Text>
      <View style={styles.card}>
        <View style={styles.block}>
          <Text style={styles.title}>Who can add photos?</Text>
          <Segment
            options={[
              { label: 'Admins', value: 'ADMIN' },
              { label: 'Anyone', value: 'ANYONE' },
            ]}
            value={addPermission}
            onChange={setAddPermission}
          />
        </View>
        <View style={styles.block}>
          <Text style={styles.title}>Who can delete photos?</Text>
          <Segment
            options={[
              { label: 'Admins & Authors', value: 'ADMINS_AUTHORS' },
              { label: 'Admins Only', value: 'ADMIN' },
            ]}
            value={deletePermission}
            onChange={setDeletePermission}
          />
        </View>
      </View>

      <TouchableOpacity
        activeOpacity={0.8}
        style={[styles.saveButton, (!hasChanges || isPending) && styles.saveButtonDisabled]}
        onPress={onSave}
        disabled={!hasChanges || isPending}
      >
        <Text style={styles.saveText}>{isPending ? 'Saving…' : 'Save'}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  header: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1C1C1E',
    marginTop: 8,
    marginBottom: 8,
  },
  card: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 0,
    overflow: 'hidden',
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  block: {
    paddingVertical: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  rowText: {
    flex: 1,
    paddingRight: 12,
  },
  title: {
    fontSize: 16,
    color: '#1C1C1E',
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E5EA',
    marginLeft: 6,
  },
  segmentContainer: {
    marginTop: 10,
    flexDirection: 'row',
    backgroundColor: '#E5E5EA',
    padding: 2,
    borderRadius: 10,
    alignSelf: 'stretch',
  },
  segmentItem: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentItemActive: {
    backgroundColor: '#FFFFFF',
  },
  segmentText: {
    fontSize: 13,
    color: '#1C1C1E',
    fontWeight: '500',
  },
  segmentTextActive: {
    color: '#000000',
  },
  saveButton: {
    backgroundColor: '#000000',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 'auto',
    marginBottom: 12,
  },
  saveButtonDisabled: {
    backgroundColor: '#8E8E93',
  },
  saveText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default CreateEventSettingsScreen;
