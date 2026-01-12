import React from "react";
import { 
    View, 
    Text, 
    StyleSheet, 
    TouchableOpacity, 
    Share, 
    SafeAreaView, 
    Dimensions,
    Platform 
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import { useNavigation, useRoute, CommonActions } from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons";

// Hooks
import { useGallery } from "../../../hooks/useGalleryData";

// Components

const { width } = Dimensions.get('window');
const QR_SIZE = width * 0.65;

const ShareGalleryScreen = () => {
    const navigation = useNavigation<any>();
    const route = useRoute();
    const { galleryId } = route.params as { galleryId: string };

    const { gallery } = useGallery(galleryId);

    // Construct your deep link or web URL here
    // Example: https://focal.app/join/123xyz
    const inviteUrl = `https://focal.app/join/${galleryId}`; 

    const handleShare = async () => {
        try {
            await Share.share({
                message: `Join my gallery "${gallery?.name || 'Focal Event'}"!`,
                url: inviteUrl, // iOS uses this field for the link
                title: 'Join my Gallery' // Android title
            });
        } catch (error) {
            console.error("Error sharing:", error);
        }
    };

    const handleDone = () => {
        // Reset the navigation state to ensure we exit the "Creation Flow" modal
        // and land on the main Tabs, preferably navigating to the new gallery.
        navigation.dispatch(
            CommonActions.reset({
                index: 0,
                routes: [
                    { 
                        name: 'MainTabs', 
                        state: {
                            routes: [
                                { name: 'Communities' } // Or 'Groups' depending on your tab structure
                            ]
                        }
                    },
                ],
            })
        );
        
        // Optional: If you want to deep link directly to the gallery after reset:
        // navigation.navigate('CommunityStack', { screen: 'Gallery', params: { galleryId } });
    };

    return (
        <View style={styles.root}>

            <View style={styles.container}>
                
                {/* 1. Success Message */}
                <View style={styles.textContainer}>
                    <Text style={styles.subHeader}>SHARE YOUR GALLERY!</Text>
                    <Text style={styles.galleryName} numberOfLines={2}>
                        {gallery?.name || "Loading..."}
                    </Text>
                </View>

                {/* 2. QR Code Card */}
                <View style={styles.qrCard}>
                    <View style={styles.qrContainer}>
                        <QRCode
                            value={inviteUrl}
                            size={QR_SIZE}
                            color="black"
                            backgroundColor="white"
                        />
                    </View>
                    <Text style={styles.qrLabel}>Scan to join</Text>
                </View>

                {/* 3. Share Link Button */}
                <TouchableOpacity 
                    style={styles.shareLinkButton} 
                    onPress={handleShare}
                    activeOpacity={0.7}
                >
                    <Ionicons name="share-outline" size={20} color="#000" />
                    <Text style={styles.shareLinkText}>Share Invite Link</Text>
                </TouchableOpacity>

            </View>

            {/* 4. Footer */}
            <SafeAreaView style={styles.footer}>
                <TouchableOpacity 
                    style={styles.doneButton} 
                    onPress={handleDone}
                    activeOpacity={0.9}
                >
                    <Text style={styles.doneButtonText}>Go to Gallery</Text>
                    <Ionicons name="arrow-forward" size={18} color="#FFF" />
                </TouchableOpacity>
            </SafeAreaView>
        </View>
    );
};

export default ShareGalleryScreen;

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: "#FFFFFF",
    },
    container: {
        flex: 1,
        alignItems: 'center',
        paddingTop: 40,
        paddingHorizontal: 24,
    },
    
    // Text
    textContainer: {
        alignItems: 'center',
        marginBottom: 40,
    },
    subHeader: {
        fontSize: 12,
        fontWeight: '700',
        color: '#8E8E93',
        letterSpacing: 1.5,
        marginBottom: 12,
        textTransform: 'uppercase',
    },
    galleryName: {
        fontSize: 28,
        fontWeight: '800',
        color: '#000000',
        textAlign: 'center',
        lineHeight: 34,
    },

    // QR Card
    qrCard: {
        alignItems: 'center',
        gap: 20,
        marginBottom: 40,
    },
    qrContainer: {
        padding: 24,
        backgroundColor: '#FFFFFF',
        borderRadius: 30,
        // Soft modern shadow
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.08,
        shadowRadius: 20,
        elevation: 6,
        borderWidth: 1,
        borderColor: '#F2F2F7',
    },
    qrLabel: {
        fontSize: 15,
        fontWeight: '600',
        color: '#8E8E93',
    },

    // Share Link
    shareLinkButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 12,
        paddingHorizontal: 20,
        backgroundColor: '#F2F2F7', // System Gray 6
        borderRadius: 20,
    },
    shareLinkText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#000000',
    },

    // Footer
    footer: {
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#F2F2F7',
        paddingHorizontal: 24,
        paddingVertical: 12,
    },
    doneButton: {
        backgroundColor: '#000000',
        height: 56,
        borderRadius: 28,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    doneButtonText: {
        color: '#FFFFFF',
        fontSize: 17,
        fontWeight: '700',
    },
});