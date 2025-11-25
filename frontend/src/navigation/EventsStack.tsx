import {createNativeStackNavigator} from "@react-navigation/native-stack";
import EventsListScreen from "../features/events/screens/EventsListScreen";
import CreateEventDetailsScreen from "../features/events/screens/CreateEventDetailsScreen";
import ShareEventScreen from "../features/events/screens/ShareEventScreen";
import ArchiveEventsListScreen from "../features/events/screens/ArchiveEventsListScreen";
import DefaultHeader from "../components/DefaultHeader";
import CreateEventSettingsScreen from "../features/events/screens/CreateEventSettingsScreen";
import JoinEventScreen from "../features/events/screens/JoinEventScreen";

const Stack = createNativeStackNavigator();

const EventsStack = () => {
    return (
        <Stack.Navigator initialRouteName="EventsList">
            <Stack.Screen 
                name="EventsList" component={EventsListScreen} 
                options={{
                    headerShown: false
                }}
            />
            <Stack.Screen 
                name="ArchiveEventsList" 
                component={ArchiveEventsListScreen} 
                options={{
                    headerShown: false
                }}
            />
            <Stack.Screen 
                name="CreateEventDetails" 
                component={CreateEventDetailsScreen} 
                options={{
                    header: () => <DefaultHeader title="Create Event" />
                }}
            />
            <Stack.Screen 
                name="CreateEventSettings" 
                component={CreateEventSettingsScreen} 
                options={{
                    header: () => <DefaultHeader title="Event Settings" />
                }}
            />
            <Stack.Screen 
                name="ShareEvent" 
                component={ShareEventScreen} 
                options={{
                    header: () => <DefaultHeader title="Share Your Event" />
                }}    
            />
            <Stack.Screen 
                name="JoinEvent" 
                component={JoinEventScreen} 
                options={{
                    headerShown: true,
                    header: () => <DefaultHeader title="Join an Event" />
                }}
            />
        </Stack.Navigator>
    )
}   

export default EventsStack;