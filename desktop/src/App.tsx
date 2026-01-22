import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore, ensureInstanceIdFile } from "./stores/authStore";
import { useSettingsStore } from "./stores/settingsStore";
import { useUpdateStore } from "./stores/updateStore";
import { useWalletStore } from "./stores/walletStore";
import { useEffect, useRef, useCallback } from "react";
import { isPermissionGranted, requestPermission, sendNotification } from "@tauri-apps/plugin-notification";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Wallets from "./pages/Wallets";
import Devices from "./pages/Devices";
import Settings from "./pages/Settings";
import Profile from "./pages/Profile";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[var(--bg)]">
        <div className="spinner" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function App() {
  const { liteMode, refreshInterval, showNotifications, loadSettings } = useSettingsStore();
  const { checkAuth, sendHeartbeat, refreshSubscription, isAuthenticated, user } = useAuthStore();
  const { checkForUpdates } = useUpdateStore();
  const { refreshStats, syncWallets } = useWalletStore();

  // Track previous worker counts for offline detection
  const previousWorkersRef = useRef<Map<string, number>>(new Map());
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Check for offline workers and send notification
  const checkOfflineWorkers = useCallback(async () => {
    if (!showNotifications || user?.plan !== 'pro') return;

    // Get fresh stats from store (not from closure)
    const freshStats = useWalletStore.getState().stats;
    const freshWallets = useWalletStore.getState().wallets;

    for (const wallet of freshWallets) {
      if (!wallet.enabled) continue;

      const currentStats = freshStats.get(wallet.id);
      if (!currentStats) continue;

      const prevOnline = previousWorkersRef.current.get(wallet.id);
      const currentOnline = currentStats.workersOnline;
      const currentOffline = currentStats.workersOffline;

      // Skip first check (no previous data) - just record baseline
      if (prevOnline === undefined) {
        previousWorkersRef.current.set(wallet.id, currentOnline);
        console.log(`[Notifications] Baseline set for ${wallet.name}: ${currentOnline} online`);
        continue;
      }

      // Check if workers went offline (had some online before, now fewer or zero)
      if (prevOnline > 0 && currentOnline < prevOnline) {
        const wentOffline = prevOnline - currentOnline;
        console.log(`[Notifications] Worker offline detected: ${wallet.name} - ${wentOffline} went offline`);

        try {
          let permissionGranted = await isPermissionGranted();
          if (!permissionGranted) {
            const permission = await requestPermission();
            permissionGranted = permission === 'granted';
          }

          if (permissionGranted) {
            sendNotification({
              title: 'Worker Offline Alert',
              body: `${wallet.name}: ${wentOffline} worker(s) went offline. Currently ${currentOnline} online, ${currentOffline} offline.`,
            });
            console.log(`[Notifications] Notification sent for ${wallet.name}`);
          } else {
            console.log(`[Notifications] Permission not granted`);
          }
        } catch (error) {
          console.error('Failed to send notification:', error);
        }
      }

      // Update previous count
      previousWorkersRef.current.set(wallet.id, currentOnline);
    }
  }, [showNotifications, user?.plan]);

  // Auto-refresh wallet stats
  const doAutoRefresh = useCallback(async () => {
    console.log('Auto-refreshing wallet stats...');
    await refreshStats();
    // Small delay to ensure store is updated before checking
    setTimeout(() => checkOfflineWorkers(), 500);
  }, [refreshStats, checkOfflineWorkers]);

  useEffect(() => {
    // Apply theme class
    if (liteMode) {
      document.documentElement.classList.add('light-mode');
    } else {
      document.documentElement.classList.remove('light-mode');
    }
  }, [liteMode]);

  useEffect(() => {
    // Ensure instance ID file exists for uninstall cleanup
    ensureInstanceIdFile();
    // Check auth on app start
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!isAuthenticated) return;

    // Load settings and sync wallets on auth
    loadSettings();
    syncWallets();

    // Send heartbeat immediately on auth
    sendHeartbeat();

    // Check for updates on startup
    checkForUpdates();

    // Initial stats refresh and set baseline for notifications
    refreshStats().then(() => {
      // Set baseline after initial refresh (don't alert, just record current state)
      setTimeout(() => {
        const freshStats = useWalletStore.getState().stats;
        const freshWallets = useWalletStore.getState().wallets;
        for (const wallet of freshWallets) {
          if (!wallet.enabled) continue;
          const stats = freshStats.get(wallet.id);
          if (stats) {
            previousWorkersRef.current.set(wallet.id, stats.workersOnline);
            console.log(`[Notifications] Initial baseline for ${wallet.name}: ${stats.workersOnline} online`);
          }
        }
      }, 1000);
    });

    // Send heartbeat every 30 seconds
    const heartbeatInterval = setInterval(() => {
      sendHeartbeat();
    }, 30 * 1000);

    // Refresh subscription every 15 minutes
    const subscriptionInterval = setInterval(() => {
      refreshSubscription();
    }, 15 * 60 * 1000);

    // Check for updates every 5 minutes
    const updateInterval = setInterval(() => {
      checkForUpdates();
    }, 5 * 60 * 1000);

    // Also check for updates when window regains focus
    const handleFocus = () => {
      checkForUpdates();
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(heartbeatInterval);
      clearInterval(subscriptionInterval);
      clearInterval(updateInterval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [isAuthenticated, sendHeartbeat, refreshSubscription, checkForUpdates, loadSettings, syncWallets, refreshStats]);

  // Set up auto-refresh interval based on settings
  useEffect(() => {
    if (!isAuthenticated) return;

    // Clear existing interval
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
    }

    // Set up new interval based on refreshInterval setting
    const intervalMs = refreshInterval * 60 * 1000; // Convert minutes to ms
    console.log(`Setting up auto-refresh every ${refreshInterval} minutes`);

    refreshIntervalRef.current = setInterval(() => {
      doAutoRefresh();
    }, intervalMs);

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [isAuthenticated, refreshInterval, doAutoRefresh]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="wallets" element={<Wallets />} />
          <Route path="devices" element={<Devices />} />
          <Route path="settings" element={<Settings />} />
          <Route path="profile" element={<Profile />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
