import {createNativeStackNavigator} from "@react-navigation/native-stack";
import ProfileScreen from "../features/profile/ProfileScreen";
import FriendsScreen from "../features/profile/FriendsScreen";
import EditProfileScreen from "../features/profile/EditProfileScreen";
import ProfileSettingsScreen from "../features/profile/ProfileSettingsScreen";
import DefaultHeader from "../components/DefaultHeader";
import AddFriendsScreen from "../features/profile/AddFriendsScreen";

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
        </Stack.Navigator>
    )
}

export default ProfileStack;