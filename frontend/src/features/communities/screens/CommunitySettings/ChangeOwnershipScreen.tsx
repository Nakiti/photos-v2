import React, { useMemo } from "react";
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { useCommunityMembers } from "../../../../hooks/useCommunityMembershipData";
import { useTransferOwnership } from "../../../../hooks/useCommunityData";
import { useAuth } from "../../../../hooks/useAuth";

const ChangeOwnershipScreen = () => {
   const route = useRoute();
   const navigation = useNavigation();
   const { communityId } = route.params as { communityId: string };
   const { user } = useAuth();

   const { members, isLoading } = useCommunityMembers(communityId);
   const { mutate: transferOwnership, isPending: isTransferring } = useTransferOwnership();

   // Filter out current owner and only show accepted members
   const eligibleMembers = useMemo(() => {
      return members.filter(({ user: memberUser, membership }) => {
         // Exclude current owner
         if (memberUser.id === user?.id) return false;
         // Only show accepted members
         const status = (membership as any).status;
         return !status || status === 'ACCEPTED';
      });
   }, [members, user?.id]);

   const handleTransfer = (newOwnerId: string, newOwnerName: string) => {
      Alert.alert(
         'Transfer Ownership',
         `Are you sure you want to transfer ownership to ${newOwnerName}? You will lose admin privileges and become a regular member.`,
         [
            { text: 'Cancel', style: 'cancel' },
            {
               text: 'Transfer',
               style: 'destructive',
               onPress: () => {
                  transferOwnership(
                     { communityId, newOwnerId },
                     {
                        onSuccess: () => {
                           Alert.alert(
                              'Success',
                              'Ownership transferred successfully',
                              [
                                 {
                                    text: 'OK',
                                    onPress: () => {
                                       (navigation as any).navigate('CommunitySettings', { communityId });
                                    },
                                 },
                              ]
                           );
                        },
                        onError: (error: any) => {
                           Alert.alert('Error', error?.message || 'Failed to transfer ownership');
                        },
                     }
                  );
               },
            },
         ]
      );
   };

   if (isLoading) {
      return (
         <View style={[styles.container, styles.center]}>
            <ActivityIndicator size="large" color="#0000ff" />
         </View>
      );
   }

   return (
      <View style={styles.container}>
         <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
            <Text style={styles.description}>
               Select a member to transfer ownership to. You will become a regular member after the transfer.
            </Text>

            {eligibleMembers.length === 0 ? (
               <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No eligible members to transfer ownership to</Text>
               </View>
            ) : (
               eligibleMembers.map(({ user: memberUser, membership }) => (
                  <TouchableOpacity
                     key={membership.id}
                     style={styles.listItem}
                     onPress={() => handleTransfer(memberUser.id, memberUser.name || memberUser.handle || 'this member')}
                     disabled={isTransferring}
                  >
                     <Image
                        source={{
                           uri: memberUser.avatarUrl || "https://upload.wikimedia.org/wikipedia/commons/a/ac/Default_pfp.jpg"
                        }}
                        style={styles.avatar}
                     />
                     <View style={styles.userInfo}>
                        <Text style={styles.userName}>{memberUser.name || memberUser.handle || 'Unknown User'}</Text>
                        {memberUser.handle && <Text style={styles.userHandle}>@{memberUser.handle}</Text>}
                        {(membership as any).role === 'ADMIN' && (
                           <Text style={styles.roleBadge}>Admin</Text>
                        )}
                     </View>
                     {isTransferring ? (
                        <ActivityIndicator size="small" color="#007AFF" />
                     ) : (
                        <Text style={styles.chevron}>›</Text>
                     )}
                  </TouchableOpacity>
               ))
            )}
         </ScrollView>
      </View>
   );
};

export default ChangeOwnershipScreen;

const styles = StyleSheet.create({
   container: {
      flex: 1,
      backgroundColor: "white",
   },
   center: {
      justifyContent: 'center',
      alignItems: 'center',
   },
   scrollView: {
      flex: 1,
   },
   scrollContent: {
      padding: 20,
   },
   description: {
      fontSize: 14,
      color: "#666",
      marginBottom: 20,
      lineHeight: 20,
   },
   emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 40,
   },
   emptyText: {
      fontSize: 16,
      color: "#666",
   },
   listItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 12,
      paddingHorizontal: 16,
      backgroundColor: "#f9f9f9",
      borderRadius: 10,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: "#eee",
   },
   avatar: {
      width: 50,
      height: 50,
      borderRadius: 25,
      marginRight: 12,
      backgroundColor: "#ddd",
   },
   userInfo: {
      flex: 1,
      justifyContent: "center",
   },
   userName: {
      fontSize: 16,
      fontWeight: "600",
      color: "#111",
      marginBottom: 2,
   },
   userHandle: {
      fontSize: 14,
      color: "#666",
      marginBottom: 4,
   },
   roleBadge: {
      fontSize: 12,
      color: "#007AFF",
      fontWeight: "500",
   },
   chevron: {
      fontSize: 24,
      color: "#C7C7CC",
      marginLeft: 8,
   },
});


