// navigators/SwiperNavigator.tsx

import React from 'react';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';

// Import the screen components that will be part of the swiper
import GalleryStack from './GalleryStack';
import CameraScreen from '../features/camera/CameraScreen';

/**
 * Type definition for the screens within this Swiper navigator.
 * This provides type safety for screen names and their params.
 */
export type SwiperTabParamList = {
  Gallery: undefined; // Screen B (your GalleryStack)
  Camera: undefined;  // Screen C (your CameraScreen)
};

// Create the navigator and apply the types
const Tab = createMaterialTopTabNavigator<SwiperTabParamList>();

const SwiperNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      initialRouteName="Gallery"
      // This is the key: returning null for the tabBar effectively hides it.
      tabBar={() => null}
      // You can also explicitly set swipeEnabled, though it's true by default.
      swipeEnabled={true}
    >
      <Tab.Screen
        name="Gallery"
        component={GalleryStack}
      />
      <Tab.Screen
        name="Camera"
        component={CameraScreen}
      />
    </Tab.Navigator>
  );
};

export default SwiperNavigator;