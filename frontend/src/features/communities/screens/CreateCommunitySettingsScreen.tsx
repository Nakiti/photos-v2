import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Platform,
  Alert,
  ActivityIndicator
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useCommunity, useUpdateCommunity } from '../../../hooks/useCommunityData';
import Segment from '../../../components/Segment'; 

// iOS Clean White Theme Colors
const COLORS = {
  background: '#FFFFFF',
  textPrimary: '#000000',
  textSecondary: '#8A8A8E', // Lighter gray for descriptions
  sectionHeader: '#000000', // Bold Black for headers in this style
  separator: '#E5E5EA', // Standard iOS separator
  segmentBg: '#F2F2F7', // Gray background for the toggle container
  button: '#000000',
  buttonText: '#FFFFFF',
};

type RouteParams = { communityId?: string };

const CreateCommunitySettingsScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { communityId } = (route.params || {}) as RouteParams;
  
  const { community } = useCommunity(communityId || null);
  const { mutateAsync: updateCommunity, isPending } = useUpdateCommunity();
  
  const [joinRequiresApproval, setJoinRequiresApproval] = useState<boolean>(false);
  const [addPermission, setAddPermission] = useState<'ANYONE' | 'ADMIN'>('ADMIN');
  const [deletePermission, setDeletePermission] = useState<'ADMINS_AUTHORS' | 'ADMIN'>('ADMIN');

  useEffect(() => {
    if (community) {
      const c: any = community;
      setJoinRequiresApproval(c.joinRequiresApproval ?? false);
      setAddPermission((c.addPermission as 'ANYONE' | 'ADMIN') ?? 'ADMIN');
      setDeletePermission((c.deletePermission as 'ADMINS_AUTHORS' | 'ADMIN') ?? 'ADMIN');
    }
  }, [community]);

  const hasChanges = useMemo(() => {
    if (!community) return true;
    const c: any = community;
    return (
      (c.joinRequiresApproval ?? false) !== joinRequiresApproval ||
      (c.addPermission ?? 'ADMIN') !== addPermission ||
      (c.deletePermission ?? 'ADMIN') !== deletePermission
    );
  }, [community, joinRequiresApproval, addPermission, deletePermission]);

  const onSave = async () => {
    if (!communityId) {
      Alert.alert('Missing community', 'Could not determine which community to update.');
      return;
    }
    try {
      await updateCommunity({
        communityId,
        data: {
          joinRequiresApproval,
          addPermission,
          deletePermission,
        } as any,
      });
      navigation.navigate("ShareCommunity", { communityId });
    } catch (e: any) {
      Alert.alert('Failed to save', e?.message ?? 'Please try again.');
    }
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      <ScrollView 
        style={styles.container} 
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >

        {/* --- Section 1: Membership --- */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>MEMBERSHIP</Text>
          
          <View style={styles.row}>
            <View style={styles.rowTextContainer}>
              <Text style={styles.rowLabel}>Require Approval</Text>
              <Text style={styles.rowDescription}>
                New members must be approved by an admin.
              </Text>
            </View>
            <Switch 
              value={joinRequiresApproval} 
              onValueChange={setJoinRequiresApproval}
              trackColor={{ false: '#E9E9EA', true: '#34C759' }}
              ios_backgroundColor="#E9E9EA"
            />
          </View>
        </View>

        <View style={styles.divider} />

        {/* --- Section 2: Permissions --- */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PERMISSIONS</Text>
          
          {/* Permission 1 */}
          <View style={styles.controlBlock}>
            <Text style={styles.controlLabel}>Who can add photos?</Text>
            <View style={styles.segmentContainer}>
              <Segment
                options={[
                  { label: 'Admins', value: 'ADMIN' },
                  { label: 'Anyone', value: 'ANYONE' },
                ]}
                value={addPermission}
                onChange={setAddPermission}
              />
            </View>
          </View>

          {/* Permission 2 */}
          <View style={styles.controlBlock}>
            <Text style={styles.controlLabel}>Who can delete photos?</Text>
            <View style={styles.segmentContainer}>
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

        </View>
      </ScrollView>

      {/* --- Footer Action --- */}
      <SafeAreaView style={styles.footerContainer}>
        <TouchableOpacity
          activeOpacity={0.8}
          style={[
            styles.saveButton, 
            (!hasChanges || isPending) && styles.saveButtonDisabled
          ]}
          onPress={onSave}
          disabled={!hasChanges || isPending}
        >
          {isPending ? (
            <ActivityIndicator color={COLORS.buttonText} />
          ) : (
            <Text style={styles.saveText}>
              Continue
            </Text>
          )}
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 40,
  },
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
  
  // Section Styling
  section: {
    paddingHorizontal: 20,
    marginTop: 24,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
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

  // Row Styling (Switch)
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
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

  // Control Block (Segments)
  controlBlock: {
    marginBottom: 24,
  },
  controlLabel: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  segmentContainer: {
    // We add a subtle background to the segment area 
    // so the white buttons inside the segment pop against the white page
    backgroundColor: COLORS.segmentBg, 
    padding: 4,
    borderRadius: 9, 
  },

  // Button Styling
  footerContainer: {
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.separator,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'android' ? 16 : 0,
  },
  saveButton: {
    backgroundColor: COLORS.button,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#E5E5EA',
  },
  saveText: {
    color: COLORS.buttonText,
    fontSize: 17,
    fontWeight: '700',
  },
});

export default CreateCommunitySettingsScreen;