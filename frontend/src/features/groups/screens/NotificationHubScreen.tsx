import React, { useState, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  SafeAreaView, 
  ActivityIndicator,
  ScrollView
} from 'react-native';
import FastImage from 'react-native-fast-image';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';

// --- Types ---
type NotificationType = 'LIKE' | 'COMMENT' | 'INVITE' | 'REQUEST' | 'SYSTEM';

interface Notification {
    id: string;
    type: NotificationType;
    actor: {
        id: string;
        name: string;
        avatarUrl?: string;
    };
    context?: {
        text?: string; // e.g., comment text or gallery name
        thumbnailUrl?: string; // photo thumbnail
    };
    timestamp: string;
    isRead: boolean;
}

// --- Mock Data ---
const MOCK_NOTIFICATIONS: Notification[] = [
    {
        id: '1',
        type: 'INVITE',
        actor: { id: 'u1', name: 'Sarah Jenkins', avatarUrl: 'https://i.pravatar.cc/150?u=a042581f4e29026704d' },
        context: { text: 'Summer Trip 2024' },
        timestamp: '2m',
        isRead: false,
    },
    {
        id: '2',
        type: 'LIKE',
        actor: { id: 'u2', name: 'Mike Ross', avatarUrl: 'https://i.pravatar.cc/150?u=a042581f4e29026024d' },
        context: { thumbnailUrl: 'https://picsum.photos/200' },
        timestamp: '1h',
        isRead: false,
    },
    {
        id: '3',
        type: 'COMMENT',
        actor: { id: 'u3', name: 'Jessica Pearson', avatarUrl: 'https://i.pravatar.cc/150?u=a042581f4e29026703d' },
        context: { text: 'This shot is incredible! 📸', thumbnailUrl: 'https://picsum.photos/201' },
        timestamp: '3h',
        isRead: true,
    },
    {
        id: '4',
        type: 'REQUEST',
        actor: { id: 'u4', name: 'Louis Litt' },
        context: { text: 'NYC Street Photography' }, // Gallery name they want to join
        timestamp: '1d',
        isRead: true,
    },
];

// --- Components ---

