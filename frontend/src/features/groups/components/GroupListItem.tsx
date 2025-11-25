import React, { useMemo } from 'react';
import { StyleSheet, View, TouchableOpacity, Text } from 'react-native';
import FastImage from 'react-native-fast-image';

// iOS Standard Colors
const COLORS = {
  background: '#FFFFFF',
  textPrimary: '#000000',
  textSecondary: '#8E8E93', // System Gray
  separator: '#C6C6C8',
  badgeBg: '#F2F2F7', // System Gray 6
  tint: '#007AFF', // Apple Blue
  unreadIndicator: '#007AFF',
};

export type GroupListItemProps = {
  id: string;
  icon: string;
  title: string;
  lastUploadedBy: string;
  unseenCount: number;
  lastUpdated: string;
  communityName?: string; // Made optional to be safe
  onPress?: (id: string) => void;
};

// Simplified Time Logic
const getTimeAgo = (dateString: string) => {
    if (!dateString) return "";
    const now = new Date();
    const uploadedDate = new Date(dateString);
    const diffMs = now.getTime() - uploadedDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Now";
    if (diffMins < 60) return `${diffMins}m`; // iOS Style compact
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d`;
    return uploadedDate.toLocaleDateString(); // Fallback to date
};

const GroupListItem = ({ 
  id, 
  icon, 
  title, 
  lastUploadedBy, 
  unseenCount, 
  lastUpdated, 
  communityName, 
  onPress 
}: GroupListItemProps) => {
  
  const timeLabel = useMemo(() => getTimeAgo(lastUpdated), [lastUpdated]);
  const hasUnread = unseenCount > 0;

  return (
    <TouchableOpacity 
      style={styles.container} 
      onPress={() => onPress && onPress(id)}
      activeOpacity={0.7}
    >
      {/* Avatar */}
      <FastImage 
        source={{ 
          uri: icon || "https://www.shutterstock.com/image-vector/premium-picture-icon-logo-line-260nw-749843887.jpg",
          priority: FastImage.priority.normal, 
        }} 
        style={styles.avatar} 
        resizeMode={FastImage.resizeMode.cover}
      />

      <View style={styles.contentContainer}>
        {/* Top Row: Title + Badge + Time */}
        <View style={styles.topRow}>
          <View style={styles.titleSection}>
            <Text style={[styles.title, hasUnread && styles.titleUnread]} numberOfLines={1}>
              {title}
            </Text>
            
            {/* Community Badge */}
            {communityName ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText} numberOfLines={1}>
                  {communityName}
                </Text>
              </View>
            ) : null}
          </View>

          <Text style={[styles.time, hasUnread && styles.timeUnread]}>
            {timeLabel}
          </Text>
        </View>

        {/* Bottom Row: Message + Unseen Indicator */}
        <View style={styles.bottomRow}>
          <Text style={[styles.message, hasUnread && styles.messageUnread]} numberOfLines={2}>
            {lastUploadedBy ? (
              <Text>
                <Text style={styles.senderName}>{lastUploadedBy}</Text> added a photo.
              </Text>
            ) : "No recent activity"}
          </Text>
          
          {/* Blue Dot for Unseen */}
          {hasUnread && (
            <View style={styles.unreadDot}>
              <Text style={styles.unreadCountText}>{unseenCount > 99 ? '99+' : unseenCount}</Text>
            </View>
          )}
        </View>
        
        {/* Indented Separator */}
        <View style={styles.separator} />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: COLORS.background,
    paddingLeft: 16, // Left padding applies to container to offset image
    minHeight: 76,
    alignItems: 'center',
  },
  avatar: {
    width: 56, // Standard iOS large list avatar
    height: 56,
    borderRadius: 18, // Continuous curve smoothing look
    backgroundColor: COLORS.badgeBg,
    marginRight: 12,
  },
  contentContainer: {
    flex: 1,
    paddingVertical: 12,
    paddingRight: 16,
    justifyContent: 'center',
   //  height: '100%',
  },
  
  // Top Row Layout
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center", // Aligns text baselines roughly
    marginBottom: 2,
  },
  titleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1, // Takes available space
    marginRight: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: "600",
    color: COLORS.textPrimary,
    flexShrink: 1, // Allows title to shrink if badge/time need space
  },
  titleUnread: {
    color: COLORS.textPrimary, // Could make blacker or keep same
  },
  
  // Badge Styling
  badge: {
    backgroundColor: COLORS.badgeBg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 6,
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: 100, // Max width for badge
  },
  badgeText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase', // Often looks cleaner for badges
  },

  // Time Styling
  time: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '400',
  },
  timeUnread: {
    color: COLORS.tint, // Blue time usually indicates unread in iOS
    fontWeight: '600',
  },

  // Bottom Row
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  message: {
    fontSize: 15,
    color: COLORS.textSecondary,
    flex: 1,
    lineHeight: 20,
    marginRight: 8,
  },
  messageUnread: {
    color: COLORS.textPrimary, // Darker text for unread preview
    fontWeight: '400',
  },
  senderName: {
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  
  // Unread Dot
  unreadDot: {
    backgroundColor: COLORS.unreadIndicator,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    marginTop: 2,
  },
  unreadCountText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },

  // Separator
//   separator: {
//     position: 'absolute',
//     bottom: 0,
//     right: 0,
//     left: 0, // Starts from content start
//     height: StyleSheet.hairlineWidth,
//     backgroundColor: COLORS.separator,
//   },
});

export default GroupListItem;