import { useNavigation, useRoute, StackActions } from '@react-navigation/native';
import { useCreateOptimisticPhoto } from '../../hooks/usePhotoData';
import { useGalleryTags } from '../../hooks/useGalleryTagData';
import GalleryHeader from '../gallery/components/GalleryHeader';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';


const PreviewScreen = () => {
    const navigation = useNavigation()
    const route = useRoute()
    const { photoUri, galleryId, photoId } = route.params as { photoUri: string; galleryId: string, photoId: string };

    const { mutate: createOptimisticPhoto, isPending } = useCreateOptimisticPhoto()
    const { tags, isLoading: tagsLoading } = useGalleryTags(galleryId)
    const [isPickerOpen, setIsPickerOpen] = useState(false)
    const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])

    const handleRetake = () => {
        navigation.goBack();
    };

    const handleSend = () => {
        if (isPending) return; // Don't allow double-taps
    
        // Call the optimistic create function
        createOptimisticPhoto(
          { galleryId, localUri: photoUri, tagIds: selectedTagIds },
          {
            onSuccess: () => {

              navigation.dispatch(StackActions.pop(2));
            },
            onError: (error) => {
              console.error("Failed to create optimistic photo record:", error);
              Alert.alert("Error", "Could not save photo. Please try again.");
              navigation.goBack();
            },
          }
        );
    };

    const selectedTags = useMemo(() => {
        const map = new Map(tags.map(t => [t.id, t]))
        return selectedTagIds.map(id => map.get(id)).filter(Boolean) as typeof tags
    }, [tags, selectedTagIds])

    const toggleTag = (tagId: string) => {
        setSelectedTagIds(prev => prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId])
    }

    return (
        <View style={styles.container}>
            {/* Fullscreen photo */}
            <Image source={{ uri: photoUri }} style={styles.photo} resizeMode="cover" />

            {/* Top overlay header (reuse existing gallery header) */}
            <GalleryHeader galleryId={galleryId} onBackPress={handleRetake} />

            {/* Tag selector anchor */}
            <View style={styles.topControls}>
                <TouchableOpacity
                    activeOpacity={0.85}
                    style={styles.tagSelector}
                    onPress={() => setIsPickerOpen(v => !v)}
                    accessibilityRole="button"
                    accessibilityLabel="Select tags for this photo"
                >
                    <Ionicons name="pricetags-outline" size={18} color="#fff" />
                    <Text style={styles.tagSelectorText}>
                        {selectedTags.length > 0 ? `${selectedTags.map(t => t.name).join(', ')}` : (tagsLoading ? 'Loading tags...' : 'Select tags')}
                    </Text>
                    <Ionicons name={isPickerOpen ? 'chevron-up' : 'chevron-down'} size={16} color="#fff" />
                </TouchableOpacity>

                {/* Dropdown panel */}
                {isPickerOpen && (
                    <View style={styles.dropdownPanel}>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.chipsRow}
                        >
                            {tags.length === 0 && !tagsLoading && (
                                <Text style={styles.emptyText}>No tags yet</Text>
                            )}
                            {tags.map(tag => {
                                const selected = selectedTagIds.includes(tag.id)
                                return (
                                    <TouchableOpacity
                                        key={tag.id}
                                        style={[styles.chip, selected && styles.chipSelected]}
                                        onPress={() => toggleTag(tag.id)}
                                        activeOpacity={0.9}
                                    >
                                        <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                                            {tag.name}
                                        </Text>
                                    </TouchableOpacity>
                                )
                            })}
                        </ScrollView>
                    </View>
                )}
            </View>

            {/* Bottom overlay with action */}
            <LinearGradient
                pointerEvents="none"
                colors={["rgba(0,0,0,0.00)", "rgba(0,0,0,0.06)", "rgba(0,0,0,0.26)", "rgba(0,0,0,0.55)"]}
                locations={[0, 0.3, 0.7, 1]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={styles.bottomGradient}
            />
            <View style={styles.bottomBar}>
                <TouchableOpacity
                    onPress={handleSend}
                    activeOpacity={0.9}
                    style={styles.sendButton}
                    accessibilityRole="button"
                    accessibilityLabel="Send photo"
                >
                    {isPending ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <>
                            <Ionicons name="send" size={18} color="#fff" />
                            <Text style={styles.sendText}>Send</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    )
}

export default PreviewScreen

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    photo: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        height: '100%',
    },
    topControls: {
        position: 'absolute',
        top: 96, // sits below GalleryHeader
        left: 0,
        right: 0,
        paddingHorizontal: 16,
        zIndex: 12,
    },
    tagSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        alignSelf: 'center',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 24,
        backgroundColor: 'rgba(0,0,0,0.45)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.18)',
    },
    tagSelectorText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    dropdownPanel: {
        marginTop: 10,
        alignSelf: 'center',
        borderRadius: 16,
        backgroundColor: 'rgba(0,0,0,0.55)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.14)',
        paddingHorizontal: 10,
        paddingVertical: 8,
        maxWidth: '92%',
    },
    chipsRow: {
        alignItems: 'center',
        paddingHorizontal: 4,
        gap: 8,
    },
    chip: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.12)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.18)',
    },
    chipSelected: {
        backgroundColor: 'rgba(86,107,255,0.35)',
        borderColor: 'rgba(86,107,255,0.65)',
    },
    chipText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '600',
    },
    chipTextSelected: {
        color: '#fff',
    },
    emptyText: {
        color: '#ddd',
        paddingHorizontal: 8,
        paddingVertical: 6,
    },
    bottomGradient: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: 180,
    },
    bottomBar: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 24,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 16,
        zIndex: 12,
    },
    sendButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 22,
        paddingVertical: 14,
        borderRadius: 28,
        backgroundColor: 'rgba(86,107,255,0.95)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.18)',
        minWidth: 140,
        justifyContent: 'center',
    },
    sendText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
})