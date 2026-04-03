import {createNativeStackNavigator} from "@react-navigation/native-stack";
import ProfileScreen from "../features/profile/screens/ProfileScreen";
import EditProfileScreen from "../features/profile/screens/EditProfileScreen";
import DefaultHeader from "../components/DefaultHeader";
import DataSyncSettingsScreen from "../features/profile/screens/ProfileSettings/DataSyncSettingsScreen";
import NotificationSettingsScreen from "../features/profile/screens/ProfileSettings/NotificationSettingsScreen";
import HelpCenterScreen from "../features/profile/screens/HelpCenterScreen";

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
                name="EditProfile"
                component={EditProfileScreen}
                options={{
                    header: () => <DefaultHeader title="Edit Profile" />
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
            <Stack.Screen
                name="HelpCenter"
                component={HelpCenterScreen}
                options={{
                    header: () => <DefaultHeader title="Help Center" />
                }}
            />
        </Stack.Navigator>
    )
}

export default ProfileStack;
