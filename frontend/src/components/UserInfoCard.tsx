import React from 'react';
import { TouchableOpacity, Text, View, StyleSheet, Dimensions } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { useSharedValue, useAnimatedStyle, withSpring, runOnJS } from "react-native-reanimated";
import FastImage from 'react-native-fast-image';
import Ionicons from 'react-native-vector-icons/Ionicons';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

type UserInfoCardProps = {
    onDismiss: () => void;
    profilePicture?: string;
    name: string;
    handle: string;
    bio?: string;
    groups?: string[];
};

const UserInfoCard = ({ onDismiss, profilePicture, name, handle, bio, groups = [] }: UserInfoCardProps) => {
    const translateY = useSharedValue(0);

    // Gestures
    const swipeGesture = Gesture.Pan()
       .onUpdate((event) => {
          if (event.translationY > 0) {
             translateY.value = event.translationY;
          }
       })
       .onEnd((event) => {
          if (event.translationY > 120) {
             runOnJS(onDismiss)();
          } else {
             translateY.value = withSpring(0);
          }
       });
 
    const animatedStyle = useAnimatedStyle(() => ({
       transform: [{ translateY: translateY.value }],
    }));

    return (
        <View style={styles.overlayWrapper}>
            {/* Backdrop (Tap to dismiss) */}
            <TouchableOpacity 
                style={styles.backdrop} 
                activeOpacity={1} 
                onPress={onDismiss} 
            />

            <GestureDetector gesture={swipeGesture}>
                <Animated.View style={[styles.card, animatedStyle]}>
                    {/* Drag Handle */}
                    <View style={styles.dragHandleContainer}>
                        <View style={styles.dragBar} />
                    </View>

                    {/* Content */}
                    <View style={styles.content}>
                        <FastImage 
                            source={{ 
                                uri: profilePicture || "https://upload.wikimedia.org/wikipedia/commons/a/ac/Default_pfp.jpg",
                                priority: FastImage.priority.high
                            }} 
                            style={styles.avatar} 
                            resizeMode={FastImage.resizeMode.cover}
                        />
                        
                        <Text style={styles.name}>{name}</Text>
                        <Text style={styles.handle}>@{handle}</Text>
                        
                        {bio && (
                            <Text style={styles.description}>{bio}</Text>
                        )}

                        {groups && groups.length > 0 && (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>MEMBER OF</Text>
                                <View style={styles.groupsContainer}>
                                    {groups.map((g, i) => (
                                        <View key={i} style={styles.groupTag}>
                                            <Text style={styles.groupTagText}>{g}</Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        )}
                        
                        {/* Example Action Buttons */}
                        <View style={styles.actionsRow}>
                            <TouchableOpacity style={styles.actionBtn}>
                                <Ionicons name="chatbubble-outline" size={20} color="#000" />
                                <Text style={styles.actionBtnText}>Message</Text>
                            </TouchableOpacity>
                        </View>

                    </View>
                </Animated.View>
            </GestureDetector>
        </View>
    );
};

export default UserInfoCard;

const styles = StyleSheet.create({
    overlayWrapper: {
       ...StyleSheet.absoluteFillObject,
       zIndex: 1000,
       justifyContent: 'flex-end',
    },
    backdrop: {
       ...StyleSheet.absoluteFillObject,
       backgroundColor: 'rgba(0,0,0,0.4)',
    },
    card: {
       backgroundColor: "#FFFFFF",
       width: "100%",
       borderTopLeftRadius: 24,
       borderTopRightRadius: 24,
       paddingBottom: 40, // Safe area bottom
       minHeight: SCREEN_HEIGHT * 0.45,
       maxHeight: SCREEN_HEIGHT * 0.85,
    },
    dragHandleContainer: {
       width: '100%',
       height: 30,
       alignItems: 'center',
       justifyContent: 'center',
    },
    dragBar: {
       width: 40,
       height: 5,
       backgroundColor: "#E5E5EA",
       borderRadius: 2.5,
    },
    content: {
       alignItems: 'center',
       paddingHorizontal: 24,
    },
    avatar: {
       width: 100,
       height: 100,
       borderRadius: 50,
       marginBottom: 16,
       backgroundColor: '#F2F2F7',
    },
    name: {
       fontSize: 22,
       fontWeight: "700",
       color: "#000000",
       textAlign: 'center',
       marginBottom: 4,
    },
    handle: {
       fontSize: 16,
       color: "#8E8E93",
       marginBottom: 16,
    },
    description: {
       fontSize: 15,
       textAlign: "center",
       color: "#333",
       lineHeight: 22,
       marginBottom: 24,
       paddingHorizontal: 20,
    },
    // Groups
    section: {
        width: '100%',
        alignItems: 'center',
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 11,
        fontWeight: '700',
        color: '#8E8E93',
        letterSpacing: 1,
        marginBottom: 12,
    },
    groupsContainer: {
       flexDirection: "row",
       flexWrap: "wrap",
       justifyContent: "center",
       gap: 8,
    },
    groupTag: {
       backgroundColor: "#F2F2F7",
       paddingVertical: 6,
       paddingHorizontal: 12,
       borderRadius: 16,
    },
    groupTagText: {
        fontSize: 14,
        color: '#000',
        fontWeight: '500',
    },
    // Actions
    actionsRow: {
        flexDirection: 'row',
        gap: 16,
        marginTop: 8,
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#F2F2F7',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 25,
    },
    actionBtnText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#000',
    },
 });