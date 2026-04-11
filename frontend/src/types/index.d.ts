// src/types/index.d.ts

export interface Gallery {
    id: string;
    name: string;
    ownerId: string;
    iconUrl?: string;
    type: 'GROUP';
    lastPhotoAt?: string | null; // ISO date string from the API
    createdAt: string; // Comes as an ISO date string from the API
    updatedAt: string;

    shareableLink?: string | null;

    // Group association (optional)
    communityId?: string | null;
    groupId?: string | null;
    communityName?: string | null;

    // Event/location fields
    startDate?: string | null;
    endDate?: string | null;
    location?: string | null;

    // Counts
    photoCount?: number;
    memberCount?: number;

    // Permission and settings fields (optional)
    joinRequiresApproval?: boolean;
    addPermission?: string;
    deletePermission?: string;
    editPermission?: string;
    defaultTagId?: string | null;
}

export interface User {
    id: string;
    email: string;
    name: string;
    handle?: string;
    avatarUrl?: string;
    bio?: string;
    createdAt: string;
    updatedAt: string;
}

/**
 * The main Photo object.
 * This is what's returned from the API.
 */
export interface Photo {
    id: string;
    galleryId: string;
    uploaderId: string;
    s3Key: string;
    s3Url: string;
    createdAt: string; 
    

    uploader?: UserProfile;
}