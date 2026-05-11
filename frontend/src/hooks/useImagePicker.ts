import { useCallback } from 'react';
import { Alert, Linking } from 'react-native';
import { launchImageLibrary, type ImageLibraryOptions, type Asset } from 'react-native-image-picker';

type PickerOptions = Omit<ImageLibraryOptions, 'mediaType'>;

// Asset guaranteed to have a uri (filtered at the pick boundary)
export type PickedAsset = Asset & { uri: string };

export function useImagePicker() {
  const pickImages = useCallback(
    (options: PickerOptions, onSuccess: (assets: PickedAsset[]) => void) => {
      launchImageLibrary({ mediaType: 'photo', ...options }, response => {
        if (response.didCancel) return;

        if (response.errorCode === 'permission') {
          Alert.alert(
            'Photo access required',
            'Please allow photo library access in Settings to select photos.',
            [
              { text: 'Not now', style: 'cancel' },
              { text: 'Open Settings', onPress: () => Linking.openSettings() },
            ],
          );
          return;
        }

        if (response.errorCode) {
          Alert.alert('Could not open photo library', 'Please try again.');
          return;
        }

        const assets = (response.assets ?? []).filter(
          (a): a is PickedAsset => typeof a.uri === 'string',
        );
        if (assets.length > 0) onSuccess(assets);
      });
    },
    [],
  );

  return { pickImages };
}
