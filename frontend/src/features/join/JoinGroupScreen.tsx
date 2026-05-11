import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { joinGroup } from '../../services/api/groups.service';

type RouteParams = {
  JoinGroup: { groupId: string; groupName?: string };
};

const JoinGroupScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RouteParams, 'JoinGroup'>>();
  const { groupId, groupName } = route.params;
  const [joining, setJoining] = useState(false);
  const [requestSent, setRequestSent] = useState(false);

  const handleJoin = async () => {
    setJoining(true);
    try {
      const membership = await joinGroup(groupId);
      if (membership?.status === 'PENDING') {
        setRequestSent(true);
        setJoining(false);
      } else {
        navigation.navigate('GroupFlow', {
          screen: 'Group',
          params: { groupId },
        });
      }
    } catch (err: any) {
      setJoining(false);
      Alert.alert('Error', err?.response?.data?.message ?? 'Could not join group. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>👥</Text>
        </View>
        <Text style={styles.heading}>{groupName ?? 'Group Invite'}</Text>

        {requestSent ? (
          <>
            <Text style={styles.subheading}>
              Your request to join has been sent. You'll be added once an admin approves it.
            </Text>
            <TouchableOpacity
              style={styles.button}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.buttonLabel}>Done</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.subheading}>You've been invited to join this group.</Text>
            <TouchableOpacity
              style={[styles.button, joining && styles.buttonDisabled]}
              onPress={handleJoin}
              disabled={joining}
            >
              {joining ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonLabel}>Join Group</Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FAFAFA' },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  icon: { fontSize: 36 },
  heading: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111111',
    letterSpacing: -0.3,
    textAlign: 'center',
    marginBottom: 8,
  },
  subheading: {
    fontSize: 15,
    color: '#888888',
    textAlign: 'center',
    marginBottom: 36,
    lineHeight: 22,
  },
  button: {
    backgroundColor: '#111111',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 48,
    alignItems: 'center',
    width: '100%',
  },
  buttonDisabled: { opacity: 0.5 },
  buttonLabel: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});

export default JoinGroupScreen;
