import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';


type Props = {
  onBack?: () => void;
  onOpenMembers?: () => void;
  onShare?: () => void;
  onOpenSettings?: () => void;
  color?: string; // Optional: to easily change icon colors
  communityId: string;
};

const CommunityHeader: React.FC<Props> = ({ 
  onBack, 
  onOpenMembers, 
  onShare, 
  onOpenSettings,
  color = '#111',
  communityId
}) => {
    const navigation = useNavigation<Any>()


    return (
        <View style={styles.container}>
        {/* Left Side: Back Button */}
        <TouchableOpacity 
            onPress={onBack} 
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
            <Ionicons name="chevron-back" size={20} color={color} />
        </TouchableOpacity>

        {/* Right Side: Members, Share, Settings */}
        <View style={styles.rightRow}>
            <TouchableOpacity 
                onPress={() => navigation.navigate("CommunityMembers", {communityId})} 
                style={styles.iconButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
                <Ionicons name="people-outline" size={20} color={color} />
            </TouchableOpacity>

            <TouchableOpacity 
                onPress={() => navigation.navigate("ShareCommunity", {communityId})} 
                style={styles.iconButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}

            >
                <Ionicons name="share-outline" size={20} color={color} />
            </TouchableOpacity>

            <TouchableOpacity 
                onPress={() => navigation.navigate("CommunitySettings", {communityId})} 
                style={styles.iconButton} // Last one implies specific spacing usually not needed on right
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
                <Ionicons name="settings-outline" size={20} color={color} />
            </TouchableOpacity>
        </View>
        </View>
    );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between', // Pushes left and right content to edges
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    marginTop: 35,
  },
  rightRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    marginLeft: 20, // Spacing between the right-side icons
  },
});

export default CommunityHeader;