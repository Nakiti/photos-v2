import {createNativeStackNavigator} from "@react-navigation/native-stack";
import GroupsListScreen from "../features/groups/screens/GroupsListScreen";
import CreateGroupDetailsScreen from "../features/groups/screens/CreateGroupDetailsScreen";
import CreateGroupSettingsScreen from "../features/groups/screens/CreateGroupSettingsScreen";
import AddGroupMembersScreen from "../features/groups/screens/AddGroupMembersScreen";
import AddGroupTagsScreen from "../features/groups/screens/AddGroupTagsScreen";
import CreateGalleryChoiceScreen from "../features/groups/screens/CreateGalleryChoiceScreen";
import DefaultHeader from "../components/DefaultHeader";
import DefaultNoBackHeader from "../components/DefaultNoBackHeader";
import NotificationHubScreen from "../features/groups/screens/NotificationHubScreen";

const Stack = createNativeStackNavigator();

const defaultHeaderOptions = {
    headerStyle: {
        backgroundColor: '#fff',
        shadowOpacity: 0,
        elevation: 0,
    },
    headerTitleStyle: {
        fontSize: 20,
        fontWeight: '600',
    },
    headerTintColor: '#111',
};

const GroupsStack = () => {
    return (
        <Stack.Navigator>
            <Stack.Screen 
                name="CreateGalleryChoice" 
                component={CreateGalleryChoiceScreen} 
                options={{
                    header: () => <DefaultHeader title="Create" />
                }}
            />
            <Stack.Screen 
                name="CreateGroupDetails" 
                component={CreateGroupDetailsScreen} 
                options={{
                    header: () => <DefaultHeader title="Create Group" />
                }}
            />
            <Stack.Screen 
                name="CreateGroupSettings" 
                component={CreateGroupSettingsScreen} 
                options={{
                    header: () => <DefaultHeader title="Group Settings" />
                }}
            />
            <Stack.Screen 
                name="AddGroupMembers" 
                component={AddGroupMembersScreen} 
                options={{
                    header: () => <DefaultNoBackHeader title="Add Group Members" />
                }}
                />
            <Stack.Screen 
                name="AddGroupTags" 
                component={AddGroupTagsScreen} 
                options={{
                    header: () => <DefaultNoBackHeader title="Add Group Tags" />
                }}
            />
            <Stack.Screen 
                name="NotificationsHub"
                component={NotificationHubScreen}
                options={{
                    header: () => <DefaultHeader title="Notifications" />
                }}
            />
        </Stack.Navigator>
    )
}

export default GroupsStack;