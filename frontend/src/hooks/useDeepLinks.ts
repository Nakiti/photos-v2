import { useEffect } from 'react';
import { Linking } from 'react-native';
import { useAuthStore } from '../stores/auth.store';
import { navigationRef } from '../navigation/navigationRef';
import { useDeepLinkStore } from '../stores/deepLink.store';

type ParsedLink = { type: 'gallery' | 'group'; id: string; name?: string };

function parseUrl(url: string): ParsedLink | null {
  const galleryMatch = url.match(/gallery\/join\/([^/?#]+)/);
  if (galleryMatch) return { type: 'gallery', id: galleryMatch[1] };
  const groupMatch = url.match(/group\/join\/([^/?#]+)/);
  if (groupMatch) return { type: 'group', id: groupMatch[1] };
  return null;
}

export function navigateParsedLink(link: ParsedLink) {
  if (link.type === 'gallery') {
    navigationRef.navigate('JoinFlow', {
      screen: 'JoinGallery',
      params: { galleryId: link.id, galleryName: link.name },
    });
  } else {
    navigationRef.navigate('JoinFlow', {
      screen: 'JoinGroup',
      params: { groupId: link.id, groupName: link.name },
    });
  }
}

export function useDeepLinks() {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const setPendingLink = useDeepLinkStore(s => s.setPendingLink);

  // Cold start: store as pending; processed in NavigationContainer onReady or after login
  useEffect(() => {
    Linking.getInitialURL().then(url => {
      if (!url) return;
      const parsed = parseUrl(url);
      if (parsed) setPendingLink(parsed);
    });
  }, []);

  // Warm start: app already running when link arrives
  useEffect(() => {
    const subscription = Linking.addEventListener('url', ({ url }) => {
      const parsed = parseUrl(url);
      if (!parsed) return;
      if (isAuthenticated && navigationRef.isReady()) {
        navigateParsedLink(parsed);
      } else {
        setPendingLink(parsed);
      }
    });
    return () => subscription.remove();
  }, [isAuthenticated, setPendingLink]);
}
