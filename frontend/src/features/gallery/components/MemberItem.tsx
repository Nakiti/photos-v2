import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import FastImage from 'react-native-fast-image';

type MemberItemProps = {
  name: string;
  handle: string;
  avatarUri?: string;
  role: string;
  onPressLeft?: () => void;
  onPressRight?: () => void;
};

const MemberItem = ({ role, name, handle, avatarUri, onPressLeft, onPressRight }: MemberItemProps) => {
  const showBadge = role && role.toLowerCase() !== 'member';

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.left} onPress={onPressLeft} activeOpacity={0.5}>
        <FastImage
          source={{
            uri: avatarUri || "https://upload.wikimedia.org/wikipedia/commons/a/ac/Default_pfp.jpg",
            priority: FastImage.priority.normal,
          }}
          style={styles.avatar}
          resizeMode={FastImage.resizeMode.cover}
        />
        <View style={styles.texts}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>{name}</Text>
            {showBadge && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{role}</Text>
              </View>
            )}
          </View>
          <Text style={styles.handle} numberOfLines={1}>@{handle}</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity style={styles.right} onPress={onPressRight} activeOpacity={0.5}>
        <Ionicons name="ellipsis-horizontal" size={18} color="#CCCCCC" />
      </TouchableOpacity>
    </View>
  );
};

export default MemberItem;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 20,
    backgroundColor: '#FAFAFA',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EBEBEB',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: '#EFEFEF',
    marginRight: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  texts: {
    flex: 1,
    gap: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111111',
    flexShrink: 1,
    letterSpacing: -0.2,
  },
  handle: {
    fontSize: 13,
    color: '#AAAAAA',
    fontWeight: '400',
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: '#EFEFEF',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#555555',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  right: {
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});