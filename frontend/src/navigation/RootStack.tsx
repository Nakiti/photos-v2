import {createNativeStackNavigator} from "@react-navigation/native-stack";
import TabNavigator from "./TabNavigator";
import GalleryStack from "./GalleryStack";
import SwiperNavigator from "./SwiperNavigator";
import AuthStack from "./AuthStack";
import { useAuth } from "../hooks/useAuth";
import CameraStack from "./CameraStack";
import GroupStack from "./GroupStack";
import GalleriesStack from "./GalleriesStack";
import ProfileStack from "./ProfileStack";
import JoinStack from "./JoinStack";

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
                    <Stack.Screen name="GroupFlow" component={GroupStack} />
                    <Stack.Screen name="GalleryFlow" component={GalleriesStack} />
                    <Stack.Screen name="ProfileFlow" component={ProfileStack} />
                    <Stack.Screen name="JoinFlow" component={JoinStack} />
                </>
            }
        </Stack.Navigator>
    )
}

export default RootStack;
