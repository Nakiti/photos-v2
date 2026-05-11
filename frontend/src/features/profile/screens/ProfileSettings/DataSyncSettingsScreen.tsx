import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { getPreferences, setPreference } from '../../../../services/preferences.service';

const DataSyncSettingsScreen = () => {
  const [syncCellular, setSyncCellular] = useState(false);
  const [quality, setQuality] = useState<'original' | 'high'>('high');

  useEffect(() => {
    getPreferences().then(prefs => {
      setSyncCellular(prefs.syncOverCellular);
      setQuality(prefs.uploadQuality);
    });
  }, []);

  const handleCellularToggle = async (value: boolean) => {
    setSyncCellular(value);
    await setPreference('syncOverCellular', value);
  };

  const handleQualityChange = async (value: 'original' | 'high') => {
    setQuality(value);
    await setPreference('uploadQuality', value);
  };

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>

          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionHeaderText}>SYNCHRONIZATION</Text>
            </View>
            <View style={styles.sectionList}>
              <View style={styles.row}>
                <View style={styles.textStack}>
                  <Text style={styles.rowLabel}>Sync over Cellular</Text>
                  <Text style={styles.rowSubtext}>
                    Allow uploading photos when not on Wi-Fi.
                  </Text>
                </View>
                <Switch
                  value={syncCellular}
                  onValueChange={handleCellularToggle}
                  trackColor={{ false: '#E5E5EA', true: '#000000' }}
                  thumbColor="#FFF"
                  ios_backgroundColor="#E5E5EA"
                />
              </View>
            </View>
          </View>

          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionHeaderText}>UPLOAD QUALITY</Text>
            </View>
            <View style={styles.sectionList}>
              <TouchableOpacity
                style={styles.row}
                onPress={() => handleQualityChange('original')}
                activeOpacity={0.7}
              >
                <View style={styles.textStack}>
                  <Text style={styles.rowLabel}>Original</Text>
                  <Text style={styles.rowSubtext}>
                    Full-resolution files. Uses more data and storage.
                  </Text>
                </View>
                {quality === 'original' && (
                  <Ionicons name="checkmark" size={22} color="#000000" />
                )}
              </TouchableOpacity>
              <View style={styles.divider} />
              <TouchableOpacity
                style={styles.row}
                onPress={() => handleQualityChange('high')}
                activeOpacity={0.7}
              >
                <View style={styles.textStack}>
                  <Text style={styles.rowLabel}>High Efficiency</Text>
                  <Text style={styles.rowSubtext}>
                    Optimized file size with excellent visual quality. Recommended.
                  </Text>
                </View>
                {quality === 'high' && (
                  <Ionicons name="checkmark" size={22} color="#000000" />
                )}
              </TouchableOpacity>
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
  sectionHeader: { paddingHorizontal: 24, marginBottom: 8 },
  sectionHeaderText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8E8E93',
    letterSpacing: 0.8,
  },
  sectionList: { paddingHorizontal: 24 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  textStack: { flex: 1, paddingRight: 24 },
  rowLabel: { fontSize: 16, color: '#000000', fontWeight: '400' },
  rowSubtext: { fontSize: 13, color: '#8E8E93', marginTop: 4, lineHeight: 18 },
  divider: { height: 1, backgroundColor: '#F2F2F7' },
});

export default DataSyncSettingsScreen;
