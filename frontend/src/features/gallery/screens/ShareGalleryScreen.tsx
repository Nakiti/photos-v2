import React, { useEffect, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Share,
    SafeAreaView,
    Dimensions,
    ActivityIndicator,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import { useNavigation, useRoute, CommonActions } from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons";

import { useGallery } from "../../../hooks/useGalleryData";
import { getGalleryShareLink } from "../../../services/api/gallery.service";

const { width } = Dimensions.get('window');
const QR_SIZE = width * 0.6;

const ShareGalleryScreen = () => {
    const navigation = useNavigation<any>();
    const route = useRoute();
    const { galleryId, fromCreateFlow } = route.params as {
        galleryId: string;
        fromCreateFlow?: boolean;
    };

    const { gallery } = useGallery(galleryId);
    const [shareLink, setShareLink] = useState<string>(`https://focal.app/gallery/join/${galleryId}`);
    const [loadingLink, setLoadingLink] = useState(true);

    useEffect(() => {
        getGalleryShareLink(galleryId)
            .then(setShareLink)
            .catch(() => {}) // keep fallback URL on error
            .finally(() => setLoadingLink(false));
    }, [galleryId]);

    const handleShare = async () => {
        try {
            await Share.share({
                message: `Join "${gallery?.name || 'my gallery'}" on Focal!\n${shareLink}`,
                url: shareLink,
                title: 'Join my Gallery',
            });
        } catch (error) {
            console.error("Error sharing:", error);
        }
    };

    const handleDone = () => {
        // After create flow, reset root to tabs + gallery so back from Gallery lands on
        // the Groups list (a plain navigate would stack Gallery on top of GroupFlow).
        if (fromCreateFlow) {
            let rootNav = navigation;
            let parent = navigation.getParent();
            while (parent) {
                rootNav = parent;
                parent = parent.getParent();
            }
            rootNav.dispatch(
                CommonActions.reset({
                    index: 1,
                    routes: [
                        { name: 'TabNavigator' },
                        {
                            name: 'Gallery',
                            params: {
                                screen: 'Gallery',
                                params: { galleryId },
                            },
                        },
                    ],
                })
            );
            return;
        }
        navigation.navigate('Gallery', {
            screen: 'Gallery',
            params: { galleryId },
        });
    };

    return (
        <View style={styles.root}>

            <View style={styles.container}>

                {/* Header */}
                <View style={styles.textContainer}>
                    <Text style={styles.eyebrow}>
                        {fromCreateFlow ? 'Gallery created' : 'Share invite'}
                    </Text>
                    <Text style={styles.galleryName} numberOfLines={2}>
                        {gallery?.name || '…'}
                    </Text>
                </View>

                {/* QR Code Card */}
                <View style={styles.qrCard}>
                    {loadingLink ? (
                        <View style={[styles.qrContainer, { width: QR_SIZE + 48, height: QR_SIZE + 48, justifyContent: 'center', alignItems: 'center' }]}>
                            <ActivityIndicator size="large" color="#111" />
                        </View>
                    ) : (
                        <View style={styles.qrContainer}>
                            <QRCode
                                value={shareLink}
                                size={QR_SIZE}
                                color="#111111"
                                backgroundColor="white"
                            />
                        </View>
                    )}
                    <Text style={styles.qrLabel}>Scan to join</Text>
                </View>

                {/* Share Link Button */}
                <TouchableOpacity
                    style={styles.shareBtn}
                    onPress={handleShare}
                    activeOpacity={0.7}
                >
                    <Ionicons name="share-outline" size={18} color="#111111" />
                    <Text style={styles.shareBtnText}>Share Invite Link</Text>
                </TouchableOpacity>

            </View>

            {fromCreateFlow ? (
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
            ) : null}

        </View>
    );
};

export default ShareGalleryScreen;

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: '#FAFAFA',
    },
    container: {
        flex: 1,
        alignItems: 'center',
        paddingTop: 32,
        paddingHorizontal: 20,
    },

    // Header
    textContainer: {
        alignItems: 'center',
        marginBottom: 32,
        gap: 6,
    },
    eyebrow: {
        fontSize: 12,
        fontWeight: '600',
        color: '#AAAAAA',
        letterSpacing: 0.4,
        textTransform: 'uppercase',
    },
    galleryName: {
        fontSize: 24,
        fontWeight: '700',
        color: '#111111',
        textAlign: 'center',
        letterSpacing: -0.4,
        lineHeight: 30,
    },

    // QR Card
    qrCard: {
        alignItems: 'center',
        gap: 20,
        marginBottom: 28,
    },
    qrContainer: {
        padding: 24,
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.07,
        shadowRadius: 18,
        elevation: 5,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: '#E5E5E5',
    },
    qrLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: '#AAAAAA',
    },

    // Share button
    shareBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#EFEFEF',
        paddingVertical: 11,
        paddingHorizontal: 20,
        borderRadius: 11,
    },
    shareBtnText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#111111',
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
    doneButton: {
        backgroundColor: '#111111',
        height: 48,
        borderRadius: 13,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    doneButtonText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700',
    },
});
