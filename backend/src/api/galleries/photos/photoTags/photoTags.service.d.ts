declare module './photoTags.service.js' {
  export function applyTagToPhoto(
    galleryId: string,
    photoId: string,
    tagId: string
  ): Promise<'OK' | 'NOT_FOUND'>;
  export function removeTagFromPhoto(
    galleryId: string,
    photoId: string,
    tagId: string
  ): Promise<boolean>;
}


