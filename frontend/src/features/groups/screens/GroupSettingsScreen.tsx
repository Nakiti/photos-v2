import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity,
  Switch, SafeAreaView, ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { useDeleteGroup, useGroup, useLeaveGroup } from '../../../hooks/useGroupData';
import { useAuth } from '../../../hooks/useAuth';
import Ionicons from 'react-native-vector-icons/Ionicons';

interface SettingItem {
  label: string;
  value?: string | null | boolean;
  onPress?: () => void;
  isDestructive?: boolean;
  isSwitch?: boolean;
}

interface SettingsSection {
  category?: string;
  items: SettingItem[];
}

const SectionLabel = ({ title }: { title: string }) => (
  <Text style={styles.sectionLabel}>{title}</Text>
);

const SettingsRow = ({ item, isLast }: { item: SettingItem; isLast: boolean }) => (
  <TouchableOpacity
    style={[styles.row, isLast && styles.rowLast]}
    onPress={item.onPress}
    activeOpacity={item.isSwitch ? 1 : 0.5}
    disabled={!item.onPress && !item.isSwitch}
  >
    <Text style={[styles.rowLabel, item.isDestructive && styles.rowLabelDestructive]}>
      {item.label}
    </Text>
    <View style={styles.rowRight}>
      {item.isSwitch ? (
        <Switch
          value={item.value === true}
          onValueChange={item.onPress}
          trackColor={{ false: '#E5E5E5', true: '#111111' }}
          thumbColor="#FFFFFF"
          ios_backgroundColor="#E5E5E5"
        />
      ) : (
        <>
          {item.value != null && typeof item.value !== 'boolean' && (
            <Text style={styles.rowValue}>{item.value}</Text>
          )}
          {!item.isDestructive && item.onPress && (
            <Ionicons name="chevron-forward" size={14} color="#CECECE" style={{ marginLeft: 4 }} />
          )}
        </>
      )}
    </View>
  </TouchableOpacity>
);

const GroupSettingsScreen = () => {
  const [settingsData, setSettingsData] = useState<SettingsSection[] | null>(null);
  const navigation = useNavigation();
  const route = useRoute();
  const { groupId } = route.params as { groupId: string };

  const { group, isLoading, refetch } = useGroup(groupId);
  const { user } = useAuth();
  const deleteGroupMutation = useDeleteGroup();
  const leaveGroupMutation = useLeaveGroup();

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const isOwner = group?.ownerId === user?.id;

  const confirmAndDeleteGroup = () => {
    if (!group?.id) return;
    Alert.alert(
      'Delete Group',
      'This will permanently delete this group and its galleries for all members. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteGroupMutation.mutate(group.id, {
              onSuccess: () => (navigation as any).navigate('TabNavigator', { screen: 'Groups' }),
            });
          },
        },
      ]
    );
  };

  const confirmAndLeaveGroup = () => {
    if (!group?.id) return;
    Alert.alert(
      'Leave Group',
      'Are you sure you want to leave this group? You will lose access to all galleries in this group.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: () => {
            leaveGroupMutation.mutate(group.id, {
              onSuccess: () => (navigation as any).navigate('TabNavigator', { screen: 'Groups' }),
            });
          },
        },
      ]
    );
  };

  useEffect(() => {
    if (!group || !user) { setSettingsData(null); return; }

    const c = group as any;
    const data: SettingsSection[] = [];

    data.push({
      category: 'General',
      items: [
        {
          label: 'Name',
          value: group.name,
          onPress: () => (navigation as any).navigate('EditGroupDetails', { groupId: group.id }),
        },
      ],
    });

    if (isOwner) {
      data.push({
        category: 'Permissions',
        items: [
          {
            label: 'Who can add members?',
            value: c.addPermission === 'ANYONE' ? 'Anyone' : 'Admins',
            onPress: () => (navigation as any).navigate('EditAddPermission', { groupId: group.id }),
          },
          {
            label: 'Who can delete photos?',
            value: c.deletePermission === 'ADMINS_AUTHORS' ? 'Admins & Authors' : 'Admins',
            onPress: () => (navigation as any).navigate('EditDeletePermission', { groupId: group.id }),
          },
        ],
      });

      data.push({
        category: 'Admin',
        items: [
          {
            label: 'Transfer Ownership',
            onPress: () => (navigation as any).navigate('ChangeOwnership', { groupId: group.id }),
          },
          {
            label: 'Delete Group',
            onPress: confirmAndDeleteGroup,
            isDestructive: true,
          },
        ],
      });
    } else {
      data.push({
        category: 'Permissions',
        items: [
          {
            label: 'Who can add members?',
            value: c.addPermission === 'ANYONE' ? 'Anyone' : 'Admins',
          },
          {
            label: 'Who can delete photos?',
            value: c.deletePermission === 'ADMINS_AUTHORS' ? 'Admins & Authors' : 'Admins',
          },
        ],
      });

      data.push({
        items: [
          {
            label: 'Leave Group',
            onPress: confirmAndLeaveGroup,
            isDestructive: true,
          },
        ],
      });
    }

    setSettingsData(data);
  }, [group, user, isOwner, navigation]);

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="small" color="#999" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {settingsData?.map((section, sectionIndex) => (
            <View key={sectionIndex} style={styles.section}>
              {section.category && <SectionLabel title={section.category} />}
              <View style={styles.card}>
                {section.items.map((item, itemIndex) => (
                  <SettingsRow
                    key={itemIndex}
                    item={item}
                    isLast={itemIndex === section.items.length - 1}
                  />
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

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
  scrollContent: {
    paddingTop: 20,
    paddingBottom: 60,
    paddingHorizontal: 20,
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
  row: {
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
  rowLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111111',
    letterSpacing: -0.1,
  },
  rowLabelDestructive: {
    color: '#CC3333',
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowValue: {
    fontSize: 14,
    color: '#AAAAAA',
    fontWeight: '400',
    marginRight: 2,
  },
});

export default GroupSettingsScreen;
