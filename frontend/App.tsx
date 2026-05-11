import 'react-native-get-random-values'
import React, { useEffect, useState } from 'react';
import { StatusBar, StyleSheet, useColorScheme, View, ActivityIndicator, Text } from 'react-native';
import {
  SafeAreaProvider,
} from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { navigationRef } from './src/navigation/navigationRef';
import { useDeepLinks, navigateParsedLink } from './src/hooks/useDeepLinks';
import { useDeepLinkStore } from './src/stores/deepLink.store';
import { useAuthStore } from './src/stores/auth.store';
import { PaperProvider } from 'react-native-paper';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { DatabaseProvider } from '@nozbe/watermelondb/react';
import { database } from './src/db';
import RootStack from './src/navigation/RootStack';
import { useAuth } from './src/hooks/useAuth';
import { usePhotoUploadQueue } from './src/hooks/usePhotoData';
import { useSocketEvents } from './src/hooks/useSocketEvents';
import messaging from '@react-native-firebase/messaging';
import ErrorBoundary from './src/components/ErrorBoundary';
import OfflineBanner from './src/components/OfflineBanner';

const queryClient = new QueryClient();

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <ErrorBoundary>
      <DatabaseProvider database={database}>
        <QueryClientProvider client={queryClient}>
          <PaperProvider>
            <GestureHandlerRootView style={styles.container}>
              <SafeAreaProvider>
                <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
                <OfflineBanner />
                <AppContent />
              </SafeAreaProvider>
            </GestureHandlerRootView>
          </PaperProvider>
        </QueryClientProvider>
      </DatabaseProvider>
    </ErrorBoundary>
  );
}

function navigateToGallery(galleryId: string) {
  if (navigationRef.isReady()) {
    navigationRef.navigate('Gallery', { screen: 'Gallery', params: { galleryId } });
  }
}

function handleNavReady() {
  const { isAuthenticated } = useAuthStore.getState();
  if (!isAuthenticated) return;
  const { pendingLink, clearPendingLink } = useDeepLinkStore.getState();
  if (!pendingLink) return;
  clearPendingLink();
  navigateParsedLink(pendingLink);
}

/**
 * This component handles checking the user's auth status on app load
 * before rendering the main navigation.
 */
function AppContent() {
  const [isLoading, setIsLoading] = useState(true);
  const { checkAuthStatus } = useAuth();

  // Global socket event handlers - must be mounted for live updates
  useSocketEvents();

  // Photo upload queue processor
  usePhotoUploadQueue();

  // Deep link subscription
  useDeepLinks();

  // Handle notification tap when app was in background
  useEffect(() => {
    const unsubscribe = messaging().onNotificationOpenedApp(remoteMessage => {
      const galleryId = remoteMessage.data?.galleryId as string | undefined;
      if (galleryId) navigateToGallery(galleryId);
    });
    return unsubscribe;
  }, []);

  // Handle notification tap when app was fully quit — wait until nav is mounted
  useEffect(() => {
    if (isLoading) return;
    messaging().getInitialNotification().then(remoteMessage => {
      if (!remoteMessage) return;
      const galleryId = remoteMessage.data?.galleryId as string | undefined;
      if (galleryId) navigateToGallery(galleryId);
    });
  }, [isLoading]);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Check for stored credentials
        await checkAuthStatus();
      } catch (e) {
        console.error("Failed to initialize auth", e);
      } finally {
        // Auth check is complete, we can now show the app
        setIsLoading(false);
      }
    };

    initializeApp();
  }, []);

  // While checking auth, show a loading spinner
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text>Auth Check</Text>
      </View>
    );
  }

  // Auth check is done, render the app
  return (
    <NavigationContainer ref={navigationRef} onReady={handleNavReady}>
      <RootStack />
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default App;
