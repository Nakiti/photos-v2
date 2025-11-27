// src/types/index.d.ts

export interface Gallery {
    id: string;
    name: string;
    ownerId: string;
    iconUrl?: string;
    type: 'GROUP' | 'EVENT';
    lastPhotoAt?: string | null; // ISO date string from the API
    createdAt: string; // Comes as an ISO date string from the API
    updatedAt: string;
  
    // Event-specific fields (optional)
    startDate?: string;
    endDate?: string;
    location?: string;
    shareableLink?: string;
    
    // Community fields (optional)
    communityId?: string | null;
    communityName?: string | null;
    
    // Permission and settings fields (optional)
    joinRequiresApproval?: boolean;
    addPermission?: string;
    deletePermission?: string;
    defaultTagId?: string | null;
}

export interface User {
    id: string;
    email: string;
    name: string;
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