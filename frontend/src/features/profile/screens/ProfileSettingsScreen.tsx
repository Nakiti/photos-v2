import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, SafeAreaView, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';

const SectionLabel = ({ title }: { title: string }) => (
  <Text style={styles.sectionLabel}>{title}</Text>
);

const SettingsRow = ({ label, value, onPress, isSwitch, isDestructive, hasChevron = true, isLast = false }: any) => (
  <TouchableOpacity
    style={[styles.row, isLast && styles.rowLast]}
    onPress={onPress}
    activeOpacity={isSwitch ? 1 : 0.5}
    disabled={!onPress && !isSwitch}
  >
    <Text style={[styles.rowLabel, isDestructive && styles.rowLabelDestructive]}>{label}</Text>
    <View style={styles.rowRight}>
      {isSwitch ? (
        <Switch
          value={value}
          onValueChange={onPress}
          trackColor={{ false: '#E5E5E5', true: '#111111' }}
          thumbColor="#FFFFFF"
          ios_backgroundColor="#E5E5E5"
        />
      ) : (
        <>
          {value && <Text style={styles.rowValue}>{value}</Text>}
          {hasChevron && !isDestructive && (
            <Ionicons name="chevron-forward" size={14} color="#CECECE" style={{ marginLeft: 4 }} />
          )}
        </>
      )}
    </View>
  </TouchableOpacity>
);

const ProfileSettingsScreen = () => {
  const navigation = useNavigation<any>();
  const [showHidden, setShowHidden] = React.useState(false);

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >

          {/* Account */}
          <View style={styles.section}>
            <SectionLabel title="Account" />
            <View style={styles.card}>
              <SettingsRow label="Edit Profile" onPress={() => navigation.navigate('EditProfile')} />
              <SettingsRow label="Appearance" value="System" onPress={() => {}} isLast />
            </View>
          </View>

          {/* Preferences */}
          <View style={styles.section}>
            <SectionLabel title="Preferences" />
            <View style={styles.card}>
              <SettingsRow label="Notifications & Sounds" value="On" onPress={() => navigation.navigate('NotificationSettings')} />
              <SettingsRow label="Sync & Data Usage" value="High Quality" onPress={() => navigation.navigate('DataSyncSettings')} isLast />
            </View>
          </View>

          {/* Gallery */}
          <View style={styles.section}>
            <SectionLabel title="Gallery" />
            <View style={styles.card}>
              <SettingsRow label="Show Hidden Galleries" isSwitch value={showHidden} onPress={() => setShowHidden(!showHidden)} />
              <SettingsRow label="Clear Cache" value="1.2 GB" onPress={() => Alert.alert('Cache Cleared')} hasChevron={false} isLast />
            </View>
          </View>




        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  scrollContent: {
    paddingTop: 20,
    paddingBottom: 60,
    paddingHorizontal: 20,
  },

  // Section
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#AAAAAA',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 8,
  },

  // Card
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E5E5',
    overflow: 'hidden',
  },

  // Row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EBEBEB',
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111111',
    letterSpacing: -0.1,
  },
  rowLabelDestructive: {
    color: '#CC3333',
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowValue: {
    fontSize: 14,
    color: '#AAAAAA',
    fontWeight: '400',
    marginRight: 2,
  },

  // Footer
  version: {
    textAlign: 'center',
    fontSize: 12,
    color: '#CCCCCC',
    marginTop: 8,
    marginBottom: 20,
  },
});

export default ProfileSettingsScreen;