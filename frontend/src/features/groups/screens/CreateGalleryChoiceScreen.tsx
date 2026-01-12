import React from "react";
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  SafeAreaView, 
  StatusBar 
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useNavigation, useRoute } from "@react-navigation/native";

const CreateGalleryChoiceScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { communityId } = (route.params as any) || {};

  const handleClose = () => {
    navigation.goBack();
  };

  const goToCreateGroup = () => {
    navigation.navigate("CreateGroupDetails", { communityId });
  };

  const goToCreateEvent = () => {
    navigation.navigate("Events", { 
        screen: "CreateEventDetails", 
        params: { communityId } 
    });
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={styles.safeArea}>
        

        {/* --- Title Section --- */}
        <View style={styles.titleContainer}>
            <Text style={styles.subtitle}>Select the type of gallery you want to build.</Text>
        </View>

        {/* --- Options List --- */}
        <View style={styles.listContainer}>
            
            {/* Option 1: Group */}
            <TouchableOpacity
                style={styles.optionRow}
                onPress={goToCreateGroup}
                activeOpacity={0.7}
            >
                <View style={styles.iconContainer}>
                    <Ionicons name="people" size={28} color="#000" />
                </View>
                <View style={styles.textContainer}>
                    <Text style={styles.optionTitle}>Group</Text>
                    <Text style={styles.optionSubtitle}>A permanent space for friends & family.</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#E5E5EA" />
            </TouchableOpacity>

            <View style={styles.separator} />

            {/* Option 2: Event */}
            <TouchableOpacity
                style={styles.optionRow}
                onPress={goToCreateEvent}
                activeOpacity={0.7}
            >
                <View style={styles.iconContainer}>
                    <Ionicons name="calendar" size={28} color="#000" />
                </View>
                <View style={styles.textContainer}>
                    <Text style={styles.optionTitle}>Event</Text>
                    <Text style={styles.optionSubtitle}>Capture a specific day, trip, or party.</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#E5E5EA" />
            </TouchableOpacity>

            <View style={styles.separator} />

        </View>

      </SafeAreaView>
    </View>
  );
};

export default CreateGalleryChoiceScreen;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  safeArea: {
    flex: 1,
  },
  
  // --- Header ---
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    marginBottom: 24,
    alignItems: 'flex-end', // Close button on right
  },
  closeButton: {
      padding: 4,
      backgroundColor: '#F2F2F7', // Subtle circle bg
      borderRadius: 20,
  },

  // --- Title ---
  titleContainer: {
    paddingHorizontal: 24,
    marginBottom: 40,
  },
  title: {
    fontSize: 34,
    fontWeight: "700",
    color: "#000000",
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    marginTop: 8,
    fontSize: 16,
    color: "#8E8E93",
    lineHeight: 22,
  },

  // --- List ---
  listContainer: {
    paddingHorizontal: 24,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 24, // Generous touch area
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#F2F2F7", // System Gray 6
    alignItems: "center",
    justifyContent: "center",
    marginRight: 20,
  },
  textContainer: {
    flex: 1,
    justifyContent: "center",
    marginRight: 16,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000000",
    marginBottom: 4,
  },
  optionSubtitle: {
    fontSize: 14,
    color: "#8E8E93",
  },
  
  // --- Divider ---
  separator: {
      height: 1,
      backgroundColor: "#F2F2F7",
      marginLeft: 76, // Indented to match text start
  },
});