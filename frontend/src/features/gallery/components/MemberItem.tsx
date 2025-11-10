import { View, Text, TouchableOpacity, Image, StyleSheet } from "react-native";
import Icon from "react-native-vector-icons/Ionicons";

type MemberItemProps = {
    name: string;
    handle: string;
    avatarUri?: string;
    role: string;
    onPressLeft?: () => void;
    onPressRight?: () => void;
};

const MemberItem = ({ role, name, handle, avatarUri, onPressLeft, onPressRight }: MemberItemProps) => {

    return (
        <View style={styles.container}>
            <TouchableOpacity style={styles.leftArea} onPress={onPressLeft} activeOpacity={0.8}>
                <Image
                    source={{
                        uri:
                            avatarUri ||
                            "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS0Wr3oWsq6KobkPqznhl09Wum9ujEihaUT4Q&s",
                    }}
                    style={styles.avatar}
                />
                <View style={styles.texts}>
                    <View style={styles.nameRow}>
                        <Text style={styles.name} numberOfLines={1}>{name}</Text>
                        {role ? (
                            <View style={styles.badge}>
                                <Text style={styles.badgeText} numberOfLines={1}>{role}</Text>
                            </View>
                        ) : null}
                    </View>
                    <Text style={styles.handle} numberOfLines={1}>@{handle}</Text>
                </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.rightArea} onPress={onPressRight} activeOpacity={0.7}>
                <Icon name="ellipsis-vertical" size={18} color="#666" />
            </TouchableOpacity>
        </View>
    )
}

export default MemberItem

const styles = StyleSheet.create({
    container: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: "#fff",
        borderBottomWidth: 1,
        borderBottomColor: "#eee",
    },
    leftArea: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: "#ddd",
        marginRight: 12,
    },
    texts: {
        flex: 1,
        justifyContent: "center",
    },
    nameRow: {
        flexDirection: "row",
        alignItems: "center",
        maxWidth: "100%",
    },
    name: {
        fontSize: 16,
        fontWeight: "600",
        color: "#222",
        flexShrink: 1,
    },
    handle: {
        fontSize: 12,
        color: "#888",
        marginTop: 2,
    },
    rightArea: {
        paddingHorizontal: 8,
        paddingVertical: 6,
    },
    badge: {
        marginLeft: 8,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
        backgroundColor: "#F1F5F9",
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },
    badgeText: {
        fontSize: 10,
        fontWeight: "700",
        color: "#475569",
    },
})