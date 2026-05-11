import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { joinGallery } from '../../services/api/memberships.service';

type RouteParams = {
  JoinGallery: { galleryId: string; galleryName?: string };
};

const JoinGalleryScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RouteParams, 'JoinGallery'>>();
  const { galleryId, galleryName } = route.params;
  const [joining, setJoining] = useState(false);

  const handleJoin = async () => {
    setJoining(true);
    try {
      await joinGallery(galleryId);
      navigation.navigate('Gallery', {
        screen: 'Gallery',
        params: { galleryId },
      });
    } catch (err: any) {
      setJoining(false);
      Alert.alert('Error', err?.response?.data?.message ?? 'Could not join gallery. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>🖼️</Text>
        </View>
        <Text style={styles.heading}>{galleryName ?? 'Gallery Invite'}</Text>
        <Text style={styles.subheading}>You've been invited to join this gallery.</Text>
        <TouchableOpacity
          style={[styles.button, joining && styles.buttonDisabled]}
          onPress={handleJoin}
          disabled={joining}
        >
          {joining ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonLabel}>Join Gallery</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FAFAFA' },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  icon: { fontSize: 36 },
  heading: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111111',
    letterSpacing: -0.3,
    textAlign: 'center',
    marginBottom: 8,
  },
  subheading: {
    fontSize: 15,
    color: '#888888',
    textAlign: 'center',
    marginBottom: 36,
    lineHeight: 22,
  },
  button: {
    backgroundColor: '#111111',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 48,
    alignItems: 'center',
    width: '100%',
  },
  buttonDisabled: { opacity: 0.5 },
  buttonLabel: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});

export default JoinGalleryScreen;
