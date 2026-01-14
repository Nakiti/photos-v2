import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Alert, 
  TouchableOpacity, 
  Switch, 
  SafeAreaView, 
  ActivityIndicator 
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';

// --- Types ---
interface SettingItem {
   label: string;
   value?: string | null | boolean;
   onPress?: () => void;
   isDestructive?: boolean;
   isSwitch?: boolean;
}

interface SettingsSection {
   category?: string;
   items: SettingItem[];
}

// --- Mock Hooks (Simulating Data) ---
const useUser = () => {
    return {
        user: {
            id: '123',
            name: 'Nikhil',
            email: 'n2akiti@ucsd.edu',
            syncEnabled: true,
            notificationsEnabled: true
        },
        isLoading: false
    };
};

const useAuth = () => {
    return {
        signOut: async () => console.log("Sign out"),
        deleteAccount: async () => console.log("Delete account")
    };
};

// --- Components (Shared with GallerySettings) ---

const SectionHeader = ({ title }: { title: string }) => (
    <View style={styles.sectionHeaderContainer}>
        <Text style={styles.sectionHeaderText}>{title}</Text>
    </View>
);

const SettingsRow = ({ item, isLast }: { item: SettingItem, isLast: boolean }) => {
    return (
        <TouchableOpacity 
            style={styles.rowContainer} 
            onPress={item.onPress}
            activeOpacity={item.isSwitch ? 1 : 0.6}
            disabled={!item.onPress && !item.isSwitch}
        >
            <View style={styles.rowContent}>
                {/* Label */}
                <Text style={[
                    styles.rowLabel, 
                    item.isDestructive && styles.destructiveLabel
                ]}>
                    {item.label}
                </Text>

                {/* Right Side: Value, Switch, or Chevron */}
                <View style={styles.rowRight}>
                    {item.isSwitch ? (
                        <Switch 
                            value={item.value === true} 
                            onValueChange={item.onPress} 
                            trackColor={{ false: "#E5E5EA", true: "#000000" }} 
                            thumbColor={"#FFFFFF"}
                            ios_backgroundColor="#E5E5EA"
                        />
                    ) : (
                        <>
                            {/* Value Text */}
                            {item.value && (
                                <Text style={styles.rowValue}>{item.value}</Text>
                            )}
                            
                            {/* Chevron */}
                            {!item.isDestructive && item.onPress && (
                                <Ionicons name="chevron-forward" size={16} color="#C7C7CC" style={{marginLeft: 8}} />
                            )}
                        </>
                    )}
                </View>
            </View>
            
            {/* Separator */}
            {!isLast && <View style={styles.separator} />}
        </TouchableOpacity>
    )
}

// --- Main Screen ---

