import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import FastImage from 'react-native-fast-image';
import { useUser } from '../../../hooks/useUser';
import { useAuth } from '../../../hooks/useAuth';

const SectionLabel = ({ title }: { title: string }) => (
  <Text style={styles.sectionLabel}>{title}</Text>
);

const SettingsRow = ({
  label,
  value,
  onPress,
  isDestructive,
  hasChevron = true,
  isLast = false,
}: any) => (
  <TouchableOpacity
    style={[styles.row, isLast && styles.rowLast]}
    onPress={onPress}
    activeOpacity={0.5}
    disabled={!onPress}
  >
    <Text style={[styles.rowLabel, isDestructive && styles.rowLabelDestructive]}>
      {label}
    </Text>
    <View style={styles.rowRight}>
      {value && <Text style={styles.rowValue}>{value}</Text>}
      {hasChevron && !isDestructive && (
        <Ionicons name="chevron-forward" size={14} color="#CECECE" style={{ marginLeft: 4 }} />
      )}
    </View>
  </TouchableOpacity>
);

const ProfileScreen = () => {
  const navigation = useNavigation<any>();
  const { user } = useUser();
  const { logout } = useAuth();

  const handleClearCache = async () => {
    await Promise.all([FastImage.clearDiskCache(), FastImage.clearMemoryCache()]);
    Alert.alert('Cache cleared');
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar + Identity */}
        {user && (
          <View style={styles.profileSection}>
            <View style={styles.avatar}>
              {user.avatarUrl ? (
                <FastImage
                  source={{ uri: user.avatarUrl }}
                  style={StyleSheet.absoluteFill}
                  resizeMode={FastImage.resizeMode.cover}
                />
              ) : (
                <Text style={styles.avatarInitial}>{(user.name ?? user.handle ?? '?')[0]}</Text>
              )}
            </View>
            <Text style={styles.name}>{user.name}</Text>
            <Text style={styles.handle}>@{user.handle}</Text>
          </View>
        )}

        {/* Account */}
        <View style={styles.section}>
          <SectionLabel title="Account" />
          <View style={styles.card}>
            <SettingsRow
              label="Edit Profile"
              onPress={() => navigation.navigate('ProfileFlow', { screen: 'EditProfile' })}
              isLast
            />
          </View>
        </View>

        {/* Preferences */}
        <View style={styles.section}>
          <SectionLabel title="Preferences" />
          <View style={styles.card}>
            <SettingsRow
              label="Notifications & Sounds"
              value="On"
              onPress={() => navigation.navigate('ProfileFlow', { screen: 'NotificationSettings' })}
            />
            <SettingsRow
              label="Sync & Data Usage"
              value="High Quality"
              onPress={() => navigation.navigate('ProfileFlow', { screen: 'DataSyncSettings' })}
              isLast
            />
          </View>
        </View>

        {/* Gallery */}
        <View style={styles.section}>
          <SectionLabel title="Gallery" />
          <View style={styles.card}>
            <SettingsRow
              label="Clear Cache"
              onPress={handleClearCache}
              hasChevron={false}
              isLast
            />
          </View>
        </View>

        {/* Support */}
        <View style={styles.section}>
          <SectionLabel title="Support" />
          <View style={styles.card}>
            <SettingsRow
              label="Help Center"
              onPress={() => navigation.navigate('ProfileFlow', { screen: 'HelpCenter' })}
              isLast
            />
          </View>
        </View>

        {/* Sign Out */}
        <View style={styles.section}>
          <View style={styles.card}>
            <SettingsRow
              label="Sign out"
              isDestructive
              hasChevron={false}
              onPress={handleSignOut}
              isLast
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  scrollContent: {
    paddingTop: 8,
    paddingBottom: 60,
    paddingHorizontal: 20,
  },

  // Profile header
  profileSection: {
    alignItems: 'center',
    paddingVertical: 28,
    marginBottom: 12,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 28,
    backgroundColor: '#EFEFEF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    overflow: 'hidden',
  },
  avatarInitial: {
    fontSize: 30,
    fontWeight: '600',
    color: '#AAAAAA',
  },
  name: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111111',
    letterSpacing: -0.3,
    marginBottom: 3,
  },
  handle: {
    fontSize: 14,
    color: '#AAAAAA',
    fontWeight: '400',
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
});

export default ProfileScreen;
