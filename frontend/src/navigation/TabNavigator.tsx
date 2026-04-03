import React from "react";
import { StyleSheet, Platform, View } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import Ionicons from 'react-native-vector-icons/Ionicons';

import ProfileStack from "./ProfileStack";
import GalleriesStack from "./GalleriesStack";
import GroupsListScreen from "../features/groups/screens/GroupsListScreen";
import GalleriesListScreen from "../features/galleries/screens/GalleriesListScreen";
import ProfileScreen from "../features/profile/screens/ProfileScreen"

const Tab = createBottomTabNavigator();

const TabNavigator = () => {
  return (
    <Tab.Navigator
      initialRouteName="Galleries"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: "#111111",
        tabBarInactiveTintColor: "#CCCCCC",
        tabBarStyle: styles.tabBar,
        tabBarIcon: ({ focused, color }) => {
          let iconName = "";

          if (route.name === "Galleries") {
            iconName = focused ? "images" : "images-outline";
          } else if (route.name === "Groups") {
            iconName = focused ? "people" : "people-outline";
          } else if (route.name === "Profile") {
            iconName = focused ? "person" : "person-outline";
          }

          return (
            <View style={styles.iconContainer}>
              <Ionicons name={iconName} size={24} color={color} />
              {focused && <View style={styles.activeDot} />}
            </View>
          );
        },
      })}
    >
      <Tab.Screen name="Galleries" component={GalleriesListScreen} />
      <Tab.Screen name="Groups" component={GroupsListScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: "#FAFAFA",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E5E5E5",
    elevation: 0,
    shadowOpacity: 0,
    height: Platform.OS === "ios" ? 84 : 60,
    paddingTop: 10,
  },
  iconContainer: {
    alignItems: "center",
    justifyContent: "center",
    top: Platform.OS === "ios" ? 8 : 0,
  },
  activeDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: "#111111",
    marginTop: 5,
  },
});

export default TabNavigator;
