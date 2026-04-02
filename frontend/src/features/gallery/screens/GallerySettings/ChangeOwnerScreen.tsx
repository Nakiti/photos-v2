import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  FlatList,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import FastImage from 'react-native-fast-image';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useMemberships, EnrichedMembership } from '../../../../hooks/useMembershipData';
import { useTransferGalleryOwnership } from '../../../../hooks/useGalleryData';
import { useAuth } from '../../../../hooks/useAuth';

const ChangeOwnerScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { galleryId } = route.params as { galleryId: string };
  const { user: currentUser } = useAuth();

  const { acceptedMembers, isLoading } = useMemberships(galleryId);
  const { mutate: transferOwnership, isPending: isTransferring } = useTransferGalleryOwnership();

  const [searchText, setSearchText] = useState('');

  // Exclude the current owner from the list
  const eligibleMembers = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    return acceptedMembers.filter(({ user }) => {
      if (user.id === currentUser?.id) return false;
      if (!query) return true;
      const fullName = (user.name ?? '').toLowerCase();
      const handle = (user.handle ?? '').toLowerCase();
      return fullName.includes(query) || handle.includes(query);
    });
  }, [acceptedMembers, searchText, currentUser?.id]);

  const handleTransfer = (item: EnrichedMembership) => {
    const { user } = item;
    const name = user.name || user.handle || 'this member';
    Alert.alert(
      'Transfer Ownership',
      `Transfer gallery ownership to ${name}? You will no longer be the owner.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Transfer',
          style: 'destructive',
          onPress: () => {
            transferOwnership(
              { galleryId, newOwnerId: user.id },
              {
                onSuccess: () => {
                  Alert.alert('Done', `Ownership transferred to ${name}.`);
                  navigation.goBack();
                },
                onError: (err) => {
                  Alert.alert('Error', (err as Error)?.message || 'Failed to transfer ownership.');
                },
              }
            );
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: EnrichedMembership }) => {
    const { user, membership } = item;
    const displayName = user.name || user.handle || 'Unknown';
    const handle = user.handle ? `@${user.handle}` : null;

    return (
      <View style={styles.row}>
        <View style={styles.avatar}>
          {user.avatarUrl ? (
            <FastImage source={{ uri: user.avatarUrl }} style={styles.avatarImg} resizeMode={FastImage.resizeMode.cover} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={18} color="#AAAAAA" />
            </View>
          )}
        </View>
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>{displayName}</Text>
          {handle ? <Text style={styles.handle} numberOfLines={1}>{handle}</Text> : null}
        </View>
        {membership.role === 'ADMIN' ? (
          <View style={styles.adminBadge}>
            <Text style={styles.adminBadgeText}>Admin</Text>
          </View>
        ) : null}
        <TouchableOpacity
          style={styles.transferBtn}
          onPress={() => handleTransfer(item)}
          disabled={isTransferring}
          activeOpacity={0.7}
        >
          <Text style={styles.transferBtnText}>Transfer</Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="small" color="#999" />
      </View>
    );
  }

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

export default ChangeOwnerScreen;

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
  avatar: {
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

  // Transfer button
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
