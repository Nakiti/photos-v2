import React, { useState } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

const CreateEventSettingsScreen = () => {
  // Core toggles moved from details
  const [isPrivate, setIsPrivate] = useState(true);
  const [isTimeLocked, setIsTimeLocked] = useState(true);
  const [isGeofenced, setIsGeofenced] = useState(false);
  const [isArchived, setIsArchived] = useState(false);

  // Additional temporary settings (mix of switches and dropdowns)
  const [allowComments, setAllowComments] = useState(true);
  const [photoQuality, setPhotoQuality] = useState<'low' | 'medium' | 'high'>('high');
  const [visibility, setVisibility] = useState<'invite_only' | 'friends' | 'public'>('invite_only');
  const [autoApproveUploads, setAutoApproveUploads] = useState(false);

  const cyclePhotoQuality = () => {
    setPhotoQuality(prev => prev === 'low' ? 'medium' : prev === 'medium' ? 'high' : 'low');
  };

  const cycleVisibility = () => {
    setVisibility(prev => prev === 'invite_only' ? 'friends' : prev === 'friends' ? 'public' : 'invite_only');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Event Settings</Text>

      <View style={styles.section}>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.label}>Private Event</Text>
            <Text style={styles.sub}>Only invited people can view and add</Text>
          </View>
          <Switch value={isPrivate} onValueChange={setIsPrivate} />
        </View>
        <View style={styles.divider} />
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.label}>Time-Locked Uploads</Text>
            <Text style={styles.sub}>Uploads allowed only during event time</Text>
          </View>
          <Switch value={isTimeLocked} onValueChange={setIsTimeLocked} />
        </View>
        <View style={styles.divider} />
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.label}>Geofenced Uploads</Text>
            <Text style={styles.sub}>Limit uploads to a specific location</Text>
          </View>
          <Switch value={isGeofenced} onValueChange={setIsGeofenced} />
        </View>
        <View style={styles.divider} />
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.label}>Event Archived</Text>
            <Text style={styles.sub}>Hide from active events</Text>
          </View>
          <Switch value={isArchived} onValueChange={setIsArchived} />
        </View>
      </View>

      <Text style={styles.header}>Advanced</Text>
      <View style={styles.section}>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.label}>Allow Comments</Text>
            <Text style={styles.sub}>Participants can leave comments</Text>
          </View>
          <Switch value={allowComments} onValueChange={setAllowComments} />
        </View>
        <View style={styles.divider} />
        <TouchableOpacity style={styles.row} onPress={cyclePhotoQuality} activeOpacity={0.7}>
          <View style={styles.rowText}>
            <Text style={styles.label}>Photo Upload Quality</Text>
            <Text style={styles.sub}>{photoQuality.toUpperCase()}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </TouchableOpacity>
        <View style={styles.divider} />
        <TouchableOpacity style={styles.row} onPress={cycleVisibility} activeOpacity={0.7}>
          <View style={styles.rowText}>
            <Text style={styles.label}>Event Visibility</Text>
            <Text style={styles.sub}>
              {visibility === 'invite_only' ? 'Invite Only' : visibility === 'friends' ? 'Friends' : 'Public'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </TouchableOpacity>
        <View style={styles.divider} />
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.label}>Auto-Approve Uploads</Text>
            <Text style={styles.sub}>Skip manual approval of new photos</Text>
          </View>
          <Switch value={autoApproveUploads} onValueChange={setAutoApproveUploads} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 16,
  },
  header: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 12,
  },
  section: {
    backgroundColor: '#F7F7F7',
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    overflow: 'hidden',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  rowText: {
    flex: 1,
    paddingRight: 12,
  },
  label: {
    fontSize: 16,
    color: '#1C1C1E',
    fontWeight: '500',
  },
  sub: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginLeft: 6,
  },
});

export default CreateEventSettingsScreen;
