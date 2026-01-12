import React, { useEffect, useMemo, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Switch, 
  TouchableOpacity, 
  Alert, 
  ScrollView,
  StatusBar,
  SafeAreaView
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useCreateGallery, useUpdateGallery } from '../../../hooks/useGalleryData';
import { useAddCommunityMembersToGallery } from '../../../hooks/useMembershipData';
import { useCommunity } from '../../../hooks/useCommunityData';

// --- Theme ---
const COLORS = {
  bg: '#FFFFFF',
  textPrimary: '#000000',
  textSecondary: '#8E8E93',
  divider: '#F2F2F7',
  tint: '#000000', // Minimalist Black for active switches (or keep standard green if preferred)
  toggleTrack: '#E5E5EA',
};

type RouteParams = { 
  name: string;
  description?: string;
  imageUri?: string | null;
  startDate: string;
  endDate: string;
  location: string;
  communityId?: string;
};

// --- Reusable Segment Component ---
const Segment = <T extends string,>({
  options,
  value,
  onChange,
  disabled = false,
}: {
  options: { label: string; value: T }[];
  value: T;
  onChange: (next: T) => void;
  disabled?: boolean;
}) => {
  return (
    <View style={[styles.segmentContainer, disabled && styles.segmentDisabled]}>
      {options.map((opt) => {
        const isActive = opt.value === value;
        return (
          <TouchableOpacity
            key={opt.value}
            activeOpacity={disabled ? 1 : 0.8}
            style={[styles.segmentItem, isActive && styles.segmentItemActive]}
            onPress={() => !disabled && onChange(opt.value)}
            disabled={disabled}
          >
            <Text style={[
              styles.segmentText, 
              isActive && styles.segmentTextActive,
            ]}>
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
  const { name, description, imageUri, startDate, endDate, location, communityId } = (route.params || {}) as RouteParams;

  // --- Hooks ---
  const { mutateAsync: createGallery, isPending: isCreating } = useCreateGallery();
  const { mutateAsync: updateGallery } = useUpdateGallery();
  const { mutateAsync: addCommunityMembers, isPending: isAddingMembers } = useAddCommunityMembersToGallery();
  const { community } = useCommunity(communityId || null);

  // --- State ---
  const [joinRequiresApproval, setJoinRequiresApproval] = useState<boolean>(false);
  const [addPermission, setAddPermission] = useState<'ANYONE' | 'ADMIN'>('ADMIN');
  const [deletePermission, setDeletePermission] = useState<'ADMINS_AUTHORS' | 'ADMIN'>('ADMINS_AUTHORS');
  const [addAllCommunityMembers, setAddAllCommunityMembers] = useState<boolean>(true);
  const [inheritCommunitySettings, setInheritCommunitySettings] = useState<boolean>(true);

  // Sync settings
  useEffect(() => {
    if (inheritCommunitySettings && community) {
      const c: any = community;
      setJoinRequiresApproval(c.joinRequiresApproval ?? false);
      setAddPermission((c.addPermission as 'ANYONE' | 'ADMIN') ?? 'ADMIN');
      setDeletePermission((c.deletePermission as 'ADMINS_AUTHORS' | 'ADMIN') ?? 'ADMINS_AUTHORS');
    }
  }, [inheritCommunitySettings, community]);

  // Settings Payload
  const settingsToSave = useMemo(() => {
    if (inheritCommunitySettings && community) {
      const c: any = community;
      return {
        joinRequiresApproval: c.joinRequiresApproval ?? false,
        addPermission: (c.addPermission as 'ANYONE' | 'ADMIN') ?? 'ADMIN',
        deletePermission: (c.deletePermission as 'ADMINS_AUTHORS' | 'ADMIN') ?? 'ADMINS_AUTHORS',
      };
    }
    return { joinRequiresApproval, addPermission, deletePermission };
  }, [inheritCommunitySettings, community, joinRequiresApproval, addPermission, deletePermission]);

  // --- Save Handler ---
  const onSave = async () => {
    if (!name) return Alert.alert('Error', 'Missing event name.');
    
    try {
      // 1. Create Gallery
      const newGallery = await createGallery({
        galleryData: {
          name,
          type: 'EVENT',
          startDate,
          endDate,
          location: location || null,
          communityId: communityId || undefined,
        },
        imageUri: imageUri ?? null,
      });

      // 2. Update Settings
      await updateGallery({
        galleryId: newGallery.id,
        data: { ...settingsToSave } as any,
      });

      // 3. Add Members
      if (addAllCommunityMembers && communityId) {
        try {
          await addCommunityMembers({ galleryId: newGallery.id, communityId });
        } catch (error) {
          console.warn('Failed to add members automatically', error);
        }
      }

      // 4. Navigate to Share Event
      navigation.navigate('ShareEvent', { galleryId: newGallery.id });
      
    } catch (e: any) {
      Alert.alert('Failed to create event', e?.message ?? 'Please try again.');
    }
  };

  const isLoading = isCreating || isAddingMembers;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" />
      
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* --- Section 1: Membership --- */}
        <View style={styles.sectionHeaderContainer}>
            <Text style={styles.sectionHeader}>MEMBERSHIP</Text>
        </View>
        
        <View style={styles.row}>
            <View style={styles.textStack}>
                <Text style={styles.rowLabel}>Require Approval</Text>
                <Text style={styles.rowSubtext}>Admins must approve guests.</Text>
            </View>
            <Switch 
                value={joinRequiresApproval} 
                onValueChange={setJoinRequiresApproval}
                trackColor={{ false: COLORS.toggleTrack, true: COLORS.tint }}
                thumbColor="#FFF"
                ios_backgroundColor={COLORS.toggleTrack}
                disabled={inheritCommunitySettings && !!communityId}
            />
        </View>

        {communityId && (
            <View style={styles.row}>
                <View style={styles.textStack}>
                    <Text style={styles.rowLabel}>Sync Members</Text>
                    <Text style={styles.rowSubtext}>Auto-add members from community.</Text>
                </View>
                <Switch 
                    value={addAllCommunityMembers} 
                    onValueChange={setAddAllCommunityMembers}
                    trackColor={{ false: COLORS.toggleTrack, true: COLORS.tint }}
                    thumbColor="#FFF"
                    ios_backgroundColor={COLORS.toggleTrack}
                />
            </View>
        )}

        {/* --- Spacer --- */}
        <View style={styles.sectionSpacer} />

        {/* --- Section 2: Permissions --- */}
        <View style={styles.sectionHeaderContainer}>
            <Text style={styles.sectionHeader}>PERMISSIONS</Text>
        </View>

        {communityId && (
            <View style={styles.row}>
                <View style={styles.textStack}>
                    <Text style={styles.rowLabel}>Inherit Settings</Text>
                    <Text style={styles.rowSubtext}>Use defaults from {community?.name}.</Text>
                </View>
                <Switch 
                    value={inheritCommunitySettings} 
                    onValueChange={setInheritCommunitySettings}
                    trackColor={{ false: COLORS.toggleTrack, true: COLORS.tint }}
                    thumbColor="#FFF"
                    ios_backgroundColor={COLORS.toggleTrack}
                />
            </View>
        )}

        {/* Segment: Who can add? */}
        <View style={styles.controlRow}>
            <Text style={styles.controlLabel}>Who can post photos?</Text>
            <Segment
                options={[
                    { label: 'Admins', value: 'ADMIN' },
                    { label: 'Everyone', value: 'ANYONE' },
                ]}
                value={addPermission}
                onChange={setAddPermission}
                disabled={inheritCommunitySettings && !!communityId}
            />
        </View>

        {/* Segment: Who can delete? */}
        <View style={styles.controlRow}>
            <Text style={styles.controlLabel}>Who can delete photos?</Text>
            <Segment
                options={[
                    { label: 'Admins', value: 'ADMIN' },
                    { label: 'Authors', value: 'ADMINS_AUTHORS' },
                ]}
                value={deletePermission}
                onChange={setDeletePermission}
                disabled={inheritCommunitySettings && !!communityId}
            />
        </View>

      </ScrollView>

      {/* --- Footer Action --- */}
      <SafeAreaView style={styles.footer}>
        <TouchableOpacity
          activeOpacity={0.8}
          style={[styles.createButton, isLoading && styles.disabledButton]}
          onPress={onSave}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading ? 'Creating Event...' : 'Create Event'}
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  scrollContent: {
    paddingVertical: 24,
    paddingHorizontal: 24,
  },
  sectionSpacer: {
      height: 40,
  },

  // --- Section Headers ---
  sectionHeaderContainer: {
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
    paddingBottom: 8,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
    letterSpacing: 1, // Uppercase spacing
  },
  
  // --- Rows ---
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    // Removed border bottom from individual rows for cleaner look
    // but you can add it back if you want separation:
    // borderBottomWidth: 1,
    // borderBottomColor: '#F9F9F9',
  },
  textStack: {
      flex: 1,
      paddingRight: 16,
  },
  rowLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  rowSubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },

  // --- Controls ---
  controlRow: {
      paddingVertical: 16,
  },
  controlLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: COLORS.textPrimary,
      marginBottom: 12,
  },

  // --- Segment ---
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F5', // Very light gray track
    padding: 2,
    borderRadius: 8,
    height: 40,
  },
  segmentDisabled: {
      opacity: 0.5,
  },
  segmentItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
  },
  segmentItemActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  segmentTextActive: {
    fontWeight: '600',
    color: COLORS.textPrimary,
  },

  // --- Footer ---
  footer: {
    backgroundColor: COLORS.bg,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  createButton: {
    backgroundColor: '#000000',
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    backgroundColor: '#E5E5EA',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default CreateEventSettingsScreen;