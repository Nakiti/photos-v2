import { createNativeStackNavigator } from "@react-navigation/native-stack";
import CommunitiesListScreen from "../features/communities/screens/CommunitiesListScreen";
import CommunityScreen from "../features/communities/screens/CommunityScreen";
import CommunityDetailsScreen from "../features/communities/screens/CommunityDetailsScreen";
import CommunityMemberScreen from "../features/communities/screens/CommunityMemberScreen";
import CommunitySettingsScreen from "../features/communities/screens/CommunitySettingsScreen";
import CreateCommunityDetailsScreen from "../features/communities/screens/CreateCommunityDetailsScreen";
import CreateCommunitySettingsScreen from "../features/communities/screens/CreateCommunitySettingsScreen";
import ShareCommunityScreen from "../features/communities/screens/ShareCommunityScreen";
import DefaultHeader from "../components/DefaultHeader";
import DefaultNoBackHeader from "../components/DefaultNoBackHeader";
import AddCommunityMembersScreen from "../features/communities/screens/AddCommunityMembersScreen";
import EditCommunityDetailsScreen from "../features/communities/screens/CommunitySettings/EditCommunityDetailsScreen";
import EditDeletePermissionScreen from "../features/communities/screens/CommunitySettings/EditDeleteMemberPermissionScreen";
import EditJoinPermissionScreen from "../features/communities/screens/CommunitySettings/EditJoinPermissionScreen";
import EditAddPermissionScreen from "../features/communities/screens/CommunitySettings/EditAddPermissionScreen";

const Stack = createNativeStackNavigator();

const CommunityStack = () => {
  return (
    <Stack.Navigator initialRouteName="CommunitiesList">
      <Stack.Screen
        name="CommunitiesList"
        component={CommunitiesListScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="Community"
        component={CommunityScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="CommunityDetails"
        component={CommunityDetailsScreen}
        options={{
          header: () => <DefaultHeader title="Community Details" />,
        }}
      />
      <Stack.Screen
        name="CommunityMembers"
        component={CommunityMemberScreen}
        options={{
          headerShown: false,
          // header: () => <DefaultHeader title="Members"/>
        }}
      />
      <Stack.Screen
        name="CommunitySettings"
        component={CommunitySettingsScreen}
        options={{
          header: () => <DefaultHeader title="Settings"/>
        }}
      />
      <Stack.Screen
        name="CreateCommunityDetails"
        component={CreateCommunityDetailsScreen}
        options={{
          header: () => <DefaultHeader title="Create Community" />,
        }}
      />
      <Stack.Screen
        name="CreateCommunitySettings"
        component={CreateCommunitySettingsScreen}
        options={{
          header: () => <DefaultNoBackHeader title="Community Settings" />,
        }}
      />
      <Stack.Screen
        name="ShareCommunity"
        component={ShareCommunityScreen}
        options={{
          header: () => <DefaultHeader title="Share" />,
        }}
      />
      <Stack.Screen
        name="AddCommunityMembers"
        component={AddCommunityMembersScreen}
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
        name="EditCommunityDetails"
        component={EditCommunityDetailsScreen}
        options={{
          header: () => <DefaultHeader title="Edit Add Permission"/>
        }}
      />
    </Stack.Navigator>
  );
};

export default CommunityStack;


