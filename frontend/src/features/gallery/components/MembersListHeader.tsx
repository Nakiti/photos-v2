import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from "react-native";
import { useNavigation } from "@react-navigation/native";
import Ionicons from 'react-native-vector-icons/Ionicons';

const MembersListHeader = ({ galleryId }: { galleryId: string }) => {
    const navigation = useNavigation();

    return (
        <View style={styles.root}>
            <SafeAreaView>
                <View style={styles.container}>
                    <View style={styles.leftGroup}>
                        <TouchableOpacity
                            onPress={() => navigation.goBack()}
                            style={styles.backButton}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="chevron-back" size={24} color="#1C1C1E" />
                        </TouchableOpacity>
                        <Text style={styles.title}>Members</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.circleButton}
                        onPress={() => (navigation as any).navigate("AddGalleryMembers", { galleryId })}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="add" size={22} color="#1C1C1E" />
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </View>
    );
};

export default MembersListHeader;

const styles = StyleSheet.create({
    root: {
        backgroundColor: '#FFFFFF',
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#F2F2F7',
    },
    container: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
    },
    leftGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    backButton: {
        padding: 4,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 20,
        fontWeight: '600',
        color: '#1C1C1E',
        letterSpacing: -0.4,
    },
    circleButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F2F2F7',
        alignItems: 'center',
        justifyContent: 'center',
    },
});