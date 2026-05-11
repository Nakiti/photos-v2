import React from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  SafeAreaView, ActivityIndicator, Alert,
} from "react-native";
import { useRoute } from "@react-navigation/native";
import FastImage from "react-native-fast-image";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useGroupMembers, useApproveGroupJoinRequest, useRemoveGroupMember } from "../../../../hooks/useGroupMembershipData";

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
        onError: () => Alert.alert('Error', 'Failed to approve request'),
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
                onError: () => Alert.alert('Error', 'Failed to deny request'),
              }
            );
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="small" color="#999" />
      </View>
    );
  }

  const isBusy = isApproving || isDenying;

  const renderItem = ({ item }: { item: { user: any; membership: any } }) => {
    const { user, membership } = item;
    const displayName = user.name || user.handle || 'Unknown';
    const handle = user.handle ? `@${user.handle}` : null;

    return (
      <View style={styles.row}>
        <View style={styles.avatarWrap}>
          {user.avatarUrl ? (
            <FastImage
              source={{ uri: user.avatarUrl }}
              style={styles.avatarImg}
              resizeMode={FastImage.resizeMode.cover}
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={18} color="#AAAAAA" />
            </View>
          )}
        </View>
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>{displayName}</Text>
          {handle && <Text style={styles.handle} numberOfLines={1}>{handle}</Text>}
        </View>
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.denyBtn]}
            onPress={() => handleDeny(user.id)}
            disabled={isBusy}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={18} color="#CC3333" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.approveBtn]}
            onPress={() => handleApprove(user.id)}
            disabled={isBusy}
            activeOpacity={0.7}
          >
            {isBusy ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Ionicons name="checkmark" size={18} color="#FFF" />
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }}>
        <FlatList
          data={pendingMembers}
          keyExtractor={(item) => item.membership.id}
          extraData={isBusy}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No pending requests</Text>
            </View>
          }
        />
      </SafeAreaView>
    </View>
  );
};

export default PendingRequestsScreen;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAFAFA',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EBEBEB',
  },
  avatarWrap: {
    marginRight: 12,
  },
  avatarImg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EFEFEF',
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EFEFEF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111111',
  },
  handle: {
    fontSize: 12,
    color: '#AAAAAA',
    marginTop: 1,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  approveBtn: {
    backgroundColor: '#111111',
  },
  denyBtn: {
    backgroundColor: '#EFEFEF',
  },
  empty: {
    alignItems: 'center',
    marginTop: 60,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 14,
    color: '#AAAAAA',
    textAlign: 'center',
  },
});
