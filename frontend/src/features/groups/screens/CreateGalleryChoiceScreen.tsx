import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";

const CreateGalleryChoiceScreen = () => {
  const navigation = useNavigation<any>();

  const goToCreateGroup = () => {
    navigation.navigate("CreateGroupDetails");
  };

  const goToCreateEvent = () => {
    navigation.navigate("Events", { screen: "CreateEventDetails" });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>What would you like to create?</Text>

      <View style={styles.cardsRow}>
        <TouchableOpacity
          style={styles.card}
          onPress={goToCreateGroup}
          activeOpacity={0.9}
          accessibilityRole="button"
          accessibilityLabel="Create a group"
        >
          <View style={styles.iconWrap}>
            <Ionicons name="people-outline" size={28} color="#111" />
          </View>
          <Text style={styles.cardTitle}>Group</Text>
          <Text style={styles.cardSubtitle}>Create a space for friends or family</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.card}
          onPress={goToCreateEvent}
          activeOpacity={0.9}
          accessibilityRole="button"
          accessibilityLabel="Create an event"
        >
          <View style={styles.iconWrap}>
            <Ionicons name="calendar-clear-outline" size={28} color="#111" />
          </View>
          <Text style={styles.cardTitle}>Event</Text>
          <Text style={styles.cardSubtitle}>Capture moments for a specific day</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default CreateGalleryChoiceScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: "600",
    color: "#111",
    marginBottom: 16,
  },
  cardsRow: {
    flexDirection: "row",
    gap: 12,
  },
  card: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    borderRadius: 14,
    padding: 16,
    alignItems: "flex-start",
  },
  iconWrap: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 8,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111",
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 13,
    color: "#666",
  },
});


