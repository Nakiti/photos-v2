import React, { useEffect, useMemo, useState } from "react";
import { View, StyleSheet } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useGallery } from "../../../hooks/useGalleryData";
import { useDatabase } from "@nozbe/watermelondb/react";
import UserModel from "../../../db/models/User";
import { useGalleryTags } from "../../../hooks/useGalleryTagData";
import SingleImageHeader from "../../gallery/components/SingleImageHeader";
import SingleImageBottomBar from "../../gallery/components/SingleImageBottomBar";
import SingleImageTagDropdown from "../../gallery/components/SingleImageTagDropdown";
import SingleImageCarousel from "../../gallery/components/SingleImageCarousel";

const SingleImageScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const database = useDatabase();

  const { galleryId, initialPhotoId, selectedTagId } = (route.params || {}) as {
    galleryId: string;
    initialPhotoId?: string | null;
    selectedTagId?: string | null;
  };

  const [activeTagId, setActiveTagId] = useState<string | null>(selectedTagId ?? null);
  const { photos } = useGallery(galleryId, { tagId: activeTagId });
  const { tags } = useGalleryTags(galleryId);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [overlaysVisible, setOverlaysVisible] = useState(true);
  const [headerHeight, setHeaderHeight] = useState(0);
  const [bottomBarHeight, setBottomBarHeight] = useState(0);
  const [liked, setLiked] = useState(false);

  const items = useMemo(() => {
    return (photos || [])
      .slice()
      .reverse() // oldest -> newest so swiping right (decreasing index) goes to older
      .map((p: any) => ({
        id: p.id,
        uri: p.s3Url || p.localUri || p.thumbnailUrl || p.thumbnailUri || p.localThumbnailUri || "",
        createdAt: p.createdAt,
        uploaderId: p.uploaderId,
      }))
      .filter((x) => !!x.uri);
  }, [photos]);

  const initialIndex = useMemo(() => {
    if (!initialPhotoId) return 0;
    const idx = items.findIndex((it) => it.id === initialPhotoId);
    return idx >= 0 ? idx : 0;
  }, [items, initialPhotoId]);

  const [currentIndex, setCurrentIndex] = useState<number>(initialIndex);

  // When items change (e.g., tag filter), try to keep the same photo in view if possible,
  // otherwise snap to initialIndex or 0.
  useEffect(() => {
    const currentId = items[currentIndex]?.id;
    let nextIndex = 0;
    if (currentId) {
      const found = items.findIndex((it) => it.id === currentId);
      nextIndex = found >= 0 ? found : 0;
    } else {
      nextIndex = initialIndex;
    }
    setCurrentIndex(nextIndex);
    // list scroll handled in carousel via currentIndex prop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  const current = items[currentIndex];

  const [uploaderName, setUploaderName] = useState<string>(""); 

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!current?.uploaderId) {
        if (!cancelled) setUploaderName("Unknown");
        return;
      }
      try {
        const users = database.collections.get<UserModel>("users");
        const user = await users.find(current.uploaderId);
        const display =
          user?.name ||
          user?.handle ||
          "Unknown";
        if (!cancelled) setUploaderName(display);
      } catch {
        if (!cancelled) setUploaderName("Unknown");
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [database, current?.uploaderId]);

  const takenAt =
    current?.createdAt ? new Date(current.createdAt).toLocaleString() : "";

  return (
    <View style={styles.container}>
      <SingleImageCarousel
        items={items}
        currentIndex={currentIndex}
        initialIndex={initialIndex}
        onIndexChange={setCurrentIndex}
        topInset={headerHeight}
        bottomInset={bottomBarHeight}
        onImageTap={() => {
          setOverlaysVisible((v) => {
            const next = !v;
            if (!next) setDropdownOpen(false);
            return next;
          });
        }}
      />

      <SingleImageHeader
        visible={overlaysVisible}
        uploaderName={uploaderName}
        takenAt={takenAt}
        onBack={() => navigation.goBack()}
        onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height)}
      />

      <SingleImageTagDropdown
        visible={dropdownOpen && overlaysVisible}
        tags={tags as any}
        activeTagId={activeTagId}
        bottomOffset={bottomBarHeight}
        onSelect={(tagId) => {
          setActiveTagId(tagId);
          setDropdownOpen(false);
        }}
      />

      <SingleImageBottomBar
        visible={overlaysVisible}
        dropdownOpen={dropdownOpen}
        activeTagName={
          activeTagId ? (tags as any).find((t: any) => t.id === activeTagId)?.name ?? "Tag" : "All photos"
        }
        onToggleDropdown={() => setDropdownOpen((v) => !v)}
        onLayout={(e) => setBottomBarHeight(e.nativeEvent.layout.height)}
        onPressDownload={() => {
          // TODO: implement actual download to device Photos/Files
          console.log("Download pressed for", current?.id);
        }}
        onPressUpload={() => {
          // TODO: implement upload flow
          console.log("Upload pressed for", current?.id);
        }}
        onPressLike={() => setLiked((v) => !v)}
        liked={liked}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
});

export default SingleImageScreen;