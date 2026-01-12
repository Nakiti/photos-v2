import React, { useEffect, useState } from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    SafeAreaView,
} from 'react-native';
import { useGallery } from '../../../hooks/useGalleryData';
import { useUpdateMyMembership } from '../../../hooks/useMembershipData';
import { useAuth } from '../../../hooks/useAuth';
import Ionicons from 'react-native-vector-icons/Ionicons';
import FastImage from 'react-native-fast-image';

// --- Sleek Components ---

const ActionButton = ({ icon, label, onPress, isActive }: any) => (
    <TouchableOpacity 
        style={styles.actionBtnWrapper} 
        onPress={onPress}
        activeOpacity={0.7}
    >
        {/* Matches the bottom bar logic: 
            Active = Solid Black (Inverse of the dark mode glass)
            Inactive = White with Thin Border
        */}
        <View style={[styles.actionBtnCircle, isActive && styles.actionBtnActive]}>
            <Ionicons 
                name={icon} 
                size={22} 
                color={isActive ? "#FFFFFF" : "#000000"} 
            />
        </View>
        <Text style={styles.actionLabel}>{label}</Text>
    </TouchableOpacity>
);

const SleekListItem = ({ icon, label, value, onPress, isLast }: any) => (
    <TouchableOpacity 
        style={styles.listItem} 
        onPress={onPress}
        activeOpacity={0.6}
    >
        <View style={styles.listIconContainer}>
            <Ionicons name={icon} size={22} color="#000000" />
        </View>
        
        <View style={[styles.listContent, isLast && styles.listContentNoBorder]}>
            <Text style={styles.listLabel}>{label}</Text>
            {/* Optional Value Text (e.g., count of members) */}
            {value && <Text style={styles.listValue}>{value}</Text>}
            <Ionicons name="chevron-forward" size={16} color="#C7C7CC" />
        </View>
    </TouchableOpacity>
);

