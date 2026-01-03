import { useEffect, useRef } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { colors } from '@/constants/theme';
import { useAuthStore } from '@/stores/authStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useWalletStore } from '@/stores/walletStore';
import {
  requestNotificationPermissions,
  addNotificationResponseListener,
} from '@/services/notifications';
import { registerBackgroundFetch } from '@/services/background';

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  // Load stores from storage on app start
  const loadAuth = useAuthStore(state => state.loadFromStorage);
  const loadSettings = useSettingsStore(state => state.loadFromStorage);
  const loadWallets = useWalletStore(state => state.loadFromStorage);

  useEffect(() => {
    async function initialize() {
      try {
        // Load persisted state
        await Promise.all([
          loadAuth(),
          loadSettings(),
          loadWallets(),
        ]);

        // Request notification permissions
        await requestNotificationPermissions();

        // Register background fetch
        await registerBackgroundFetch();
      } catch (error) {
        console.error('Initialization error:', error);
      } finally {
        // Hide splash screen
        await SplashScreen.hideAsync();
      }
    }

    initialize();

    // Set up notification response listener (when user taps notification)
    responseListener.current = addNotificationResponseListener(response => {
      const data = response.notification.request.content.data;
      console.log('Notification tapped:', data);
      // Could navigate to specific wallet here based on data.walletId
    });

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, []);

  return (
    <>
      <StatusBar style="light" backgroundColor={colors.cardBackground} />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: colors.cardBackground,
          },
          headerTintColor: colors.text,
          headerTitleStyle: {
            fontWeight: '600',
          },
          contentStyle: {
            backgroundColor: colors.background,
          },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="onboarding"
          options={{
            headerShown: false,
            presentation: 'fullScreenModal',
          }}
        />
        <Stack.Screen
          name="scan"
          options={{
            title: 'Scan QR Code',
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="wallet/[id]"
          options={{
            title: 'Wallet Details',
          }}
        />
      </Stack>
    </>
  );
}
