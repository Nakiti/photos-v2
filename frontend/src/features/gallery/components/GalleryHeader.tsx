import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useGallery } from "../../../hooks/useGalleryData";
import { useNavigation } from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons";
import LinearGradient from "react-native-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface GalleryHeaderProps {
  galleryId: string;
  onBackPress?: () => void;
  onTitlePress?: () => void;
}

const GalleryHeader = ({ galleryId, onBackPress, onTitlePress }: GalleryHeaderProps) => {
  const navigation = useNavigation();
  const { gallery } = useGallery(galleryId);
  const insets = useSafeAreaInsets();

  const handleNavigateDetails = () => {
    if (onTitlePress) { onTitlePress(); return; }
    (navigation as any).navigate('GalleryDetails', { galleryId });
  };

  return (
    <View style={styles.root}>
      <LinearGradient
        pointerEvents="none"
        colors={["rgba(0,0,0,0.5)", "rgba(0,0,0,0.2)", "rgba(0,0,0,0.04)", "rgba(0,0,0,0)"]}
        locations={[0, 0.4, 0.75, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.gradient}
      />
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>

        <TouchableOpacity
          onPress={onBackPress}
          style={styles.sideButton}
          activeOpacity={0.6}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={18} color="#FFFFFF" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.titleArea} onPress={handleNavigateDetails} activeOpacity={0.7}>
          {gallery?.name && (
            <Text style={styles.title} numberOfLines={1}>
              {gallery.name}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleNavigateDetails}
          style={styles.sideButton}
          activeOpacity={0.6}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="ellipsis-horizontal" size={18} color="#FFFFFF" />
        </TouchableOpacity>

      </View>
    </View>
  );
};

export default GalleryHeader;

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  gradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 160,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingBottom: 10,
  },
  sideButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
});