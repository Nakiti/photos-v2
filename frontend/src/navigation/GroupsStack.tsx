import {createNativeStackNavigator} from "@react-navigation/native-stack";
import CreateGroupDetailsScreen from "../features/groups/screens/CreateGroupDetailsScreen";
import CreateGalleryChoiceScreen from "../features/groups/screens/CreateGalleryChoiceScreen";
import ShareGalleryScreen from "../features/gallery/screens/ShareGalleryScreen";
import DefaultHeader from "../components/DefaultHeader";
import DefaultNoBackHeader from "../components/DefaultNoBackHeader";

const Stack = createNativeStackNavigator();

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
                    header: () => <DefaultHeader title="Create Gallery" />
                }}
            />
            <Stack.Screen
                name="ShareGroup"
                component={ShareGalleryScreen}
                options={{
                    header: () => <DefaultNoBackHeader title="Share Gallery" />
                }}
            />
        </Stack.Navigator>
    )
}

export default GroupsStack;
