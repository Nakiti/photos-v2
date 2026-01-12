import React, { useMemo } from 'react';
import { StyleSheet, View, TouchableOpacity, Text } from 'react-native';
import FastImage from 'react-native-fast-image';
import Ionicons from 'react-native-vector-icons/Ionicons';

// --- Theme Colors ---
const COLORS = {
  background: '#FFFFFF',
  textPrimary: '#1C1C1E', // Almost Black
  textSecondary: '#8E8E93', // Slate Grey
  textTertiary: '#C7C7CC', // Light Grey
  accent: '#007AFF', // System Blue
  separator: '#F2F2F7', // Very Light Grey
};

// --- Dummy Data Fallbacks ---
const DUMMY_DATA = {
    fallbackIcon: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?q=80&w=2000&auto=format&fit=crop"
};

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

// Simplified Time Logic
const getTimeAgo = (dateString: string) => {
    if (!dateString) return "";
    const now = new Date();
    const uploadedDate = new Date(dateString);
    const diffMins = Math.floor((now.getTime() - uploadedDate.getTime()) / 60000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d`;
    return uploadedDate.toLocaleDateString();
};

const GroupListItem = ({ 
  id, 
  icon, 
  title, 
  lastUploadedBy, 
  unseenCount, 
  lastUpdated, 
  communityName,
  photoCount,
  memberCount,
  onPress 
}: GroupListItemProps) => {
  
  const timeLabel = useMemo(() => getTimeAgo(lastUpdated), [lastUpdated]);
  const hasUnread = unseenCount > 0;
  
  // Format fallback status with actual counts
  const formatFallbackStatus = () => {
    const photos = photoCount ?? 0;
    const members = memberCount ?? 0;
    const photoText = photos === 1 ? 'photo' : 'photos';
    const memberText = members === 1 ? 'contributor' : 'contributors';
    return `${photos} ${photoText} • ${members} ${memberText}`;
  };

  return (
    <TouchableOpacity 
      style={styles.container} 
      onPress={() => onPress && onPress(id)}
      activeOpacity={0.6}
    >
        {/* --- 1. Enhanced Avatar --- */}
        <View style={styles.avatarContainer}>
            <FastImage 
                source={{ 
                uri: icon || DUMMY_DATA.fallbackIcon,
                priority: FastImage.priority.normal, 
                }} 
                style={styles.avatar} 
                resizeMode={FastImage.resizeMode.cover}
            />
            {/* Optional: Add a tiny ring if unread to make it pop */}
            {hasUnread && <View style={styles.avatarUnreadRing} />}
        </View>

        {/* --- 2. Content Stack --- */}
        <View style={styles.contentContainer}>
            
            {/* Row A: Context (Community) + Time */}
            <View style={styles.metaRow}>
                <Text style={styles.communityLabel} numberOfLines={1}>
                    {communityName || "PRIVATE GALLERY"}
                </Text>
                <Text style={[styles.timeLabel, hasUnread && styles.timeLabelUnread]}>
                    {timeLabel}
                </Text>
            </View>

            {/* Row B: Main Title */}
            <View style={styles.titleRow}>
                <Text style={[styles.title, hasUnread && styles.titleUnread]} numberOfLines={1}>
                    {title}
                </Text>
                
                {/* Unread Pill (Instead of blue dot) */}
                {hasUnread && (
                    <View style={styles.unreadBadge}>
                        <Text style={styles.unreadText}>{unseenCount}</Text>
                    </View>
                )}
            </View>

            {/* Row C: Rich Status */}
            <View style={styles.statusRow}>
                {lastUploadedBy ? (
                    <>
                        <Ionicons name="camera" size={12} color={COLORS.textSecondary} style={{marginRight: 4}} />
                        <Text style={styles.statusText} numberOfLines={1}>
                            <Text style={styles.senderName}>{lastUploadedBy}</Text> added a photo
                        </Text>
                    </>
                ) : (
                    <>
                         <Ionicons name="images-outline" size={12} color={COLORS.textSecondary} style={{marginRight: 4}} />
                         <Text style={styles.statusText} numberOfLines={1}>
                            {formatFallbackStatus()}
                         </Text>
                    </>
                )}
            </View>

        </View>

        {/* --- 3. Subtle Chevron (Optional, keeps it looking like a list item) --- */}
        <Ionicons name="chevron-forward" size={16} color="#E5E5EA" style={{ marginLeft: 8 }} />

    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: COLORS.background,
    paddingVertical: 14, // More breathing room
    paddingHorizontal: 16,
    alignItems: 'center',
    // Separator logic
    borderBottomWidth: 1,
    borderBottomColor: COLORS.separator,
  },
  
  // --- Avatar ---
  avatarContainer: {
      position: 'relative',
      marginRight: 16,
      // Shadow for depth
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 6,
      elevation: 3,
  },
  avatar: {
    width: 60, // Slightly larger than standard 56
    height: 60,
    borderRadius: 20, // Modern "Squircle"
    backgroundColor: '#F2F2F7',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  avatarUnreadRing: {
      position: 'absolute',
      top: -2, left: -2, right: -2, bottom: -2,
      borderWidth: 2,
      borderColor: COLORS.accent,
      borderRadius: 22,
  },

  // --- Content ---
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    gap: 3, // Modern gap spacing
  },
  
  // Row A: Meta
  metaRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
  },
  communityLabel: {
      fontSize: 10,
      fontWeight: '700',
      color: COLORS.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.8, // Tracking makes small text readable and premium
  },
  timeLabel: {
      fontSize: 12,
      color: COLORS.textTertiary,
      fontWeight: '500',
  },
  timeLabelUnread: {
      color: COLORS.accent,
      fontWeight: '600',
  },

  // Row B: Title
  titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
  },
  title: {
      fontSize: 17,
      fontWeight: '600',
      color: COLORS.textPrimary,
      letterSpacing: -0.4,
      flex: 1,
      marginRight: 8,
  },
  titleUnread: {
      color: '#000', // Pure black when unread
      fontWeight: '700',
  },
  unreadBadge: {
      backgroundColor: COLORS.accent,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 10,
      minWidth: 20,
      alignItems: 'center',
      justifyContent: 'center',
  },
  unreadText: {
      color: '#FFF',
      fontSize: 11,
      fontWeight: '700',
  },

  // Row C: Status
  statusRow: {
      flexDirection: 'row',
      alignItems: 'center',
  },
  statusText: {
      fontSize: 14,
      color: COLORS.textSecondary,
      fontWeight: '400',
  },
  senderName: {
      color: COLORS.textPrimary, // Highlight the user name
      fontWeight: '500',
  },
});

export default GroupListItem;