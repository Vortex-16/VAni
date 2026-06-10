import Constants from 'expo-constants';
import { Platform } from 'react-native';

const DEFAULT_PORT = 3000;

function getExpoHost(): string | null {
  const hostUri =
    Constants?.expoConfig?.hostUri ??
    (Constants as any)?.manifest2?.extra?.expoGo?.debuggerHost ??
    (Constants as any)?.manifest?.debuggerHost;

  if (!hostUri) return null;

  return hostUri.split(':')[0] || null;
}

export function getApiUrl(): string {
  const configuredUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (configuredUrl) return configuredUrl.replace(/\/$/, '');

  if (Platform.OS === 'web') return `http://127.0.0.1:${DEFAULT_PORT}`;

  const expoHost = getExpoHost();
  if (expoHost) {
    const url = `http://${expoHost}:${DEFAULT_PORT}`;
    console.log('Using Expo host URL:', url);
    return url;
  }

  const fallbackUrl = Platform.OS === 'android' ? 'http://10.0.2.2' : 'http://localhost';
  const url = `${fallbackUrl}:${DEFAULT_PORT}`;
  console.log('Using fallback URL:', url);
  return url;
}