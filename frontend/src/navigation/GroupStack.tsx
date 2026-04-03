import { createNativeStackNavigator } from "@react-navigation/native-stack";
import GroupScreen from "../features/groups/screens/GroupScreen";
import GroupDetailsScreen from "../features/groups/screens/GroupDetailsScreen";
import GroupMemberScreen from "../features/groups/screens/GroupMemberScreen";
import GroupSettingsScreen from "../features/groups/screens/GroupSettingsScreen";
import CreateGroupDetailsScreen from "../features/groups/screens/CreateGroupDetailsScreen";
import ShareGroupScreen from "../features/groups/screens/ShareGroupScreen";
import AddGroupMembersScreen from "../features/groups/screens/AddGroupMembersScreen";
import DefaultHeader from "../components/DefaultHeader";
import EditGroupDetailsScreen from "../features/groups/screens/GroupSettings/EditGroupDetailsScreen";
import EditDeletePermissionScreen from "../features/groups/screens/GroupSettings/EditDeleteMemberPermissionScreen";
import EditJoinPermissionScreen from "../features/groups/screens/GroupSettings/EditJoinPermissionScreen";
import EditAddPermissionScreen from "../features/groups/screens/GroupSettings/EditAddPermissionScreen";
import PendingRequestsScreen from "../features/groups/screens/GroupSettings/PendingRequestsScreen";
import ChangeOwnershipScreen from "../features/groups/screens/GroupSettings/ChangeOwnershipScreen";

const Stack = createNativeStackNavigator();

const GroupStack = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Group"
        component={GroupScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="GroupDetails"
        component={GroupDetailsScreen}
        options={{
          header: () => <DefaultHeader title="Group Details" />,
        }}
      />
      <Stack.Screen
        name="GroupMembers"
        component={GroupMemberScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="GroupSettings"
        component={GroupSettingsScreen}
        options={{
          header: () => <DefaultHeader title="Settings"/>
        }}
      />
      <Stack.Screen
        name="CreateGroupDetails"
        component={CreateGroupDetailsScreen}
        options={{
          header: () => <DefaultHeader title="Create Group" />,
        }}
      />
      <Stack.Screen
        name="ShareGroup"
        component={ShareGroupScreen}
        options={{
          header: () => <DefaultHeader title="Share Group" />,
        }}
      />
      <Stack.Screen
        name="AddGroupMembers"
        component={AddGroupMembersScreen}
        options={{
          header: () => <DefaultHeader title="Add Members" />,
        }}
      />
      <Stack.Screen
        name="EditAddPermission"
        component={EditAddPermissionScreen}
        options={{
          header: () => <DefaultHeader title="Edit Add Permission"/>
        }}
      />
      <Stack.Screen
        name="EditJoinPermission"
        component={EditJoinPermissionScreen}
        options={{
          header: () => <DefaultHeader title="Edit Add Permission"/>
        }}
      />
      <Stack.Screen
        name="EditDeletePermission"
        component={EditDeletePermissionScreen}
        options={{
          header: () => <DefaultHeader title="Edit Add Permission"/>
        }}
      />
      <Stack.Screen
        name="EditGroupDetails"
        component={EditGroupDetailsScreen}
        options={{
          header: () => <DefaultHeader title="Edit Group Details"/>
        }}
      />
      <Stack.Screen
        name="PendingRequests"
        component={PendingRequestsScreen}
        options={{
          header: () => <DefaultHeader title="Pending Requests"/>
        }}
      />
      <Stack.Screen
        name="ChangeOwnership"
        component={ChangeOwnershipScreen}
        options={{
          header: () => <DefaultHeader title="Change Ownership"/>
        }}
      />
    </Stack.Navigator>
  );
};

export default GroupStack;
