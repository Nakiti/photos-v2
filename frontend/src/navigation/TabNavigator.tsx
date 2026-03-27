import React from "react";
import { StyleSheet, Platform, View } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import Ionicons from 'react-native-vector-icons/Ionicons';

import ProfileStack from "./ProfileStack";
import GroupsStack from "./GroupsStack";
import CommunitiesListScreen from "../features/communities/screens/CommunitiesListScreen";
import GroupsListScreen from "../features/groups/screens/GroupsListScreen";
import ProfileScreen from "../features/profile/screens/ProfileScreen"

const Tab = createBottomTabNavigator();

const TabNavigator = () => {
  return (
    <Tab.Navigator
      initialRouteName="Groups"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: "#111111",
        tabBarInactiveTintColor: "#CCCCCC",
        tabBarStyle: styles.tabBar,
        tabBarIcon: ({ focused, color }) => {
          let iconName = "";

          if (route.name === "Groups") {
            iconName = focused ? "images" : "images-outline";
          } else if (route.name === "Communities") {
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
      <Tab.Screen name="Groups" component={GroupsListScreen} />
      <Tab.Screen name="Communities" component={CommunitiesListScreen} />
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