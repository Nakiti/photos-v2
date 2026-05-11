# Deep Link / Invite Flow — Remaining Work

Feature: users share `https://focal.app/gallery/join/<id>` or `https://focal.app/group/join/<id>` links; tapping them opens the app and lands on a join-confirmation screen.

## Done

- `useDeepLinks.ts` — parses URLs, stores pending link on cold start, navigates on warm start
- `deepLink.store.ts` — Zustand store holding pending link across auth
- `navigationRef.ts` — imperative navigation ref wired into `NavigationContainer`
- `JoinGalleryScreen` / `JoinGroupScreen` — confirmation UIs (group handles PENDING state)
- `JoinStack.tsx` + `RootStack` `JoinFlow` screen — navigation registered
- `App.tsx` — `useDeepLinks()` mounted, `handleNavReady` flushes pending link after nav ready
- `useAuth.ts` — `processPendingDeepLink()` called after login and register
- iOS `Info.plist` — `focal://` custom URL scheme registered
- Android `AndroidManifest.xml` — `focal://` + `https://focal.app` intent filters added
- Backend `POST /api/v1/galleries/:galleryId/join` — gallery join endpoint
- Backend `POST /api/v1/communities/:groupId/join` — group join (respects `joinRequiresApproval`)
- Backend `GET /api/v1/galleries/:galleryId/share-link` and `GET /api/v1/communities/:groupId/share-link` — link generation
- `ShareGalleryScreen` / `ShareGroupScreen` — share UI

---

## Remaining

### iOS Universal Links (HTTPS links open app, not Safari)

- [ ] Add `.entitlements` file to the Xcode project with `com.apple.developer.associated-domains` → `applinks:focal.app`
- [ ] Enable Associated Domains capability in the Xcode target
- [ ] Serve `/.well-known/apple-app-site-association` (AASA) from the backend with the correct app ID and path patterns:
  ```json
  {
    "applinks": {
      "details": [{ "appIDs": ["<TEAM_ID>.com.focal.app"], "components": [{ "/": "/gallery/join/*" }, { "/": "/group/join/*" }] }]
    }
  }
  ```

### Android App Links (HTTPS links open app, not browser)

- [ ] Serve `/.well-known/assetlinks.json` from the backend with the app's SHA-256 certificate fingerprint
  ```json
  [{ "relation": ["delegate_permission/common.handle_all_urls"], "target": { "namespace": "android_app", "package_name": "com.focal.app", "sha256_cert_fingerprints": ["..."] } }]
  ```

### Join Screens: Show Entity Name

- [ ] Add a backend endpoint (e.g. `GET /api/v1/galleries/:galleryId/preview` and `GET /api/v1/communities/:groupId/preview`) that returns `{ id, name, iconUrl }` without requiring membership — only requires authentication
- [ ] In `JoinGalleryScreen`, fetch and display the gallery name on mount instead of showing "Gallery Invite" fallback
- [ ] In `JoinGroupScreen`, fetch and display the group name on mount instead of showing "Group Invite" fallback

### Gallery Join: Access Control

- [ ] `POST /api/v1/galleries/:galleryId/join` (in `members.controller.ts`) does not check `joinRequiresApproval` — any authenticated user with the ID can join any gallery. Decide and implement the intended behaviour: open join for all, OR add approval gating matching the group join flow.

### Post-Join Sync

- [ ] After `JoinGalleryScreen` joins and navigates to `GalleryScreen`, the gallery won't be in WatermelonDB yet. `useGallery` will show an empty/loading state until TanStack Query fetches and syncs it. Verify the loading state is handled gracefully — add a loading indicator in `GalleryScreen` if `gallery` is `null` during the initial sync.
- [ ] After `JoinGroupScreen` joins and navigates to `GroupScreen`, same issue applies — group won't be in local DB. Verify or add the same loading guard.

### Testing

- [ ] Unit tests for `parseUrl` in `useDeepLinks.ts` — cover gallery, group, and unrecognised URLs
- [ ] Integration test: cold-start deep link → unauthenticated → login → navigates to join screen
- [ ] Integration test: warm-start deep link → already authenticated → navigates directly to join screen
