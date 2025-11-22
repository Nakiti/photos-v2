import { createNativeStackNavigator } from "@react-navigation/native-stack";
import CameraScreen from "../features/camera/CameraScreen";
import PreviewScreen from "../features/camera/PreviewScreen";

const Stack = createNativeStackNavigator();

const CameraStack = () => {

    return (
        <Stack.Navigator initialRouteName="Camera" screenOptions={{headerShown: false}}>
            <Stack.Screen name="Camera" component={CameraScreen}/>
            <Stack.Screen name="Preview" component={PreviewScreen}/>
        </Stack.Navigator>
    )
}

export default CameraStack


