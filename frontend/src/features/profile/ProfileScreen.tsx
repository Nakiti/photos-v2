import React from 'react';
import { View, StyleSheet, Text, Image, TouchableOpacity } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { useUser } from '../../hooks/useUser';
import { ActivityIndicator } from 'react-native-paper';
import FastImage from 'react-native-fast-image';

const ProfileScreen = () => {
   const navigation = useNavigation();
   const {user, isError, isLoading, isSyncing, error} = useUser()

   // if (isLoading) {
   //    return (
   //      <View style={[styles.container, styles.center]}>
   //        <ActivityIndicator size="large" color="#0000ff" />
   //      </View>
   //    );
   // }
  
   // if (isError) {
   //    return (
   //       <View style={[styles.container, styles.center]}>
   //          <Text style={styles.errorText}>Failed to load groups: {error?.message}</Text>
   //       </View>
   //    );
   // }

  return (
    <View style={styles.container}>
         {user && (
            <View style={styles.profileContainer}>
               <View style={styles.avatar}>
                  {!user.avatarUrl ? (
                     <Text style={styles.avatarText}>
                        {user.name[0]}
                     </Text>
                  ) : (
                     <FastImage source={{ uri: user.avatarUrl }} style={styles.avatarImage} />
                  )}
               </View>
               <Text style={styles.name}>{user.name}</Text>
               <Text style={styles.handle}>@{user.handle}</Text>
            </View>
         )}

        <View style={styles.buttonsContainer}>
            {[
               { name: "Edit Profile", icon: "person-outline", route: "EditProfile" },
               { name: "Friends", icon: "people-outline", route: "Friends" },
               { name: "Settings", icon: "settings-outline", route: "ProfileSettings" },
               { name: "Help Center", icon: "help-circle-outline", route: "HelpCenter" },
               { name: "Sign out", icon: "log-out-outline", action: null, type: "action" },
            ].map((item, index) => (
               <TouchableOpacity
                  key={index}
                  style={item.action ? styles.action : styles.button}
                  onPress={() => (item.action ? item.action() : navigation.navigate(item.route))}
               >
                  <Ionicons name={item.icon} size={24} color="black" />
                  <Text style={styles.buttonText}>{item.name}</Text>
               </TouchableOpacity>
            ))}
         </View>
    </View>
  );
};

const styles = StyleSheet.create({
    container: {
       flex: 1,
       backgroundColor: 'white',
       alignItems: 'center',
       paddingTop: 100,
    },
    profileContainer: {
       alignItems: 'center',
       marginBottom: 40,
    },
    avatar: {
       width: 150,
       height: 150,
       borderRadius: 75,
       backgroundColor: '#e0e0e0',
       justifyContent: 'center',
       alignItems: 'center',
       marginBottom: 12,
    },
    avatarText: {
       fontSize: 36,
       fontWeight: 'bold',
       color: 'gray',
    },
    avatarImage: {
       width: '100%',
       height: '100%',
       borderRadius: 75,
    },
    name: {
       fontSize: 30,
       fontWeight: 'bold',
       color: 'black',
       marginBottom: 2
    },
    handle: {
       fontSize: 18,
       color: 'gray',
    },
    buttonsContainer: {
       width: '90%',
    },
    button: {
       flexDirection: 'row',
       alignItems: 'center',
       paddingVertical: 16,
       paddingHorizontal: 20,
       borderRadius: 10,
       backgroundColor: '#f8f8f8',
       marginBottom: 10,
    },
    action: {
       flexDirection: 'row',
       alignItems: 'center',
       paddingVertical: 16,
       paddingHorizontal: 20,
       borderRadius: 10,
       backgroundColor: '#4A90E2',
       marginBottom: 10,
    },
    buttonText: {
       fontSize: 15,
       marginLeft: 16,
       fontWeight: '500',
       color: 'black',
    },
 });

export default ProfileScreen;
