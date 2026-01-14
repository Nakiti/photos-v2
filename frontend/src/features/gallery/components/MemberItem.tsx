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
    return (
        <View style={styles.container}>
            <TouchableOpacity style={styles.leftArea} onPress={onPressLeft} activeOpacity={0.7}>
                {/* Avatar */}
                <FastImage
                    source={{
                        uri: avatarUri || "https://upload.wikimedia.org/wikipedia/commons/a/ac/Default_pfp.jpg",
                        priority: FastImage.priority.normal
                    }}
                    style={styles.avatar}
                    resizeMode={FastImage.resizeMode.cover}
                />
                
                {/* Text Info */}
                <View style={styles.texts}>
                    <View style={styles.nameRow}>
                        <Text style={styles.name} numberOfLines={1}>{name}</Text>
                        {/* Only show badge if role is not strictly 'member' or empty, adjusting logic as needed */}
                        {role && role.toLowerCase() !== 'member' && (
                            <View style={styles.badge}>
                                <Text style={styles.badgeText}>{role}</Text>
                            </View>
                        )}
                    </View>
                    <Text style={styles.handle} numberOfLines={1}>@{handle}</Text>
                </View>
            </TouchableOpacity>

            {/* Menu Action */}
            <TouchableOpacity style={styles.rightArea} onPress={onPressRight} activeOpacity={0.5}>
                <Ionicons name="ellipsis-horizontal" size={20} color="#8E8E93" />
            </TouchableOpacity>
        </View>
    );
};

export default MemberItem;

const styles = StyleSheet.create({
    container: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: "#FFFFFF",
    },
    leftArea: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
        marginRight: 8,
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: "#F2F2F7",
        marginRight: 12,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
    },
    texts: {
        flex: 1,
        justifyContent: "center",
        gap: 2,
    },
    nameRow: {
        flexDirection: "row",
        alignItems: "center",
        flexWrap: 'wrap',
        gap: 6,
    },
    name: {
        fontSize: 16,
        fontWeight: "600",
        color: "#000000",
        flexShrink: 1,
    },
    handle: {
        fontSize: 14,
        color: "#8E8E93",
    },
    // Badge Styles
    badge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        backgroundColor: "#F2F2F7",
    },
    badgeText: {
        fontSize: 10,
        fontWeight: "700",
        color: "#000000",
        textTransform: 'uppercase',
    },
    // Right Action
    rightArea: {
        padding: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
});