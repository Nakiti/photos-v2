import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useCreateGroup, useUpdateGroup } from '../../../hooks/useGroupData';

// --- Theme ---
const COLORS = {
  bg: '#FFFFFF',
  textPrimary: '#000000',
  textSecondary: '#8E8E93',
  divider: '#F2F2F7',
  tint: '#000000', // Minimalist Black for active state
  toggleTrack: '#E5E5EA',
};

type RouteParams = { 
  name: string;
  description?: string;
  imageUri?: string | null;
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

const CreateGroupSettingsScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { name, description, imageUri } = (route.params || {}) as RouteParams;

  // --- Hooks ---
  const { mutateAsync: createGroup, isPending: isCreating } = useCreateGroup();
  const { mutateAsync: updateGroup } = useUpdateGroup();
  
  // --- State ---
  const [addPermission, setAddPermission] = useState<'ANYONE' | 'ADMIN'>('ADMIN');
  const [deletePermission, setDeletePermission] = useState<'ADMINS_AUTHORS' | 'ADMIN'>('ADMIN');

  // --- Save Handler ---
  const onSave = async () => {
    if (!name) return Alert.alert('Error', 'Missing group name.');

    try {
      // 1. Create Group
      const newGroup = await createGroup({
        data: {
          name,
          description: description || undefined,
        },
        imageUri: imageUri ?? null,
      });

      // 2. Update Settings (since they're not in create schema)
      await updateGroup({
        groupId: newGroup.id,
        data: {
          addPermission,
          deletePermission,
        } as any,
      });

      // 3. Navigate to Add Members
      navigation.navigate("AddGroupMembers", { groupId: newGroup.id });
    } catch (e: any) {
      Alert.alert('Failed to create group', e?.message ?? 'Please try again.');
    }
  };

  const isLoading = isCreating;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" />
      
      <ScrollView 
        style={styles.container} 
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >

        {/* --- Section: Permissions --- */}
        <View style={styles.sectionHeaderContainer}>
            <Text style={styles.sectionHeader}>PERMISSIONS</Text>
        </View>

        {/* Permission: Add Members (Matching your CommunitySettings logic) */}
        <View style={styles.controlRow}>
            <Text style={styles.controlLabel}>Who can invite members?</Text>
            <Segment
              options={[
                { label: 'Admins', value: 'ADMIN' },
                { label: 'Everyone', value: 'ANYONE' },
              ]}
              value={addPermission}
              onChange={setAddPermission}
            />
        </View>

        {/* Permission: Delete Photos */}
        <View style={styles.controlRow}>
            <Text style={styles.controlLabel}>Who can delete photos?</Text>
            <Segment
              options={[
                { label: 'Admins Only', value: 'ADMIN' },
                { label: 'Admins & Authors', value: 'ADMINS_AUTHORS' },
              ]}
              value={deletePermission}
              onChange={setDeletePermission}
            />
        </View>

      </ScrollView>

      {/* --- Footer Action --- */}
      <SafeAreaView style={styles.footer}>
        <TouchableOpacity
          activeOpacity={0.8}
          style={[styles.saveButton, isLoading && styles.saveButtonDisabled]}
          onPress={onSave}
          disabled={isLoading}
        >
          <Text style={styles.saveText}>
            {isLoading ? 'Creating Group...' : 'Create Group'}
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
  container: {
    flex: 1,
  },
  contentContainer: {
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
    backgroundColor: '#F5F5F5',
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
  saveButton: {
    backgroundColor: '#000000',
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#E5E5EA',
  },
  saveText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default CreateGroupSettingsScreen;