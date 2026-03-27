import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from "react-native";
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from "@react-navigation/native";

const CommunityListHeader = () => {
  const navigation = useNavigation();

  return (
    <View style={styles.root}>
      <SafeAreaView>
        <View style={styles.container}>
          <Text style={styles.title}>Groups</Text>
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => (navigation as any).navigate("JoinCommunity")}
              activeOpacity={0.5}
              accessibilityRole="button"
              accessibilityLabel="Scan QR Code"
            >
              <Ionicons name="scan-outline" size={18} color="#3A3A3A" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.iconButton, styles.iconButtonPrimary]}
              onPress={() => (navigation as any).navigate("CommunityFlow", { screen: "CreateCommunityDetails" })}
              activeOpacity={0.5}
              accessibilityRole="button"
              accessibilityLabel="Create Community"
            >
              <Ionicons name="add" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
};

export default CommunityListHeader;

const styles = StyleSheet.create({
  root: {
    backgroundColor: "#FAFAFA",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E5E5",
  },
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111111",
    letterSpacing: -0.6,
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#EFEFEF",
    alignItems: "center",
    justifyContent: "center",
  },
  iconButtonPrimary: {
    backgroundColor: "#111111",
  },
});