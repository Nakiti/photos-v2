import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import FastImage from 'react-native-fast-image';

// iOS Design Colors
const COLORS = {
  background: '#FFFFFF',
  textPrimary: '#000000',
  textSecondary: '#8E8E93', // System Gray
  separator: '#C6C6C8',
  iconBg: '#F2F2F7', // System Gray 6
};

type Props = {
  name: string;
  description?: string;
  iconUrl?: string;
  membersCount?: number;
  onPress?: () => void;
};

const CommunityCard: React.FC<Props> = ({ name, description, iconUrl, membersCount, onPress }) => {
  return (
    <TouchableOpacity 
      style={styles.container} 
      onPress={onPress} 
      activeOpacity={0.7}
    >
      {/* Avatar / Placeholder */}
      <View style={styles.avatarContainer}>
        {iconUrl ? (
          <FastImage 
            source={{ uri: iconUrl }} 
            style={styles.avatar} 
            resizeMode={FastImage.resizeMode.cover}
          />
        ) : (
          <View style={[styles.avatar, styles.placeholder]}>
            <Text style={styles.placeholderText}>{name.slice(0, 1).toUpperCase()}</Text>
          </View>
        )}
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.textContainer}>
          <Text style={styles.title} numberOfLines={1}>{name}</Text>
          
          {description ? (
            <Text style={styles.description} numberOfLines={2}>
              {description}
            </Text>
          ) : null}

          {/* Optional Meta Data (Members count) */}
          {membersCount !== undefined && (
             <Text style={styles.meta}>
               {membersCount} {membersCount === 1 ? 'member' : 'members'}
             </Text>
          )}
        </View>

        {/* Separator (Indented) */}
        <View style={styles.separator} />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    paddingLeft: 20, // Left padding on container for the avatar
    alignItems: 'center',
    minHeight: 76,
  },
  avatarContainer: {
    marginRight: 16,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 14, // Continuous curve smoothing look
  },
  placeholder: {
    backgroundColor: COLORS.iconBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  content: {
    flex: 1,
    paddingVertical: 12,
    paddingRight: 20, // Right padding for text
    justifyContent: 'center',
    height: '100%',
  },
  textContainer: {
    gap: 2,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.textPrimary,
    letterSpacing: -0.4,
  },
  description: {
    fontSize: 15,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  meta: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  separator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    left: 0, 
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.separator,
  },
});

export default CommunityCard;