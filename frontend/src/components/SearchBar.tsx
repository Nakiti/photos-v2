import React from 'react';
import { StyleSheet, View, TextInput } from 'react-native';
import FontAwesome from 'react-native-vector-icons/FontAwesome';

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
    <View style={styles.searchWrapper}>
        <View style={styles.searchContainer}>
        <FontAwesome
            name="search"
            size={20}
            color="gray"
            style={styles.searchIcon}
        />
        <TextInput
            placeholder={placeholder}
            style={styles.searchInput}
            placeholderTextColor="gray"
            onChangeText={onChangeText}
            value={value}
            autoFocus={autoFocus}
            testID={testID}
        />
        </View>
    </View>

  );
};

const styles = StyleSheet.create({
    searchWrapper: {
        paddingHorizontal: 12
     },
     searchContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#f1f1f1",
        borderRadius: 8,
        paddingHorizontal: 10,
        height: 32,
        marginBottom: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 1.5
     },
     searchIcon: {
        marginRight: 8
     },
     searchInput: {
        flex: 1,
        fontSize: 15,
        paddingVertical: 0,
        color: "#111"
     },
});

export default SearchBar;