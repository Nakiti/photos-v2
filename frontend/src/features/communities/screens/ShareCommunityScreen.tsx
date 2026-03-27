import React, { useMemo } from 'react';
import {
  View, StyleSheet, Text, TouchableOpacity,
  Share, Dimensions, SafeAreaView,
} from 'react-native';
import { useRoute, useNavigation, CommonActions } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import QRCode from "react-native-qrcode-svg";
import { useCommunity } from '../../../hooks/useCommunityData';

const { width } = Dimensions.get('window');
const QR_SIZE = width * 0.55;

const ShareCommunityScreen = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { communityId } = (route.params || {}) as { communityId?: string };

  const { community } = useCommunity(communityId || null);

  const inviteLink = `https://focal.app/community/${communityId}`;

  const pin = useMemo(() => {
    if (!communityId) return '-----';
    const base = communityId.replace(/[^0-9]/g, '');
    return base.slice(0, 5).padEnd(5, '0');
  }, [communityId]);

  const onShare = async () => {
    try {
      await Share.share({
        message: [
          `Join "${community?.name || 'my community'}" on Focal!`,
          inviteLink,
          `PIN: ${pin}`,
        ].join('\n'),
      });
    } catch (e) {
      console.error('Share failed', e);
    }
  };

  const onDone = () => {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'MainTabs', state: { routes: [{ name: 'Communities' }] } }],
      })
    );
  };

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safeArea}>

        <View style={styles.container}>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.eyebrow}>Community created</Text>
            <Text style={styles.title} numberOfLines={2}>
              {community?.name || '…'}
            </Text>
          </View>

          {/* QR Card */}
          <View style={styles.card}>
            <View style={styles.qrWrap}>
              <QRCode
                value={inviteLink}
                size={QR_SIZE}
                color="#111111"
                backgroundColor="white"
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.pinSection}>
              <Text style={styles.pinLabel}>Entry PIN</Text>
              <Text style={styles.pinValue}>{pin}</Text>
            </View>
          </View>

          {/* Share */}
          <TouchableOpacity style={styles.shareBtn} onPress={onShare} activeOpacity={0.6}>
            <Ionicons name="share-outline" size={17} color="#111111" />
            <Text style={styles.shareBtnText}>Share invite</Text>
          </TouchableOpacity>

        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.doneBtn} onPress={onDone} activeOpacity={0.7}>
            <Text style={styles.doneBtnText}>Go to Community</Text>
            <Ionicons name="arrow-forward" size={16} color="#FFF" style={{ marginLeft: 6 }} />
          </TouchableOpacity>
        </View>

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
    paddingTop: 24,
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
    marginBottom: 24,
    padding: 4,
  },
  divider: {
    width: '80%',
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#EBEBEB',
    marginBottom: 20,
  },
  pinSection: {
    alignItems: 'center',
    gap: 4,
  },
  pinLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#AAAAAA',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  pinValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111111',
    letterSpacing: 8,
    fontVariant: ['tabular-nums'],
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

export default ShareCommunityScreen;