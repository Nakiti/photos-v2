import React from "react";
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { useRoute } from "@react-navigation/native";
import { useGroupMembers, useApproveGroupJoinRequest, useRemoveGroupMember } from "../../../../hooks/useGroupMembershipData";
import Ionicons from "react-native-vector-icons/Ionicons";

const PendingRequestsScreen = () => {
   const route = useRoute();
   const { groupId } = route.params as { groupId: string };

   const { pendingMembers, isLoading } = useGroupMembers(groupId);
   const { mutate: approveMember, isPending: isApproving } = useApproveGroupJoinRequest();
   const { mutate: denyMember, isPending: isDenying } = useRemoveGroupMember();

   const handleApprove = (userId: string) => {
      approveMember(
         { groupId, userId },
         {
            onSuccess: () => {
               Alert.alert('Success', 'Request approved');
            },
            onError: () => {
               Alert.alert('Error', 'Failed to approve request');
            },
         }
      );
   };

   const handleDeny = (userId: string) => {
      Alert.alert(
         'Deny Request',
         'Are you sure you want to deny this request?',
         [
            { text: 'Cancel', style: 'cancel' },
            {
               text: 'Deny',
               style: 'destructive',
               onPress: () => {
                  denyMember(
                     { groupId, userId },
                     {
                        onSuccess: () => {
                           Alert.alert('Success', 'Request denied');
                        },
                        onError: () => {
                           Alert.alert('Error', 'Failed to deny request');
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
            {pendingMembers.length === 0 ? (
               <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No pending requests</Text>
               </View>
            ) : (
               pendingMembers.map(({ user, membership }) => (
                  <View key={membership.id} style={styles.listItem}>
                     <Image
                        source={{
                           uri: user.avatarUrl || "https://upload.wikimedia.org/wikipedia/commons/a/ac/Default_pfp.jpg"
                        }}
                        style={styles.avatar}
                     />
                     <View style={styles.userInfo}>
                        <Text style={styles.userName}>{user.name || user.handle || 'Unknown User'}</Text>
                        {user.handle && <Text style={styles.userHandle}>@{user.handle}</Text>}
                     </View>
                     <View style={styles.actions}>
                        <TouchableOpacity
                           style={[styles.actionButton, styles.approveButton]}
                           onPress={() => handleApprove(user.id)}
                           disabled={isApproving || isDenying}
                        >
                           {(isApproving || isDenying) ? (
                              <ActivityIndicator size="small" color="#fff" />
                           ) : (
                              <Ionicons name="checkmark" size={20} color="#fff" />
                           )}
                        </TouchableOpacity>
                        <TouchableOpacity
                           style={[styles.actionButton, styles.denyButton]}
                           onPress={() => handleDeny(user.id)}
                           disabled={isApproving || isDenying}
                        >
                           {(isApproving || isDenying) ? (
                              <ActivityIndicator size="small" color="#fff" />
                           ) : (
                              <Ionicons name="close" size={20} color="#fff" />
                           )}
                        </TouchableOpacity>
                     </View>
                  </View>
               ))
            )}
         </ScrollView>
      </View>
   );
};

export default PendingRequestsScreen;

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
   },
   actions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
   },
   actionButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: "center",
      alignItems: "center",
   },
   approveButton: {
      backgroundColor: "#4CAF50",
   },
   denyButton: {
      backgroundColor: "#FF3B30",
   },
});

