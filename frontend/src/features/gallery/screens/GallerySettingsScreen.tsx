import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity, Switch, SafeAreaView, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useDeleteGallery, useGallery } from '../../../hooks/useGalleryData';
import { useAuth } from '../../../hooks/useAuth';
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

// --- Utility Functions ---
const formatAddPermission = (value?: string | null): string => {
   if (!value) return 'Anyone';
   const normalized = value.toLowerCase();
   if (normalized === 'anyone' || normalized === 'all') return 'Anyone';
   if (normalized === 'admin') return 'Admin';
   return value; // Fallback to original if unknown
};

const formatDeletePermission = (value?: string | null): string => {
   if (!value) return 'Admin';
   const normalized = value.toLowerCase();
   if (normalized === 'admin') return 'Admin';
   if (normalized === 'admins_authors' || normalized === 'admins/authors') return 'Admin/Authors';
   return value; // Fallback to original if unknown
};

const formatJoinRequiresApproval = (value?: boolean | string | null): string => {
   if (value === undefined || value === null) return 'Anyone';
   if (typeof value === 'boolean') {
      return value ? 'Require Approval' : 'Anyone';
   }
   if (typeof value === 'string') {
      const normalized = value.toLowerCase();
      if (normalized === 'admin_approval' || normalized === 'require approval') return 'Require Approval';
      if (normalized === 'all' || normalized === 'anyone') return 'Anyone';
   }
   return 'Anyone'; // Default fallback
};

// --- Components ---

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
            activeOpacity={item.isSwitch ? 1 : 0.6} // Disable opacity change for switches
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
                            onValueChange={item.onPress} // Assuming onPress toggles logic
                            trackColor={{ false: "#E5E5EA", true: "#000000" }} // Minimalist Black Toggle
                            thumbColor={"#FFFFFF"}
                            ios_backgroundColor="#E5E5EA"
                        />
                    ) : (
                        <>
                            {/* Value Text */}
                            {item.value && (
                                <Text style={styles.rowValue}>{item.value}</Text>
                            )}
                            
                            {/* Chevron (Only if not destructive and is clickable) */}
                            {!item.isDestructive && item.onPress && (
                                <Ionicons name="chevron-forward" size={16} color="#C7C7CC" style={{marginLeft: 8}} />
                            )}
                        </>
                    )}
                </View>
            </View>
            
            {/* Separator (Inset) */}
            {!isLast && <View style={styles.separator} />}
        </TouchableOpacity>
    )
}

