import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity,
  Switch, SafeAreaView, ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useDeleteGallery, useGallery } from '../../../hooks/useGalleryData';
import { useAuth } from '../../../hooks/useAuth';
import Ionicons from 'react-native-vector-icons/Ionicons';

interface SettingItem {
  label: string;
  value?: string | null | boolean;
  onPress?: () => void;
  isDestructive?: boolean;
  isSwitch?: boolean;
}

interface SettingsSection {
  category?: string;
  items: SettingItem[];
}

const formatAddPermission = (value?: string | null): string => {
  if (!value) return 'Anyone';
  const n = value.toLowerCase();
  if (n === 'anyone' || n === 'all') return 'Anyone';
  if (n === 'admin') return 'Admin';
  return value;
};

const formatDeletePermission = (value?: string | null): string => {
  if (!value) return 'Admin';
  const n = value.toLowerCase();
  if (n === 'admin') return 'Admin';
  if (n === 'admins_authors' || n === 'admins/authors') return 'Admin/Authors';
  return value;
};

const formatJoinRequiresApproval = (value?: boolean | string | null): string => {
  if (value === undefined || value === null) return 'Anyone';
  if (typeof value === 'boolean') return value ? 'Require Approval' : 'Anyone';
  const n = value.toLowerCase();
  if (n === 'admin_approval' || n === 'require approval') return 'Require Approval';
  return 'Anyone';
};

const SectionLabel = ({ title }: { title: string }) => (
  <Text style={styles.sectionLabel}>{title}</Text>
);

const SettingsRow = ({ item, isLast }: { item: SettingItem; isLast: boolean }) => (
  <TouchableOpacity
    style={[styles.row, isLast && styles.rowLast]}
    onPress={item.onPress}
    activeOpacity={item.isSwitch ? 1 : 0.5}
    disabled={!item.onPress && !item.isSwitch}
  >
    <Text style={[styles.rowLabel, item.isDestructive && styles.rowLabelDestructive]}>
      {item.label}
    </Text>
    <View style={styles.rowRight}>
      {item.isSwitch ? (
        <Switch
          value={item.value === true}
          onValueChange={item.onPress}
          trackColor={{ false: '#E5E5E5', true: '#111111' }}
          thumbColor="#FFFFFF"
          ios_backgroundColor="#E5E5E5"
        />
      ) : (
        <>
          {item.value && <Text style={styles.rowValue}>{item.value}</Text>}
          {!item.isDestructive && item.onPress && (
            <Ionicons name="chevron-forward" size={14} color="#CECECE" style={{ marginLeft: 4 }} />
          )}
        </>
      )}
    </View>
  </TouchableOpacity>
);

const GallerySettingsScreen = () => {
  const [settingsData, setSettingsData] = useState<SettingsSection[] | null>(null);
  const navigation = useNavigation();
  const route = useRoute();
  const { galleryId } = route.params as { galleryId: string };

  const { gallery, isLoading } = useGallery(galleryId);
  const { user } = useAuth();
  const deleteGalleryMutation = useDeleteGallery();

  const isOwner = gallery?.ownerId === user?.id;

  const confirmAndDeleteGallery = () => {
    if (!gallery?.id) return;
    Alert.alert(
      'Delete Gallery',
      'This will permanently delete this gallery and all photos.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteGalleryMutation.mutate(gallery.id, {
              onSuccess: () => (navigation as any).navigate('TabNavigator', { screen: 'Groups' }),
            });
          },
        },
      ]
    );
  };

  useEffect(() => {
    if (!gallery || !user) { setSettingsData(null); return; }

    const data: SettingsSection[] = [];

    // General
    const general: SettingsSection = { category: 'General', items: [] };
    general.items.push({
      label: 'Name',
      value: gallery.name,
      onPress: () => (navigation as any).navigate('EditGalleryDetails', { galleryId: gallery.id }),
    });

    // Danger
    if (isOwner) {
      data.push({
        category: 'Admin',
        items: [
          { label: 'Transfer Ownership', onPress: () => {} },
          { label: 'Delete Gallery', onPress: confirmAndDeleteGallery, isDestructive: true },
        ],
      });
    } else {
      data.push({
        category: 'Actions',
        items: [{ label: 'Leave Gallery', onPress: () => {}, isDestructive: true }],
      });
    }

    setSettingsData(data);
  }, [gallery, user, isOwner, navigation]);

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="small" color="#999" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {settingsData?.map((section, sectionIndex) => (
            <View key={sectionIndex} style={styles.section}>
              {section.category && <SectionLabel title={section.category} />}
              <View style={styles.card}>
                {section.items.map((item, itemIndex) => (
                  <SettingsRow
                    key={itemIndex}
                    item={item}
                    isLast={itemIndex === section.items.length - 1}
                  />
                ))}
              </View>
            </View>
          ))}
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
  loading: {
    flex: 1,
    backgroundColor: '#FAFAFA',
    alignItems: 'center',
    justifyContent: 'center',
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
});

export default GallerySettingsScreen;