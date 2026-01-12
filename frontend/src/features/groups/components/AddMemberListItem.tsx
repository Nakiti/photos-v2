import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import FastImage from 'react-native-fast-image';

export type FriendStatus = 'member' | 'pending' | 'can_add';

type Props = {
  user: {
      id: string;
      name: string;
      handle?: string;
      avatarUrl?: string | null;
  };
  status: FriendStatus;
  onInvite: () => void;
  isInviting: boolean;
};

const AddMemberListItem = ({ user, status, onInvite, isInviting }: Props) => {
  
  const isMember = status === 'member';
  const isPending = status === 'pending';

  return (
    <View style={styles.container}>
      {/* Avatar */}
      <FastImage 
        source={{ 
            uri: user.avatarUrl || "https://upload.wikimedia.org/wikipedia/commons/a/ac/Default_pfp.jpg",
            priority: FastImage.priority.normal 
        }} 
        style={styles.avatar} 
        resizeMode={FastImage.resizeMode.cover}
      />

      {/* Info */}
      <View style={styles.textContainer}>
        <Text style={styles.name} numberOfLines={1}>{user.name}</Text>
        <Text style={styles.handle} numberOfLines={1}>@{user.handle}</Text>
      </View>

      {/* Action */}
      <View style={styles.actionContainer}>
        {isInviting ? (
            <ActivityIndicator size="small" color="#000" />
        ) : isMember ? (
            <View style={styles.badge}>
                <Text style={[styles.badgeText, styles.memberText]}>Member</Text>
            </View>
        ) : isPending ? (
            <View style={styles.badge}>
                <Text style={[styles.badgeText, styles.pendingText]}>Invited</Text>
            </View>
        ) : (
            <TouchableOpacity 
                style={styles.addButton} 
                onPress={onInvite}
                activeOpacity={0.7}
            >
                <Text style={styles.addButtonText}>Add</Text>
            </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

export default AddMemberListItem;

const styles = StyleSheet.create({
    container: {
       flexDirection: "row",
       alignItems: "center",
       paddingVertical: 12,
       paddingHorizontal: 16,
       backgroundColor: "#FFFFFF",
    },
    avatar: {
       width: 44,
       height: 44,
       borderRadius: 22,
       marginRight: 12,
       backgroundColor: "#F2F2F7",
       borderWidth: 1,
       borderColor: 'rgba(0,0,0,0.05)',
    },
    textContainer: {
       flex: 1,
       justifyContent: "center",
       gap: 2,
    },
    name: {
       fontSize: 16,
       fontWeight: "600",
       color: "#000000",
    },
    handle: {
       fontSize: 14,
       color: "#8E8E93",
    },
    actionContainer: {
       minWidth: 70,
       alignItems: 'flex-end',
       justifyContent: 'center',
    },
    // Add Button
    addButton: {
       backgroundColor: '#000000',
       paddingVertical: 6,
       paddingHorizontal: 16,
       borderRadius: 16,
    },
    addButtonText: {
       color: '#FFFFFF',
       fontSize: 13,
       fontWeight: '600',
    },
    // Badges
    badge: {
        paddingVertical: 4,
        paddingHorizontal: 8,
    },
    badgeText: {
        fontSize: 13,
        fontWeight: '600',
    },
    memberText: {
        color: '#34C759', // Green
    },
    pendingText: {
        color: '#8E8E93', // Gray
    },
 });