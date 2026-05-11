import { create } from 'zustand';

type PendingLink = { type: 'gallery' | 'group'; id: string; name?: string };

type DeepLinkState = {
  pendingLink: PendingLink | null;
  setPendingLink: (link: PendingLink) => void;
  clearPendingLink: () => void;
};

export const useDeepLinkStore = create<DeepLinkState>(set => ({
  pendingLink: null,
  setPendingLink: link => set({ pendingLink: link }),
  clearPendingLink: () => set({ pendingLink: null }),
}));
