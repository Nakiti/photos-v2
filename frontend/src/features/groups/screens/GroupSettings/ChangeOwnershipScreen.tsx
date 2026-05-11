import React, { useMemo, useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity,
  SafeAreaView, TextInput, FlatList, Alert, ActivityIndicator,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import FastImage from "react-native-fast-image";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useGroupMembers } from "../../../../hooks/useGroupMembershipData";
import { useTransferOwnership } from "../../../../hooks/useGroupData";
import { useAuth } from "../../../../hooks/useAuth";

const ChangeOwnershipScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { groupId } = route.params as { groupId: string };
  const { user } = useAuth();

  const { members, isLoading } = useGroupMembers(groupId);
  const { mutate: transferOwnership, isPending: isTransferring } = useTransferOwnership();

  const [searchText, setSearchText] = useState('');

  const eligibleMembers = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    return members.filter(({ user: memberUser, membership }) => {
      if (memberUser.id === user?.id) return false;
      const status = (membership as any).status;
      if (status && status !== 'ACCEPTED') return false;
      if (!query) return true;
      const fullName = (memberUser.name ?? '').toLowerCase();
      const handle = (memberUser.handle ?? '').toLowerCase();
      return fullName.includes(query) || handle.includes(query);
    });
  }, [members, user?.id, searchText]);

  const handleTransfer = (newOwnerId: string, displayName: string) => {
    Alert.alert(
      'Transfer Ownership',
      `Are you sure you want to transfer ownership to ${displayName}? You will lose admin privileges and become a regular member.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Transfer',
          style: 'destructive',
          onPress: () => {
            transferOwnership(
              { groupId, newOwnerId },
              {
                onSuccess: () => {
                  Alert.alert('Done', `Ownership transferred to ${displayName}.`, [
                    { text: 'OK', onPress: () => navigation.goBack() },
                  ]);
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
      <View style={styles.centered}>
        <ActivityIndicator size="small" color="#999" />
      </View>
    );
  }

  const renderItem = ({ item }: { item: { user: any; membership: any } }) => {
    const { user: memberUser, membership } = item;
    const displayName = memberUser.name || memberUser.handle || 'Unknown';
    const handle = memberUser.handle ? `@${memberUser.handle}` : null;

    return (
      <View style={styles.row}>
        <View style={styles.avatarWrap}>
          {memberUser.avatarUrl ? (
            <FastImage
              source={{ uri: memberUser.avatarUrl }}
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
        {membership.role === 'ADMIN' && (
          <View style={styles.adminBadge}>
            <Text style={styles.adminBadgeText}>Admin</Text>
          </View>
        )}
        <TouchableOpacity
          style={styles.transferBtn}
          onPress={() => handleTransfer(memberUser.id, displayName)}
          disabled={isTransferring}
          activeOpacity={0.7}
        >
          <Text style={styles.transferBtnText}>Transfer</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={16} color="#AAAAAA" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search members…"
            placeholderTextColor="#CCCCCC"
            value={searchText}
            onChangeText={setSearchText}
            autoCapitalize="none"
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText('')}>
              <Ionicons name="close-circle" size={16} color="#AAAAAA" />
            </TouchableOpacity>
          )}
        </View>

        <FlatList
          data={eligibleMembers}
          keyExtractor={(item) => item.user.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>
                {searchText ? 'No members match your search.' : 'No other members to transfer ownership to.'}
              </Text>
            </View>
          }
        />

        {isTransferring && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#111111" />
          </View>
        )}
      </SafeAreaView>
    </View>
  );
};

export default ChangeOwnershipScreen;

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

  // Search
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginVertical: 14,
    backgroundColor: '#EFEFEF',
    borderRadius: 11,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#111111',
  },

  // List
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  // Row
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
  adminBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#111111',
    marginRight: 10,
  },
  adminBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  transferBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 9,
    backgroundColor: '#111111',
  },
  transferBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Empty
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

  // Loading overlay
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
