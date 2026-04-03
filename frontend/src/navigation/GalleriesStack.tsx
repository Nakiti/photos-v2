import {createNativeStackNavigator} from "@react-navigation/native-stack";
import CreateGalleryDetailsScreen from "../features/galleries/screens/CreateGalleryDetailsScreen";
import CreateGallerySettingsScreen from "../features/galleries/screens/CreateGallerySettingsScreen";
import AddGalleryMembersScreen from "../features/galleries/screens/AddGalleryMembersScreen";
import AddGalleryTagsScreen from "../features/galleries/screens/AddGalleryTagsScreen";
import ShareGalleryScreen from "../features/gallery/screens/ShareGalleryScreen";
import DefaultHeader from "../components/DefaultHeader";
import DefaultNoBackHeader from "../components/DefaultNoBackHeader";

const Stack = createNativeStackNavigator();

const GalleriesStack = () => {
    return (
        <Stack.Navigator>
            <Stack.Screen
                name="CreateGalleryDetails"
                component={CreateGalleryDetailsScreen}
                options={{
                    header: () => <DefaultHeader title="Create Gallery" />
                }}
            />
            <Stack.Screen
                name="CreateGallerySettings"
                component={CreateGallerySettingsScreen}
                options={{
                    header: () => <DefaultHeader title="Gallery Settings" />
                }}
            />
            <Stack.Screen
                name="AddGalleryMembers"
                component={AddGalleryMembersScreen}
                options={{
                    header: () => <DefaultHeader title="Add Members" />
                }}
            />
            <Stack.Screen
                name="AddGalleryTags"
                component={AddGalleryTagsScreen}
                options={{
                    header: () => <DefaultHeader title="Add Tags" />
                }}
            />
            <Stack.Screen
                name="ShareGallery"
                component={ShareGalleryScreen}
                options={{
                    header: () => <DefaultNoBackHeader title="Share Gallery" />
                }}
            />
        </Stack.Navigator>
    )
}

export default GalleriesStack;
