import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import SettingsItem from '../../gallery/components/SettingsItem';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { useDeleteCommunity, useCommunity, useLeaveCommunity } from '../../../hooks/useCommunityData';
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

const CommunitySettingsScreen = () => {
   const [settingsData, setSettingsData] = useState<SettingsSection[] | null>(null);
   const navigation = useNavigation()
   const route = useRoute();
   const { communityId } = route.params as { communityId: string }

   const { community, isLoading, refetch } = useCommunity(communityId)

   useFocusEffect(
      useCallback(() => {
         // This runs when screen is focused (initial load + navigating back)
         refetch();
      }, [refetch])
   );

   console.log("communityId ", communityId)
   console.log("community ", community)
   const { user } = useAuth()
   const deleteCommunityMutation = useDeleteCommunity()
   const leaveCommunityMutation = useLeaveCommunity()

   const isOwner = community?.ownerId === user?.id

   const confirmAndDeleteCommunity = () => {
      if (!community?.id) return;
      
      Alert.alert(
         'Delete Community',
         'This will permanently delete this community and its galleries for all members. This action cannot be undone.',
         [
            { text: 'Cancel', style: 'cancel' },
            { 
               text: 'Delete', 
               style: 'destructive',
               onPress: () => {
                  deleteCommunityMutation.mutate(community.id, {
                     onSuccess: () => {
                        (navigation as any).navigate('TabNavigator', { screen: 'Communities' })
                     },
                  })
               }
            },
         ]
      )
   }

   const confirmAndLeaveCommunity = () => {
      if (!community?.id) return;
      
      Alert.alert(
         'Leave Community',
         'Are you sure you want to leave this community? You will lose access to all galleries in this community.',
         [
            { text: 'Cancel', style: 'cancel' },
            { 
               text: 'Leave', 
               style: 'destructive',
               onPress: () => {
                  leaveCommunityMutation.mutate(community.id, {
                     onSuccess: () => {
                        (navigation as any).navigate('TabNavigator', { screen: 'Communities' })
                     },
                  })
               }
            },
         ]
      )
   }

   useEffect(() => {
      if (!community || !user) {
         // Wait for data to be loaded
         setSettingsData(null);
         return;
      }

      const data: SettingsSection[] = [];

      // --- Section 1: Customization ---
      const customizationSection: SettingsSection = {category: 'Customization', items: []}

      customizationSection.items.push({
         label: 'Edit Details', 
         value: community.name, 
         onPress: () => (navigation as any).navigate("CommunityDetails", { communityId: community.id }),
         bottom: true
      })

      if (customizationSection.items.length > 0) {
         data.push(customizationSection);
      }

      // --- Section 2: Privacy ---
      const privacySection: SettingsSection = { category: 'Privacy', items: [] };
      
      if (isOwner) {
         const c: any = community;
         privacySection.items.push({
            label: 'Require Admin Approval to Join',
            value: c.joinRequiresApproval ?? false,
            onPress: () => (navigation as any).navigate("EditJoinPermission", { communityId: community.id })
         });

         // Note: Pending requests functionality would need to be implemented
         // privacySection.items.push({
         //    label: 'Pending Requests',
         //    value: '0',
         //    isSwitch: false,
         //    onPress: () => { /* Logic to show pending requests */ },
         //    bottom: true
         // })
      }

      if (privacySection.items.length > 0) {
        data.push(privacySection);
      }

      // --- Section 3: Permissions ---
      const permissionsSection: SettingsSection = { category: 'Permissions', items: [] };
      const c: any = community;

      if (isOwner) {
         permissionsSection.items.push({
            label: 'Who can add photos?',
            value: c.addPermission === 'ANYONE' ? 'Anyone' : 'Admins', 
            onPress: () => (navigation as any).navigate("EditAddPermission", { communityId: community.id })
         });

         permissionsSection.items.push({
            label: 'Who can delete photos?',
            value: c.deletePermission === 'ADMINS_AUTHORS' ? 'Admins & Authors' : 'Admins Only',
            onPress: () => (navigation as any).navigate("EditDeletePermission", { communityId: community.id }),
            bottom: true
         });
      } else {
         // For non-owners, show read-only permission info
         permissionsSection.items.push({
            label: 'Who can add photos?',
            value: c.addPermission === 'ANYONE' ? 'Anyone' : 'Admins',
            onPress: undefined,
            privilege: true
         });

         permissionsSection.items.push({
            label: 'Who can delete photos?',
            value: c.deletePermission === 'ADMINS_AUTHORS' ? 'Admins & Authors' : 'Admins Only',
            onPress: undefined,
            privilege: true,
            bottom: true
         });
      }
      
      data.push(permissionsSection);
      
      // --- Section 4: Admin Settings (Only show if user is owner) ---
      if (isOwner) {
         data.push({
            category: 'Admin Settings',
            items: [
               { 
                 label: 'Delete Community', 
                 value: null, 
                 isDestructive: true, 
                 onPress: confirmAndDeleteCommunity 
               },
               // Note: Change Owner functionality would need to be implemented
               // { 
               //    label: 'Change Owner', 
               //    value: null, 
               //    isDestructive: true, 
               //    onPress: () => { /* Call change owner mutation */ },
               //    bottom: true
               // },
            ],
         });
      }
      
      // --- Section 5: Leave ---
      if (!isOwner) {
        data.push({
          items: [
             { 
               label: 'Leave Community', 
               value: null, 
               isDestructive: true, 
               onPress: confirmAndLeaveCommunity 
             },
          ],
       });
      }

      setSettingsData(data);

   }, [community, user, isOwner, navigation]);

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
      color: 'black', // Light mode text color
   },
});

export default CommunitySettingsScreen;
