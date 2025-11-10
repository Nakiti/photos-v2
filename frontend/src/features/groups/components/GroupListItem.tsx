import React from 'react';
import { StyleSheet, View, TouchableOpacity, Image } from 'react-native';
import { Text } from 'react-native-paper';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {useNavigation} from '@react-navigation/native';
import FastImage from 'react-native-fast-image';

export type GroupListItemProps = {
  id: string;
  icon: string;
  title: string;
  lastUploadedBy: string;
  unseenCount: number;
  lastUpdated: string;
  onPress?: (id: string) => void;
};

const getTimeAgo = (dateString: string) => {
    if (!dateString) return "--";
    const now = new Date();
    const uploadedDate = new Date(dateString);
    const diffMs = now.getTime() - uploadedDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins} min ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hr${diffHours === 1 ? "" : "s"} ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
};

const GroupListItem = ({ id, icon, title, lastUploadedBy, unseenCount, lastUpdated, onPress }: GroupListItemProps) => {
  
  const navigation = useNavigation();
    return (
        <TouchableOpacity 
            style={styles.groupItem} 
            onPress={onPress}
        >
            
            <FastImage source={{ uri: icon || "https://www.shutterstock.com/image-vector/premium-picture-icon-logo-line-260nw-749843887.jpg" }} style={styles.groupImage} />
        
            <View style={styles.groupInfo}>
            <View style={styles.nameRow}>
                <Text style={styles.groupName} numberOfLines={1}>{title}</Text>
                <Text style={styles.groupTime}>{getTimeAgo(lastUpdated)}</Text>
            </View>
            <Text style={styles.groupMessage} numberOfLines={1}>
                {lastUploadedBy ? `${lastUploadedBy} took a picture.` : "No Activity"}
            </Text>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    // Styles are simplified as swipe functionality is removed
    groupItem: {
       flexDirection: "row",
       alignItems: "center",
       paddingVertical: 12,
       paddingHorizontal: 16,
       // borderBottomWidth: 1,
       borderBottomColor: "#f0f0f0",
       backgroundColor: '#fff',
    },
    groupImage: {
       width: 52,
       height: 52,
       borderRadius: 8,
       marginRight: 12,
       backgroundColor: "#eaeaea",
    },
    placeholderImage: {
       justifyContent: 'center',
       alignItems: 'center',
    },
    placeholderText: {
       color: '#555',
       fontWeight: 'bold',
       fontSize: 18,
    },
    groupInfo: {
       flex: 1,
       justifyContent: "center",
    },
    nameRow: {
       flexDirection: "row",
       justifyContent: "space-between",
       alignItems: "center",
    },
    groupName: {
       fontSize: 16,
       fontWeight: "600",
       color: "#111",
       flex: 1, // Allow name to take space but not push time away
    },
    groupMessage: {
       fontSize: 14,
       color: "#6e6e6e",
       marginTop: 2,
    },
    groupTime: {
       fontSize: 12,
       color: "#999",
       marginLeft: 8,
    },
 });
export default GroupListItem;


