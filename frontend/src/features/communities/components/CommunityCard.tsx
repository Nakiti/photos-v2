import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import FastImage from 'react-native-fast-image';
import Ionicons from 'react-native-vector-icons/Ionicons';

// --- Types ---
type Props = {
  name: string;
  description?: string; // Optional: displayed in body if needed
  iconUrl?: string;     // Used as Banner Image
  membersCount?: number;
  galleryCount?: number;
  onPress?: () => void;
};

// --- Dummy Data (Hardcoded as requested) ---
const DUMMY_STATS = {
  lastActive: '2h ago',
  createdAt: 'Nov 2023',
  members: 0, // Fallback if prop not provided
  galleries: 0, // Fallback if prop not provided
};

const CommunityCard: React.FC<Props> = ({ name, iconUrl, membersCount, galleryCount, onPress }) => {
  
  // Use prop or dummy
  const displayMembers = membersCount ?? DUMMY_STATS.members;
  const displayGalleries = galleryCount ?? DUMMY_STATS.galleries;
  // Use prop URL or a nice placeholder scenery for the banner
  const bannerSource = iconUrl ? { uri: iconUrl } : { uri: 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?q=80&w=2070&auto=format&fit=crop' };

  return (
    <TouchableOpacity 
      style={styles.cardContainer} 
      onPress={onPress} 
      activeOpacity={0.9}
    >
      {/* --- Top Banner Section --- */}
      <View style={styles.bannerContainer}>
        <FastImage 
            source={bannerSource} 
            style={styles.bannerImage} 
            resizeMode={FastImage.resizeMode.cover}
        />
        
        {/* Dark Gradient Overlay for Text Readability */}
        <View style={styles.bannerOverlay}>
            <View style={styles.titleWrapper}>
                <Text style={styles.bannerTitle} numberOfLines={2}>{name}</Text>
                <View style={styles.badgeContainer}>
                    <Text style={styles.badgeText}>COMMUNITY</Text>
                </View>
            </View>
        </View>
      </View>

      {/* --- Bottom Info Section --- */}
      <View style={styles.infoSection}>
        
        {/* Row 1: Key Stats (Members & Galleries) */}
        <View style={styles.statsRow}>
            
            {/* Stat Item: Members */}
            <View style={styles.statItem}>
                <View style={styles.iconCircle}>
                    <Ionicons name="people" size={16} color="#000" />
                </View>
                <View>
                    <Text style={styles.statValue}>{displayMembers}</Text>
                    <Text style={styles.statLabel}>Members</Text>
                </View>
            </View>

            {/* Vertical Divider */}
            <View style={styles.divider} />

            {/* Stat Item: Galleries */}
            <View style={styles.statItem}>
                <View style={styles.iconCircle}>
                    <Ionicons name="images" size={16} color="#000" />
                </View>
                <View>
                    <Text style={styles.statValue}>{displayGalleries}</Text>
                    <Text style={styles.statLabel}>Galleries</Text>
                </View>
            </View>
        </View>

        {/* Row 2: Meta Data (Timestamps) */}
        <View style={styles.metaRow}>
            <View style={styles.metaItem}>
                <Ionicons name="time-outline" size={12} color="#8E8E93" />
                <Text style={styles.metaText}>Active {DUMMY_STATS.lastActive}</Text>
            </View>
            <Text style={styles.metaDot}>•</Text>
            <View style={styles.metaItem}>
                <Ionicons name="calendar-outline" size={12} color="#8E8E93" />
                <Text style={styles.metaText}>Created {DUMMY_STATS.createdAt}</Text>
            </View>
        </View>

      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 10,
    
    // Modern "Lifted" Card Shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4, // Android
    overflow: 'hidden', // Ensures image respects border radius
    borderWidth: 1,
    borderColor: '#F2F2F7',
  },

  // --- Banner Styles ---
  bannerContainer: {
    height: 160,
    width: '100%',
    position: 'relative',
    backgroundColor: '#E1E1E6',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  bannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)', // Darken image slightly
    justifyContent: 'flex-end', // Push text to bottom
    padding: 16,
  },
  titleWrapper: {
      gap: 8,
  },
  bannerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  badgeContainer: {
      backgroundColor: 'rgba(255,255,255,0.2)',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
      alignSelf: 'flex-start',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.3)',
      // backdropFilter: 'blur(10px)' // Note: React Native needs extra lib for blur, using opacity for now
  },
  badgeText: {
      color: '#FFF',
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 0.8,
  },

  // --- Info Styles ---
  infoSection: {
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  
  // Stats
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statItem: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      gap: 12,
  },
  iconCircle: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: '#F2F2F7', // Subtle grey circle
      alignItems: 'center',
      justifyContent: 'center',
  },
  statValue: {
      fontSize: 15,
      fontWeight: '700',
      color: '#000',
  },
  statLabel: {
      fontSize: 12,
      color: '#8E8E93',
      fontWeight: '500',
  },
  divider: {
      width: 1,
      height: 24,
      backgroundColor: '#E5E5EA',
      marginHorizontal: 16,
  },

  // Meta (Footer)
  metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      borderTopWidth: 1,
      borderTopColor: '#F2F2F7',
      paddingTop: 12,
  },
  metaItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
  },
  metaText: {
      fontSize: 12,
      color: '#8E8E93',
      fontWeight: '500',
  },
  metaDot: {
      marginHorizontal: 8,
      color: '#C7C7CC',
      fontSize: 10,
  },
});

export default CommunityCard;