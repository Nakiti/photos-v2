import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import ProfileStack from "./ProfileStack";
import GroupsStack from "./GroupsStack";
import EventsStack from "./EventsStack";
import { StyleSheet } from "react-native";
import Ionicons from 'react-native-vector-icons/Ionicons';
import SwiperNavigator from './SwiperNavigator';
import CommunityStack from "./CommunityStack";


const Tab = createBottomTabNavigator()

const TabNavigator = () => {

    return (
        <Tab.Navigator 
            initialRouteName="Groups"
            screenOptions={{
                headerShown: false,
                tabBarStyle: styles.tabBar,
                tabBarIconStyle: styles.tabBarIcon,
            }}
        >
            <Tab.Screen 
                name="Groups" component={GroupsStack}
                options={{
                    tabBarIcon: () => (
                    <Ionicons name="images-outline" size={24} color="black"/>
                    ),
                    tabBarShowLabel: false
                }}
            />
            <Tab.Screen 
                name="Communities" component={CommunityStack}
                options={{
                    tabBarIcon: () => (
                    <Ionicons name="people-outline" size={24} color="black"/>
                    ),
                    tabBarShowLabel: false
                }}
            />
            {/* <Tab.Screen 
                name="Events" component={EventsStack}
                options={{
                    tabBarIcon: () => (
                        <Ionicons name="calendar-clear-outline" size={24} color="black"/>
                    ),
                    tabBarShowLabel: false
                }}
            /> */}
            <Tab.Screen 
                name="Profile" component={ProfileStack}
                options={{
                    tabBarIcon: () => (
                        <Ionicons name="person-outline" size={24} color="black"/>
                    ),
                    tabBarShowLabel: false
                }}
            />
        </Tab.Navigator>
    )
}

const styles = StyleSheet.create({
    tabBar: {
       height: 70,
       backgroundColor: "#ffffff",
       // borderTopWidth: 1,
       // borderTopColor: "#e5e5e5",
       paddingBottom: 8,
       paddingTop: 6,
       shadowColor: "#000",
       shadowOffset: { width: 0, height: -2 },
       shadowOpacity: 0.03,
       shadowRadius: 4,
       elevation: 5,
    },
    tabBarIcon: {
       alignSelf: "center",
    },
 });

export default TabNavigator;