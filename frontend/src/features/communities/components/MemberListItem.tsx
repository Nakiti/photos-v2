import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';

type Props = {
  name: string;
  handle?: string;
  avatarUrl?: string;
  role?: 'ADMIN' | 'MEMBER';
  onPress?: () => void;
  rightActionText?: string;
  onRightActionPress?: () => void;
};

const MemberListItem: React.FC<Props> = ({
  name,
  handle,
  avatarUrl,
  role,
  onPress,
  rightActionText,
  onRightActionPress,
}) => {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      {avatarUrl ? (
        <Image source={{ uri: avatarUrl }} style={styles.avatar} />
      ) : (
        <View style={styles.placeholderAvatar}>
          <Text style={styles.placeholderText}>{name.slice(0, 1).toUpperCase()}</Text>
        </View>
      )}
      <View style={styles.center}>
        <Text style={styles.name}>{name}</Text>
        <View style={styles.metaRow}>
          {!!handle && <Text style={styles.handle}>@{handle}</Text>}
          {!!role && <Text style={styles.role}>{role}</Text>}
        </View>
      </View>
      {!!rightActionText && (
        <TouchableOpacity onPress={onRightActionPress} style={styles.actionBtn}>
          <Text style={styles.actionText}>{rightActionText}</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  placeholderAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f1f1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  placeholderText: {
    fontWeight: '700',
    color: '#555',
  },
  center: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111',
  },
  metaRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
  handle: {
    fontSize: 12,
    color: '#666',
  },
  role: {
    fontSize: 12,
    color: '#999',
  },
  actionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#111',
    borderRadius: 8,
  },
  actionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default MemberListItem;










