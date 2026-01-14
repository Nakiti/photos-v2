import React, { useMemo } from 'react';
import { 
  View, 
  StyleSheet, 
  Text, 
  TouchableOpacity, 
  Share, 
  Alert, 
  Dimensions, 
  SafeAreaView
} from 'react-native';
import { useRoute, useNavigation, CommonActions } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import QRCode from "react-native-qrcode-svg";

// Hooks
import { useCommunity } from '../../../hooks/useCommunityData';

// Components

// --- Theme ---
const COLORS = {
  background: '#FFFFFF',
  textPrimary: '#000000',
  textSecondary: '#8E8E93',
  cardBorder: '#F2F2F7',
  buttonPrimary: '#000000',
  buttonText: '#FFFFFF',
  secondaryBtnBg: '#F2F2F7',
};

const { width } = Dimensions.get('window');
const QR_SIZE = width * 0.6; 

const ShareCommunityScreen = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { communityId } = (route.params || {}) as { communityId?: string };
  
  const { community } = useCommunity(communityId || null);

  // --- Logic ---
  const inviteLink = `https://focal.app/community/${communityId}`;
  
  // Generate a mock PIN based on ID if real one doesn't exist yet
  const pin = useMemo(() => {
    if (!communityId) return '----'; 
    const base = communityId.replace(/[^0-9]/g, '');
    return base.slice(0, 5).padEnd(5, '0');
  }, [communityId]);

  const onShare = async () => {
    try {
      const message = [
        `Join "${community?.name || 'my community'}" on Focal!`,
        inviteLink,
        `PIN: ${pin}`,
      ].join('\n');
      
      await Share.share({ message });
    } catch (e: any) {
      console.error("Share failed", e);
    }
  };

  const onDone = () => {
    // Reset stack to ensure user cannot "go back" into the creation flow
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [
          { 
            name: 'MainTabs', 
            state: { routes: [{ name: 'Communities' }] }
          },
        ],
      })
    );
  };

  return (
    <View style={styles.root}>

      <SafeAreaView style={styles.safeArea}>
          <View style={styles.container}>
            
            {/* 1. Success Message */}
            <View style={styles.textContainer}>
              <Text style={styles.subHeader}>COMMUNITY CREATED!</Text>
              <Text style={styles.communityName} numberOfLines={2}>
                {community?.name || "Loading..."}
              </Text>
            </View>

            {/* 2. QR Card */}
            <View style={styles.card}>
                
                {/* QR Code */}
                <View style={styles.qrWrapper}>
                    <QRCode 
                        value={inviteLink} 
                        size={QR_SIZE} 
                        color="black" 
                        backgroundColor="white" 
                    />
                </View>

                {/* PIN Display */}
                <View style={styles.pinContainer}>
                    <Text style={styles.pinLabel}>ENTRY PIN</Text>
                    <Text style={styles.pinValue}>{pin}</Text>
                </View>

            </View>

            {/* 3. Share Action */}
            <TouchableOpacity 
                style={styles.shareBtn} 
                onPress={onShare} 
                activeOpacity={0.7}
            >
                <Ionicons name="share-outline" size={20} color="#000" />
                <Text style={styles.shareText}>Share Invite</Text>
            </TouchableOpacity>

          </View>

          {/* 4. Footer */}
          <View style={styles.footer}>
            <TouchableOpacity 
                style={styles.doneBtn} 
                onPress={onDone} 
                activeOpacity={0.9}
            >
                <Text style={styles.doneText}>Go to Community</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFF" />
            </TouchableOpacity>
          </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: 'center',
    paddingTop: 20,
  },
  
  // --- Text Header ---
  textContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  subHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    letterSpacing: 1.5,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  communityName: {
    fontSize: 28,
    fontWeight: '800', // Heavy bold
    color: COLORS.textPrimary,
    textAlign: 'center',
    lineHeight: 34,
  },

  // --- Card ---
  card: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    paddingVertical: 32,
    alignItems: 'center',
    // Modern Drop Shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 6,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    marginBottom: 32,
  },
  qrWrapper: {
      marginBottom: 24,
  },
  
  // --- PIN Section ---
  pinContainer: {
    alignItems: 'center',
    gap: 4,
  },
  pinLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  pinValue: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: 6, // Wide spacing for PIN
    fontVariant: ['tabular-nums'],
  },

  // --- Share Button ---
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.secondaryBtnBg,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 20,
  },
  shareText: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },

  // --- Footer ---
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
    paddingTop: 16,
  },
  doneBtn: {
    backgroundColor: COLORS.buttonPrimary,
    height: 56,
    borderRadius: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  doneText: {
    color: COLORS.buttonText,
    fontSize: 17,
    fontWeight: '700',
  },
});

export default ShareCommunityScreen;