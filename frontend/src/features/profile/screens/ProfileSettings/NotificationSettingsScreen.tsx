import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Switch, 
  SafeAreaView, 
  Alert
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

// --- Theme ---
const COLORS = {
  bg: '#FFFFFF',
  textPrimary: '#000000',
  textSecondary: '#8E8E93',
  divider: '#F2F2F7',
  tint: '#000000', // Minimalist Black Toggle
};

const NotificationSettingsScreen = () => {
    // --- Dummy State ---
    const [pauseAll, setPauseAll] = useState(false);
    const [toggles, setToggles] = useState({
        newPhotos: true,
        invites: true,
        likes: true,
        comments: false,
        enhanced: false,
    });
    const [sounds, setSounds] = useState({
        group: 'Sigh',
        dm: 'Daps',
    });

    const toggleItem = (key: keyof typeof toggles) => {
        setToggles(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const changeSound = (type: 'group' | 'dm') => {
        Alert.alert("Change Sound", "This would open a picker or modal.", [
            { text: "Cancel", style: "cancel" },
            { text: "Ding", onPress: () => setSounds(p => ({...p, [type]: 'Ding'})) },
            { text: "Note", onPress: () => setSounds(p => ({...p, [type]: 'Note'})) },
        ]);
    };

    return (
        <View style={styles.root}>
            <SafeAreaView style={styles.safeArea}>
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    
                    {/* 1. Master Switch */}
                    <View style={styles.sectionContainer}>
                        <View style={styles.sectionList}>
                            <View style={styles.masterRow}>
                                <View style={styles.textStack}>
                                    <Text style={styles.rowLabel}>Pause All</Text>
                                    <Text style={styles.rowSubtext}>Temporarily mute all push notifications.</Text>
                                </View>
                                <Switch 
                                    value={pauseAll} 
                                    onValueChange={setPauseAll} 
                                    trackColor={{ false: "#E5E5EA", true: COLORS.tint }}
                                    thumbColor="#FFF"
                                    ios_backgroundColor="#E5E5EA"
                                />
                            </View>
                        </View>
                    </View>

                    {/* 2. Activity Toggles */}
                    <View style={styles.sectionContainer}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionHeaderText}>ACTIVITY</Text>
                        </View>
                        <View style={styles.sectionList}>
                            <ToggleRow 
                                label="New Photos" 
                                value={toggles.newPhotos} 
                                onValueChange={() => toggleItem('newPhotos')} 
                                disabled={pauseAll}
                            />
                            <ToggleRow 
                                label="Event Invites" 
                                value={toggles.invites} 
                                onValueChange={() => toggleItem('invites')} 
                                disabled={pauseAll}
                            />
                            <ToggleRow 
                                label="Likes" 
                                value={toggles.likes} 
                                onValueChange={() => toggleItem('likes')} 
                                disabled={pauseAll}
                            />
                            <ToggleRow 
                                label="Comments" 
                                value={toggles.comments} 
                                onValueChange={() => toggleItem('comments')} 
                                isLast
                                disabled={pauseAll}
                            />
                        </View>
                    </View>

                    {/* 3. Sounds */}
                    <View style={styles.sectionContainer}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionHeaderText}>SOUNDS</Text>
                        </View>
                        <View style={styles.sectionList}>
                            <TouchableOpacity 
                                style={styles.linkRow} 
                                onPress={() => changeSound('group')}
                                activeOpacity={0.6}
                            >
                                <Text style={styles.rowLabel}>Group Messages</Text>
                                <View style={styles.rowRight}>
                                    <Text style={styles.rowValue}>{sounds.group}</Text>
                                    <Ionicons name="chevron-forward" size={16} color="#C7C7CC" />
                                </View>
                            </TouchableOpacity>
                            <View style={styles.divider} />
                            
                            <TouchableOpacity 
                                style={styles.linkRow} 
                                onPress={() => changeSound('dm')}
                                activeOpacity={0.6}
                            >
                                <Text style={styles.rowLabel}>Direct Messages</Text>
                                <View style={styles.rowRight}>
                                    <Text style={styles.rowValue}>{sounds.dm}</Text>
                                    <Ionicons name="chevron-forward" size={16} color="#C7C7CC" />
                                </View>
                            </TouchableOpacity>
                        </View>
                    </View>

                </ScrollView>
            </SafeAreaView>
        </View>
    );
};

// Helper Component for consistent toggles
const ToggleRow = ({ label, value, onValueChange, isLast, disabled }: any) => (
    <View style={[styles.toggleRow, disabled && { opacity: 0.5 }]}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Switch 
            value={value} 
            onValueChange={onValueChange}
            trackColor={{ false: "#E5E5EA", true: COLORS.tint }}
            thumbColor="#FFF"
            ios_backgroundColor="#E5E5EA"
            disabled={disabled}
        />
        {!isLast && <View style={styles.dividerAbsolute} />}
    </View>
);

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: COLORS.bg },
    safeArea: { flex: 1 },
    scrollContent: { paddingVertical: 24 },
    
    sectionContainer: { marginBottom: 32 },
    sectionHeader: { paddingHorizontal: 24, marginBottom: 8 },
    sectionHeaderText: { fontSize: 11, fontWeight: '600', color: COLORS.textSecondary, letterSpacing: 0.8 },
    sectionList: { paddingHorizontal: 24 },

    // Master Switch
    masterRow: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        paddingVertical: 12 
    },
    textStack: { flex: 1, paddingRight: 16 },
    rowSubtext: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4, lineHeight: 18 },

    // Rows
    toggleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        position: 'relative'
    },
    linkRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
    },
    rowLabel: { fontSize: 16, color: COLORS.textPrimary, fontWeight: '400' },
    rowRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    rowValue: { fontSize: 16, color: COLORS.textSecondary },

    // Dividers
    divider: { height: 1, backgroundColor: COLORS.divider },
    dividerAbsolute: { 
        position: 'absolute', 
        bottom: 0, 
        left: 0, 
        right: 0, 
        height: 1, 
        backgroundColor: COLORS.divider 
    },
});

export default NotificationSettingsScreen;