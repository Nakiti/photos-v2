import React from 'react';
import { View, Image, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import Ionicons from 'react-native-vector-icons/Ionicons';
import User from '../../../db/models/User';

type FriendStatus = 'can_add' | 'pending' | 'member';

type Props = {
  user: User;
  status: FriendStatus;
  onInvite: () => void;
  isInviting: boolean;
  onRemove?: () => void;
};

const AddMemberListItem = ({ user, status, onInvite, isInviting, onRemove }: Props) => {
  
  console.log("user ", user.handle)
  // This component now contains the logic for what to display
  const renderStatusIndicator = () => {
    if (isInviting) {
      return <ActivityIndicator size="small" />;
    }
    

    switch (status) {
      case 'member':
        return <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />;
      case 'pending':
        if (onRemove) {
          return (
            <TouchableOpacity style={styles.iconButton} onPress={onRemove}>
              <Ionicons name="close" size={20} color="#FF3B30" />
            </TouchableOpacity>
          );
        }
        return <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />;
      case 'can_add':
        return (
          <TouchableOpacity style={styles.iconButton} onPress={onInvite}>
            <Ionicons name="add" size={24} color="#007AFF" />
          </TouchableOpacity>
        );
      default:
        return null;
    }
  };

  return (
    <View style={styles.itemContainer}>
      <Image 
        source={{ uri: user.avatarUrl || "https://upload.wikimedia.org/wikipedia/commons/a/ac/Default_pfp.jpg" }} 
        style={styles.avatar} 
      />
      <View style={styles.textContainer}>
        <Text style={styles.name}>{user.name}</Text>
        <Text style={styles.handle}>@{user.handle}</Text>
      </View>
      <View style={styles.statusContainer}>
        {renderStatusIndicator()}
      </View>
    </View>
  );
};

export default AddMemberListItem;

const styles = StyleSheet.create({
    itemContainer: {
       flexDirection: "row",
       alignItems: "center",
       paddingVertical: 10,
       paddingHorizontal: 14,
       backgroundColor: "#fff",
       borderRadius: 10,
       marginBottom: 10,
       borderBottomWidth: 1,
       borderColor: "#eee",
    },
    avatar: {
       width: 42,
       height: 42,
       borderRadius: 21,
       marginRight: 14,
       backgroundColor: "#ddd",
    },
    textContainer: {
       flex: 1,
       justifyContent: "center",
    },
    name: {
       fontSize: 15,
       fontWeight: "600",
       color: "#111",
    },
    handle: {
       fontSize: 13,
       color: "#777",
       marginTop: 2,
    },
    statusContainer: {
       paddingLeft: 10,
       minWidth: 40, // Give it space
       alignItems: 'center',
    },
    iconButton: {
       padding: 6,
       borderRadius: 8,
    },
 });
