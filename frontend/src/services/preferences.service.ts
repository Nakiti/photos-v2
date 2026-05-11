import RNFS from 'react-native-fs';

export type AppPreferences = {
  pauseNotifications: boolean;
  syncOverCellular: boolean;
  uploadQuality: 'original' | 'high';
};

const PREFS_PATH = `${RNFS.DocumentDirectoryPath}/app_preferences.json`;

const DEFAULTS: AppPreferences = {
  pauseNotifications: false,
  syncOverCellular: false,
  uploadQuality: 'high',
};

export async function getPreferences(): Promise<AppPreferences> {
  try {
    const exists = await RNFS.exists(PREFS_PATH);
    if (!exists) return { ...DEFAULTS };
    const raw = await RNFS.readFile(PREFS_PATH, 'utf8');
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULTS };
  }
}

export async function setPreference<K extends keyof AppPreferences>(
  key: K,
  value: AppPreferences[K]
): Promise<void> {
  const current = await getPreferences();
  await RNFS.writeFile(PREFS_PATH, JSON.stringify({ ...current, [key]: value }), 'utf8');
}
