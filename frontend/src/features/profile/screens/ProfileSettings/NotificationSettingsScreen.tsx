import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  SafeAreaView,
} from 'react-native';
import messaging from '@react-native-firebase/messaging';
import { getPreferences, setPreference } from '../../../../services/preferences.service';
import { registerPushToken } from '../../../../hooks/useAuth';
import { removeDeviceToken } from '../../../../services/api/userService';

const NotificationSettingsScreen = () => {
  const [pauseAll, setPauseAll] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPreferences().then(prefs => {
      setPauseAll(prefs.pauseNotifications);
      setLoading(false);
    });
  }, []);

  const handlePauseToggle = async (value: boolean) => {
    setPauseAll(value);
    await setPreference('pauseNotifications', value);
    if (value) {
      try {
        const token = await messaging().getToken();
        await removeDeviceToken(token);
        await messaging().deleteToken();
      } catch {}
    } else {
      await registerPushToken();
    }
  };

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.sectionContainer}>
            <View style={styles.sectionList}>
              <View style={styles.row}>
                <View style={styles.textStack}>
                  <Text style={styles.rowLabel}>Pause All</Text>
                  <Text style={styles.rowSubtext}>
                    Temporarily mute all push notifications.
                  </Text>
                </View>
                <Switch
                  value={pauseAll}
                  onValueChange={handlePauseToggle}
                  disabled={loading}
                  trackColor={{ false: '#E5E5EA', true: '#000000' }}
                  thumbColor="#FFF"
                  ios_backgroundColor="#E5E5EA"
                />
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  safeArea: { flex: 1 },
  scrollContent: { paddingVertical: 24 },
  sectionContainer: { marginBottom: 32 },
  sectionList: { paddingHorizontal: 24 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  textStack: { flex: 1, paddingRight: 16 },
  rowLabel: { fontSize: 16, color: '#000000', fontWeight: '400' },
  rowSubtext: { fontSize: 13, color: '#8E8E93', marginTop: 4, lineHeight: 18 },
});

export default NotificationSettingsScreen;
