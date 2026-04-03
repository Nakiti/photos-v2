import React, { useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView, 
  ActivityIndicator,
  ScrollView
} from 'react-native';
import FastImage from 'react-native-fast-image';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { useNotifications, useMarkNotificationAsRead, EnrichedNotification } from '../../../hooks/useNotificationData';
import Notification from '../../../db/models/Notification';

// --- Types ---
type NotificationType = 'LIKE' | 'COMMENT' | 'INVITE' | 'SYSTEM';

// --- Helpers ---
const formatTimestamp = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d`;
  if (hours > 0) return `${hours}h`;
  if (minutes > 0) return `${minutes}m`;
  return 'now';
};

// --- Components ---

const NotificationItem = ({ item }: { item: EnrichedNotification }) => {
    const { mutate: markAsRead } = useMarkNotificationAsRead();
    const notification = item.notification;
    const actor = item.actor;
    const isInvite = notification.type === 'INVITE';
    
    // Parse notification data
    const notificationData = notification.data ? JSON.parse(notification.data) : null;
    const galleryName = notificationData?.galleryName;
    const previewText = notificationData?.previewText;
    const thumbnailUrl = notificationData?.thumbnailUrl;

    const handlePress = () => {
        if (!notification.isRead) {
            markAsRead(notification.id);
        }
    };
    
    // Helper to render content based on type
    const renderContent = () => {
        const actorName = actor.name || actor.handle || 'Someone';
        switch (notification.type) {
            case 'LIKE':
                return (
                    <Text style={styles.text} numberOfLines={2}>
                        <Text style={styles.name}>{actorName}</Text> liked your photo.
                    </Text>
                );
            case 'COMMENT':
                return (
                    <Text style={styles.text} numberOfLines={2}>
                        <Text style={styles.name}>{actorName}</Text> commented: <Text style={styles.commentText}>"{previewText || '...'}"</Text>
                    </Text>
                );
            case 'INVITE':
                return (
                    <Text style={styles.text} numberOfLines={2}>
                        <Text style={styles.name}>{actorName}</Text> invited you to join <Text style={styles.galleryName}>{galleryName || 'a gallery'}</Text>.
                    </Text>
                );
            case 'SYSTEM':
                return (
                    <Text style={styles.text} numberOfLines={2}>
                        {previewText || 'New notification.'}
                    </Text>
                );
            default:
                return <Text style={styles.text}>New notification.</Text>;
        }
    };

    const actorName = actor.name || actor.handle || 'Someone';
    const avatarUrl = actor.avatarUrl;
    const initials = actorName[0]?.toUpperCase() || '?';

    return (
        <TouchableOpacity 
            style={[styles.itemContainer, !notification.isRead && styles.unreadContainer]} 
            activeOpacity={0.7}
            onPress={handlePress}
        >
            {/* 1. Avatar */}
            <View style={styles.left}>
                {avatarUrl ? (
                    <FastImage 
                        source={{ uri: avatarUrl }} 
                        style={styles.avatar} 
                    />
                ) : (
                    <View style={[styles.avatar, styles.avatarPlaceholder]}>
                        <Text style={styles.initials}>{initials}</Text>
                    </View>
                )}
                
                {/* Type Badge (Icon overlay) */}
                <View style={[styles.iconBadge, { backgroundColor: getIconColor(notification.type) }]}>
                    <Ionicons name={getIconName(notification.type)} size={10} color="#FFF" />
                </View>
            </View>

            {/* 2. Content */}
            <View style={styles.center}>
                {renderContent()}
                <Text style={styles.timestamp}>{formatTimestamp(notification.createdAt)}</Text>
                
                {/* Action Buttons for Invites */}
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
                {thumbnailUrl ? (
                    <FastImage 
                        source={{ uri: thumbnailUrl }} 
                        style={styles.thumbnail} 
                    />
                ) : !notification.isRead && !isInvite ? (
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
        case 'SYSTEM': return 'notifications';
        default: return 'notifications';
    }
};

const getIconColor = (type: NotificationType) => {
    switch (type) {
        case 'LIKE': return '#FF2D55'; // Red/Pink
        case 'COMMENT': return '#34C759'; // Green
        case 'INVITE': return '#007AFF'; // Blue
        case 'SYSTEM': return '#8E8E93'; // Gray
        default: return '#8E8E93';
    }
};

// --- Main Screen ---
const NotificationHubScreen = () => {
    const navigation = useNavigation();
    const { notifications, isLoading, isSyncing } = useNotifications();
    
    // Grouping Logic (Simple Split)
    const newNotifications = useMemo(() => 
        notifications.filter(n => !n.notification.isRead),
        [notifications]
    );
    const earlierNotifications = useMemo(() => 
        notifications.filter(n => n.notification.isRead),
        [notifications]
    );

    if (isLoading) {
        return (
            <View style={styles.root}>
                <SafeAreaView style={styles.safeArea}>
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#007AFF" />
                    </View>
                </SafeAreaView>
            </View>
        );
    }

    return (
        <View style={styles.root}>
            <SafeAreaView style={styles.safeArea}>
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    {/* Section: NEW */}
                    {newNotifications.length > 0 && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>New</Text>
                            {newNotifications.map(item => (
                                <NotificationItem key={item.notification.id} item={item} />
                            ))}
                        </View>
                    )}

                    {/* Section: EARLIER */}
                    {earlierNotifications.length > 0 && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Earlier</Text>
                            {earlierNotifications.map(item => (
                                <NotificationItem key={item.notification.id} item={item} />
                            ))}
                        </View>
                    )}

                    {notifications.length === 0 && !isLoading && (
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

    // Loading State
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
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