const GalleryDetailsScreen = () => {
   const navigation = useNavigation();
   const route = useRoute();
   const { galleryId } = route.params as { galleryId: string };

   const { gallery, isLoading } = useGallery(galleryId);
   const { mutate: updateMembership } = useUpdateMyMembership();
   const { user } = useAuth();

   const [isMuted, setIsMuted] = useState<boolean>(false);

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

   if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#000" />
        </View>
      );
    }

   return (
      <View style={styles.container}>
          <SafeAreaView style={styles.safeArea}>


            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {gallery && (
                    <>
                    {/* --- Profile Header --- */}
                    <View style={styles.header}>
                        <View style={styles.imageWrapper}>
                            <FastImage 
                                source={{uri: gallery.iconUrl}} 
                                style={styles.avatar} 
                                resizeMode={FastImage.resizeMode.cover}
                            />
                        </View>
                        <Text style={styles.title}>{gallery.name}</Text>
                        <Text style={styles.subtitle}>GALLERY DETAILS</Text> 
                    </View>
        
                    {/* --- Action Row --- */}
                    <View style={styles.actionRow}>
                            <ActionButton 
                                icon="share-outline" 
                                label="Share" 
                                onPress={() => (navigation as any).navigate("ShareGallery", {galleryId})} 
                            />
                            <ActionButton 
                                icon={isMuted ? "notifications-off" : "notifications-outline"} 
                                label={isMuted ? "Muted" : "Mute"} 
                                onPress={handleMutePress}
                                isActive={isMuted}
                            />
                    </View>

                    {/* --- Settings List --- */}
                    <View style={styles.listSection}>
                        {/* Section Label */}
                        <Text style={styles.sectionHeader}>PREFERENCES</Text>
                        
                        <View style={styles.listContainer}>
                            <SleekListItem 
                                icon="people-outline" 
                                label="Members" 
                                onPress={() => navigation.navigate("GalleryMembers", {galleryId})}
                            />
                            <SleekListItem 
                                icon="pricetags-outline" 
                                label="Tags" 
                                onPress={() => navigation.navigate("GalleryTags", {galleryId})}
                            />
                            {((gallery as any)?.ownerId === user?.id || (gallery as any)?.myMembership?.role === 'ADMIN') && (
                                <SleekListItem 
                                    icon="time-outline" 
                                    label="Pending Images" 
                                    onPress={() => navigation.navigate("PendingImages", {galleryId})}
                                />
                            )}
                            <SleekListItem 
                                icon="settings-outline" 
                                label="Settings" 
                                onPress={() => navigation.navigate("GallerySettings", {galleryId})}
                                isLast={true}
                            />
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
   container: {
      flex: 1,
      backgroundColor: '#FFFFFF',
   },
   safeArea: {
       flex: 1,
   },
   loadingContainer: {
      flex: 1,
      backgroundColor: '#FFFFFF',
      justifyContent: 'center',
      alignItems: 'center'
   },
   navBar: {
       paddingHorizontal: 24,
       paddingVertical: 12,
   },
   scrollContent: {
      paddingBottom: 60,
   },

   // --- Header ---
   header: {
      alignItems: 'center',
      marginTop: 10,
      marginBottom: 32,
      paddingHorizontal: 24,
   },
   imageWrapper: {
      marginBottom: 20,
      // Minimalist Shadow
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
      elevation: 4,
   },
   avatar: {
      width: 110,
      height: 110,
      borderRadius: 40, // Matches the "Squircle" look
      backgroundColor: '#F5F5F5',
      borderWidth: 1,
      borderColor: '#F0F0F0',
   },
   title: {
      fontSize: 24,
      fontWeight: '700', 
      color: '#000000',
      marginBottom: 6,
      textAlign: 'center',
      letterSpacing: -0.6, // Tighter tracking for modern feel
   },
   subtitle: {
       fontSize: 12,
       color: '#8E8E93',
       fontWeight: '600',
       letterSpacing: 1, // Wide spacing for uppercase subtitles
   },

   // --- Actions ---
   actionRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 40, 
      marginBottom: 48,
   },
   actionBtnWrapper: {
       alignItems: 'center',
       gap: 10,
   },
   actionBtnCircle: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: '#E5E5EA', // Subtle border
      justifyContent: 'center',
      alignItems: 'center',
      
      // Very faint shadow to lift it off the white bg
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
   },
   actionBtnActive: {
       backgroundColor: '#1C1C1E', // Matching the dark aesthetic of the bottom bar
       borderColor: '#1C1C1E',
   },
   actionLabel: {
      fontSize: 12,
      fontWeight: '500',
      color: '#1C1C1E',
   },

   // --- List Section ---
   listSection: {
       paddingHorizontal: 24,
   },
   sectionHeader: {
       fontSize: 11,
       fontWeight: '600',
       color: '#8E8E93',
       marginBottom: 12,
       marginLeft: 16, // Align with text start
       textTransform: 'uppercase',
       letterSpacing: 0.5,
   },
   listContainer: {
       // Optional: Enclose in a subtle border if you want the "Grouped" look, 
       // OR keep it open for "Minimalist" look. We'll go open but wide.
   },
   listItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 4, // Inner padding is handled by listContent
   },
   listIconContainer: {
       width: 40,
       alignItems: 'center',
       justifyContent: 'center',
       marginRight: 12,
   },
   listContent: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 18,
      borderBottomWidth: 1,
      borderBottomColor: '#F2F2F7', // Very light separator
   },
   listContentNoBorder: {
       borderBottomWidth: 0,
   },
   listLabel: {
      fontSize: 17,
      fontWeight: '400',
      color: '#000000',
      letterSpacing: -0.3,
   },
   listValue: {
       fontSize: 16,
       color: '#8E8E93',
       marginRight: 8,
   },
});

export default GalleryDetailsScreen;