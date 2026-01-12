import {createNativeStackNavigator} from "@react-navigation/native-stack";
import TabNavigator from "./TabNavigator";
import GalleryStack from "./GalleryStack";
import SwiperNavigator from "./SwiperNavigator";
import AuthStack from "./AuthStack";
import { useAuth } from "../hooks/useAuth";
import CameraStack from "./CameraStack";
import EventsStack from "./EventsStack";
import CommunityStack from "./CommunityStack";
import GroupsStack from "./GroupsStack";

const Stack = createNativeStackNavigator();

const RootStack = () => {
    const {isAuthenticated} = useAuth()
    console.log(isAuthenticated)

    return (
        <Stack.Navigator 
            screenOptions={{
                headerShown: false
            }}
        >
            {!isAuthenticated ?
                <Stack.Screen name="Auth" component={AuthStack} />
                :
                <>
                    <Stack.Screen name="TabNavigator" component={TabNavigator} />
                    <Stack.Screen name="Camera" component={CameraStack} />
                    <Stack.Screen name="Gallery" component={GalleryStack} />
                    <Stack.Screen name="Events" component={EventsStack} />
                    <Stack.Screen name="CommunityFlow" component={CommunityStack} />
                    <Stack.Screen name="GroupFlow" component={GroupsStack} />
                </>
            }
        </Stack.Navigator>
    )
}

export default RootStack;