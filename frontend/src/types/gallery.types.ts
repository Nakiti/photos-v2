
export interface UpdateGalleryRequest {
    name?: string;
    description?: string;
    iconUrl?: string | null;
    startDate?: string | null;
    endDate?: string | null;
    location?: string | null;
    addPermission?: 'ANYONE' | 'ADMIN';
    deletePermission?: 'ADMINS_AUTHORS' | 'ADMIN';
    defaultTagId?: string;
}