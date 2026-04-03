import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import FastImage from 'react-native-fast-image';
import Ionicons from 'react-native-vector-icons/Ionicons';

type Props = {
  name: string;
  membersCount?: number;
  lastActiveAt?: string;
  mostRecentPhotoUrl?: string;
  hasUnread?: boolean;
  onPress?: () => void;
};

const GroupCard: React.FC<Props> = ({
  name,
  membersCount = 0,
  lastActiveAt,
  mostRecentPhotoUrl,
  hasUnread = false,
  onPress,
}) => {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const metadata = [
    membersCount === 1 ? '1 member' : `${membersCount} members`,
    lastActiveAt,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      activeOpacity={0.5}
    >
      {/* Avatar */}
      {mostRecentPhotoUrl ? (
        <FastImage
          source={{ uri: mostRecentPhotoUrl }}
          style={styles.avatar}
          resizeMode={FastImage.resizeMode.cover}
        />
      ) : (
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.initials}>{initials}</Text>
        </View>
      )}

      {/* Text */}
      <View style={styles.content}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
          {hasUnread && <View style={styles.unreadDot} />}
        </View>
        {metadata ? (
          <Text style={styles.metadata} numberOfLines={1}>
            {metadata}
          </Text>
        ) : null}
      </View>

      <Ionicons name="chevron-forward" size={14} color="#CECECE" />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 13,
    backgroundColor: '#FAFAFA',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EBEBEB',
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#EFEFEF',
  },
  avatarPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#EFEFEF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontSize: 16,
    fontWeight: '600',
    color: '#AAAAAA',
    letterSpacing: 0.5,
  },
  content: {
    flex: 1,
    marginLeft: 13,
    marginRight: 6,
    gap: 3,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111111',
    letterSpacing: -0.2,
    flexShrink: 1,
  },
  metadata: {
    fontSize: 12.5,
    color: '#AAAAAA',
    fontWeight: '400',
    letterSpacing: 0.1,
  },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#111111',
  },
});

export default GroupCard;