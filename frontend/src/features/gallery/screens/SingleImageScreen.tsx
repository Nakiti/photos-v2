import React, { useEffect, useMemo, useState } from "react";
import { Alert, View, StyleSheet } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useLocalGallery, useDeletePhoto } from "../../../hooks/useGalleryData";
import { useDatabase } from "@nozbe/watermelondb/react";
import { Q } from "@nozbe/watermelondb";
import UserModel from "../../../db/models/User";
import MembershipModel from "../../../db/models/Membership";
import PhotoModel from "../../../db/models/Photo";
import { useGalleryTags } from "../../../hooks/useGalleryTagData";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getPhotoLikeStatus, likePhoto, unlikePhoto } from "../../../services/api/photos.service";
import { useAuth } from "../../../hooks/useAuth";
import SingleImageHeader from "../../gallery/components/SingleImageHeader";
import SingleImageBottomBar from "../../gallery/components/SingleImageBottomBar";
import SingleImageTagDropdown from "../../gallery/components/SingleImageTagDropdown";
import SingleImageCarousel from "../../gallery/components/SingleImageCarousel";
import SingleImageFilmstrip from "../../gallery/components/SingleImageFilmstrip";

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
  const likedOnly = activeTagId === '__liked__';
  const { gallery, photos } = useLocalGallery(galleryId, {
    tagId: likedOnly ? null : activeTagId,
    likedOnly,
  });
  const { tags } = useGalleryTags(galleryId);
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const deleteMutation = useDeletePhoto();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [overlaysVisible, setOverlaysVisible] = useState(true);
  const [headerHeight, setHeaderHeight] = useState(0);
  const [bottomBarHeight, setBottomBarHeight] = useState(0);

  const items = useMemo(() => {
    return (photos || [])
      .slice()
      .reverse() // oldest -> newest so swiping right (decreasing index) goes to older
      .map((p: any) => ({
        id: p.id,
        uri: p.s3Url || p.localUri || p.thumbnailUri || p.localThumbnailUri || "",
        thumbnailUri: p.thumbnailUri || p.localThumbnailUri || "",
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
  const currentPhotoId = current?.id;

  const { data: likeData, refetch: refetchLike } = useQuery({
    queryKey: ['photoLike', galleryId, currentPhotoId],
    queryFn: () => getPhotoLikeStatus(galleryId, currentPhotoId!),
    enabled: !!currentPhotoId,
    staleTime: 0,
  });

  const liked = likeData?.liked ?? false;
  const likeCount = likeData?.likeCount ?? 0;

  const likeMutation = useMutation({
    mutationFn: () =>
      liked ? unlikePhoto(galleryId, currentPhotoId!) : likePhoto(galleryId, currentPhotoId!),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['photoLike', galleryId, currentPhotoId] });
      const prev = queryClient.getQueryData<{ liked: boolean; likeCount: number }>(['photoLike', galleryId, currentPhotoId]);
      queryClient.setQueryData(['photoLike', galleryId, currentPhotoId], {
        liked: !liked,
        likeCount: liked ? likeCount - 1 : likeCount + 1,
      });
      return { prev };
    },
    onSuccess: async () => {
      try {
        const photo = await database.collections.get<PhotoModel>('photos').find(currentPhotoId!);
        await database.write(async () => { await photo.update(r => { r.isLiked = !liked; }); });
      } catch {}
    },
    onError: (_err, _vars, context: any) => {
      queryClient.setQueryData(['photoLike', galleryId, currentPhotoId], context?.prev);
    },
    onSettled: () => {
      refetchLike();
    },
  });

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

  const [canDelete, setCanDelete] = useState(false);

  useEffect(() => {
    if (!currentUser || !gallery) { setCanDelete(false); return; }
    const isUploader = current?.uploaderId === currentUser.id;
    const isOwner = gallery.ownerId === currentUser.id;
    if (isUploader || isOwner) { setCanDelete(true); return; }
    let cancelled = false;
    database.collections.get<MembershipModel>('memberships')
      .query(Q.where('gallery_id', galleryId), Q.where('user_id', currentUser.id))
      .fetch()
      .then(([m]) => { if (!cancelled) setCanDelete(m?.role === 'ADMIN'); })
      .catch(() => { if (!cancelled) setCanDelete(false); });
    return () => { cancelled = true; };
  }, [current?.uploaderId, gallery?.ownerId, currentUser?.id, galleryId, database]);

  const handleDelete = () => {
    if (!currentPhotoId) return;
    Alert.alert(
      'Delete photo',
      'This photo will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteMutation.mutate(
              { galleryId, photoId: currentPhotoId },
              { onSuccess: () => { if (items.length <= 1) navigation.goBack(); } },
            );
          },
        },
      ],
    );
  };

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
        canDelete={canDelete}
        onPressDelete={handleDelete}
      />

      <SingleImageFilmstrip
        items={items}
        currentIndex={currentIndex}
        onIndexChange={setCurrentIndex}
        visible={overlaysVisible}
        bottomOffset={bottomBarHeight}
      />

      <SingleImageTagDropdown
        visible={dropdownOpen && overlaysVisible}
        tags={tags as any}
        activeTagId={activeTagId}
        bottomOffset={bottomBarHeight}
        showLikedOption
        onSelect={(tagId) => {
          setActiveTagId(tagId);
          setDropdownOpen(false);
        }}
      />

      <SingleImageBottomBar
        visible={overlaysVisible}
        dropdownOpen={dropdownOpen}
        activeTagName={
          activeTagId === '__liked__'
            ? 'Liked'
            : activeTagId
              ? (tags as any).find((t: any) => t.id === activeTagId)?.name ?? 'Tag'
              : 'All photos'
        }
        onToggleDropdown={() => setDropdownOpen((v) => !v)}
        onLayout={(e) => setBottomBarHeight(e.nativeEvent.layout.height)}
        onPressLike={() => { if (currentPhotoId) likeMutation.mutate(); }}
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