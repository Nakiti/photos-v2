import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import SettingsItem from '../../gallery/components/SettingsItem';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { useDeleteGroup, useGroup, useLeaveGroup } from '../../../hooks/useGroupData';
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

const GroupSettingsScreen = () => {
   const [settingsData, setSettingsData] = useState<SettingsSection[] | null>(null);
   const navigation = useNavigation()
   const route = useRoute();
   const { groupId } = route.params as { groupId: string }

   const { group, isLoading, refetch } = useGroup(groupId)

   useFocusEffect(
      useCallback(() => {
         // This runs when screen is focused (initial load + navigating back)
         refetch();
      }, [refetch])
   );

   console.log("groupId ", groupId)
   console.log("group ", group)
   const { user } = useAuth()
   const deleteGroupMutation = useDeleteGroup()
   const leaveGroupMutation = useLeaveGroup()

   const isOwner = group?.ownerId === user?.id

   const confirmAndDeleteGroup = () => {
      if (!group?.id) return;

      Alert.alert(
         'Delete Group',
         'This will permanently delete this group and its galleries for all members. This action cannot be undone.',
         [
            { text: 'Cancel', style: 'cancel' },
            {
               text: 'Delete',
               style: 'destructive',
               onPress: () => {
                  deleteGroupMutation.mutate(group.id, {
                     onSuccess: () => {
                        (navigation as any).navigate('TabNavigator', { screen: 'Groups' })
                     },
                  })
               }
            },
         ]
      )
   }

   const confirmAndLeaveGroup = () => {
      if (!group?.id) return;

      Alert.alert(
         'Leave Group',
         'Are you sure you want to leave this group? You will lose access to all galleries in this group.',
         [
            { text: 'Cancel', style: 'cancel' },
            {
               text: 'Leave',
               style: 'destructive',
               onPress: () => {
                  leaveGroupMutation.mutate(group.id, {
                     onSuccess: () => {
                        (navigation as any).navigate('TabNavigator', { screen: 'Groups' })
                     },
                  })
               }
            },
         ]
      )
   }

   useEffect(() => {
      if (!group || !user) {
         // Wait for data to be loaded
         setSettingsData(null);
         return;
      }

      const data: SettingsSection[] = [];

      // --- Section 1: Customization ---
      const customizationSection: SettingsSection = {category: 'Customization', items: []}

      customizationSection.items.push({
         label: 'Edit Details',
         value: group.name,
         onPress: () => (navigation as any).navigate("EditGroupDetails", { groupId: group.id }),
         bottom: true
      })

      if (customizationSection.items.length > 0) {
         data.push(customizationSection);
      }

      // --- Section 2: Privacy ---
      const privacySection: SettingsSection = { category: 'Privacy', items: [] };

      if (isOwner) {
         const c: any = group;
         privacySection.items.push({
            label: 'Require Admin Approval to Join',
            value: c.joinRequiresApproval ?? false,
            onPress: () => (navigation as any).navigate("EditJoinPermission", { groupId: group.id })
         });

         privacySection.items.push({
            label: 'Pending Requests',
            value: '0',
            isSwitch: false,
            onPress: () => (navigation as any).navigate("PendingRequests", { groupId: group.id }),
            bottom: true
         })
      }

      if (privacySection.items.length > 0) {
        data.push(privacySection);
      }

      // --- Section 3: Permissions ---
      const permissionsSection: SettingsSection = { category: 'Permissions', items: [] };
      const c: any = group;

      if (isOwner) {
         permissionsSection.items.push({
            label: 'Who can add members?',
            value: c.addPermission === 'ANYONE' ? 'Anyone' : 'Admins',
            onPress: () => (navigation as any).navigate("EditAddPermission", { groupId: group.id })
         });

         permissionsSection.items.push({
            label: 'Who can delete photos?',
            value: c.deletePermission === 'ADMINS_AUTHORS' ? 'Admins & Authors' : 'Admins Only',
            onPress: () => (navigation as any).navigate("EditDeletePermission", { groupId: group.id }),
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
                 label: 'Change Ownership',
                 value: null,
                 isDestructive: false,
                 onPress: () => (navigation as any).navigate("ChangeOwnership", { groupId: group.id })
               },
               {
                 label: 'Delete Group',
                 value: null,
                 isDestructive: true,
                 onPress: confirmAndDeleteGroup,
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
               label: 'Leave Group',
               value: null,
               isDestructive: true,
               onPress: confirmAndLeaveGroup
             },
          ],
       });
      }

      setSettingsData(data);

   }, [group, user, isOwner, navigation]);

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
      backgroundColor: 'white',
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
      color: 'black',
   },
});

export default GroupSettingsScreen;
