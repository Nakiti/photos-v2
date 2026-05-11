import React, { useMemo } from 'react';
import { StyleSheet, View, TouchableOpacity, Text } from 'react-native';
import FastImage from 'react-native-fast-image';
import Ionicons from 'react-native-vector-icons/Ionicons';

export type GalleryListItemProps = {
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
  if (!dateString) return '';
  const diffMins = Math.floor((Date.now() - new Date(dateString).getTime()) / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const GalleryListItem = ({
  id, icon, title, lastUploadedBy, unseenCount,
  lastUpdated, communityName, onPress,
}: GalleryListItemProps) => {
  const timeLabel = useMemo(() => getTimeAgo(lastUpdated), [lastUpdated]);
  const hasUnread = unseenCount > 0;

  const preview = lastUploadedBy
    ? `${lastUploadedBy} added a photo`
    : 'No photos yet';

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={() => onPress?.(id)}
      activeOpacity={0.5}
    >
      {/* Unread indicator */}
      <View style={styles.unreadIndicatorWrap}>
        {hasUnread && <View style={styles.unreadDot} />}
      </View>

      {/* Avatar */}
      <FastImage
        source={{ uri: icon, priority: FastImage.priority.normal }}
        style={styles.avatar}
        resizeMode={FastImage.resizeMode.cover}
      />

      {/* Content */}
      <View style={styles.content}>

        {/* Row 1: title + community badge + timestamp */}
        <View style={styles.topRow}>
          <Text
            style={[styles.title, hasUnread && styles.titleUnread]}
            numberOfLines={1}
          >
            {title}
          </Text>
          {communityName ? (
            <View style={styles.communityBadge}>
              <Text style={styles.communityBadgeText} numberOfLines={1}>{communityName}</Text>
            </View>
          ) : null}
          <Text style={[styles.time, hasUnread && styles.timeUnread]}>
            {timeLabel}
          </Text>
        </View>

        {/* Row 2: preview */}
        <Text
          style={[styles.preview, hasUnread && styles.previewUnread]}
          numberOfLines={1}
        >
          {preview}
        </Text>

      </View>

        <Ionicons name="chevron-forward" size={14} color="#CECECE" style={styles.chevron} />

    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 16,
    paddingVertical: 13,
    backgroundColor: '#FAFAFA',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EBEBEB',
  },

  // Unread dot sits in a fixed-width column to the left of the avatar
  unreadIndicatorWrap: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#111111',
  },

  avatar: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: '#EFEFEF',
    marginRight: 13,
  },

  content: {
    flex: 1,
    gap: 3,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    flexShrink: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#111111',
    letterSpacing: -0.2,
    marginRight: 6,
  },
  titleUnread: {
    fontWeight: '700',
  },
  time: {
    fontSize: 12,
    color: '#BBBBBB',
    fontWeight: '400',
    flexShrink: 0,
    marginLeft: 'auto',
    paddingLeft: 6,
  },
  timeUnread: {
    color: '#888888',
    fontWeight: '500',
  },
  chevron: {
    marginLeft: 4,
  },

  communityBadge: {
    backgroundColor: '#F0F0F0',
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
    flexShrink: 0,
    maxWidth: 120,
  },
  communityBadgeText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#888888',
    letterSpacing: 0.1,
  },
  preview: {
    fontSize: 13,
    color: '#BBBBBB',
    fontWeight: '400',
    lineHeight: 18,
    flexShrink: 1,
  },
  previewUnread: {
    color: '#666666',
    fontWeight: '400',
  },
});

export default GalleryListItem;