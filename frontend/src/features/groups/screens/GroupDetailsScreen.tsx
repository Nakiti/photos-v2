// similar to gallery details screen, presentational summary with actions
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useGroup } from '../../../hooks/useGroupData';
import { useGroupMembers } from '../../../hooks/useGroupMembershipData';

const GroupDetailsScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { groupId } = (route.params as any) ?? { groupId: undefined };
  const { group } = useGroup(groupId);
  const { members } = useGroupMembers(groupId);

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>{(group as any)?.name ?? 'Group'}</Text>
        {!!(group as any)?.description && (
          <Text style={styles.desc}>{(group as any)?.description}</Text>
        )}
        <View style={styles.metaRow}>
          <Text style={styles.meta}>Owner • {(group as any)?.ownerId}</Text>
          <Text style={styles.dot}>•</Text>
          <Text style={styles.meta}>{members?.length ?? 0} members</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.primary]}
          onPress={() => navigation.navigate('GroupMembers', { groupId })}
        >
          <Text style={styles.primaryText}>View Members</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, styles.secondary]}
          onPress={() => navigation.navigate('GroupSettings', { groupId })}
        >
          <Text style={styles.secondaryText}>Settings</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#eee',
    padding: 16,
    marginBottom: 16,
  },
  title: { fontSize: 22, fontWeight: '700', color: '#111', marginBottom: 6 },
  desc: { fontSize: 15, color: '#555', lineHeight: 20 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  meta: { color: '#777', fontSize: 12 },
  dot: { color: '#aaa', marginHorizontal: 2 },
  actions: { gap: 10 },
  actionBtn: {
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: { backgroundColor: '#111' },
  primaryText: { color: '#fff', fontWeight: '600' },
  secondary: { backgroundColor: '#f4f4f4' },
  secondaryText: { color: '#111', fontWeight: '600' },
});

export default GroupDetailsScreen;