const GallerySettingsScreen = () => {
   const [settingsData, setSettingsData] = useState<SettingsSection[] | null>(null);
   const navigation = useNavigation()
   const route = useRoute();
   const { galleryId } = route.params as { galleryId: string }

   const { gallery, isLoading } = useGallery(galleryId)
   const { user } = useAuth()
   const deleteGalleryMutation = useDeleteGallery()

   const isOwner = gallery?.ownerId === user?.id

   // --- Actions ---

   const confirmAndDeleteGallery = () => {
      if (!gallery?.id) return;
      Alert.alert(
         'Delete Gallery',
         'Are you sure? This will permanently delete this gallery and all photos.',
         [
            { text: 'Cancel', style: 'cancel' },
            { 
               text: 'Delete', 
               style: 'destructive',
               onPress: () => {
                  deleteGalleryMutation.mutate(gallery.id, {
                     onSuccess: () => (navigation as any).navigate('TabNavigator', { screen: 'Groups' }),
                  })
               }
            },
         ]
      )
   }

   // --- Data Builder ---

   useEffect(() => {
      if (!gallery || !user) {
         setSettingsData(null);
         return;
      }

      const data: SettingsSection[] = [];

      // 1. Customization
      const customizationSection: SettingsSection = {category: 'GENERAL', items: []}
      customizationSection.items.push({
         label: 'Name', 
         value: gallery.name, 
         onPress: () => (navigation as any).navigate("EditGalleryDetails", { galleryId: gallery.id }),
      })

      if (gallery.type == "EVENT") {
         customizationSection.items.push({ label: 'Date', value: "Oct 24", onPress: () => {} }) // Mock data
         customizationSection.items.push({ label: 'Location', value: "New York", onPress: () => {} })
      }
      if (customizationSection.items.length > 0) data.push(customizationSection);

      // 2. Privacy
      const privacySection: SettingsSection = { category: 'PRIVACY', items: [] };
      if (gallery.type === 'EVENT') {
        privacySection.items.push({ 
         label: 'Share Event Link', 
         value: 'Public', 
         onPress: () => (navigation as any).navigate("EditShareEventLink", {galleryId: gallery.id})
        });
      }
      if (isOwner) {
         privacySection.items.push({
            label: 'Require Approval',
            value: formatJoinRequiresApproval(gallery.joinRequiresApproval), 
            onPress: () => (navigation as any).navigate("EditRequireApproval", {galleryId: gallery.id})
         });
         privacySection.items.push({
            label: 'Require Picture Review',
            value: gallery.requirePictureReview ? 'On' : 'Off', 
            onPress: () => (navigation as any).navigate("EditRequirePictureReview", {galleryId: gallery.id})
         });
         privacySection.items.push({
            label: 'Pending Requests',
            value: '0', 
            onPress: () => (navigation as any).navigate("PendingRequests", {galleryId: gallery.id}),
         })
      }
      if (privacySection.items.length > 0) data.push(privacySection);

      // 3. Permissions
      const permissionsSection: SettingsSection = { category: 'PERMISSIONS', items: [] };
      permissionsSection.items.push({
         label: 'Who can add members?',
         value: formatAddPermission(gallery.addPermission), 
         onPress: () => (navigation as any).navigate("EditAddMembersPermission", { galleryId: gallery.id })
      });
      permissionsSection.items.push({
         label: 'Who can edit details?',
         value: 'Admin', 
         onPress: () => (navigation as any).navigate("EditPermission", { galleryId: gallery.id })
      });
      permissionsSection.items.push({
         label: 'Who can delete photos?',
         value: formatDeletePermission(gallery.deletePermission), 
         onPress: () => (navigation as any).navigate("EditDeletePermission", { galleryId: gallery.id }),
      });
      data.push(permissionsSection);
      
      // 4. Danger Zone
      if (isOwner) {
         data.push({
            category: 'ADMIN',
            items: [
               { label: 'Transfer Ownership', onPress: () => {}, isDestructive: false },
               { label: 'Delete Gallery', onPress: confirmAndDeleteGallery, isDestructive: true },
            ],
         });
      } else {
        data.push({
          category: 'ACTIONS',
          items: [
             { label: 'Leave Gallery', onPress: () => {}, isDestructive: true },
          ],
       });
      }

      setSettingsData(data);

   }, [gallery, user, isOwner, navigation]);

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
                {settingsData && settingsData.map((section, sectionIndex) => (
                <View key={sectionIndex} style={styles.sectionContainer}>
                    {section.category && <SectionHeader title={section.category} />}
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
   
   // --- Navigation ---
   navBar: {
       flexDirection: 'row',
       alignItems: 'center',
       justifyContent: 'space-between',
       paddingHorizontal: 24,
       paddingVertical: 16,
       borderBottomWidth: 1,
       borderBottomColor: '#F9F9F9',
   },
   navTitle: {
       fontSize: 16,
       fontWeight: '600',
       color: '#000',
   },

   // --- Scroll Content ---
   scrollContent: {
      paddingBottom: 60,
      paddingTop: 10,
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
       // We don't put paddingVertical here because we want the separator to act as the boundary
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
       // Optional: Indent separator if you prefer that look
       // marginLeft: 0, 
   },
});

export default GallerySettingsScreen;