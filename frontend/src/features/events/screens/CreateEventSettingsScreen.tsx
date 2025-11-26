import React, { useEffect, useMemo, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Switch, 
  TouchableOpacity, 
  Alert, 
  SafeAreaView, 
  ScrollView,
  StatusBar,
  Platform
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useGallery, useUpdateGallery } from '../../../hooks/useGalleryData';
import { useAddCommunityMembersToGallery } from '../../../hooks/useMembershipData';
import { useCommunity } from '../../../hooks/useCommunityData';

// iOS Design System
const COLORS = {
  background: '#FFFFFF',
  textPrimary: '#000000',
  textSecondary: '#8A8A8E',
  sectionHeader: '#6D6D72', // Standard iOS Section Header Gray
  separator: '#E5E5EA',
  segmentBg: '#F2F2F7', // System Gray 6
  button: '#000000',
  buttonText: '#FFFFFF',
  tint: '#34C759', // Apple Green for switches
};

type RouteParams = { galleryId?: string, communityId?: string };

// --- Styled Segment Component ---
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
    <View style={[styles.segmentContainer, disabled && styles.segmentContainerDisabled]}>
      {options.map((opt) => {
        const isActive = opt.value === value;
        return (
          <TouchableOpacity
            key={opt.value}
            activeOpacity={disabled ? 1 : 0.9}
            style={[styles.segmentItem, isActive && styles.segmentItemActive]}
            onPress={() => !disabled && onChange(opt.value)}
            disabled={disabled}
          >
            <Text style={[
              styles.segmentText, 
              isActive && styles.segmentTextActive,
              disabled && styles.segmentTextDisabled
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
  const { galleryId, communityId } = (route.params || {}) as RouteParams;

  const { gallery } = useGallery(galleryId || null);
  const { mutateAsync: updateGallery, isPending } = useUpdateGallery();
  const { mutateAsync: addCommunityMembers, isPending: isAddingMembers } = useAddCommunityMembersToGallery();
  const { community } = useCommunity(communityId || null);

  const [joinRequiresApproval, setJoinRequiresApproval] = useState<boolean>(false);
  const [addPermission, setAddPermission] = useState<'ANYONE' | 'ADMIN'>('ADMIN');
  const [deletePermission, setDeletePermission] = useState<'ADMINS_AUTHORS' | 'ADMIN'>('ADMINS_AUTHORS');
  const [addAllCommunityMembers, setAddAllCommunityMembers] = useState<boolean>(false);
  const [inheritCommunitySettings, setInheritCommunitySettings] = useState<boolean>(false);

  // Load gallery settings
  useEffect(() => {
    if (gallery) {
      const g: any = gallery;
      setJoinRequiresApproval(g.joinRequiresApproval ?? false);
      setAddPermission((g.addPermission as 'ANYONE' | 'ADMIN') ?? 'ADMIN');
      setDeletePermission((g.deletePermission as 'ADMINS_AUTHORS' | 'ADMIN') ?? 'ADMINS_AUTHORS');
      // Check if gallery already inherits from community (for existing galleries)
      // For new galleries, we'll default to false
    }
  }, [gallery]);

  // Sync settings from community when inherit is enabled
  useEffect(() => {
    if (inheritCommunitySettings && community) {
      const c: any = community;
      setJoinRequiresApproval(c.joinRequiresApproval ?? false);
      setAddPermission((c.addPermission as 'ANYONE' | 'ADMIN') ?? 'ADMIN');
      setDeletePermission((c.deletePermission as 'ADMINS_AUTHORS' | 'ADMIN') ?? 'ADMINS_AUTHORS');
    }
  }, [inheritCommunitySettings, community]);

  const hasChanges = useMemo(() => {
    if (!gallery) return true;
    const g: any = gallery;
    return (
      (g.joinRequiresApproval ?? false) !== joinRequiresApproval ||
      (g.addPermission ?? 'ADMIN') !== addPermission ||
      (g.deletePermission ?? 'ADMINS_AUTHORS') !== deletePermission
    );
  }, [gallery, joinRequiresApproval, addPermission, deletePermission]);

  // Determine which settings to save based on inherit flag
  const settingsToSave = useMemo(() => {
    if (inheritCommunitySettings && community) {
      const c: any = community;
      return {
        joinRequiresApproval: c.joinRequiresApproval ?? false,
        addPermission: (c.addPermission as 'ANYONE' | 'ADMIN') ?? 'ADMIN',
        deletePermission: (c.deletePermission as 'ADMINS_AUTHORS' | 'ADMIN') ?? 'ADMINS_AUTHORS',
      };
    }
    return {
      joinRequiresApproval,
      addPermission,
      deletePermission,
    };
  }, [inheritCommunitySettings, community, joinRequiresApproval, addPermission, deletePermission]);

  const onSave = async () => {
    if (!galleryId) {
      Alert.alert('Error', 'Missing event ID.');
      return;
    }
    try {
      await updateGallery({
        galleryId,
        data: {
          ...settingsToSave,
        } as any,
      });

      // If the switch is enabled and communityId exists, add all community members to the event
      if (addAllCommunityMembers && communityId) {
        try {
          const result = await addCommunityMembers({ galleryId, communityId });
          if (result.errors && result.errors.length > 0) {
            console.warn('Some members could not be added:', result.errors);
            Alert.alert(
              'Settings Saved',
              `Settings were saved. Added ${result.addedCount} member(s), but some could not be added.`,
              [{ text: 'OK' }]
            );
          }
        } catch (memberError: any) {
          console.error('Failed to add community members:', memberError);
          // Don't block navigation if member addition fails, but show a warning
          Alert.alert(
            'Settings Saved',
            'Settings were saved, but community members could not be added.',
            [{ text: 'OK' }]
          );
          navigation.navigate('ShareEvent', { galleryId });
          return;
        }
      }

      navigation.navigate('ShareEvent', { galleryId });
    } catch (e: any) {
      Alert.alert('Failed to save', e?.message ?? 'Please try again.');
    }
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        {/* --- Section 1: Membership --- */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>MEMBERSHIP</Text>
          
          <View style={styles.row}>
            <View style={styles.rowTextContainer}>
              <Text style={styles.rowLabel}>Require Approval</Text>
              <Text style={styles.rowDescription}>
                Admins must approve guests before they can view photos.
              </Text>
            </View>
            <Switch 
              value={joinRequiresApproval} 
              onValueChange={setJoinRequiresApproval}
              trackColor={{ false: '#E9E9EA', true: COLORS.tint }}
              ios_backgroundColor="#E9E9EA"
              disabled={inheritCommunitySettings && !!communityId}
            />
          </View>

          {communityId && (
            <View style={styles.row}>
              <View style={styles.rowTextContainer}>
                <Text style={styles.rowLabel}>Add All Community Members</Text>
                <Text style={styles.rowDescription}>
                  Automatically add all members from the community to this event.
                </Text>
              </View>
              <Switch 
                value={addAllCommunityMembers} 
                onValueChange={setAddAllCommunityMembers}
                trackColor={{ false: '#E9E9EA', true: COLORS.tint }}
                ios_backgroundColor="#E9E9EA"
              />
            </View>
          )}
        </View>

        <View style={styles.divider} />

        {/* --- Section 2: Permissions --- */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PERMISSIONS</Text>
          
          {communityId && (
            <View style={styles.row}>
              <View style={styles.rowTextContainer}>
                <Text style={styles.rowLabel}>Inherit Community Settings</Text>
                <Text style={styles.rowDescription}>
                  Use the same permissions as the community for this event.
                </Text>
              </View>
              <Switch 
                value={inheritCommunitySettings} 
                onValueChange={setInheritCommunitySettings}
                trackColor={{ false: '#E9E9EA', true: COLORS.tint }}
                ios_backgroundColor="#E9E9EA"
              />
            </View>
          )}

          {communityId && inheritCommunitySettings && (
            <View style={styles.inheritNotice}>
              <Text style={styles.inheritNoticeText}>
                Settings are inherited from the community and will update automatically.
              </Text>
            </View>
          )}

          <View style={styles.controlBlock}>
            <Text style={styles.controlLabel}>Who can add photos?</Text>
            <Segment
              options={[
                { label: 'Admins', value: 'ADMIN' },
                { label: 'Anyone', value: 'ANYONE' },
              ]}
              value={addPermission}
              onChange={setAddPermission}
              disabled={inheritCommunitySettings && !!communityId}
            />
          </View>

          <View style={styles.controlBlock}>
            <Text style={styles.controlLabel}>Who can delete photos?</Text>
            <Segment
              options={[
                { label: 'Admins & Authors', value: 'ADMINS_AUTHORS' },
                { label: 'Admins Only', value: 'ADMIN' },
              ]}
              value={deletePermission}
              onChange={setDeletePermission}
              disabled={inheritCommunitySettings && !!communityId}
            />
          </View>
        </View>

      </ScrollView>

      {/* --- Footer Action --- */}
      <View style={styles.footer}>
        <TouchableOpacity
          activeOpacity={0.8}
          style={[styles.button, (!hasChanges || isPending || isAddingMembers) && styles.buttonDisabled]}
          onPress={onSave}
          disabled={!hasChanges || isPending || isAddingMembers}
        >
          <Text style={styles.buttonText}>
            {isPending || isAddingMembers ? 'Saving…' : 'Save Settings'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  
  // Header
  headerContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  mainTitle: {
    fontSize: 34,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
  },

  // Sections
  section: {
    paddingHorizontal: 20,
    marginTop: 24,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.sectionHeader,
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.separator,
    marginHorizontal: 20,
    marginVertical: 16,
  },

  // Row (Switch)
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12
  },
  rowTextContainer: {
    flex: 1,
    paddingRight: 16,
  },
  rowLabel: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  rowDescription: {
    fontSize: 15,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },

  // Control Blocks (Segments)
  controlBlock: {
    marginBottom: 24,
  },
  controlLabel: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  
  // Segment Styling
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.segmentBg,
    padding: 3,
    borderRadius: 9,
    height: 36, // Standard height for sleek segments
  },
  segmentItem: {
    flex: 1,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentItemActive: {
    backgroundColor: '#FFFFFF',
    // iOS Shadow for floating effect
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 3,
  },
  segmentText: {
    fontSize: 13,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  segmentTextActive: {
    fontWeight: '600',
    color: '#000000',
  },
  segmentContainerDisabled: {
    opacity: 0.5,
  },
  segmentTextDisabled: {
    opacity: 0.6,
  },

  // Inherit Notice
  inheritNotice: {
    backgroundColor: COLORS.segmentBg,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 24,
    marginTop: 12,
  },
  inheritNoticeText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },

  // Footer
  footer: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F2',
    backgroundColor: COLORS.background, // Ensure opaque background
  },
  button: {
    backgroundColor: COLORS.button,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#E5E5EA',
  },
  buttonText: {
    color: COLORS.buttonText,
    fontSize: 17,
    fontWeight: '700',
  },
});

export default CreateEventSettingsScreen;