import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ScanJoinScreen from '../features/join/ScanJoinScreen';
import JoinGalleryScreen from '../features/join/JoinGalleryScreen';
import JoinGroupScreen from '../features/join/JoinGroupScreen';
import DefaultHeader from '../components/DefaultHeader';

const Stack = createNativeStackNavigator();

const JoinStack = () => (
  <Stack.Navigator>
    <Stack.Screen
      name="ScanJoin"
      component={ScanJoinScreen}
      options={{ header: () => <DefaultHeader title="Join with Code" /> }}
    />
    <Stack.Screen
      name="JoinGallery"
      component={JoinGalleryScreen}
      options={{ header: () => <DefaultHeader title="Join Gallery" /> }}
    />
    <Stack.Screen
      name="JoinGroup"
      component={JoinGroupScreen}
      options={{ header: () => <DefaultHeader title="Join Group" /> }}
    />
  </Stack.Navigator>
);

export default JoinStack;
