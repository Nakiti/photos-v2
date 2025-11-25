import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import type { LayoutChangeEvent } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";

type Props = {
  visible: boolean;
  uploaderName: string;
  takenAt?: string;
  onBack: () => void;
  onLayout?: (e: LayoutChangeEvent) => void;
};

const SingleImageHeader = ({ visible, uploaderName, takenAt, onBack, onLayout }: Props) => {
  return (
    <View
      style={[styles.header, { opacity: visible ? 1 : 0 }]}
      pointerEvents={visible ? "auto" : "none"}
      onLayout={onLayout}
    >
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={onBack} style={styles.roundButton}>
          <Ionicons name="chevron-back" size={20} color="#111" />
        </TouchableOpacity>
        <View style={styles.titleBlock}>
          <Text numberOfLines={1} style={styles.title}>{uploaderName || "Photo"}</Text>
          {!!takenAt && <Text numberOfLines={1} style={styles.subtitle}>{takenAt}</Text>}
        </View>
        <View style={styles.rightPlaceholder} />
      </View>
    </View>
  );
};

export default SingleImageHeader;

const styles = StyleSheet.create({
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 56,
    paddingBottom: 8,
    paddingHorizontal: 12,
    backgroundColor: "#fff",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e9e9ea",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  roundButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f2f2f7",
    alignItems: "center",
    justifyContent: "center",
  },
  titleBlock: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  title: {
    color: "#111",
    fontSize: 15,
    fontWeight: "700",
  },
  subtitle: {
    marginTop: 2,
    color: "#6b7280",
    fontSize: 12,
  },
  rightPlaceholder: {
    width: 32,
    height: 32,
  },
});



