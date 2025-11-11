import { View, StyleSheet, TouchableOpacity, Pressable, Text } from "react-native"
import Icon from "react-native-vector-icons/Ionicons"
import { useMemo, useState } from "react"

type GalleryBottomBarProps = {
   onPressUpload?: () => void;
   onPressCamera?: () => void;
   tags?: Array<{ id: string; name: string; color?: string }>;
   selectedTagId?: string | null;
   onSelectTag?: (tagId: string | null) => void;
};

const GalleryBottomBar = ({ onPressUpload, onPressCamera, tags = [], selectedTagId = null, onSelectTag }: GalleryBottomBarProps) => {

   const [isFiltersOpen, setIsFiltersOpen] = useState(false)

   const currentLabel = useMemo(() => {
      if (!selectedTagId) return 'All';
      const t = tags.find(t => t.id === selectedTagId);
      return t?.name || 'Filters';
   }, [selectedTagId, tags]);

   const handleSelect = (tagId: string | null) => {
      onSelectTag && onSelectTag(tagId);
      setIsFiltersOpen(false);
   };

   return (
      <>
         {isFiltersOpen && (
            <Pressable style={styles.dismissOverlay} onPress={() => setIsFiltersOpen(false)} />
         )}
         <View style={styles.barContainer} pointerEvents="box-none">
         <TouchableOpacity style={styles.floatingButton} onPress={onPressUpload} activeOpacity={0.8}>
            <Icon name="cloud-upload-outline" size={18} color="white" />
         </TouchableOpacity>

         <View style={styles.filterWrapper} pointerEvents="box-none">
            <Pressable
               onPress={() => setIsFiltersOpen((v) => !v)}
               style={({pressed}) => [
                  styles.filterBar,
                  pressed && styles.filterBarPressed
               ]}
            >
               <Icon name="options-outline" size={16} color="white" />
               <Text style={styles.filterText} numberOfLines={1}>{currentLabel}</Text>
               <Icon name={isFiltersOpen ? "chevron-down" : "chevron-up"} size={16} color="white" />
            </Pressable>

            {isFiltersOpen && (
               <View style={styles.filterListContainer}>
                  {[{ id: '__all__', name: 'All' } as any, ...tags].map((t) => {
                     const isAll = t.id === '__all__';
                     const selected = isAll ? !selectedTagId : selectedTagId === t.id;
                     return (
                        <Pressable
                           key={t.id}
                           onPress={() => handleSelect(isAll ? null : t.id)}
                           style={({pressed}) => [
                              styles.filterItem,
                              pressed && styles.filterItemPressed
                           ]}
                        >
                           <Text style={[styles.filterItemText, selected && styles.filterItemTextSelected]}>
                              {t.name}
                           </Text>
                           {selected ? (
                              <Icon name="checkmark" size={16} color="#6ee7b7" />
                           ) : <View style={{width: 16}} />}
                        </Pressable>
                     )
                  })}
               </View>
            )}
         </View>

         <TouchableOpacity style={styles.floatingButton} onPress={onPressCamera} activeOpacity={0.8}>
            <Icon name="camera-outline" size={18} color="white" />
         </TouchableOpacity>
         </View>
      </>
   )
}

export default GalleryBottomBar

const styles = StyleSheet.create({
   dismissOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'transparent',
      zIndex: 5,
   },
   barContainer: {
      position: 'absolute',
      bottom: 24,
      left: 0,
      right: 0,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      zIndex: 10,
   },
   floatingButton: {
      width: 40,
      height: 40,
      backgroundColor: 'rgba(50, 50, 50, 0.7)',
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 6,
   },
   filterWrapper: {
      position: 'relative',
      alignItems: 'center',
      justifyContent: 'center',
   },
   filterBar: {
      minWidth: 160,
      maxWidth: 200,
      height: 34,
      paddingHorizontal: 10,
      borderRadius: 17,
      backgroundColor: 'rgba(50, 50, 50, 0.7)',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 5,
   },
   filterBarPressed: {
      backgroundColor: 'rgba(70, 70, 70, 0.75)',
   },
   filterText: {
      color: 'white',
      fontSize: 12,
      fontWeight: '600',
      maxWidth: 120,
   },
   filterListContainer: {
      position: 'absolute',
      bottom: 44,
      alignSelf: 'center',
      width: 200,
      maxHeight: 240,
      paddingVertical: 6,
      backgroundColor: 'rgba(40, 40, 40, 0.90)',
      borderRadius: 14,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.35,
      shadowRadius: 8,
      elevation: 8,
      overflow: 'hidden',
      zIndex: 20,
   },
   filterItem: {
      paddingHorizontal: 12,
      paddingVertical: 10,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
   },
   filterItemPressed: {
      backgroundColor: 'rgba(255,255,255,0.06)',
   },
   filterItemText: {
      color: 'white',
      fontSize: 14,
   },
   filterItemTextSelected: {
      color: '#6ee7b7',
      fontWeight: '700',
   },
})