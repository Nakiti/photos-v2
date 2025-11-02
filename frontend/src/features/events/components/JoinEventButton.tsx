import React from 'react';
import { StyleSheet, View, StyleProp, ViewStyle } from 'react-native';
import { Button } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
type JoinEventButtonProps = {
  onPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

const JoinEventButton = ({ onPress, disabled, style, testID }: JoinEventButtonProps) => {
  const navigation = useNavigation();

  const handlePress = () => {
    onPress?.();
    navigation.navigate("JoinEvent");
  } 
  return (
    <View style={[styles.wrapper, style]}>
      <Button
        mode="contained"
        onPress={handlePress}
        disabled={disabled}
        accessibilityRole="button"
        testID={testID}
        contentStyle={styles.content}
        style={styles.button}
      >
        Join Event
      </Button>
    </View>
  );
};

export default JoinEventButton;

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  button: {
    borderRadius: 8,
    elevation: 0,
  },
  content: {
    height: 40,
  },
});
