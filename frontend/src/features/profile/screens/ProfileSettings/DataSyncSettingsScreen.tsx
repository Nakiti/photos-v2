import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Switch, 
  SafeAreaView, 
  TouchableOpacity 
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

// --- Theme ---
const COLORS = {
  bg: '#FFFFFF',
  textPrimary: '#000000',
  textSecondary: '#8E8E93',
  divider: '#F2F2F7',
  tint: '#000000',
};

const DataSyncSettingsScreen = () => {
    const [syncCellular, setSyncCellular] = useState(false);
    const [bgSync, setBgSync] = useState(true);
    const [quality, setQuality] = useState<'Original' | 'High'>('High');

    return (
        <View style={styles.root}>
            <SafeAreaView style={styles.safeArea}>
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    
                    {/* 1. Synchronization */}
                    <View style={styles.sectionContainer}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionHeaderText}>SYNCHRONIZATION</Text>
                        </View>
                        <View style={styles.sectionList}>
                            
                            {/* Cellular Toggle */}
                            <View style={styles.row}>
                                <View style={styles.textStack}>
                                    <Text style={styles.rowLabel}>Sync over Cellular</Text>
                                    <Text style={styles.rowSubtext}>Allow uploading photos when not on Wi-Fi.</Text>
                                </View>
                                <Switch 
                                    value={syncCellular} 
                                    onValueChange={setSyncCellular} 
                                    trackColor={{ false: "#E5E5EA", true: COLORS.tint }}
                                    thumbColor="#FFF"
                                    ios_backgroundColor="#E5E5EA"
                                />
                            </View>
                            <View style={styles.divider} />

                            {/* Background Sync Toggle */}
                            <View style={styles.row}>
                                <View style={styles.textStack}>
                                    <Text style={styles.rowLabel}>Background Sync</Text>
                                    <Text style={styles.rowSubtext}>Keep galleries up to date even when the app is closed.</Text>
                                </View>
                                <Switch 
                                    value={bgSync} 
                                    onValueChange={setBgSync} 
                                    trackColor={{ false: "#E5E5EA", true: COLORS.tint }}
                                    thumbColor="#FFF"
                                    ios_backgroundColor="#E5E5EA"
                                />
                            </View>

                        </View>
                    </View>

                    {/* 2. Media Quality */}
                    <View style={styles.sectionContainer}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionHeaderText}>UPLOAD QUALITY</Text>
                        </View>
                        <View style={styles.sectionList}>
                            
                            {/* Option: Original */}
                            <TouchableOpacity 
                                style={styles.row} 
                                onPress={() => setQuality('Original')}
                                activeOpacity={0.7}
                            >
                                <View style={styles.textStack}>
                                    <Text style={styles.rowLabel}>Original</Text>
                                    <Text style={styles.rowSubtext}>Uploads full-resolution files. Uses more data and storage.</Text>
                                </View>
                                {quality === 'Original' && <Ionicons name="checkmark" size={22} color={COLORS.tint} />}
                            </TouchableOpacity>
                            <View style={styles.divider} />

                            {/* Option: High Efficiency */}
                            <TouchableOpacity 
                                style={styles.row} 
                                onPress={() => setQuality('High')}
                                activeOpacity={0.7}
                            >
                                <View style={styles.textStack}>
                                    <Text style={styles.rowLabel}>High Efficiency</Text>
                                    <Text style={styles.rowSubtext}>Optimized file size with excellent visual quality. Recommended.</Text>
                                </View>
                                {quality === 'High' && <Ionicons name="checkmark" size={22} color={COLORS.tint} />}
                            </TouchableOpacity>

                        </View>
                    </View>

                </ScrollView>
            </SafeAreaView>
        </View>
    );
};

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: COLORS.bg },
    safeArea: { flex: 1 },
    scrollContent: { paddingVertical: 24 },
    
    sectionContainer: { marginBottom: 32 },
    sectionHeader: { paddingHorizontal: 24, marginBottom: 8 },
    sectionHeaderText: { fontSize: 11, fontWeight: '600', color: COLORS.textSecondary, letterSpacing: 0.8 },
    sectionList: { paddingHorizontal: 24 },

    row: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        paddingVertical: 16 
    },
    textStack: { flex: 1, paddingRight: 24 },
    rowLabel: { fontSize: 16, color: COLORS.textPrimary, fontWeight: '400' },
    rowSubtext: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4, lineHeight: 18 },
    
    divider: { height: 1, backgroundColor: COLORS.divider },
});

export default DataSyncSettingsScreen;