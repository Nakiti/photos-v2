import React, { useMemo } from 'react';
import { 
  View, 
  StyleSheet, 
  Text, 
  TouchableOpacity, 
  Share, 
  Alert, 
  Dimensions 
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useGallery } from '../../../hooks/useGalleryData';

// Reusing your design system colors
const COLORS = {
  background: '#FFFFFF',
  cardBg: '#F2F2F7', // System Gray 6
  textPrimary: '#000000',
  textSecondary: '#8E8E93',
  tint: '#007AFF',
  buttonPrimary: '#000000',
  buttonPrimaryText: '#FFFFFF',
  buttonSecondary: '#E5E5EA',
  buttonSecondaryText: '#000000',
};

const { width } = Dimensions.get('window');
const QR_SIZE = width * 0.6; // Responsive QR size

const ShareCommunityScreen = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { galleryId } = (route.params || {}) as { galleryId?: string };
  const { gallery } = useGallery(galleryId || null);

  const inviteLink = useMemo(() => {
    return (gallery as any)?.shareableLink || 'https://focal.app/join/xyz';
  }, [gallery]);

  const pin = useMemo(() => {
    if (!galleryId) return '76867'; // Fallback for preview
    const base = galleryId.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    return base.slice(0, 5).padEnd(5, '0');
  }, [galleryId]);

  const onShare = async () => {
    try {
      const message = [
        'Join my community on Focal:',
        inviteLink ? `Link: ${inviteLink}` : undefined,
        pin ? `PIN: ${pin}` : undefined,
      ].filter(Boolean).join('\n');
      await Share.share({ message });
    } catch (e: any) {
      Alert.alert('Share failed', e?.message ?? 'Please try again.');
    }
  };

  const onContinue = () => {
    navigation.navigate('Community');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <View style={styles.container}>
        
        {/* --- Header --- */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Invite Members</Text>
          <Text style={styles.headerSubtitle}>
            Share this QR code or PIN to let friends join instantly.
          </Text>
        </View>

        {/* --- The "Pass" Card --- */}
        <View style={styles.card}>
          {/* QR Placeholder */}
          <View style={styles.qrContainer}>
            {/* Replace this View with <QRCode value={inviteLink} /> when ready */}
            <Ionicons name="qr-code-outline" size={QR_SIZE * 0.6} color={COLORS.textPrimary} />
          </View>

          {/* PIN Section */}
          <View style={styles.pinSection}>
            <Text style={styles.pinLabel}>ENTRY PIN</Text>
            <Text style={styles.pinValue}>{pin}</Text>
          </View>

          {/* Link Section */}
          {inviteLink ? (
             <TouchableOpacity style={styles.linkPill} onPress={onShare} activeOpacity={0.7}>
               <Ionicons name="link" size={14} color={COLORS.textSecondary} style={{marginRight: 6}}/>
               <Text style={styles.linkText} numberOfLines={1} ellipsizeMode="middle">
                 {inviteLink.replace('https://', '')}
               </Text>
             </TouchableOpacity>
          ) : null}
        </View>

        {/* --- Action Buttons --- */}
        <View style={styles.footer}>
          
          {/* Share Button (Secondary) */}
          <TouchableOpacity 
            style={styles.shareBtn} 
            onPress={onShare} 
            activeOpacity={0.8}
          >
            <Ionicons name="share-outline" size={22} color={COLORS.buttonSecondaryText} />
            <Text style={styles.shareText}>Share Invite</Text>
          </TouchableOpacity>

          {/* Continue Button (Primary) */}
          <TouchableOpacity 
            style={styles.continueBtn} 
            onPress={onContinue} 
            activeOpacity={0.8}
          >
            <Text style={styles.continueText}>Done</Text>
          </TouchableOpacity>
        </View>

      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  
  // Header
  header: {
    marginTop: 20,
    marginBottom: 30,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    maxWidth: '80%',
    lineHeight: 20,
  },

  // The Card (Pass)
  card: {
    width: '100%',
    backgroundColor: COLORS.cardBg,
    borderRadius: 24,
    paddingVertical: 32,
    alignItems: 'center',
    // Subtle shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
  qrContainer: {
    width: QR_SIZE,
    height: QR_SIZE,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    // Shadow for the QR specifically (makes it pop off the card)
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  
  // PIN Styling
  pinSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  pinLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
    letterSpacing: 1,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  pinValue: {
    fontSize: 34,
    fontWeight: '800', // Heavy weight for numbers looks great on iOS
    color: COLORS.textPrimary,
    letterSpacing: 4, // Wide tracking for PINs
    fontVariant: ['tabular-nums'], // Monospace numbers if font supports it
  },

  // Link Pill
  linkPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E5E5EA80', // Transparent gray
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
    maxWidth: '80%',
  },
  linkText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },

  // Footer Actions
  footer: {
    width: '100%',
    marginTop: 'auto',
    marginBottom: 10,
    gap: 12,
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.buttonSecondary,
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
  },
  shareText: {
    color: COLORS.buttonSecondaryText,
    fontSize: 17,
    fontWeight: '600',
  },
  continueBtn: {
    backgroundColor: COLORS.buttonPrimary,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueText: {
    color: COLORS.buttonPrimaryText,
    fontSize: 17,
    fontWeight: '700',
  },
});

export default ShareCommunityScreen;