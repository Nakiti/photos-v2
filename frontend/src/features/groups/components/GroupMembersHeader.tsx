import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import Ionicons from 'react-native-vector-icons/Ionicons';

const GroupMembersHeader = ({groupId}: {groupId: string}) => {
    const navigation = useNavigation<any>()

    const handleBackPress = () => {
        navigation.goBack();
    }

    return (
        <View style={styles.header}>
            <View style={styles.backContainer}>
                <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={24}  />
                </TouchableOpacity>
                <Text style={styles.title}>Members</Text>
            </View>
        </View>
    );
    
}

export default GroupMembersHeader;

const styles = StyleSheet.create({
    header: {
       flexDirection: "row",
       justifyContent: "space-between",
       alignItems: "center",
       paddingHorizontal: 16,
       paddingBottom: 8,
       backgroundColor: "#fff",
       paddingTop: 52,
       // borderBottomWidth: 1,
       // borderBottomColor: "#f0f0f0",
    },
    backContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    backButton: {
        padding: 4,
    },
    title: {
       fontSize: 22,
       fontWeight: "600",
       color: "#111",
    },
    addButton: {
       backgroundColor: "#f4f4f4",
       borderRadius: 8,
       padding: 4,
       shadowColor: "#000",
       shadowOffset: { width: 0, height: 1 },
       shadowOpacity: 0.05,
       shadowRadius: 2,
       elevation: 1,
    },
 });