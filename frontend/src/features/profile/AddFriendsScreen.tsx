import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import FriendsListItem from './components/FriendsListItem';

type Friend = {
  id: string;
  name: string;
  handle: string;
  avatar?: string;
};

const AddFriendsScreen = () => {
  const [value, setValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [searchResult, setSearchResult] = useState<Friend | null>(null);

  // Presentational placeholder requests
  const outgoingRequests: Friend[] = [
    { id: '1', name: 'Alex Johnson', handle: 'alexj', avatar: undefined },
    { id: '2', name: 'Maya Patel', handle: 'mayap', avatar: undefined },
  ];
  const incomingRequests: Friend[] = [
    { id: '3', name: 'Chris Lee', handle: 'chrisl', avatar: undefined },
    { id: '4', name: 'Taylor Kim', handle: 'taylork', avatar: undefined },
  ];

  const handleSearch = () => {
    if (!value.trim()) return;
    setIsLoading(true);
    // Presentational: simulate a quick result without API
    setTimeout(() => {
      setSearchResult({ id: 'sr-1', name: 'Sample User', handle: value.trim() });
      setIsLoading(false);
    }, 400);
  };

  return (
    <View style={styles.container}>
      <ScrollView>
        {/* Social Media Sharing Options (presentational) */}
        <View style={styles.shareOptions}>
          <TouchableOpacity style={styles.shareButton}>
            <FontAwesome name="facebook" size={20} color="#1877F2" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.shareButton}>
            <FontAwesome name="twitter" size={20} color="#1DA1F2" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.shareButton}>
            <FontAwesome name="whatsapp" size={20} color="#25D366" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.shareButton}>
            <Ionicons name="mail" size={20} color="black" />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchBar}
            placeholder="Enter a name or handle"
            placeholderTextColor="gray"
            value={value}
            onChangeText={setValue}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            editable={!isLoading}
          />
          <TouchableOpacity style={styles.searchButton} onPress={handleSearch} disabled={isLoading}>
            {isLoading ? (
              <ActivityIndicator size="small" color="gray" />
            ) : (
              <Ionicons name='search-outline' size={16} />
            )}
          </TouchableOpacity>
        </View>

        {/* Loading indicator beneath search bar */}
        {isLoading ? <ActivityIndicator size="large" color="gray" style={{ marginTop: 10 }} /> : null}

        {/* Optional search result (presentational) */}
        {searchResult ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Search result</Text>
            <FriendsListItem
              id={searchResult.id}
              avatar={searchResult.avatar}
              name={searchResult.name}
              handle={searchResult.handle}
              icon="add"
              handleRemove={() => { /* presentational no-op */ }}
            />
          </View>
        ) : null}

        {/* Outgoing Friend Requests */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Outgoing requests</Text>
          {outgoingRequests.map((req) => (
            <FriendsListItem
              key={req.id}
              id={req.id}
              avatar={req.avatar}
              name={req.name}
              handle={req.handle}
              icon="close"
              handleRemove={() => { /* presentational no-op */ }}
            />
          ))}
        </View>

        {/* Incoming Friend Requests */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Incoming requests</Text>
          {incomingRequests.map((req) => (
            <FriendsListItem
              key={req.id}
              id={req.id}
              avatar={req.avatar}
              name={req.name}
              handle={req.handle}
              icon="remove"
              handleRemove={() => { /* presentational no-op */ }}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
    paddingHorizontal: 16,
    // paddingTop: 16,
  },
  shareOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: "#f0f0f0",
    padding: 12,
    borderRadius: 8
  },
  shareButton: {
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
    borderRadius: 10,
    paddingHorizontal: 10,
    marginTop: 12
  },
  searchBar: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: "#333",
  },
  searchButton: {
    marginLeft: 10,
  },
  section: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
    paddingHorizontal: 2,
  },
});

export default AddFriendsScreen;