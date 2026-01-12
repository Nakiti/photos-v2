import 'react-native-get-random-values'
import React, { useEffect, useState } from 'react';
import { StatusBar, StyleSheet, useColorScheme, View, ActivityIndicator, Text } from 'react-native';
import {
  SafeAreaProvider,
} from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { PaperProvider } from 'react-native-paper'; // Assuming this is your provider
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { DatabaseProvider } from '@nozbe/watermelondb/react';
import { database } from './src/db';
import RootStack from './src/navigation/RootStack';
import { useAuth } from './src/hooks/useAuth';
import { usePhotoUploadQueue } from './src/hooks/usePhotoData';
import { useSocketEvents } from './src/hooks/useSocketEvents';

const queryClient = new QueryClient();

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <DatabaseProvider database={database}>
      <QueryClientProvider client={queryClient}>
        <PaperProvider>
          <GestureHandlerRootView style={styles.container}>
            <SafeAreaProvider>
              <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
              <AppContent />
            </SafeAreaProvider>
          </GestureHandlerRootView>
        </PaperProvider>
      </QueryClientProvider>
    </DatabaseProvider>
  );
}

/**
 * This component handles checking the user's auth status on app load
 * before rendering the main navigation.
 */
function AppContent() {
  const [isLoading, setIsLoading] = useState(true);
  const { checkAuthStatus } = useAuth();

  // Global socket event handlers - must be mounted for live updates
  // useSocketEvents();
  
  // Photo upload queue processor
  usePhotoUploadQueue()

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
    <NavigationContainer>
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
