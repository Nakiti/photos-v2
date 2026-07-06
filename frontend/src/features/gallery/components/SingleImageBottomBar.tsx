import React from "react";
import { View, StyleSheet, TouchableOpacity, Text } from "react-native";
import type { LayoutChangeEvent } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";

type Props = {
  visible: boolean;
  dropdownOpen: boolean;
  activeTagName: string;
  onToggleDropdown: () => void;
  onLayout?: (e: LayoutChangeEvent) => void;
  onPressLike?: () => void;
  liked?: boolean;
};

const SingleImageBottomBar = ({
  visible,
  dropdownOpen,
  activeTagName,
  onToggleDropdown,
  onLayout,
  onPressLike,
  liked = false,
}: Props) => {
  return (
    <View
      style={[styles.bottomBar, { opacity: visible ? 1 : 0 }]}
      pointerEvents={visible ? "auto" : "none"}
      onLayout={onLayout}
    >
      <View style={styles.barRow}>
        {/* Empty left slot keeps the centre toggle balanced against the like button */}
        <View style={styles.sideGroup} />

        <View style={styles.bottomBarCenter}>
          <TouchableOpacity
            onPress={onToggleDropdown}
            style={styles.tagToggle}
            activeOpacity={0.8}
          >
            <Ionicons
              name={dropdownOpen ? "chevron-down" : "chevron-up"}
              size={16}
              color="#111"
            />
            <Text style={styles.tagToggleText}>{activeTagName}</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.sideGroup, { justifyContent: "flex-end" }]}>
          <TouchableOpacity
            onPress={onPressLike}
            style={styles.circleBtn}
            activeOpacity={0.8}
          >
            <Ionicons
              name={liked ? "heart" : "heart-outline"}
              size={20}
              color={liked ? "#ef4444" : "#111"}
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default SingleImageBottomBar;

const styles = StyleSheet.create({
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingBottom: 24,
    paddingTop: 8,
    backgroundColor: "#fff",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#e9e9ea",
  },
  barRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  sideGroup: {
    width: 120,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  bottomBarCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  tagToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#f4f4f5",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  tagToggleText: {
    color: "#111",
    fontWeight: "600",
  },
  circleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f4f4f5",
    alignItems: "center",
    justifyContent: "center",
  },
});



