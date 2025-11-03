import React, { useEffect, useState } from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
    View,
    Text,
    Image,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
} from 'react-native';
import { useGallery } from '../../../hooks/useGalleryData';
import { useUpdateMyMembership } from '../../../hooks/useMembershipData';
import Ionicons from 'react-native-vector-icons/Ionicons';

type DummyGroup = { name?: string; image?: string; is_muted?: boolean; is_event?: number } | null;

const GalleryDetailsScreen = () => {
   const navigation = useNavigation()
   const route = useRoute()
   const { galleryId } = route.params as { galleryId: string }

   const {gallery, isLoading, isError, isSyncing, error} = useGallery(galleryId)
   const { mutate: updateMembership, isPending } = useUpdateMyMembership();

   const [isMuted, setIsMuted] = useState<boolean>(false);

   useEffect(() => {
      if (gallery && typeof (gallery as any).is_muted === 'boolean') {
         setIsMuted((gallery as any).is_muted);
      }
   }, [gallery]);

   // console.log("gallery ", gallery.name)


   const handleSharePress = () => {};
   const handleMutePress = () => {
      const next = !isMuted;
      setIsMuted(next); // optimistic
      updateMembership(
         { galleryId, isMuted: next },
         {
            onError: () => {
               // revert on error
               setIsMuted((prev) => !prev);
            },
         }
      );
   };
   const handleMembersPress = () => {
      navigation.navigate("GalleryMembers", {galleryId})
   };

   const handleSettingsPress = () => {
      navigation.navigate("GallerySettings", {galleryId})
   };

   if (isLoading) {
      return (
        <View style={[styles.container, styles.center]}>
          <ActivityIndicator size="large" color="#0000ff" />
        </View>
      );
    }
  
    if (isError) {
      return (
        <View style={[styles.container, styles.center]}>
          <Text style={styles.errorText}>Failed to load groups: {error.message}</Text>
        </View>
      );
    }

   return (
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
         {gallery && (
            <>
               {/* --- Profile Section --- */}
               <View style={styles.profileContainer}>
                  <Image
                        source={{ uri: gallery.image || 'https://via.placeholder.com/120' }}
                        style={styles.groupImage}
                  />
                  <View style={styles.groupNameContainer}>
                     <Text style={styles.groupName}>{gallery.name}</Text>
                  </View>
               </View>

               {/* --- Action Buttons --- */}
               <View style={styles.actionsRow}>
                  <View style={styles.actionButtonContainer}>
                        <TouchableOpacity style={styles.actionButton} onPress={handleSharePress}>
                           <Ionicons name="share-outline" size={20} color="black"/>
                        </TouchableOpacity>
                        <Text style={styles.actionLabel}>Share</Text>
                  </View>
                  <View style={styles.actionButtonContainer}>
                        <TouchableOpacity style={styles.actionButton} onPress={handleMutePress} disabled={isPending}>
                           {isMuted ? 
                              <Ionicons name="notifications-outline" size={20} color="black"/> :
                              <Ionicons name="notifications-off-outline" size={20} color="black"/>
                           }
                        </TouchableOpacity>
                        <Text style={styles.actionLabel}>{isMuted ? 'Unmute' : 'Mute'}</Text>
                  </View>
               </View>
               
               {/* --- List Section --- */}
               <View style={styles.listContainer}>
                  <TouchableOpacity style={styles.listItem} onPress={handleMembersPress}>
                        <Text style={{ fontSize: 18, color: '#8A8A8E' }}>
                           <Ionicons name="people-outline" size={24} color="black"/>
                        </Text>
                        <Text style={styles.listText}>Members</Text>
                        <Text style={{ fontSize: 18, color: '#C7C7CC' }}>
                           <Ionicons name="chevron-forward-outline" size={16} color="gray"/>
                        </Text>
                  </TouchableOpacity>
                  <View style={styles.separator} />
                  <TouchableOpacity style={styles.listItem} onPress={handleSettingsPress}>
                        <Text style={{ fontSize: 18, color: '#8A8A8E' }}>
                           <Ionicons name="settings-outline" size={24} color="black"/>
                        </Text>
                        <Text style={styles.listText}>Settings</Text>
                        <Text style={{ fontSize: 18, color: '#C7C7CC' }}>
                           <Ionicons name="chevron-forward-outline" size={16} color="gray"/>
                        </Text>
                  </TouchableOpacity>
               </View>
            </>
         )}
      </ScrollView>
   );
};

const styles = StyleSheet.create({
   container: {
      flex: 1,
      backgroundColor: '#FFFFFF', // Light gray background for the whole screen
   },
   contentContainer: {
      paddingBottom: 40,
      paddingTop: 50
   },
   profileContainer: {
      alignItems: 'center',
      paddingTop: 20,
      paddingBottom: 24,
      backgroundColor: '#FFFFFF', // White background for the top section
   },
   groupImage: {
      width: 120,
      height: 120,
      borderRadius: 28, // Squircle shape
      backgroundColor: '#EFEFEF',
   },
   groupNameContainer: {
      marginTop: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
   },
   groupName: {
      fontSize: 28,
      fontWeight: 'bold',
      color: '#000',
   },
   editButton: {
      backgroundColor: '#007AFF', // Blue circle for the edit button
      padding: 6,
      borderRadius: 15,
      marginLeft: 10,
      justifyContent: 'center',
      alignItems: 'center',
   },
   actionsRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      paddingVertical: 10,
      backgroundColor: '#FFFFFF',
      // borderTopWidth: StyleSheet.hairlineWidth,
      // borderBottomWidth: StyleSheet.hairlineWidth,
      // borderColor: '#E5E5EA',
   },
   actionButtonContainer: {
      alignItems: 'center',
   },
   actionButton: {
      width: 40,
      height: 40,
      borderRadius: 28,
      backgroundColor: '#EFEFEF', // Light gray circle for action buttons
      justifyContent: 'center',
      alignItems: 'center',
   },
   actionLabel: {
      marginTop: 8,
      fontSize: 13,
      color: '#3C3C43',
   },
   listContainer: {
      marginTop: 60,
      marginHorizontal: 16,
      // borderRadius: 12,
      // borderWidth: StyleSheet.hairlineWidth,
      // borderColor: '#C6C6C8',
      overflow: 'hidden',
   },
   listItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 14,
      backgroundColor: '#FFFFFF',
   },
   listText: {
      flex: 1,
      fontSize: 17,
      marginLeft: 16,
      color: '#000',
   },
   separator: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: '#C6C6C8',
      marginLeft: 54, // Indent separator to align with text
   },
   addTopicButton: {
      backgroundColor: '#007AFF',
      borderRadius: 15,
      paddingHorizontal: 12,
      paddingVertical: 5,
   },
   addTopicText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: 'bold',
   },
});

export default GalleryDetailsScreen;