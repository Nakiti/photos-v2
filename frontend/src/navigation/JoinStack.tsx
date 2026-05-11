import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import JoinGalleryScreen from '../features/join/JoinGalleryScreen';
import JoinGroupScreen from '../features/join/JoinGroupScreen';

const Stack = createNativeStackNavigator();

const JoinStack = () => (
  <Stack.Navigator>
    <Stack.Screen
      name="JoinGallery"
      component={JoinGalleryScreen}
      options={{ title: 'Join Gallery' }}
    />
    <Stack.Screen
      name="JoinGroup"
      component={JoinGroupScreen}
      options={{ title: 'Join Group' }}
    />
  </Stack.Navigator>
);

export default JoinStack;
