import { View, TouchableOpacity, Text, StyleSheet } from "react-native";

const Segment = <T extends string,>({
    options,
    value,
    onChange,
  }: {
    options: { label: string; value: T }[];
    value: T;
    onChange: (next: T) => void;
  }) => {
    return (
      <View style={styles.segmentContainer}>
        {options.map((opt) => {
          const isActive = opt.value === value;
          return (
            <TouchableOpacity
              key={opt.value}
              activeOpacity={0.8}
              style={[styles.segmentItem, isActive && styles.segmentItemActive]}
              onPress={() => onChange(opt.value)}
            >
              <Text style={[styles.segmentText, isActive && styles.segmentTextActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
};

const styles = StyleSheet.create({
    segmentContainer: {
      marginTop: 10,
      flexDirection: 'row',
      backgroundColor: '#E5E5EA',
      padding: 2,
      borderRadius: 10,
      alignSelf: 'stretch',
    },
    segmentItem: {
      flex: 1,
      borderRadius: 8,
      paddingVertical: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    segmentItemActive: {
      backgroundColor: '#FFFFFF',
    },
    segmentText: {
      fontSize: 13,
      color: '#1C1C1E',
      fontWeight: '500',
    },
    segmentTextActive: {
      color: '#000000',
    },
});
  

export default Segment