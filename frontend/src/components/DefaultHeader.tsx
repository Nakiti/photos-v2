import { View, TouchableOpacity, Text, StyleSheet, SafeAreaView } from "react-native";
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from "@react-navigation/native";

const DefaultHeader = ({ title }: { title?: string }) => {
  const navigation = useNavigation();

  return (
    <View style={styles.root}>
      <SafeAreaView>
        <View style={styles.container}>

          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.5}
          >
            <Ionicons name="chevron-back" size={22} color="#111111" />
          </TouchableOpacity>

          {title && (
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
          )}

        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    backgroundColor: '#FAFAFA',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5E5',
  },
  container: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  backButton: {
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111111',
    letterSpacing: -0.3,
    flex: 1,
  },
});

export default DefaultHeader;