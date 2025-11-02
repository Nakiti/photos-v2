import { View, Image, Text, TouchableOpacity, StyleSheet } from "react-native"
import Ionicons from 'react-native-vector-icons/Ionicons';

const FriendsListItem = ({id, avatar, name, handle, handleRemove, icon}) => {

    return (
        <View key={id} style={styles.requestItem}>
            <Image source={{ uri: avatar || "https://upload.wikimedia.org/wikipedia/commons/a/ac/Default_pfp.jpg" }} style={styles.avatar} />
            <View style={styles.textContainer}>
            <Text style={styles.name}>{name}</Text>
            <Text style={styles.handle}>@{handle}</Text>
            </View>
            <TouchableOpacity style={styles.iconButton} onPress={() => handleRemove(id)}>
            <Ionicons name={icon || "close"} size={16} color="#007AFF" />
            </TouchableOpacity>
        </View>
    )
}

export default FriendsListItem;

const styles = StyleSheet.create({
    requestItem: {
       flexDirection: "row",
       alignItems: "center",
       paddingVertical: 10,
       paddingHorizontal: 14,
       backgroundColor: "#fff",
       borderRadius: 10,
       marginBottom: 10,
       borderBottomWidth: 1,
       borderColor: "#eee",
    },
    avatar: {
       width: 42,
       height: 42,
       borderRadius: 21,
       marginRight: 14,
       backgroundColor: "#ddd",
    },
    textContainer: {
       flex: 1,
       justifyContent: "center",
    },
    name: {
       fontSize: 15,
       fontWeight: "600",
       color: "#111",
    },
    handle: {
       fontSize: 13,
       color: "#777",
       marginTop: 2,
    },
    iconButton: {
       padding: 6,
       borderRadius: 8,
    },
 });