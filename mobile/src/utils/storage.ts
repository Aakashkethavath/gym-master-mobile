import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

/**
 * On native we use SecureStore (Keychain / Keystore). On web it isn't
 * available, so we fall back to AsyncStorage (acceptable for dev/web
 * preview — use a real key-management solution for production web).
 */
const isNative = Platform.OS !== 'web';

const KEYS = {
  ACCESS_TOKEN: 'gm_access_token',
  REFRESH_TOKEN: 'gm_refresh_token',
  USER: 'gm_user',
} as const;

async function set(key: string, value: string) {
  if (isNative) {
    await SecureStore.setItemAsync(key, value);
  } else {
    await AsyncStorage.setItem(key, value);
  }
}

async function get(key: string): Promise<string | null> {
  if (isNative) {
    return SecureStore.getItemAsync(key);
  }
  return AsyncStorage.getItem(key);
}

async function remove(key: string) {
  if (isNative) {
    await SecureStore.deleteItemAsync(key);
  } else {
    await AsyncStorage.removeItem(key);
  }
}

export const storage = {
  setTokens: (access: string, refresh: string) =>
    Promise.all([set(KEYS.ACCESS_TOKEN, access), set(KEYS.REFRESH_TOKEN, refresh)]),

  getAccessToken: () => get(KEYS.ACCESS_TOKEN),
  getRefreshToken: () => get(KEYS.REFRESH_TOKEN),

  setUser: (user: object) => set(KEYS.USER, JSON.stringify(user)),
  getUser: async () => {
    const raw = await get(KEYS.USER);
    return raw ? JSON.parse(raw) : null;
  },

  clear: () =>
    Promise.all([
      remove(KEYS.ACCESS_TOKEN),
      remove(KEYS.REFRESH_TOKEN),
      remove(KEYS.USER),
    ]),
};
