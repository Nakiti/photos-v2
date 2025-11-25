import React, { useMemo } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Share, Alert } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useGallery } from '../../../hooks/useGalleryData';

const ShareEventScreen = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { galleryId } = (route.params || {}) as { galleryId?: string };
  const { gallery } = useGallery(galleryId || null);

  const inviteLink = useMemo(() => {
    return (gallery as any)?.shareableLink || '';
  }, [gallery]);

  const pin = useMemo(() => {
    if (!galleryId) return '';
    // Simple deterministic placeholder PIN from galleryId
    const base = galleryId.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    return base.slice(0, 6).padEnd(6, '0');
  }, [galleryId]);

  const onShare = async () => {
    try {
      const message = [
        'Join my event:',
        inviteLink ? `Link: ${inviteLink}` : undefined,
        pin ? `PIN: ${pin}` : undefined,
      ].filter(Boolean).join('\n');
      await Share.share({ message });
    } catch (e: any) {
      Alert.alert('Share failed', e?.message ?? 'Please try again.');
    }
  };

  const onContinue = () => {
    if (!galleryId) return;
    // Navigate to the gallery home
    navigation.navigate('Gallery', { galleryId });
  };

  return (
    <View style={styles.container}>
      <View style={styles.body}>
        <View style={styles.qrBox}>
          <Text style={styles.qrText}>QR</Text>
        </View>
        <View style={styles.pinRow}>
          <Text style={styles.pinLabel}>PIN</Text>
          <Text style={styles.pinValue}>{pin}</Text>
        </View>
        {inviteLink ? <Text style={styles.link} numberOfLines={1}>{inviteLink}</Text> : null}
        <Text style={styles.later}>You can do this later too</Text>
        <TouchableOpacity style={styles.shareBtn} onPress={onShare} activeOpacity={0.9}>
          <Text style={styles.shareText}>Share Invite</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity style={styles.continueBtn} onPress={onContinue} activeOpacity={0.9}>
        <Text style={styles.continueText}>Continue</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  body: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111',
    marginBottom: 20,
  },
  qrBox: {
    width: 200,
    height: 200,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  qrText: {
    fontSize: 24,
    color: '#8E8E93',
    fontWeight: '700',
  },
  pinRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  pinLabel: {
    fontSize: 14,
    color: '#666',
  },
  pinValue: {
    fontSize: 20,
    color: '#111',
    fontWeight: '700',
    letterSpacing: 2,
  },
  link: {
    fontSize: 12,
    color: '#007AFF',
    marginBottom: 16,
  },
  later: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 20,
  },
  shareBtn: {
    backgroundColor: '#111',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 10,
  },
  shareText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  continueBtn: {
    backgroundColor: '#000',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  continueText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ShareEventScreen;
