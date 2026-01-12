import React from "react";
import { StyleSheet, Platform, View } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import Ionicons from 'react-native-vector-icons/Ionicons';

// Stacks
import ProfileStack from "./ProfileStack";
import GroupsStack from "./GroupsStack";
import CommunityStack from "./CommunityStack";
import CommunitiesListScreen from "../features/communities/screens/CommunitiesListScreen";
import GroupsListScreen from "../features/groups/screens/GroupsListScreen";

// import EventsStack from "./EventsStack"; // Uncomment if needed

const Tab = createBottomTabNavigator();

const TabNavigator = () => {
    return (
        <Tab.Navigator 
            initialRouteName="Groups"
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarShowLabel: false, // Minimalist: Icons only
                tabBarActiveTintColor: "#000000",
                tabBarInactiveTintColor: "#8E8E93", // System Gray
                tabBarStyle: styles.tabBar,
                
                // Dynamic Icon Logic
                tabBarIcon: ({ focused, color, size }) => {
                    let iconName = "";

                    if (route.name === "Groups") {
                        iconName = focused ? "images" : "images-outline";
                    } else if (route.name === "Communities") {
                        iconName = focused ? "people" : "people-outline";
                    } else if (route.name === "Profile") {
                        iconName = focused ? "person" : "person-outline";
                    }

                    // Optional: Add a subtle dot indicator below the active tab
                    return (
                        <View style={styles.iconContainer}>
                            <Ionicons name={iconName} size={26} color={color} />
                            {focused && <View style={styles.activeDot} />}
                        </View>
                    );
                },
            })}
        >
            <Tab.Screen name="Groups" component={GroupsListScreen} />
            <Tab.Screen name="Communities" component={CommunitiesListScreen} />
            <Tab.Screen name="Profile" component={ProfileStack} />
        </Tab.Navigator>
    )
}

const styles = StyleSheet.create({
    tabBar: {
       position: 'absolute', // Optional: Makes it float slightly if you add transparency
       bottom: 0,
       left: 0,
       right: 0,
       backgroundColor: "#FFFFFF",
       borderTopWidth: 1,
       borderTopColor: "#F2F2F7", // Very subtle hairline divider
       elevation: 0, // Remove Android shadow
       shadowOpacity: 0, // Remove iOS shadow for flat look
       
       // Sizing
       height: Platform.OS === 'ios' ? 88 : 60, // Taller on iOS for Home Indicator
       paddingTop: 12, // Push icons down slightly
    },
    iconContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        top: Platform.OS === 'ios' ? 10 : 0, // Center optically
    },
    activeDot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#000000',
        marginTop: 4, // Spacing between icon and dot
    }
 });

export default TabNavigator;