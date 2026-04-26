import { Platform } from 'react-native';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import type { Medicine } from "@/context/AppContext";

// Guard: SDK 53+ removed push support from Expo Go Android
const isExpoGo = Constants.appOwnership === 'expo';

// Lazy-load notifications to prevent crash on import in Expo Go
const getNotifications = () => {
  try {
    if (Platform.OS === 'web') return require('expo-notifications');
    if (isExpoGo) return null;
    return require('expo-notifications');
  } catch (e) {
    return null;
  }
};

const Notifications = getNotifications();

// DISABLED FOR EXPO GO STABILITY
if (Notifications && (Platform.OS === 'web' || !isExpoGo)) {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  } catch (e) {}
}

export async function requestNotificationPermissions(): Promise<boolean> {
  if (!Device.isDevice) {
    console.log('Must use physical device for Push Notifications');
    return false;
  }

  try {
    if (!Notifications) return false;
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    return finalStatus === 'granted';
  } catch (e) {
    return false;
  }
}

export async function getDevicePushToken(): Promise<string | null> {
  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) return null;

    // Project ID is required for Expo SDK 49+
    const projectId = 
      Constants?.expoConfig?.extra?.eas?.projectId ?? 
      Constants?.easConfig?.projectId;

    if (isExpoGo && Platform.OS === 'android') {
      console.warn('Push tokens are not supported in Expo Go on Android SDK 53+. Use a development build.');
      return null;
    }

    if (!Notifications) return null;
    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    console.log('Expo Push Token:', token);
    return token;
  } catch (error) {
    console.error('Error getting push token:', error);
    return null;
  }
}

export async function scheduleMedicineNotifications(
  medicine: Medicine
): Promise<Record<string, string>> {
  const notificationIds: Record<string, string> = {};
  
  if (Platform.OS === 'web' || !Notifications) return {};

  for (const time of medicine.times) {
    const [hours, minutes] = time.split(':').map(Number);
    
    // 1. Primary Notification (at dose time)
    const primaryId = await Notifications.scheduleNotificationAsync({
      content: {
        title: "Time for your medicine! 💊",
        body: `Please take ${medicine.dosage} of ${medicine.name}.`,
        sound: 'universfield-new-notification-057-494255.mp3.mpeg',
        data: { medicineId: medicine.id },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
        hour: hours,
        minute: minutes,
        repeats: true,
      },
    });
    
    notificationIds[`${time}_primary`] = primaryId;

    // 2. Warning Notification (10 mins before)
    const warningDate = new Date();
    warningDate.setHours(hours);
    warningDate.setMinutes(minutes - 10);
    
    const warningId = await Notifications.scheduleNotificationAsync({
      content: {
        title: "Upcoming Medicine ⏰",
        body: `In 10 minutes: ${medicine.name} (${medicine.dosage}).`,
        data: { medicineId: medicine.id },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
        hour: warningDate.getHours(),
        minute: warningDate.getMinutes(),
        repeats: true,
      },
    });

    notificationIds[`${time}_warning`] = warningId;
  }

  return notificationIds;
}

export async function cancelMedicineNotifications(
  notificationIds: string[]
): Promise<void> {
  if (!Notifications) return;
  for (const id of notificationIds) {
    await Notifications.cancelScheduledNotificationAsync(id);
  }
}

export async function cancelAllNotifications(): Promise<void> {
  if (!Notifications) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
}
