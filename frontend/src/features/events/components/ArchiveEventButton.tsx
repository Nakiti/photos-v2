import React from 'react';
import { StyleSheet, View, StyleProp, ViewStyle } from 'react-native';
import { Button } from 'react-native-paper';

type ArchiveEventButtonProps = {
  onPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

const ArchiveEventButton = ({ onPress, disabled, style, testID }: ArchiveEventButtonProps) => {
  return (
    <View style={[styles.wrapper, style]}>
      <Button
        mode="outlined"
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="button"
        testID={testID}
        contentStyle={styles.content}
        style={styles.button}
      >
        Archive
      </Button>
    </View>
  );
};

export default ArchiveEventButton;

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  button: {
    borderRadius: 8,
  },
  content: {
    height: 40,
  },
});
