import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

const KEY = 'asepo:guest-id:v1';
let cached: string | null = null;

/** Stable identity for API jobs created before someone signs in. */
export async function getGuestId(): Promise<string> {
  if (cached) return cached;
  const saved = await AsyncStorage.getItem(KEY).catch(() => null);
  if (saved) {
    cached = saved;
    return saved;
  }

  const created = Crypto.randomUUID();
  cached = created;
  await AsyncStorage.setItem(KEY, created).catch(() => {});
  return created;
}
