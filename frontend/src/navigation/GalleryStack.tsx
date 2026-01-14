import {createNativeStackNavigator} from "@react-navigation/native-stack";
import GalleryScreen from "../features/gallery/screens/GalleryScreen";
import GalleryDetailsScreen from "../features/gallery/screens/GalleryDetailsScreen";
import GallerySettingsScreen from "../features/gallery/screens/GallerySettingsScreen";
import GalleryPermissionScreen from "../features/gallery/screens/GalleryPermissionScreen";
import GalleryMembersScreen from "../features/gallery/screens/GalleryMembersScreen";
import AddGalleryMembersScreen from "../features/gallery/screens/AddGalleryMembersScreen";
import SingleImageScreen from "../features/gallery/screens/SingleImageScreen";
import EditGalleryDetailsScreen from "../features/gallery/screens/GallerySettings/EditGalleryDetailsScreen";
import EditGalleryEventScreen from "../features/gallery/screens/GallerySettings/EditGalleryEventScreen";
import EditPermissionScreen from "../features/gallery/screens/GallerySettings/EditPermissionScreen";
import EditAddMembersPermissionScreen from "../features/gallery/screens/GallerySettings/EditAddMembersPermissionScreen";
import EditDeletePermissionScreen from "../features/gallery/screens/GallerySettings/EditDeletePermissionScreen";
import EditJoinPermissionScreen from "../features/gallery/screens/GallerySettings/EditJoinPermissionScreen";
import ChangeOwnerScreen from "../features/gallery/screens/GallerySettings/ChangeOwnerScreen";
import DefaultHeader from "../components/DefaultHeader";
import GalleryTagsScreen from "../features/gallery/screens/GalleryTagsScreen";
import EditRequireApprovalScreen from "../features/gallery/screens/GallerySettings/EditRequireApprovalScreen";
import EditRequirePictureReviewScreen from "../features/gallery/screens/GallerySettings/EditRequirePictureReviewScreen";
import EditShareEventLinkScreen from "../features/gallery/screens/GallerySettings/EditShareEventLinkScreen";
import PendingRequestsScreen from "../features/gallery/screens/GallerySettings/PendingRequestsScreen";
import PendingImagesScreen from "../features/gallery/screens/PendingImagesScreen";
import ShareGalleryScreen from "../features/gallery/screens/ShareGalleryScreen";

const Stack = createNativeStackNavigator();

const GalleryStack = () => {
    return (
        <Stack.Navigator 
            initialRouteName="Gallery"
            screenOptions={{
                headerShown: false
            }}
        >
            <Stack.Screen name="Gallery" component={GalleryScreen} 
                options={{
                    headerShown: false
                }}
            />
            <Stack.Screen 
                name="GalleryDetails" 
                component={GalleryDetailsScreen} 
                options={{
                    headerShown: true,
                    header: () => <DefaultHeader title="Details"/>
                }}
            />
            <Stack.Screen 
                name="GallerySettings" 
                component={GallerySettingsScreen} 
                options={{
                    headerShown: true,
                    header: () => <DefaultHeader title="Settings"/>
                }}
            />
            <Stack.Screen name="GalleryPermission" component={GalleryPermissionScreen} />
            <Stack.Screen 
                name="GalleryMembers" 
                component={GalleryMembersScreen} 
                options={{
                    headerShown: true,
                    header: () => <DefaultHeader title="Members"/>
                }}
            />
            <Stack.Screen 
                name="AddGalleryMembers" 
                component={AddGalleryMembersScreen} 
                options={{
                    headerShown: true,
                    header: () => <DefaultHeader title="Add Members"/>
                }}
            />
            <Stack.Screen name="SingleImage" component={SingleImageScreen} />
            <Stack.Screen 
                name="GalleryTags" 
                component={GalleryTagsScreen as any}
                options={{
                    headerShown: true,
                    header: () => <DefaultHeader title="Tags"/>
                }}
            />
            <Stack.Screen 
                name="EditGalleryDetails" 
                component={EditGalleryDetailsScreen} 
                options={{
                    headerShown: true,
                    header: () => <DefaultHeader title="Edit Details"/>
                }}
            /> 
            <Stack.Screen 
                name="EditGalleryEvent"
                component={EditGalleryEventScreen as any}
                options={{
                    headerShown: true,
                    header: () => <DefaultHeader title="Event"/>
                }}
            />
            <Stack.Screen name="EditPermission" component={EditPermissionScreen as any}
                options={{
                    headerShown: true,
                    header: () => <DefaultHeader title="Permission"/>
                }}
            />
            <Stack.Screen name="EditAddMembersPermission" component={EditAddMembersPermissionScreen as any}
                options={{
                    headerShown: true,
                    header: () => <DefaultHeader title="Add Members Permission"/>
                }}
            />
            <Stack.Screen name="EditDeletePermission" component={EditDeletePermissionScreen as any}
                options={{
                    headerShown: true,
                    header: () => <DefaultHeader title="Delete Permission"/>
                }}
            />
            <Stack.Screen name="EditJoinPermission" component={EditJoinPermissionScreen as any}
                options={{
                    headerShown: true,
                    header: () => <DefaultHeader title="Join Permission"/>
                }}
            />
            <Stack.Screen name="ChangeOwner" component={ChangeOwnerScreen as any}
                options={{
                    headerShown: true,
                    header: () => <DefaultHeader title="Change Owner"/>
                }}
            />
            <Stack.Screen name="EditRequireApproval" component={EditRequireApprovalScreen as any}
                options={{
                    headerShown: true,
                    header: () => <DefaultHeader title="Require Join Approval"/>
                }}
            />
            <Stack.Screen name="EditRequirePictureReview" component={EditRequirePictureReviewScreen as any}
                options={{
                    headerShown: true,
                    header: () => <DefaultHeader title="Require Picture Review"/>
                }}
            />
            <Stack.Screen name="EditShareEventLink" component={EditShareEventLinkScreen as any}
                options={{
                    headerShown: true,
                    header: () => <DefaultHeader title="Edit Share Event Link"/>
                }}
            />
            <Stack.Screen name="PendingRequests" component={PendingRequestsScreen as any}
                options={{
                    headerShown: true,
                    header: () => <DefaultHeader title="Pending Requests"/>
                }}
            />
            <Stack.Screen name="PendingImages" component={PendingImagesScreen as any}
                options={{
                    headerShown: false,
                }}
            />
            <Stack.Screen name="ShareGallery" component={ShareGalleryScreen as any}
                options={{
                    headerShown: true,
                    header: () => <DefaultHeader title="Share Gallery" />
                }}
            />
        </Stack.Navigator>
    )
}

export default GalleryStack;