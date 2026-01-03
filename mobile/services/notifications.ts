// Push notification service for MineGlance

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configure how notifications are handled when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export interface NotificationData {
  type: 'worker_offline' | 'profit_drop' | 'better_coin';
  walletId?: string;
  walletName?: string;
}

/**
 * Request notification permissions
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  if (!Device.isDevice) {
    console.log('Notifications only work on physical devices');
    return false;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Notification permissions not granted');
    return false;
  }

  // Set up Android notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('mining-alerts', {
      name: 'Mining Alerts',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#1a365d',
    });
  }

  return true;
}

/**
 * Get push token for remote notifications (future use)
 */
export async function getPushToken(): Promise<string | null> {
  try {
    const token = await Notifications.getExpoPushTokenAsync({
      projectId: 'mineglance', // Replace with actual Expo project ID
    });
    return token.data;
  } catch (error) {
    console.error('Failed to get push token:', error);
    return null;
  }
}

/**
 * Send local notification for worker offline
 */
export async function notifyWorkerOffline(
  walletName: string,
  workerName: string
): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Worker Offline',
      body: `${workerName} on ${walletName} has gone offline`,
      data: {
        type: 'worker_offline',
        walletName,
        workerName,
      } as NotificationData,
      sound: true,
    },
    trigger: null, // Send immediately
  });
}

/**
 * Send local notification for multiple workers offline
 */
export async function notifyMultipleWorkersOffline(
  walletName: string,
  count: number
): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Workers Offline',
      body: `${count} workers on ${walletName} have gone offline`,
      data: {
        type: 'worker_offline',
        walletName,
      } as NotificationData,
      sound: true,
    },
    trigger: null,
  });
}

/**
 * Send local notification for profit drop
 */
export async function notifyProfitDrop(
  walletName: string,
  dropPercent: number
): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Profit Drop Alert',
      body: `${walletName} profit dropped ${dropPercent.toFixed(1)}%`,
      data: {
        type: 'profit_drop',
        walletName,
      } as NotificationData,
      sound: true,
    },
    trigger: null,
  });
}

/**
 * Send local notification for all workers back online
 */
export async function notifyWorkersBackOnline(
  walletName: string
): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Workers Online',
      body: `All workers on ${walletName} are back online`,
      data: {
        type: 'worker_offline',
        walletName,
      } as NotificationData,
      sound: false,
    },
    trigger: null,
  });
}

/**
 * Update app badge with number of alerts
 */
export async function updateBadgeCount(count: number): Promise<void> {
  await Notifications.setBadgeCountAsync(count);
}

/**
 * Clear all notifications
 */
export async function clearAllNotifications(): Promise<void> {
  await Notifications.dismissAllNotificationsAsync();
  await Notifications.setBadgeCountAsync(0);
}

/**
 * Track notified workers to avoid duplicate notifications
 */
const NOTIFIED_WORKERS_KEY = 'notified_offline_workers';

export async function getNotifiedWorkers(): Promise<Set<string>> {
  try {
    const stored = await AsyncStorage.getItem(NOTIFIED_WORKERS_KEY);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch {
    return new Set();
  }
}

export async function setNotifiedWorkers(workers: Set<string>): Promise<void> {
  try {
    await AsyncStorage.setItem(NOTIFIED_WORKERS_KEY, JSON.stringify([...workers]));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Add notification listener
 */
export function addNotificationListener(
  handler: (notification: Notifications.Notification) => void
): Notifications.Subscription {
  return Notifications.addNotificationReceivedListener(handler);
}

/**
 * Add notification response listener (when user taps notification)
 */
export function addNotificationResponseListener(
  handler: (response: Notifications.NotificationResponse) => void
): Notifications.Subscription {
  return Notifications.addNotificationResponseReceivedListener(handler);
}
