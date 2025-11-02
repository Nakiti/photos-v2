import {createNativeStackNavigator} from "@react-navigation/native-stack";
import GroupsListScreen from "../features/groups/screens/GroupsListScreen";
import CreateGroupDetailsScreen from "../features/groups/screens/CreateGroupDetailsScreen";
import AddGroupMembersScreen from "../features/groups/screens/AddGroupMembersScreen";
import DefaultHeader from "../components/DefaultHeader";

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
        <Stack.Navigator initialRouteName="GroupsList" id="GroupsStack">
            <Stack.Screen 
                name="GroupsList"  
                component={GroupsListScreen} 
                options={{ 
                    headerShown: false
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
                name="AddGroupMembers" 
                component={AddGroupMembersScreen} 
                options={{
                    header: () => <DefaultHeader title="Add Group Members" />
                }}
                />
        </Stack.Navigator>
    )
}

export default GroupsStack;