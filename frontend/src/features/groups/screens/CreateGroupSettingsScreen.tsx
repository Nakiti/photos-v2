import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, Switch, TouchableOpacity,
  Alert, ScrollView, SafeAreaView,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useCreateGallery, useUpdateGallery } from '../../../hooks/useGalleryData';
import { useAddCommunityMembersToGallery } from '../../../hooks/useMembershipData';
import { useCommunity } from '../../../hooks/useCommunityData';

type RouteParams = {
  name: string;
  description?: string;
  imageUri?: string | null;
  communityId?: string;
};

const Segment = <T extends string,>({
  options, value, onChange, disabled = false,
}: {
  options: { label: string; value: T }[];
  value: T;
  onChange: (next: T) => void;
  disabled?: boolean;
}) => (
  <View style={[styles.segmentTrack, disabled && styles.segmentDisabled]}>
    {options.map((opt) => {
      const isActive = opt.value === value;
      return (
        <TouchableOpacity
          key={opt.value}
          activeOpacity={disabled ? 1 : 0.7}
          style={[styles.segmentItem, isActive && styles.segmentItemActive]}
          onPress={() => !disabled && onChange(opt.value)}
          disabled={disabled}
        >
          <Text style={[styles.segmentText, isActive && styles.segmentTextActive]}>
            {opt.label}
          </Text>
        </TouchableOpacity>
      );
    })}
  </View>
);

const CreateGroupSettingsScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { name, description, imageUri, communityId } = (route.params || {}) as RouteParams;

  const { mutateAsync: createGallery, isPending: isCreating } = useCreateGallery();
  const { mutateAsync: updateGallery } = useUpdateGallery();
  const { mutateAsync: addCommunityMembers, isPending: isAddingMembers } = useAddCommunityMembersToGallery();
  const { community } = useCommunity(communityId || null);

  const [joinRequiresApproval, setJoinRequiresApproval] = useState(true);
  const [addPermission, setAddPermission] = useState<'ANYONE' | 'ADMIN'>('ADMIN');
  const [deletePermission, setDeletePermission] = useState<'ADMINS_AUTHORS' | 'ADMIN'>('ADMINS_AUTHORS');
  const [addAllCommunityMembers, setAddAllCommunityMembers] = useState(false);
  const [inheritCommunitySettings, setInheritCommunitySettings] = useState(false);

  useEffect(() => {
    if (inheritCommunitySettings && community) {
      const c: any = community;
      setJoinRequiresApproval(c.joinRequiresApproval ?? true);
      setAddPermission((c.addPermission as 'ANYONE' | 'ADMIN') ?? 'ADMIN');
      setDeletePermission((c.deletePermission as 'ADMINS_AUTHORS' | 'ADMIN') ?? 'ADMINS_AUTHORS');
    }
  }, [inheritCommunitySettings, community]);

  const settingsToSave = useMemo(() => {
    if (inheritCommunitySettings && community) {
      const c: any = community;
      return {
        joinRequiresApproval: c.joinRequiresApproval ?? true,
        addPermission: (c.addPermission as 'ANYONE' | 'ADMIN') ?? 'ADMIN',
        deletePermission: (c.deletePermission as 'ADMINS_AUTHORS' | 'ADMIN') ?? 'ADMINS_AUTHORS',
      };
    }
    return { joinRequiresApproval, addPermission, deletePermission };
  }, [inheritCommunitySettings, community, joinRequiresApproval, addPermission, deletePermission]);

  const onSave = async () => {
    if (!name) return Alert.alert('Error', 'Missing group name.');
    try {
      const newGallery = await createGallery({
        galleryData: { name, type: 'GROUP', communityId: communityId || undefined },
        imageUri: imageUri ?? null,
      });
      await updateGallery({ galleryId: newGallery.id, data: { ...settingsToSave } as any });
      if (addAllCommunityMembers && communityId) {
        try {
          await addCommunityMembers({ galleryId: newGallery.id, communityId });
        } catch (e) {
          console.warn('Failed to add members automatically', e);
        }
      }
      navigation.navigate('AddGroupMembers', { galleryId: newGallery.id });
    } catch (e: any) {
      Alert.alert('Failed to create group', e?.message ?? 'Please try again.');
    }
  };

  const isLoading = isCreating || isAddingMembers;
  const inherited = inheritCommunitySettings && !!communityId;

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        {/* Membership */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Membership</Text>
          <View style={styles.card}>
            <View style={styles.switchRow}>
              <View style={styles.switchText}>
                <Text style={styles.switchLabel}>Require Approval</Text>
                <Text style={styles.switchSub}>Admins must approve new members.</Text>
              </View>
              <Switch
                value={joinRequiresApproval}
                onValueChange={setJoinRequiresApproval}
                trackColor={{ false: '#E5E5E5', true: '#111111' }}
                thumbColor="#FFF"
                ios_backgroundColor="#E5E5E5"
                disabled={inherited}
              />
            </View>
            {communityId && (
              <View style={[styles.switchRow, styles.rowLast]}>
                <View style={styles.switchText}>
                  <Text style={styles.switchLabel}>Sync Members</Text>
                  <Text style={styles.switchSub}>Auto-add members from community.</Text>
                </View>
                <Switch
                  value={addAllCommunityMembers}
                  onValueChange={setAddAllCommunityMembers}
                  trackColor={{ false: '#E5E5E5', true: '#111111' }}
                  thumbColor="#FFF"
                  ios_backgroundColor="#E5E5E5"
                />
              </View>
            )}
          </View>
        </View>

        {/* Permissions */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Permissions</Text>
          <View style={styles.card}>
            {communityId && (
              <View style={styles.switchRow}>
                <View style={styles.switchText}>
                  <Text style={styles.switchLabel}>Inherit Settings</Text>
                  <Text style={styles.switchSub}>Use defaults from {community?.name}.</Text>
                </View>
                <Switch
                  value={inheritCommunitySettings}
                  onValueChange={setInheritCommunitySettings}
                  trackColor={{ false: '#E5E5E5', true: '#111111' }}
                  thumbColor="#FFF"
                  ios_backgroundColor="#E5E5E5"
                />
              </View>
            )}

            <View style={styles.segmentRow}>
              <Text style={styles.segmentLabel}>Who can post photos?</Text>
              <Segment
                options={[
                  { label: 'Admins', value: 'ADMIN' },
                  { label: 'Everyone', value: 'ANYONE' },
                ]}
                value={addPermission}
                onChange={setAddPermission}
                disabled={inherited}
              />
            </View>

            <View style={[styles.segmentRow, styles.rowLast]}>
              <Text style={styles.segmentLabel}>Who can delete photos?</Text>
              <Segment
                options={[
                  { label: 'Admins', value: 'ADMIN' },
                  { label: 'Authors', value: 'ADMINS_AUTHORS' },
                ]}
                value={deletePermission}
                onChange={setDeletePermission}
                disabled={inherited}
              />
            </View>
          </View>
        </View>

      </ScrollView>

      {/* Footer */}
      <SafeAreaView style={styles.footer}>
        <TouchableOpacity
          style={[styles.createBtn, isLoading && styles.createBtnDisabled]}
          onPress={onSave}
          disabled={isLoading}
          activeOpacity={0.7}
        >
          <Text style={[styles.createBtnText, isLoading && styles.createBtnTextDisabled]}>
            {isLoading ? 'Creating…' : 'Create Group'}
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
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

  // Switch rows
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EBEBEB',
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  switchText: {
    flex: 1,
    paddingRight: 16,
    gap: 2,
  },
  switchLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111111',
    letterSpacing: -0.1,
  },
  switchSub: {
    fontSize: 12,
    color: '#AAAAAA',
    lineHeight: 18,
  },

  // Segment rows
  segmentRow: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EBEBEB',
    gap: 10,
  },
  segmentLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#111111',
    letterSpacing: -0.1,
  },
  segmentTrack: {
    flexDirection: 'row',
    backgroundColor: '#F2F2F2',
    padding: 2,
    borderRadius: 9,
    height: 36,
  },
  segmentDisabled: {
    opacity: 0.4,
  },
  segmentItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 7,
  },
  segmentItemActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#AAAAAA',
  },
  segmentTextActive: {
    fontWeight: '600',
    color: '#111111',
  },

  // Footer
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E5E5',
    backgroundColor: '#FAFAFA',
  },
  createBtn: {
    backgroundColor: '#111111',
    height: 48,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createBtnDisabled: {
    backgroundColor: '#EFEFEF',
  },
  createBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  createBtnTextDisabled: {
    color: '#BBBBBB',
  },
});

export default CreateGroupSettingsScreen;