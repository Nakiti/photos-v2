import {createNativeStackNavigator} from "@react-navigation/native-stack";
import ProfileScreen from "../features/profile/screens/ProfileScreen";
import FriendsScreen from "../features/profile/screens/FriendsScreen";
import EditProfileScreen from "../features/profile/screens/EditProfileScreen";
import ProfileSettingsScreen from "../features/profile/screens/ProfileSettingsScreen";
import DefaultHeader from "../components/DefaultHeader";
import AddFriendsScreen from "../features/profile/screens/AddFriendsScreen";
import DataSyncSettingsScreen from "../features/profile/screens/ProfileSettings/DataSyncSettingsScreen";
import NotificationSettingsScreen from "../features/profile/screens/ProfileSettings/NotificationSettingsScreen";

const Stack = createNativeStackNavigator();

const ProfileStack = () => {
    return (
        <Stack.Navigator>
            <Stack.Screen 
                name="Profile" 
                component={ProfileScreen} 
                options={{
                    headerShown: false
                }}
            />
            <Stack.Screen 
                name="Friends" 
                component={FriendsScreen} 
                options={{
                    headerShown: false
                }}
            />
            <Stack.Screen 
                name="AddFriends" 
                component={AddFriendsScreen} 
                options={{
                    header: () => <DefaultHeader title="Add Friends" />
                }}
            />
            <Stack.Screen 
                name="EditProfile" 
                component={EditProfileScreen} 
                options={{
                    header: () => <DefaultHeader title="Edit Profile" />
                }}
            />
            <Stack.Screen 
                name="ProfileSettings" 
                component={ProfileSettingsScreen} 
                options={{
                    header: () => <DefaultHeader title="Profile Settings" />
                }}
            />
            <Stack.Screen 
                name="NotificationSettings"
                component={NotificationSettingsScreen}
                options={{
                    header: () => <DefaultHeader title="Notifications" />
                }}
            />
            <Stack.Screen 
                name="DataSyncSettings"
                component={DataSyncSettingsScreen}
                options={{
                    header: () => <DefaultHeader title="Data Sync"/>
                }}
            />
        </Stack.Navigator>
    )
}

export default ProfileStack;