const NotificationItem = ({ item }: { item: Notification }) => {
    const isInvite = item.type === 'INVITE' || item.type === 'REQUEST';
    
    // Helper to render content based on type
    const renderContent = () => {
        switch (item.type) {
            case 'LIKE':
                return (
                    <Text style={styles.text} numberOfLines={2}>
                        <Text style={styles.name}>{item.actor.name}</Text> liked your photo.
                    </Text>
                );
            case 'COMMENT':
                return (
                    <Text style={styles.text} numberOfLines={2}>
                        <Text style={styles.name}>{item.actor.name}</Text> commented: <Text style={styles.commentText}>"{item.context?.text}"</Text>
                    </Text>
                );
            case 'INVITE':
                return (
                    <Text style={styles.text} numberOfLines={2}>
                        <Text style={styles.name}>{item.actor.name}</Text> invited you to join <Text style={styles.galleryName}>{item.context?.text}</Text>.
                    </Text>
                );
            case 'REQUEST':
                return (
                    <Text style={styles.text} numberOfLines={2}>
                        <Text style={styles.name}>{item.actor.name}</Text> requested to join <Text style={styles.galleryName}>{item.context?.text}</Text>.
                    </Text>
                );
            default:
                return <Text style={styles.text}>New notification.</Text>;
        }
    };

    return (
        <TouchableOpacity style={[styles.itemContainer, !item.isRead && styles.unreadContainer]} activeOpacity={0.7}>
            {/* 1. Avatar */}
            <View style={styles.left}>
                {item.actor.avatarUrl ? (
                    <FastImage 
                        source={{ uri: item.actor.avatarUrl }} 
                        style={styles.avatar} 
                    />
                ) : (
                    <View style={[styles.avatar, styles.avatarPlaceholder]}>
                        <Text style={styles.initials}>{item.actor.name[0]}</Text>
                    </View>
                )}
                
                {/* Type Badge (Icon overlay) */}
                <View style={[styles.iconBadge, { backgroundColor: getIconColor(item.type) }]}>
                    <Ionicons name={getIconName(item.type)} size={10} color="#FFF" />
                </View>
            </View>

            {/* 2. Content */}
            <View style={styles.center}>
                {renderContent()}
                <Text style={styles.timestamp}>{item.timestamp}</Text>
                
                {/* Action Buttons for Invites/Requests */}
                {isInvite && (
                    <View style={styles.actionsRow}>
                        <TouchableOpacity style={styles.acceptBtn}>
                            <Text style={styles.acceptText}>Accept</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.declineBtn}>
                            <Text style={styles.declineText}>Delete</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            {/* 3. Right Side (Thumbnail or Dot) */}
            <View style={styles.right}>
                {item.context?.thumbnailUrl ? (
                    <FastImage 
                        source={{ uri: item.context.thumbnailUrl }} 
                        style={styles.thumbnail} 
                    />
                ) : !item.isRead && !isInvite ? (
                    <View style={styles.blueDot} />
                ) : null}
            </View>
        </TouchableOpacity>
    );
};

// --- Helpers ---
const getIconName = (type: NotificationType) => {
    switch (type) {
        case 'LIKE': return 'heart';
        case 'COMMENT': return 'chatbubble';
        case 'INVITE': return 'people';
        case 'REQUEST': return 'key';
        default: return 'notifications';
    }
};

const getIconColor = (type: NotificationType) => {
    switch (type) {
        case 'LIKE': return '#FF2D55'; // Red/Pink
        case 'COMMENT': return '#34C759'; // Green
        case 'INVITE': return '#007AFF'; // Blue
        case 'REQUEST': return '#FF9500'; // Orange
        default: return '#8E8E93';
    }
};

// --- Main Screen ---
const NotificationHubScreen = () => {
    const navigation = useNavigation();
    
    // Grouping Logic (Simple Split)
    const newNotifications = MOCK_NOTIFICATIONS.filter(n => !n.isRead);
    const earlierNotifications = MOCK_NOTIFICATIONS.filter(n => n.isRead);

    return (
        <View style={styles.root}>
            <SafeAreaView style={styles.safeArea}>
                

                <ScrollView contentContainerStyle={styles.scrollContent}>
                    
                    {/* Section: NEW */}
                    {newNotifications.length > 0 && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>New</Text>
                            {newNotifications.map(item => (
                                <NotificationItem key={item.id} item={item} />
                            ))}
                        </View>
                    )}

                    {/* Section: EARLIER */}
                    {earlierNotifications.length > 0 && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Earlier</Text>
                            {earlierNotifications.map(item => (
                                <NotificationItem key={item.id} item={item} />
                            ))}
                        </View>
                    )}

                    {MOCK_NOTIFICATIONS.length === 0 && (
                        <View style={styles.emptyState}>
                            <Ionicons name="notifications-off-outline" size={48} color="#C7C7CC" />
                            <Text style={styles.emptyText}>No notifications yet</Text>
                        </View>
                    )}

                </ScrollView>
            </SafeAreaView>
        </View>
    );
};

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    safeArea: {
        flex: 1,
    },
    
    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F9F9F9',
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '700',
        color: '#000',
        letterSpacing: -0.5,
    },

    // Content
    scrollContent: {
        paddingBottom: 40,
    },
    section: {
        marginTop: 24,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#000',
        marginLeft: 24,
        marginBottom: 12,
    },

    // Notification Item
    itemContainer: {
        flexDirection: 'row',
        paddingVertical: 12,
        paddingHorizontal: 24,
        alignItems: 'flex-start',
    },
    unreadContainer: {
        backgroundColor: '#F2F8FF', // Very subtle blue tint for unread
    },
    
    // Left (Avatar)
    left: {
        position: 'relative',
        marginRight: 12,
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#F2F2F7',
    },
    avatarPlaceholder: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    initials: {
        fontSize: 18,
        fontWeight: '600',
        color: '#8E8E93',
    },
    iconBadge: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        width: 18,
        height: 18,
        borderRadius: 9,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },

    // Center (Text)
    center: {
        flex: 1,
        justifyContent: 'center',
        minHeight: 44, // Align with avatar height
    },
    text: {
        fontSize: 15,
        color: '#333',
        lineHeight: 20,
    },
    name: {
        fontWeight: '700',
        color: '#000',
    },
    commentText: {
        color: '#555',
    },
    galleryName: {
        fontWeight: '600',
        color: '#007AFF',
    },
    timestamp: {
        fontSize: 12,
        color: '#8E8E93',
        marginTop: 4,
    },

    // Actions (Buttons)
    actionsRow: {
        flexDirection: 'row',
        marginTop: 10,
        gap: 8,
    },
    acceptBtn: {
        backgroundColor: '#000',
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 14,
    },
    acceptText: {
        color: '#FFF',
        fontSize: 13,
        fontWeight: '600',
    },
    declineBtn: {
        backgroundColor: '#F2F2F7',
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 14,
    },
    declineText: {
        color: '#000',
        fontSize: 13,
        fontWeight: '600',
    },

    // Right (Thumbnail)
    right: {
        marginLeft: 12,
        justifyContent: 'center',
        height: 44,
    },
    thumbnail: {
        width: 44,
        height: 44,
        borderRadius: 6,
        backgroundColor: '#F2F2F7',
    },
    blueDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#007AFF',
    },

    // Empty State
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 100,
        opacity: 0.5,
    },
    emptyText: {
        marginTop: 12,
        fontSize: 16,
        fontWeight: '600',
        color: '#8E8E93',
    },
});

export default NotificationHubScreen;