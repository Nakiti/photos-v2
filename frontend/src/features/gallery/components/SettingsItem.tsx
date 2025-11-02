import { TouchableOpacity, Text, Switch, View, StyleSheet } from "react-native"

interface SettingsItemShape {
   label: string;
   value?: string | null | boolean;
   onPress?: () => void;
   bottom?: boolean;
   isSwitch?: boolean;
   privilege?: boolean;
}

const SettingsItem = ({item}: { item: SettingsItemShape }) => {

   return (
      <TouchableOpacity style={item.bottom ? styles.bottomItem : styles.item} onPress={item.onPress}>
         <Text style={styles.itemLabel}>{item.label}</Text>
         {item.isSwitch && <Switch
            trackColor={{ false: "#767577", true: "#81b0ff" }}
            thumbColor={item.value ? "#f5dd4b" : "#f4f3f4"}
            ios_backgroundColor="#3e3e3e"
            onValueChange={() => item.onPress && item.onPress()}
            value={Boolean(item.value)}
         />}
         {item.value !== null && !item.isSwitch && (
            <View style={styles.itemValueContainer}>
               <Text style={styles.itemValue}>{String(item.value ?? '')}</Text>
               <Text style={{ color: 'gray', fontSize: 18 }}>›</Text>
            </View>
         )}
         {item.value === null && item.privilege && (
            <Text style={{ color: 'gray', fontSize: 18 }}>›</Text>
         )}
      </TouchableOpacity>
   )
}

export default SettingsItem

const styles = StyleSheet.create({
   item: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: '#eee', // Light gray separator
   },
   bottomItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 16,
   },
   itemLabel: {
      fontSize: 14,
      color: 'black', // Light mode text color
   },
   itemValueContainer: {
      flexDirection: 'row',
      alignItems: 'center',
   },
   itemValue: {
      fontSize: 14,
      color: 'gray',
      marginRight: 8,
   },
})