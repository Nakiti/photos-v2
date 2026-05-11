import { View, StyleSheet, TouchableOpacity, Pressable, Text } from "react-native"
import Icon from "react-native-vector-icons/Ionicons"
import { useMemo, useState } from "react"

const LIKED_SENTINEL = '__liked__';

type GalleryBottomBarProps = {
  onPressUpload?: () => void;
  onPressCamera?: () => void;
  tags?: Array<{ id: string; name: string; color?: string }>;
  selectedTagId?: string | null;
  onSelectTag?: (tagId: string | null) => void;
  users?: Array<{ id: string; name: string }>;
  selectedUploaderId?: string | null;
  onSelectUploader?: (uploaderId: string | null) => void;
};

const GalleryBottomBar = ({
  onPressUpload,
  onPressCamera,
  tags = [],
  selectedTagId = null,
  onSelectTag,
  users = [],
  selectedUploaderId = null,
  onSelectUploader,
}: GalleryBottomBarProps) => {

  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isUsersOpen, setIsUsersOpen] = useState(false);

  const currentLabel = useMemo(() => {
    if (!selectedTagId) return 'All Photos';
    if (selectedTagId === LIKED_SENTINEL) return 'Liked';
    return tags.find(t => t.id === selectedTagId)?.name || 'Filters';
  }, [selectedTagId, tags]);

  const currentUserLabel = useMemo(() => {
    if (!selectedUploaderId) return 'All Users';
    return users.find(u => u.id === selectedUploaderId)?.name || 'Users';
  }, [selectedUploaderId, users]);

  const handleSelectTag = (tagId: string | null) => {
    onSelectTag?.(tagId);
    setIsFiltersOpen(false);
  };

  const handleSelectUser = (uploaderId: string | null) => {
    onSelectUploader?.(uploaderId);
    setIsUsersOpen(false);
  };

  const dismissAll = () => {
    setIsFiltersOpen(false);
    setIsUsersOpen(false);
  };

  const tagActive = !!selectedTagId;
  const userActive = !!selectedUploaderId;

  return (
    <>
      {(isFiltersOpen || isUsersOpen) && (
        <Pressable style={styles.dismissOverlay} onPress={dismissAll} />
      )}

      <View style={styles.container} pointerEvents="box-none">

        {/* Tag Menu */}
        {isFiltersOpen && (
          <View style={[styles.menu, styles.menuLeft]}>
            {/* All Photos */}
            <TouchableOpacity
              onPress={() => handleSelectTag(null)}
              style={styles.menuItem}
              activeOpacity={0.6}
            >
              <Text style={[styles.menuText, !selectedTagId && styles.menuTextSelected]}>
                All Photos
              </Text>
              {!selectedTagId && <Icon name="checkmark" size={13} color="rgba(255,255,255,0.9)" />}
            </TouchableOpacity>

            {/* Liked */}
            <TouchableOpacity
              onPress={() => handleSelectTag(LIKED_SENTINEL)}
              style={[styles.menuItem, styles.menuItemBorder]}
              activeOpacity={0.6}
            >
              <Text style={[styles.menuText, selectedTagId === LIKED_SENTINEL && styles.menuTextSelected]}>
                Liked
              </Text>
              <Icon
                name={selectedTagId === LIKED_SENTINEL ? 'heart' : 'heart-outline'}
                size={13}
                color={selectedTagId === LIKED_SENTINEL ? '#ef4444' : 'rgba(255,255,255,0.4)'}
              />
            </TouchableOpacity>

            {/* Tags */}
            {tags.map((t) => {
              const selected = selectedTagId === t.id;
              return (
                <TouchableOpacity
                  key={t.id}
                  onPress={() => handleSelectTag(t.id)}
                  style={[styles.menuItem, styles.menuItemBorder]}
                  activeOpacity={0.6}
                >
                  <Text style={[styles.menuText, selected && styles.menuTextSelected]}>
                    {t.name}
                  </Text>
                  {selected && <Icon name="checkmark" size={13} color="rgba(255,255,255,0.9)" />}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* User Menu */}
        {isUsersOpen && (
          <View style={[styles.menu, styles.menuRight]}>
            {[{ id: '__all__', name: 'All Users' } as any, ...users].map((u, index) => {
              const isAll = u.id === '__all__';
              const selected = isAll ? !selectedUploaderId : selectedUploaderId === u.id;
              return (
                <TouchableOpacity
                  key={u.id}
                  onPress={() => handleSelectUser(isAll ? null : u.id)}
                  style={[styles.menuItem, index !== 0 && styles.menuItemBorder]}
                  activeOpacity={0.6}
                >
                  <Text style={[styles.menuText, selected && styles.menuTextSelected]}>
                    {u.name}
                  </Text>
                  {selected && <Icon name="checkmark" size={13} color="rgba(255,255,255,0.9)" />}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Command Bar */}
        <View style={styles.bar}>

          {/* Upload */}
          <TouchableOpacity style={styles.iconSlot} onPress={onPressUpload} activeOpacity={0.5}>
            <Icon name="add" size={21} color="rgba(255,255,255,0.95)" />
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Tag Filter */}
          <TouchableOpacity
            style={styles.filterSlot}
            onPress={() => { setIsFiltersOpen(v => !v); setIsUsersOpen(false); }}
            activeOpacity={0.5}
          >
            <Text style={[styles.filterLabel, tagActive && styles.filterLabelActive]} numberOfLines={1}>
              {currentLabel}
            </Text>
            <Icon
              name={isFiltersOpen ? "chevron-down" : "chevron-up"}
              size={9}
              color={tagActive ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.3)"}
            />
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* User Filter */}
          <TouchableOpacity
            style={styles.filterSlot}
            onPress={() => { setIsUsersOpen(v => !v); setIsFiltersOpen(false); }}
            activeOpacity={0.5}
          >
            <Text style={[styles.filterLabel, userActive && styles.filterLabelActive]} numberOfLines={1}>
              {currentUserLabel}
            </Text>
            <Icon
              name={isUsersOpen ? "chevron-down" : "chevron-up"}
              size={9}
              color={userActive ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.3)"}
            />
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Camera */}
          <TouchableOpacity style={styles.iconSlot} onPress={onPressCamera} activeOpacity={0.5}>
            <Icon name="camera-outline" size={19} color="rgba(255,255,255,0.95)" />
          </TouchableOpacity>

        </View>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 36,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 20,
  },
  dismissOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },

  // Bar
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 46,
    minWidth: 300,
    paddingHorizontal: 2,
    backgroundColor: 'rgba(16, 16, 16, 0.82)',
    borderRadius: 23,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    height: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },

  // Slots
  iconSlot: {
    width: 50,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterSlot: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    gap: 5,
    paddingHorizontal: 4,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 0.1,
  },
  filterLabelActive: {
    color: 'rgba(255,255,255,0.95)',
    fontWeight: '600',
  },

  // Menus
  menu: {
    position: 'absolute',
    bottom: 58,
    width: 190,
    backgroundColor: 'rgba(18, 18, 18, 0.94)',
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  menuLeft: {
    // Aligns roughly under the tag filter slot
    alignSelf: 'center',
    marginRight: 60,
  },
  menuRight: {
    // Aligns roughly under the user filter slot
    alignSelf: 'center',
    marginLeft: 60,
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
    borderTopColor: 'rgba(255,255,255,0.07)',
  },
  menuText: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.65)',
  },
  menuTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

export default GalleryBottomBar;