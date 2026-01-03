// Background fetch service for MineGlance
// Fetches wallet data and sends notifications when app is in background

import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchPoolData } from './pools';
import { fetchCoinPrices } from './coingecko';
import {
  notifyWorkerOffline,
  notifyMultipleWorkersOffline,
  notifyWorkersBackOnline,
  notifyProfitDrop,
  updateBadgeCount,
  getNotifiedWorkers,
  setNotifiedWorkers,
} from './notifications';
import { Wallet, WalletData, Worker } from '@/types';
import { getCoinGeckoId } from '@/constants/coins';

const BACKGROUND_FETCH_TASK = 'mineglance-background-fetch';
const PREVIOUS_STATE_KEY = 'previous_wallet_state';

interface PreviousState {
  [walletId: string]: {
    onlineWorkers: string[];
    earnings24hUsd: number;
  };
}

/**
 * Define the background fetch task
 */
TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
  try {
    console.log('[BackgroundFetch] Running background task');

    // Load wallets and settings from storage
    const walletsJson = await AsyncStorage.getItem('wallets');
    const settingsJson = await AsyncStorage.getItem('settings');

    if (!walletsJson) {
      console.log('[BackgroundFetch] No wallets configured');
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    const wallets: Wallet[] = JSON.parse(walletsJson);
    const settings = settingsJson ? JSON.parse(settingsJson) : {};
    const enabledWallets = wallets.filter(w => w.enabled);

    if (enabledWallets.length === 0) {
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    // Load previous state for comparison
    const previousStateJson = await AsyncStorage.getItem(PREVIOUS_STATE_KEY);
    const previousState: PreviousState = previousStateJson
      ? JSON.parse(previousStateJson)
      : {};

    // Fetch data for all wallets
    const results: { wallet: Wallet; data: WalletData | null }[] = [];
    const coins = new Set<string>();

    for (const wallet of enabledWallets) {
      coins.add(wallet.coin.toLowerCase());
      try {
        const poolStats = await fetchPoolData(wallet.pool, wallet.coin, wallet.address);
        results.push({
          wallet,
          data: {
            walletId: wallet.id,
            hashrate: poolStats.hashrate,
            hashrate24h: poolStats.hashrate24h,
            balance: poolStats.balance,
            earnings24h: poolStats.earnings24h,
            workers: poolStats.workers.map(w => ({
              name: w.name,
              hashrate: w.hashrate,
              lastSeen: w.lastSeen,
              online: !w.offline,
            })),
            lastUpdated: Date.now(),
          },
        });
      } catch (error) {
        console.log(`[BackgroundFetch] Failed to fetch ${wallet.coin}:`, error);
        results.push({ wallet, data: null });
      }
    }

    // Fetch prices
    const coinIds = [...coins].map(c => getCoinGeckoId(c)).filter(Boolean) as string[];
    const prices = await fetchCoinPrices([...coins]);

    // Check for alerts
    let alertCount = 0;
    const notifiedWorkers = await getNotifiedWorkers();
    const newNotifiedWorkers = new Set<string>();
    const newState: PreviousState = {};

    for (const { wallet, data } of results) {
      if (!data) continue;

      const walletName = wallet.name || `${wallet.coin.toUpperCase()} Wallet`;
      const prev = previousState[wallet.id];

      // Get current online workers
      const currentOnline = data.workers
        .filter(w => w.online)
        .map(w => w.name);

      // Store new state
      const price = prices[wallet.coin.toLowerCase()] || 0;
      const earnings24hUsd = (data.earnings24h || 0) * price;
      newState[wallet.id] = {
        onlineWorkers: currentOnline,
        earnings24hUsd,
      };

      // Check for worker offline alerts
      if (settings.notifications?.workerOffline !== false) {
        const previousOnline = prev?.onlineWorkers || [];

        // Find workers that went offline
        const wentOffline = data.workers.filter(w => {
          const workerId = `${wallet.id}:${w.name}`;
          const wasOnline = previousOnline.includes(w.name);
          const isOffline = !w.online;
          const alreadyNotified = notifiedWorkers.has(workerId);

          if (isOffline) {
            newNotifiedWorkers.add(workerId);
          }

          return wasOnline && isOffline && !alreadyNotified;
        });

        if (wentOffline.length === 1) {
          await notifyWorkerOffline(walletName, wentOffline[0].name);
          alertCount++;
        } else if (wentOffline.length > 1) {
          await notifyMultipleWorkersOffline(walletName, wentOffline.length);
          alertCount++;
        }

        // Check if all workers came back online
        const allOnline = data.workers.length > 0 && data.workers.every(w => w.online);
        const hadOffline = previousOnline.length < (prev ? data.workers.length : 0);
        if (allOnline && hadOffline && prev) {
          await notifyWorkersBackOnline(walletName);
        }
      }

      // Check for profit drop alerts
      if (settings.notifications?.profitDrop && prev) {
        const threshold = settings.notifications.profitDropThreshold || 20;
        const prevEarnings = prev.earnings24hUsd;

        if (prevEarnings > 0 && earnings24hUsd > 0) {
          const dropPercent = ((prevEarnings - earnings24hUsd) / prevEarnings) * 100;

          if (dropPercent >= threshold) {
            await notifyProfitDrop(walletName, dropPercent);
            alertCount++;
          }
        }
      }
    }

    // Update badge and save state
    await updateBadgeCount(alertCount);
    await setNotifiedWorkers(newNotifiedWorkers);
    await AsyncStorage.setItem(PREVIOUS_STATE_KEY, JSON.stringify(newState));

    console.log(`[BackgroundFetch] Completed. ${alertCount} alerts sent.`);
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.error('[BackgroundFetch] Error:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

/**
 * Register background fetch task
 */
export async function registerBackgroundFetch(): Promise<void> {
  try {
    const status = await BackgroundFetch.getStatusAsync();

    if (status === BackgroundFetch.BackgroundFetchStatus.Restricted ||
        status === BackgroundFetch.BackgroundFetchStatus.Denied) {
      console.log('[BackgroundFetch] Background fetch is disabled');
      return;
    }

    // Check if already registered
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_FETCH_TASK);
    if (isRegistered) {
      console.log('[BackgroundFetch] Task already registered');
      return;
    }

    // Register with minimum interval of 15 minutes (iOS limitation)
    await BackgroundFetch.registerTaskAsync(BACKGROUND_FETCH_TASK, {
      minimumInterval: 15 * 60, // 15 minutes
      stopOnTerminate: false,
      startOnBoot: true,
    });

    console.log('[BackgroundFetch] Task registered successfully');
  } catch (error) {
    console.error('[BackgroundFetch] Failed to register:', error);
  }
}

/**
 * Unregister background fetch task
 */
export async function unregisterBackgroundFetch(): Promise<void> {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_FETCH_TASK);
    if (isRegistered) {
      await BackgroundFetch.unregisterTaskAsync(BACKGROUND_FETCH_TASK);
      console.log('[BackgroundFetch] Task unregistered');
    }
  } catch (error) {
    console.error('[BackgroundFetch] Failed to unregister:', error);
  }
}

/**
 * Check if background fetch is available
 */
export async function isBackgroundFetchAvailable(): Promise<boolean> {
  const status = await BackgroundFetch.getStatusAsync();
  return status === BackgroundFetch.BackgroundFetchStatus.Available;
}

/**
 * Get background fetch status
 */
export async function getBackgroundFetchStatus(): Promise<string> {
  const status = await BackgroundFetch.getStatusAsync();

  switch (status) {
    case BackgroundFetch.BackgroundFetchStatus.Available:
      return 'available';
    case BackgroundFetch.BackgroundFetchStatus.Restricted:
      return 'restricted';
    case BackgroundFetch.BackgroundFetchStatus.Denied:
      return 'denied';
    default:
      return 'unknown';
  }
}
