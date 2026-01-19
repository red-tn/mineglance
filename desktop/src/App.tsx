import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "./stores/authStore";
import { useSettingsStore } from "./stores/settingsStore";
import { useEffect } from "react";
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
  const { liteMode } = useSettingsStore();
  const { checkAuth, sendHeartbeat, refreshSubscription, isAuthenticated } = useAuthStore();

  useEffect(() => {
    // Apply theme class
    if (liteMode) {
      document.documentElement.classList.add('light-mode');
    } else {
      document.documentElement.classList.remove('light-mode');
    }
  }, [liteMode]);

  useEffect(() => {
    // Check auth on app start
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!isAuthenticated) return;

    // Send heartbeat immediately on auth
    sendHeartbeat();

    // Send heartbeat every 5 minutes
    const heartbeatInterval = setInterval(() => {
      sendHeartbeat();
    }, 5 * 60 * 1000);

    // Refresh subscription every 15 minutes
    const subscriptionInterval = setInterval(() => {
      refreshSubscription();
    }, 15 * 60 * 1000);

    return () => {
      clearInterval(heartbeatInterval);
      clearInterval(subscriptionInterval);
    };
  }, [isAuthenticated, sendHeartbeat, refreshSubscription]);

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
