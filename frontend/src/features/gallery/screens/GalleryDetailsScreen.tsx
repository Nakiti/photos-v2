import React, { useCallback, useEffect, useState } from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useDeleteGallery, useGallery, useLocalGallery } from '../../../hooks/useGalleryData';
import { useLeaveGallery, useUpdateMyMembership } from '../../../hooks/useMembershipData';
import { useAuth } from '../../../hooks/useAuth';
import Ionicons from 'react-native-vector-icons/Ionicons';
import FastImage from 'react-native-fast-image';

const ActionButton = ({ icon, label, onPress, isActive }: any) => (
  <TouchableOpacity style={styles.actionBtn} onPress={onPress} activeOpacity={0.6}>
    <View style={[styles.actionBtnIcon, isActive && styles.actionBtnIconActive]}>
      <Ionicons name={icon} size={18} color={isActive ? '#FFFFFF' : '#111111'} />
    </View>
    <Text style={[styles.actionBtnLabel, isActive && styles.actionBtnLabelActive]}>
      {label}
    </Text>
  </TouchableOpacity>
);

const ListRow = ({ icon, label, value, onPress, isLast, isDestructive }: any) => (
  <TouchableOpacity
    style={[styles.row, isLast && styles.rowLast]}
    onPress={onPress}
    activeOpacity={0.5}
    disabled={!onPress}
  >
    {icon ? (
      <View style={styles.rowIconWrap}>
        <Ionicons name={icon} size={17} color={isDestructive ? '#CC3333' : '#555555'} />
      </View>
    ) : null}
    <Text style={[styles.rowLabel, !icon && styles.rowLabelIndent, isDestructive && styles.rowLabelDestructive]} numberOfLines={1}>
      {label}
    </Text>
    {value ? <Text style={styles.rowValue}>{value}</Text> : null}
    {onPress && !isDestructive && (
      <Ionicons name="chevron-forward" size={14} color="#CECECE" />
    )}
  </TouchableOpacity>
);

const GalleryDetailsScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { galleryId } = route.params as { galleryId: string };

  const queryClient = useQueryClient();
  const { gallery } = useGallery(galleryId);
  const isLoading = !gallery;
  const { mutate: updateMembership } = useUpdateMyMembership();
  const { user } = useAuth();
  const deleteGalleryMutation = useDeleteGallery();
  const leaveGalleryMutation = useLeaveGallery();

  const onRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['gallery', galleryId, 'meta'] });
  }, [queryClient, galleryId]);

  const [isMuted, setIsMuted] = useState(false);

  const isOwner = gallery?.ownerId === user?.id;

  useEffect(() => {
    if (gallery && typeof (gallery as any).is_muted === 'boolean') {
      setIsMuted((gallery as any).is_muted);
    }
  }, [gallery]);

  const handleMutePress = () => {
    const next = !isMuted;
    setIsMuted(next);
    updateMembership({ galleryId, isMuted: next }, { onError: () => setIsMuted(!next) });
  };

  const confirmAndDeleteGallery = () => {
    if (!gallery?.id) return;
    Alert.alert(
      'Delete Gallery',
      'This will permanently delete this gallery and all photos.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteGalleryMutation.mutate(gallery.id, {
              onSuccess: () => (navigation as any).navigate('TabNavigator', { screen: 'Groups' }),
            });
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="small" color="#999" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={false} onRefresh={onRefresh} tintColor="#999" colors={['#999']} />
          }
        >
          {gallery && (
            <>
              {/* Avatar + Identity */}
              <View style={styles.profileSection}>
                <View style={styles.avatarWrap}>
                  <FastImage
                    source={{ uri: gallery.iconUrl }}
                    style={styles.avatar}
                    resizeMode={FastImage.resizeMode.cover}
                  />
                </View>
                <Text style={styles.name}>{gallery.name}</Text>
                <Text style={styles.meta}>Gallery</Text>
              </View>

              {/* Actions */}
              <View style={styles.actionRow}>
                <ActionButton
                  icon="share-outline"
                  label="Share"
                  onPress={() => (navigation as any).navigate('ShareGallery', { galleryId })}
                />
                <ActionButton
                  icon={isMuted ? 'notifications-off-outline' : 'notifications-outline'}
                  label={isMuted ? 'Muted' : 'Mute'}
                  onPress={handleMutePress}
                  isActive={isMuted}
                />
              </View>

              {/* General */}
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>General</Text>
                <View style={styles.card}>
                  <ListRow
                    icon="create-outline"
                    label="Name"
                    value={gallery.name}
                    onPress={() => (navigation as any).navigate('EditGalleryDetails', { galleryId })}
                  />
                  <ListRow
                    icon="people-outline"
                    label="Members"
                    onPress={() => (navigation as any).navigate('GalleryMembers', { galleryId })}
                  />
                  <ListRow
                    icon="pricetags-outline"
                    label="Tags"
                    onPress={() => (navigation as any).navigate('GalleryTags', { galleryId })}
                    isLast
                  />
                </View>
              </View>

              {/* Admin / Actions */}
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>{isOwner ? 'Admin' : 'Actions'}</Text>
                <View style={styles.card}>
                  {isOwner ? (
                    <>
                      <ListRow
                        icon="swap-horizontal-outline"
                        label="Transfer Ownership"
                        onPress={() => (navigation as any).navigate('ChangeOwner', { galleryId })}
                      />
                      <ListRow
                        icon="trash-outline"
                        label="Delete Gallery"
                        onPress={confirmAndDeleteGallery}
                        isDestructive
                        isLast
                      />
                    </>
                  ) : (
                    <ListRow
                      icon="exit-outline"
                      label="Leave Gallery"
                      onPress={() => {
                        Alert.alert(
                          'Leave Gallery',
                          'Are you sure you want to leave this gallery?',
                          [
                            { text: 'Cancel', style: 'cancel' },
                            {
                              text: 'Leave',
                              style: 'destructive',
                              onPress: () => {
                                leaveGalleryMutation.mutate(galleryId, {
                                  onSuccess: () => (navigation as any).goBack(),
                                });
                              },
                            },
                          ]
                        );
                      }}
                      isDestructive
                      isLast
                    />
                  )}
                </View>
              </View>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  loading: {
    flex: 1,
    backgroundColor: '#FAFAFA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingBottom: 60,
  },

  // Profile
  profileSection: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 28,
    paddingHorizontal: 24,
  },
  avatarWrap: {
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 28,
    backgroundColor: '#EFEFEF',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  name: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111111',
    letterSpacing: -0.4,
    marginBottom: 4,
    textAlign: 'center',
  },
  meta: {
    fontSize: 12,
    fontWeight: '500',
    color: '#AAAAAA',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },

  // Actions
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 40,
    marginBottom: 32,
  },
  actionBtn: {
    alignItems: 'center',
    gap: 7,
  },
  actionBtnIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#EFEFEF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnIconActive: {
    backgroundColor: '#111111',
  },
  actionBtnLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#AAAAAA',
  },
  actionBtnLabelActive: {
    color: '#111111',
    fontWeight: '600',
  },

  // Section
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#AAAAAA',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E5E5',
    overflow: 'hidden',
  },

  // Rows
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EBEBEB',
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  rowIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#F4F4F4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rowLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#111111',
    letterSpacing: -0.1,
  },
  rowLabelIndent: {
    paddingLeft: 4,
  },
  rowLabelDestructive: {
    color: '#CC3333',
  },
  rowValue: {
    fontSize: 13,
    color: '#AAAAAA',
    marginRight: 4,
  },
});

export default GalleryDetailsScreen;
