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

  if (Platform.OS === 'web') return `http://localhost:${DEFAULT_PORT}`;

  const expoHost = getExpoHost();
  if (expoHost) return `http://${expoHost}:${DEFAULT_PORT}`;

  if (Platform.OS === 'android') return `http://10.0.2.2:${DEFAULT_PORT}`;
  if (Platform.OS === 'ios') return `http://localhost:${DEFAULT_PORT}`;

  return `http://localhost:${DEFAULT_PORT}`;
}