const ProfileSettingsScreen = () => {
   const navigation = useNavigation<any>();
   const [settingsData, setSettingsData] = useState<SettingsSection[] | null>(null);

   // Mock Data Fetching
   const { user, isLoading } = useUser();
   const { signOut, deleteAccount } = useAuth();

   // --- Actions ---

   const confirmSignOut = () => {
      Alert.alert(
         'Log Out',
         'Are you sure you want to log out?',
         [
            { text: 'Cancel', style: 'cancel' },
            { 
               text: 'Log Out', 
               style: 'destructive',
               onPress: () => signOut()
            },
         ]
      );
   };

   const confirmDeleteAccount = () => {
      Alert.alert(
         'Delete Account',
         'This action is irreversible. All your photos and data will be lost.',
         [
            { text: 'Cancel', style: 'cancel' },
            { 
               text: 'Delete', 
               style: 'destructive',
               onPress: () => deleteAccount()
            },
         ]
      );
   };

   // --- Data Builder ---

   useEffect(() => {
      if (!user) {
         setSettingsData(null);
         return;
      }

      const data: SettingsSection[] = [];

      // 1. Account
      const accountSection: SettingsSection = {category: 'ACCOUNT', items: []};
      accountSection.items.push({
         label: 'Edit Profile', 
         onPress: () => navigation.navigate("EditProfile"),
      });
      accountSection.items.push({
         label: 'Email', 
         value: user.email, 
         onPress: () => navigation.navigate("ChangeEmail"),
      });
      accountSection.items.push({
         label: 'Password', 
         value: '••••••••', 
         onPress: () => navigation.navigate("ChangePassword"),
      });
      data.push(accountSection);

      // 2. Preferences (Sync & Data - Important for Offline First)
      const preferencesSection: SettingsSection = {category: 'PREFERENCES', items: []};
      preferencesSection.items.push({
         label: 'Notifications',
         value: 'On', 
         onPress: () => navigation.navigate("NotificationSettings"),
      });
      preferencesSection.items.push({
         label: 'Sync over Cellular',
         value: true, 
         isSwitch: true,
         onPress: () => console.log('Toggle Sync'),
      });
      preferencesSection.items.push({
        label: 'Upload Quality',
        value: 'High', 
        onPress: () => navigation.navigate("DataUsageSettings"),
     });
      data.push(preferencesSection);

      // 3. Support
      const supportSection: SettingsSection = { category: 'SUPPORT', items: [] };
      supportSection.items.push({
         label: 'Help Center',
         onPress: () => navigation.navigate("HelpCenter"),
      });
      supportSection.items.push({
         label: 'Privacy Policy',
         onPress: () => navigation.navigate("PrivacyPolicy"),
      });
      supportSection.items.push({
        label: 'Terms of Service',
        onPress: () => navigation.navigate("TermsOfService"),
     });
      data.push(supportSection);

      // 4. Session
      data.push({
        category: 'SESSION',
        items: [
           { label: 'Log Out', onPress: confirmSignOut, isDestructive: true },
        ],
      });
      
      // 5. Danger Zone
      data.push({
         category: '',
         items: [
            { label: 'Delete Account', onPress: confirmDeleteAccount, isDestructive: true },
         ],
      });

      setSettingsData(data);

   }, [user, navigation]);

   if (isLoading) {
      return (
         <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#000" />
         </View>
      )
   }

   return (
      <View style={styles.container}>
         <SafeAreaView style={styles.safeArea}>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                
                {/* Profile Header Block */}
                <View style={styles.profileHeader}>
                    <View style={styles.avatarPlaceholder}>
                         <Text style={styles.avatarInitials}>
                             {user?.name?.substring(0,2).toUpperCase() || 'U'}
                         </Text>
                    </View>
                    <Text style={styles.profileName}>{user?.name}</Text>
                    <Text style={styles.profileHandle}>@{user?.email?.split('@')[0]}</Text>
                </View>

                {/* Settings List */}
                {settingsData && settingsData.map((section, sectionIndex) => (
                    <View key={sectionIndex} style={styles.sectionContainer}>
                        {section.category ? <SectionHeader title={section.category} /> : null}
                        <View style={styles.sectionList}>
                            {section.items.map((item, itemIndex) => (
                                <SettingsRow 
                                    key={itemIndex} 
                                    item={item} 
                                    isLast={itemIndex === section.items.length - 1} 
                                />
                            ))}
                        </View>
                    </View>
                ))}

                <Text style={styles.versionText}>Focal v1.0.2</Text>
            </ScrollView>
         </SafeAreaView>
      </View>
   );
};

const styles = StyleSheet.create({
   container: {
      flex: 1,
      backgroundColor: '#FFFFFF',
   },
   safeArea: {
      flex: 1,
   },
   loadingContainer: {
      flex: 1, 
      justifyContent: 'center', 
      alignItems: 'center',
      backgroundColor: '#FFFFFF'
   },

   // --- Profile Header ---
   profileHeader: {
       alignItems: 'center',
       paddingVertical: 32,
       borderBottomWidth: 1,
       borderBottomColor: '#F9F9F9',
       marginBottom: 24,
   },
   avatarPlaceholder: {
       width: 80,
       height: 80,
       borderRadius: 40,
       backgroundColor: '#F2F2F7',
       alignItems: 'center',
       justifyContent: 'center',
       marginBottom: 16,
   },
   avatarInitials: {
       fontSize: 28,
       fontWeight: '600',
       color: '#8E8E93',
   },
   profileName: {
       fontSize: 22,
       fontWeight: '700',
       color: '#000000',
       marginBottom: 4,
   },
   profileHandle: {
       fontSize: 16,
       color: '#8E8E93',
   },

   // --- Scroll Content ---
   scrollContent: {
      paddingBottom: 60,
   },
   sectionContainer: {
      marginBottom: 32,
   },
   sectionList: {
       paddingHorizontal: 24,
   },

   // --- Headers ---
   sectionHeaderContainer: {
      paddingHorizontal: 24,
      marginBottom: 8,
   },
   sectionHeaderText: {
      fontSize: 11,
      fontWeight: '600',
      color: '#8E8E93',
      textTransform: 'uppercase',
      letterSpacing: 0.8,
   },

   // --- Rows ---
   rowContainer: {
       // Separator handles spacing
   },
   rowContent: {
       flexDirection: 'row',
       alignItems: 'center',
       justifyContent: 'space-between',
       paddingVertical: 18,
   },
   rowLabel: {
       fontSize: 16,
       color: '#000000',
       fontWeight: '400',
       letterSpacing: -0.2,
   },
   destructiveLabel: {
       color: '#FF3B30', // System Red
   },
   rowRight: {
       flexDirection: 'row',
       alignItems: 'center',
   },
   rowValue: {
       fontSize: 16,
       color: '#8E8E93', // Subtle Grey
       marginRight: 4,
   },
   
   // --- Separator ---
   separator: {
       height: StyleSheet.hairlineWidth,
       backgroundColor: '#E5E5EA',
   },

   // --- Version Footer ---
   versionText: {
       textAlign: 'center',
       color: '#D1D1D6',
       fontSize: 12,
       marginBottom: 40,
   },
});

export default ProfileSettingsScreen;