import React, { useMemo } from 'react';
import { StyleSheet, View, TouchableOpacity, Text } from 'react-native';
import FastImage from 'react-native-fast-image';
import Ionicons from 'react-native-vector-icons/Ionicons';

export type GroupListItemProps = {
  id: string;
  icon: string;
  title: string;
  lastUploadedBy: string;
  unseenCount: number;
  lastUpdated: string;
  communityName?: string;
  photoCount?: number;
  memberCount?: number;
  onPress?: (id: string) => void;
};

const getTimeAgo = (dateString: string) => {
  if (!dateString) return "";
  const diffMins = Math.floor((Date.now() - new Date(dateString).getTime()) / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d`;
  return new Date(dateString).toLocaleDateString();
};

const GroupListItem = ({
  id, icon, title, lastUploadedBy, unseenCount,
  lastUpdated, communityName, photoCount, memberCount, onPress,
}: GroupListItemProps) => {
  const timeLabel = useMemo(() => getTimeAgo(lastUpdated), [lastUpdated]);
  const hasUnread = unseenCount > 0;

  const statusText = `${lastUploadedBy} added a photo`

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={() => onPress?.(id)}
      activeOpacity={0.5}
    >
      {/* Avatar */}
      <View style={styles.avatarWrap}>
        <FastImage
          source={{ uri: icon, priority: FastImage.priority.normal }}
          style={styles.avatar}
          resizeMode={FastImage.resizeMode.cover}
        />
        {hasUnread && <View style={styles.unreadRing} />}
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.topRow}>

          <Text style={[styles.timeLabel, hasUnread && styles.timeLabelUnread]}>
            {timeLabel}
          </Text>
        </View>

        <View style={styles.titleRow}>
          <Text style={[styles.title, hasUnread && styles.titleUnread]} numberOfLines={1}>
            {title}
          </Text>
          {hasUnread && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{unseenCount}</Text>
            </View>
          )}
        </View>

        <View style={styles.statusRow}>

          <Text style={styles.statusText} numberOfLines={1}>
            {lastUploadedBy
              ? <><Text style={styles.statusSender}>{lastUploadedBy}</Text> added a photo</>
              : statusText}
          </Text>
        </View>
      </View>

      <Ionicons name="chevron-forward" size={14} color="#CECECE" style={{ marginLeft: 6 }} />
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

  avatarWrap: {
    position: 'relative',
    marginRight: 14,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#EFEFEF',
  },
  unreadRing: {
    position: 'absolute',
    top: -2, left: -2, right: -2, bottom: -2,
    borderWidth: 2,
    borderColor: '#111111',
    borderRadius: 16,
  },

  content: {
    flex: 1,
    gap: 3,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  communityLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#AAAAAA',
    letterSpacing: 0.6,
  },
  timeLabel: {
    fontSize: 11.5,
    color: '#CCCCCC',
    fontWeight: '400',
  },
  timeLabelUnread: {
    color: '#111111',
    fontWeight: '600',
  },

  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111111',
    letterSpacing: -0.2,
    flex: 1,
    marginRight: 8,
  },
  titleUnread: {
    fontWeight: '700',
  },
  unreadBadge: {
    backgroundColor: '#111111',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    minWidth: 20,
    alignItems: 'center',
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },

  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 12.5,
    color: '#AAAAAA',
    fontWeight: '400',
  },
  statusSender: {
    color: '#555555',
    fontWeight: '500',
  },
});

export default GroupListItem;