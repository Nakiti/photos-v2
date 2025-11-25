import React from "react";
import { View, TouchableOpacity, Text, StyleSheet, Pressable } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";

type TagItem = { id: string; name: string };

type Props = {
  visible: boolean;
  tags: TagItem[];
  activeTagId: string | null;
  onSelect: (tagId: string | null) => void;
  bottomOffset?: number;
};

const SingleImageTagDropdown = ({ visible, tags, activeTagId, onSelect, bottomOffset = 72 }: Props) => {
  if (!visible) return null;
  return (
    <View style={[styles.dropdownContainer, { bottom: bottomOffset + 8 }]}>
      <View style={styles.dropdownPanel}>
        <TouchableOpacity
          style={styles.dropdownItem}
          onPress={() => onSelect(null)}
          activeOpacity={0.85}
        >
          <Text style={[styles.itemText, !activeTagId && styles.itemTextSelected]}>All</Text>
          {!activeTagId ? (
            <Ionicons name="checkmark" size={16} color="#6ee7b7" />
          ) : (
            <View style={{ width: 16 }} />
          )}
        </TouchableOpacity>
        {tags.map((t) => {
          const selected = activeTagId === t.id;
          return (
            <TouchableOpacity
              key={t.id}
              style={styles.dropdownItem}
              onPress={() => onSelect(t.id)}
              activeOpacity={0.85}
            >
              <Text style={[styles.itemText, selected && styles.itemTextSelected]}>{t.name}</Text>
              {selected ? (
                <Ionicons name="checkmark" size={16} color="#6ee7b7" />
              ) : (
                <View style={{ width: 16 }} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

export default SingleImageTagDropdown;

const styles = StyleSheet.create({
  dropdownContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
  },
  dropdownPanel: {
    width: 200,
    maxHeight: 260,
    backgroundColor: "rgba(40,40,40,0.9)",
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
    paddingVertical: 4,
  },
  dropdownItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  itemText: {
    color: "#fff",
    fontSize: 14,
  },
  itemTextSelected: {
    color: "#6ee7b7",
    fontWeight: "700",
  },
});



