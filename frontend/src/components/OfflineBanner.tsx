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
      <View style={styles.dot} />
      <Text style={styles.text}>No connection</Text>
    </View>
  );
};

export default OfflineBanner;

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#F5F5F5',
    paddingVertical: 5,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E8E8E8',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#BBBBBB',
  },
  text: {
    color: '#999999',
    fontSize: 12,
    fontWeight: '400',
  },
});
