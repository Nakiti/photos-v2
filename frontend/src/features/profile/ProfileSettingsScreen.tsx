import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

type DummySettings = {
   appearance: string;
   pauseNotifications: boolean;
   likeNotifications: boolean;
   groupMessageSound: string;
   directMessageSound: string;
   enhancedNotifications: boolean;
};

const dummySettings: DummySettings = {
   appearance: 'System Default',
   pauseNotifications: false,
   likeNotifications: true,
   groupMessageSound: 'Sigh',
   directMessageSound: 'Daps',
   enhancedNotifications: false,
};

const ProfileSettingsScreen: React.FC = () => {
   return (
      <ScrollView style={styles.container}>
         <View style={styles.section}>
            <TouchableOpacity style={styles.item} disabled>
               <Text style={styles.itemText}>Appearance</Text>
               <View style={styles.itemValueContainer}>
                  <Text style={styles.itemValue}>{dummySettings.appearance}</Text>
                  <Ionicons name="chevron-forward" size={20} color="gray" />
               </View>
            </TouchableOpacity>
         </View>

         <View style={styles.section}>
            <Text style={styles.sectionHeader}>Notifications and sounds</Text>

            <TouchableOpacity style={styles.item} disabled>
               <Text style={styles.itemText}>Pause notifications</Text>
               <Switch
                  trackColor={{ false: "#ddd", true: "#4CAF50" }}
                  thumbColor={dummySettings.pauseNotifications ? "#f5dd4b" : "#f4f3f4"}
                  value={dummySettings.pauseNotifications}
                  disabled
               />
            </TouchableOpacity>

            <TouchableOpacity style={styles.item} disabled>
               <Text style={styles.itemText}>Like notifications</Text>
               <Switch
                  trackColor={{ false: "#ddd", true: "#4CAF50" }}
                  thumbColor={dummySettings.likeNotifications ? "#f5dd4b" : "#f4f3f4"}
                  value={dummySettings.likeNotifications}
                  disabled
               />
            </TouchableOpacity>

            <TouchableOpacity style={styles.item} disabled>
               <Text style={styles.itemText}>Group message sound</Text>
               <View style={styles.itemValueContainer}>
                  <Text style={styles.itemValue}>{dummySettings.groupMessageSound}</Text>
                  <Ionicons name="chevron-forward" size={20} color="gray" />
               </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.item} disabled>
               <Text style={styles.itemText}>Direct message sound</Text>
               <View style={styles.itemValueContainer}>
                  <Text style={styles.itemValue}>{dummySettings.directMessageSound}</Text>
                  <Ionicons name="chevron-forward" size={20} color="gray" />
               </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.item} disabled>
               <Text style={styles.itemText}>Enhanced notifications</Text>
               <Switch
                  trackColor={{ false: "#ddd", true: "#4CAF50" }}
                  thumbColor={dummySettings.enhancedNotifications ? "#f5dd4b" : "#f4f3f4"}
                  value={dummySettings.enhancedNotifications}
                  disabled
               />
            </TouchableOpacity>

            <Text style={styles.infoText}>
               Not receiving notifications? Try turning them on and off again. Double check that they are enabled in the settings app.
            </Text>
         </View>
      </ScrollView>
   );
};

const styles = StyleSheet.create({
   container: {
      flex: 1,
      backgroundColor: '#fff',
      paddingHorizontal: 16,
      paddingTop: 16,
   },
   header: {
      fontSize: 28,
      fontWeight: 'bold',
      marginBottom: 20,
      color: 'black',
   },
   section: {
      backgroundColor: '#f9f9f9',
      borderRadius: 12,
      paddingVertical: 8,
      paddingHorizontal: 12,
      marginBottom: 16,
   },
   sectionHeader: {
      fontSize: 16,
      fontWeight: 'bold',
      marginVertical: 12,
      color: 'black',
   },
   item: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: '#eee',
   },
   itemText: {
      fontSize: 16,
      color: 'black',
   },
   itemValueContainer: {
      flexDirection: 'row',
      alignItems: 'center',
   },
   itemValue: {
      fontSize: 16,
      color: 'gray',
      marginRight: 8,
   },
   linkText: {
      fontSize: 16,
      color: '#007AFF',
      marginRight: 8,
   },
   infoText: {
      fontSize: 14,
      color: 'gray',
      paddingVertical: 12,
   },
});

export default ProfileSettingsScreen;
