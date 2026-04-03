import React, { useEffect, useState } from 'react';
import {
  View, StyleSheet, Text, TouchableOpacity,
  Share, Dimensions, SafeAreaView, ActivityIndicator,
} from 'react-native';
import { useRoute, useNavigation, CommonActions } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import QRCode from 'react-native-qrcode-svg';
import { useGroup } from '../../../hooks/useGroupData';
import { getGroupShareLink } from '../../../services/api/groups.service';

const { width } = Dimensions.get('window');
const QR_SIZE = width * 0.6;

const ShareGroupScreen = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { groupId, fromCreateFlow } = (route.params || {}) as {
    groupId?: string;
    fromCreateFlow?: boolean;
  };

  const { group } = useGroup(groupId || null);
  const [shareLink, setShareLink] = useState<string>(`https://focal.app/group/join/${groupId}`);
  const [loadingLink, setLoadingLink] = useState(true);

  useEffect(() => {
    if (!groupId) return;
    getGroupShareLink(groupId)
      .then(setShareLink)
      .catch(() => {}) // keep fallback URL on error
      .finally(() => setLoadingLink(false));
  }, [groupId]);

  const onShare = async () => {
    try {
      await Share.share({
        message: `Join "${group?.name || 'my group'}" on Focal!\n${shareLink}`,
        url: shareLink,
        title: 'Join my Group',
      });
    } catch (e) {
      console.error('Share failed', e);
    }
  };

  const onDone = () => {
    // Reset root to tabs + GroupFlow so we land in the new group and
    // back from Group returns to the Groups list (see ShareGalleryScreen).
    let rootNav = navigation;
    let parent = navigation.getParent();
    while (parent) {
      rootNav = parent;
      parent = parent.getParent();
    }

    if (!groupId) {
      rootNav.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{
            name: 'TabNavigator',
            state: {
              index: 1,
              routes: [{ name: 'Galleries' }, { name: 'Groups' }, { name: 'Profile' }],
            },
          }],
        })
      );
      return;
    }

    rootNav.dispatch(
      CommonActions.reset({
        index: 1,
        routes: [
          {
            name: 'TabNavigator',
            state: {
              index: 1,
              routes: [{ name: 'Galleries' }, { name: 'Groups' }, { name: 'Profile' }],
            },
          },
          {
            name: 'GroupFlow',
            params: {
              screen: 'Group',
              params: { groupId },
            },
          },
        ],
      })
    );
  };

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safeArea}>

        <View style={styles.container}>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.eyebrow}>
              {fromCreateFlow ? 'Group Created' : 'Share invite'}
            </Text>
            <Text style={styles.title} numberOfLines={2}>
              {group?.name || '…'}
            </Text>
          </View>

          {/* QR Card */}
          <View style={styles.card}>
            {loadingLink ? (
              <View style={{ width: QR_SIZE + 8, height: QR_SIZE + 8, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#111" />
              </View>
            ) : (
              <View style={styles.qrWrap}>
                <QRCode
                  value={shareLink}
                  size={QR_SIZE}
                  color="#111111"
                  backgroundColor="white"
                />
              </View>
            )}
          </View>

          {/* Share */}
          <TouchableOpacity style={styles.shareBtn} onPress={onShare} activeOpacity={0.6}>
            <Ionicons name="share-outline" size={17} color="#111111" />
            <Text style={styles.shareBtnText}>Share Invite Link</Text>
          </TouchableOpacity>

        </View>

        {fromCreateFlow ? (
          <View style={styles.footer}>
            <TouchableOpacity style={styles.doneBtn} onPress={onDone} activeOpacity={0.7}>
              <Text style={styles.doneBtnText}>Go to Group</Text>
              <Ionicons name="arrow-forward" size={16} color="#FFF" style={{ marginLeft: 6 }} />
            </TouchableOpacity>
          </View>
        ) : null}

      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    alignItems: 'center',
    paddingTop: 32,
  },

  // Header
  header: {
    alignItems: 'center',
    marginBottom: 28,
    gap: 6,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '600',
    color: '#AAAAAA',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111111',
    textAlign: 'center',
    letterSpacing: -0.4,
    lineHeight: 30,
  },

  // Card
  card: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 28,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E5E5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 3,
    marginBottom: 20,
  },
  qrWrap: {
    padding: 4,
  },

  // Share button
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#EFEFEF',
    paddingVertical: 11,
    paddingHorizontal: 20,
    borderRadius: 11,
  },
  shareBtnText: {
    color: '#111111',
    fontSize: 14,
    fontWeight: '500',
  },

  // Footer
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E5E5',
    backgroundColor: '#FAFAFA',
  },
  doneBtn: {
    backgroundColor: '#111111',
    height: 48,
    borderRadius: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
});

export default ShareGroupScreen;
