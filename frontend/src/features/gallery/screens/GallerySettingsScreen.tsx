import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import SettingsItem from '../components/SettingsItem';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useGallery } from '../../../hooks/useGalleryData';
import { useAuth } from '../../../hooks/useAuth';

interface SettingItem {
   label: string;
   value?: string | null | boolean;
   onPress?: () => void;
   bottom?: boolean;
   isDestructive?: boolean;
   isSwitch?: boolean;
   privilege?: boolean; 
}

interface SettingsSection {
   category?: string;
   items: SettingItem[];
}

interface GallerySettingsProps { galleryId: string | number }

const GallerySettingsScreen = () => {
   const [settingsData, setSettingsData] = useState<SettingsSection[] | null>(null);
   const navigation = useNavigation()
   const route = useRoute();
   const { galleryId } = route.params as { galleryId: string }

   const { gallery, isLoading } = useGallery(galleryId)
   const { user } = useAuth()

   const isOwner = gallery?.ownerId === user?.id


   useEffect(() => {
      if (!gallery || !user) {
         // Wait for data to be loaded
         setSettingsData(null);
         return;
      }

      const data: SettingsSection[] = [];

      // --- Section 1: Personalization ---
      const customizationSection: SettingsSection = {category: 'Customization', items: []}

      customizationSection.items.push({
         label: 'Edit Details', 
         value: gallery.name, 
         onPress: () => (navigation as any).navigate("EditGalleryDetails", { galleryId: gallery.id }),
         bottom: true
      })

      if (gallery.type == "EVENT") {
         customizationSection.items.push({
            label: 'Edit Date', 
            value: gallery.name, 
            onPress: () => {}
         })

         customizationSection.items.push({
            label: 'Edit Location', 
            value: gallery.name, 
            onPress: () => {}
         })
      }

      if (customizationSection.items.length > 0) {
         data.push(customizationSection);
      }

      // --- Section 2: Privacy (Conditionally build) ---
      const privacySection: SettingsSection = { category: 'Privacy', items: [] };
      
      if (gallery.type === 'EVENT') {
        privacySection.items.push({
          label: 'Share Event Link',
          value: null,
          onPress: () => { /* Logic to open share sheet with shareableLink */ }
        });
      }
      
      if (isOwner) {
         privacySection.items.push({
            label: 'Require Admin Approval to Join',
            value: gallery.joinRequiresApproval,
            onPress: () => (navigation as any).navigate("EditJoinPermission", { galleryId: gallery.id })
         });

         privacySection.items.push({
            label: 'Pending Requests',
            value: '0',
            isSwitch: false,
            onPress: () => { /* Logic to call useUpdateGallery mutation */ },
            bottom: true
         })
      }


      if (privacySection.items.length > 0) {
        data.push(privacySection);
      }

      // --- Section 3: Permissions (Conditionally build) ---
      const permissionsSection: SettingsSection = { category: 'Permissions', items: [] };


      permissionsSection.items.push({
         label: 'Who can add members?',
         value: gallery.addPermission, // This would come from gallery data
         onPress: () => (navigation as any).navigate("EditAddMembersPermission", { galleryId: gallery.id })
      });

      permissionsSection.items.push({
         label: 'Who can edit details?',
         value: 'Admins Only', // This would come from gallery data
         onPress: () => (navigation as any).navigate("EditPermission", { galleryId: gallery.id })
      });

      permissionsSection.items.push({
         label: 'Who can delete pictures?',
         value: gallery.deletePermission, // This would come from gallery data
         onPress: () => (navigation as any).navigate("EditDeletePermission", { galleryId: gallery.id }),
         bottom: true
      });
      
      
      data.push(permissionsSection);
      
      // --- Section 4: Admin Settings (Only show if user is owner/admin) ---
      if (isOwner) {
         data.push({
            category: 'Admin Settings',
            items: [
               { 
                 label: 'Delete Gallery', 
                 value: null, 
                 isDestructive: true, 
                 onPress: () => { /* Call useDeleteGallery mutation */ } 
               },
               { 
                  label: 'Change Owner', 
                  value: null, 
                  isDestructive: true, 
                  onPress: () => { /* Call useDeleteGallery mutation */ },
                  bottom: true
               },
            ],
         });
      }
      
      // --- Section 5: Leave ---
      if (!isOwner) {
        data.push({
          items: [
             { 
               label: 'Leave Gallery', 
               value: null, 
               isDestructive: true, 
               onPress: () => { /* Call useLeaveGallery mutation */ } 
             },
          ],
       });
      }

      setSettingsData(data);

   }, [gallery, user, isOwner, navigation]);

   return (
      <View style={styles.container}>
         <ScrollView style={styles.scorllContainer}>
            {settingsData && settingsData.map((section, index) => (
               <View key={index} style={styles.sectionContainer}>
                  {section.category && <Text style={styles.sectionTitle}>{section.category}</Text>}
                  {section.items.map((listItem, idx) => (
                     <View key={idx}>
                        {listItem && <SettingsItem item={listItem} />}
                     </View>
                  ))}
               </View>
            ))}
         </ScrollView>
      </View>
   );
};

const styles = StyleSheet.create({
   container: {
      flex: 1,
      backgroundColor: 'white', // Light mode background
      // paddingTop: 20,
      paddingBottom: 50

   },
   scorllContainer: {
      flexGrow: 1,
      backgroundColor: "#fff",
      paddingHorizontal: 15,
      paddingBottom: 20,
   },
   sectionContainer: {
      marginBottom: 20,
      backgroundColor: "#f9f9f9",
      paddingHorizontal: 20,
      borderRadius: 8,
   },
   sectionTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      marginTop: 20,
      // marginBottom: 4,
      color: 'black', // Light mode text color
   },

});

export default GallerySettingsScreen;
