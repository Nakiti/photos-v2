import React from "react";
import { View, Text, StyleSheet } from "react-native";

const PendingRequestsScreen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>No pending requests</Text>
    </View>
  );
};

export default PendingRequestsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white",
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 16,
    color: "#666",
  },
});
