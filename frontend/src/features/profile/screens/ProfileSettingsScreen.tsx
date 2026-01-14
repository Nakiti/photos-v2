import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, SafeAreaView, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';

// --- Shared Components ---
const SectionHeader = ({ title }: { title: string }) => (
    <View style={styles.sectionHeaderContainer}>
        <Text style={styles.sectionHeaderText}>{title}</Text>
    </View>
);

const SettingsRow = ({ label, value, onPress, isSwitch, isDestructive, hasChevron = true }: any) => (
    <TouchableOpacity 
        style={styles.rowContainer} 
        onPress={onPress}
        activeOpacity={isSwitch ? 1 : 0.6}
        disabled={!onPress && !isSwitch}
    >
        <View style={styles.rowContent}>
            <Text style={[styles.rowLabel, isDestructive && styles.destructiveLabel]}>{label}</Text>
            <View style={styles.rowRight}>
                {isSwitch ? (
                    <Switch 
                        value={value} 
                        onValueChange={onPress} 
                        trackColor={{ false: "#E5E5EA", true: "#000000" }} 
                        thumbColor={"#FFFFFF"}
                        ios_backgroundColor="#E5E5EA"
                    />
                ) : (
                    <>
                        {value && <Text style={styles.rowValue}>{value}</Text>}
                        {hasChevron && !isDestructive && (
                            <Ionicons name="chevron-forward" size={16} color="#C7C7CC" style={{marginLeft: 8}} />
                        )}
                    </>
                )}
            </View>
        </View>
        <View style={styles.separator} />
    </TouchableOpacity>
);

// --- Main Screen ---
const ProfileSettingsScreen = () => {
   const navigation = useNavigation<any>();

   // Dummy State for the top-level simple toggles
   const [showHidden, setShowHidden] = React.useState(false);

   return (
      <View style={styles.container}>
         <SafeAreaView style={styles.safeArea}>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                
                {/* 1. Account */}
                <View style={styles.sectionContainer}>
                    <SectionHeader title="ACCOUNT" />
                    <View style={styles.sectionList}>
                        <SettingsRow label="Edit Profile" onPress={() => navigation.navigate("EditProfile")} />
                        <SettingsRow label="Appearance" value="System" onPress={() => {}} />
                    </View>
                </View>

                {/* 2. Complex Settings (Drill-Downs) */}
                <View style={styles.sectionContainer}>
                    <SectionHeader title="PREFERENCES" />
                    <View style={styles.sectionList}>
                        <SettingsRow 
                            label="Notifications & Sounds" 
                            value="On"
                            onPress={() => navigation.navigate("NotificationSettings")} 
                        />
                        <SettingsRow 
                            label="Sync & Data Usage" 
                            value="High Quality"
                            onPress={() => navigation.navigate("DataSyncSettings")} 
                        />
                    </View>
                </View>

                {/* 3. Simple Gallery Settings (Inline) */}
                <View style={styles.sectionContainer}>
                    <SectionHeader title="GALLERY" />
                    <View style={styles.sectionList}>
                         <SettingsRow 
                            label="Show Hidden Galleries" 
                            isSwitch 
                            value={showHidden} 
                            onPress={() => setShowHidden(!showHidden)} 
                        />
                        <SettingsRow 
                            label="Clear Cache" 
                            value="1.2 GB" 
                            onPress={() => Alert.alert("Cache Cleared")} 
                            hasChevron={false}
                        />
                    </View>
                </View>

                {/* 4. Support & Danger */}
                <View style={styles.sectionContainer}>
                    <SectionHeader title="SUPPORT" />
                    <View style={styles.sectionList}>
                        <SettingsRow label="Help Center" onPress={() => {}} />
                        <SettingsRow label="Log Out" isDestructive onPress={() => {}} hasChevron={false} />
                    </View>
                </View>

                <Text style={styles.versionText}>Focal v1.0.3</Text>
            </ScrollView>
         </SafeAreaView>
      </View>
   );
};

const styles = StyleSheet.create({
   container: { flex: 1, backgroundColor: '#FFFFFF' },
   safeArea: { flex: 1 },
   scrollContent: { paddingBottom: 60, paddingTop: 24 },
   sectionContainer: { marginBottom: 32 },
   sectionList: { paddingHorizontal: 24 },
   sectionHeaderContainer: { paddingHorizontal: 24, marginBottom: 8 },
   sectionHeaderText: { fontSize: 11, fontWeight: '600', color: '#8E8E93', textTransform: 'uppercase', letterSpacing: 0.8 },
   rowContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 18 },
   rowLabel: { fontSize: 16, color: '#000000', fontWeight: '400' },
   destructiveLabel: { color: '#FF3B30' },
   rowRight: { flexDirection: 'row', alignItems: 'center' },
   rowValue: { fontSize: 16, color: '#8E8E93', marginRight: 4 },
   separator: { height: StyleSheet.hairlineWidth, backgroundColor: '#E5E5EA' },
   versionText: { textAlign: 'center', color: '#D1D1D6', fontSize: 12, marginBottom: 40 },
});

export default ProfileSettingsScreen;