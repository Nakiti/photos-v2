import { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

const OfflineBanner = () => {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    // Fetch current state immediately on mount
    NetInfo.fetch().then(state => {
      setIsOffline(state.isConnected === false);
    });

    const unsubscribe = NetInfo.addEventListener(state => {
      // isConnected can be null while the native module is initialising — treat as online
      setIsOffline(state.isConnected === false);
    });

    return unsubscribe;
  }, []);

  if (!isOffline) return null;

  return (
    <View style={styles.banner}>
      <Text style={styles.text}>No internet connection</Text>
    </View>
  );
};

export default OfflineBanner;

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#1a1a1a',
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
  },
});
