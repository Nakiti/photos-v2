import React from 'react';
import { StyleSheet, View, TextInput } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

type SearchBarProps = {
  value: string;
  onChangeText: (query: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  testID?: string;
};

const SearchBar = ({
  value,
  onChangeText,
  placeholder = 'Search',
  autoFocus = false,
  testID,
}: SearchBarProps) => {
  return (
    <View style={styles.container}>
        <View style={styles.searchBar}>
            <Ionicons
                name="search"
                size={18}
                color="#8E8E93" // System Gray
                style={styles.icon}
            />
            <TextInput
                placeholder={placeholder}
                style={styles.input}
                placeholderTextColor="#8E8E93"
                onChangeText={onChangeText}
                value={value}
                autoFocus={autoFocus}
                testID={testID}
                clearButtonMode="while-editing" // Native iOS clear button
            />
        </View>
    </View>
  );
};

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: '#FFFFFF',
    },
    searchBar: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#F2F2F7", // System Gray 6 (Standard iOS input bg)
        borderRadius: 10,
        height: 40, // Standard touch height
        paddingHorizontal: 12,
    },
    icon: {
        marginRight: 8,
    },
    input: {
        flex: 1,
        fontSize: 17, // Standard Body Size
        color: "#000000",
        height: '100%', // Full height to capture taps
    },
});

export default SearchBar;