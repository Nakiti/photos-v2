import { useNavigation, useRoute, StackActions } from '@react-navigation/native';
import { useCreateOptimisticPhoto } from '../../hooks/usePhotoData';
import Ionicons from 'react-native-vector-icons/Ionicons';
import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';


const PreviewScreen = () => {
    const navigation = useNavigation()
    const route = useRoute()
    const { photoUri, galleryId } = route.params as { photoUri: string; galleryId: string };

    const { mutate: createOptimisticPhoto, isPending } = useCreateOptimisticPhoto()

    const handleRetake = () => {
        navigation.goBack();
    };

    const handleSend = () => {
        if (isPending) return; // Don't allow double-taps
    
        // Call the optimistic create function
        createOptimisticPhoto(
          { galleryId, localUri: photoUri },
          {
            onSuccess: () => {

              navigation.dispatch(StackActions.pop(2));
            },
            onError: (error) => {
              console.error("Failed to create optimistic photo record:", error);
              Alert.alert("Error", "Could not save photo. Please try again.");
              navigation.goBack();
            },
          }
        );
    };

    return (
        <View>

        </View>
    )
}

export default PreviewScreen

const styles = StyleSheet.create({
    
})