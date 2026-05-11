import React, { useEffect, useState, useMemo } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, Alert,
  SafeAreaView, ActivityIndicator,
} from "react-native";
import { useRoute } from "@react-navigation/native";
import { useGroup, useUpdateGroup } from "../../../../hooks/useGroupData";
import { useMyGroupMembership } from "../../../../hooks/useGroupMembershipData";
import { useQueryClient } from "@tanstack/react-query";
import Ionicons from "react-native-vector-icons/Ionicons";

const EditDeletePermissionScreen = () => {
  const route = useRoute();
  const queryClient = useQueryClient();
  const { groupId } = route.params as { groupId: string };

  const { group: community, isLoading } = useGroup(groupId);
  const { data: myMembership } = useMyGroupMembership(groupId);
  const { mutate: updateGroup, isPending: isUpdating } = useUpdateGroup();

  const [selectedOption, setSelectedOption] = useState<'ADMINS_AUTHORS' | 'ADMIN'>('ADMINS_AUTHORS');

  const options = [
    { id: "1", value: "ADMINS_AUTHORS" as const, title: "Admins and Authors", subtitle: "Admins and photo authors can delete pictures" },
    { id: "2", value: "ADMIN" as const, title: "Admins Only", subtitle: "Only admins can delete pictures" },
  ];

  useEffect(() => {
    if (community?.deletePermission) {
      setSelectedOption(community.deletePermission);
    }
  }, [community]);

  const isDirty = useMemo(() => {
    return community?.deletePermission !== selectedOption;
  }, [community?.deletePermission, selectedOption]);

  const handleSave = () => {
    if (!isDirty || isUpdating) return;
    updateGroup(
      { groupId, data: { deletePermission: selectedOption } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['group', groupId] });
        },
        onError: () => {
          Alert.alert('Error', 'Failed to update permission.');
        },
      }
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="small" color="#999" />
      </View>
    );
  }

  const canEdit = myMembership?.role === 'ADMIN' || community?.ownerId === myMembership?.userId;

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.content}>
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Who can delete photos?</Text>
            <View style={styles.card}>
              {options.map((item, index) => (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.optionRow, index === options.length - 1 && styles.optionRowLast]}
                  onPress={() => setSelectedOption(item.value)}
                  disabled={!canEdit}
                  activeOpacity={0.5}
                >
                  <View style={styles.optionText}>
                    <Text style={styles.optionTitle}>{item.title}</Text>
                    <Text style={styles.optionSubtitle}>{item.subtitle}</Text>
                  </View>
                  {selectedOption === item.value && (
                    <Ionicons name="checkmark" size={18} color="#111111" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
        {canEdit && (
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.saveBtn, (!isDirty || isUpdating) && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={!isDirty || isUpdating}
              activeOpacity={0.7}
            >
              {isUpdating ? (
                <ActivityIndicator color={isDirty ? '#FFF' : '#BBBBBB'} />
              ) : (
                <Text style={[styles.saveBtnText, (!isDirty || isUpdating) && styles.saveBtnTextDisabled]}>
                  Save changes
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
};

export default EditDeletePermissionScreen;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  loading: {
    flex: 1,
    backgroundColor: '#FAFAFA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
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
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EBEBEB',
  },
  optionRowLast: {
    borderBottomWidth: 0,
  },
  optionText: {
    flex: 1,
    marginRight: 12,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111111',
    letterSpacing: -0.1,
  },
  optionSubtitle: {
    fontSize: 13,
    color: '#AAAAAA',
    marginTop: 2,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E5E5',
  },
  saveBtn: {
    backgroundColor: '#111111',
    height: 48,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnDisabled: {
    backgroundColor: '#EFEFEF',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  saveBtnTextDisabled: {
    color: '#BBBBBB',
  },
});
