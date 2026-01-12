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
      if (!selectedTagId) return 'All Photos';
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

         <View style={styles.container} pointerEvents="box-none">
            
            {/* Filter Menu */}
            {isFiltersOpen && (
               <View style={styles.menuContainer}>
                  {[{ id: '__all__', name: 'All Photos' } as any, ...tags].map((t, index) => {
                     const isAll = t.id === '__all__';
                     const selected = isAll ? !selectedTagId : selectedTagId === t.id;
                     return (
                        <TouchableOpacity
                           key={t.id}
                           onPress={() => handleSelect(isAll ? null : t.id)}
                           style={[styles.menuItem, index !== 0 && styles.menuItemBorder]}
                           activeOpacity={0.7}
                        >
                           <Text style={[styles.menuText, selected && styles.menuTextSelected]}>
                              {t.name}
                           </Text>
                           {selected && <Icon name="checkmark" size={14} color="#FFF" />}
                        </TouchableOpacity>
                     )
                  })}
               </View>
            )}

            {/* The Unified Command Bar */}
            <View style={styles.commandBar}>
                
                {/* 1. Upload */}
                <TouchableOpacity style={styles.iconSection} onPress={onPressUpload} activeOpacity={0.5}>
                    <Icon name="add" size={22} color="#FFF" />
                </TouchableOpacity>

                {/* Divider */}
                <View style={styles.divider} />

                {/* 2. Filter / Label */}
                <TouchableOpacity 
                    style={styles.filterSection} 
                    onPress={() => setIsFiltersOpen((v) => !v)}
                    activeOpacity={0.5}
                >
                    <Text style={styles.filterText} numberOfLines={1}>{currentLabel}</Text>
                    <Icon name={isFiltersOpen ? "chevron-down" : "chevron-up"} size={10} color="rgba(255,255,255,0.4)" />
                </TouchableOpacity>

                {/* Divider */}
                <View style={styles.divider} />

                {/* 3. Camera */}
                <TouchableOpacity style={styles.iconSection} onPress={onPressCamera} activeOpacity={0.5}>
                    <Icon name="camera-outline" size={20} color="#FFF" />
                </TouchableOpacity>

            </View>
         </View>
      </>
   )
}

const styles = StyleSheet.create({
   container: {
      position: 'absolute',
      bottom: 40,
      left: 0,
      right: 0,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 20,
   },
   dismissOverlay: {
      ...StyleSheet.absoluteFillObject,
      zIndex: 10,
   },

   // --- The Skinny Bar ---
   commandBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between', // Spreads items out
      
      // Dimensions
      height: 44, // Skinnier (Standard iOS size)
      minWidth: 280, // Wider base
      paddingHorizontal: 4, 
      
      // Glass Look
      backgroundColor: 'rgba(20, 20, 20, 0.75)', // More Transparent
      borderRadius: 22, // Half of height
      
      // Border & Shadow
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.1)',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.25,
      shadowRadius: 20,
   },
   divider: {
       width: 1,
       height: 16, // Shorter dividers
       backgroundColor: 'rgba(255, 255, 255, 0.1)',
   },

   // --- Sections ---
   iconSection: {
       width: 48, // Wide touch target
       height: '100%',
       alignItems: 'center',
       justifyContent: 'center',
   },
   filterSection: {
       flex: 1, // Takes up remaining space (makes it flexible)
       flexDirection: 'row',
       alignItems: 'center',
       justifyContent: 'center',
       height: '100%',
       gap: 6,
   },
   filterText: {
       color: '#FFF',
       fontSize: 13, // Slightly smaller text
       fontWeight: '500',
       letterSpacing: 0.4,
   },

   // --- Menu ---
   menuContainer: {
      position: 'absolute',
      bottom: 60, 
      width: 200,
      backgroundColor: 'rgba(20, 20, 20, 0.90)', // Matching transparency
      borderRadius: 16,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.1)',
      paddingVertical: 4,
      overflow: 'hidden',
   },
   menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      paddingHorizontal: 16,
   },
   menuItemBorder: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: 'rgba(255, 255, 255, 0.08)',
   },
   menuText: {
      color: 'rgba(255, 255, 255, 0.8)',
      fontSize: 13,
      fontWeight: '500',
   },
   menuTextSelected: {
      color: '#FFF',
      fontWeight: '600',
   },
})

export default GalleryBottomBar