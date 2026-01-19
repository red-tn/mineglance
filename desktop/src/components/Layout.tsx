import { Outlet, NavLink, useLocation } from "react-router-dom";
import { useAuthStore } from "../stores/authStore";
import { useUpdateStore } from "../stores/updateStore";
import {
  LayoutDashboard,
  Wallet,
  Monitor,
  Settings as SettingsIcon,
  User,
  LogOut,
  Moon,
  Sun,
  Download,
  X,
} from "lucide-react";
import { useSettingsStore } from "../stores/settingsStore";

const navItems = [
  { path: "/", icon: LayoutDashboard, label: "Dashboard" },
  { path: "/wallets", icon: Wallet, label: "Wallets" },
  { path: "/devices", icon: Monitor, label: "Devices" },
  { path: "/settings", icon: SettingsIcon, label: "Settings" },
  { path: "/profile", icon: User, label: "Profile" },
];

export default function Layout() {
  const { user, logout } = useAuthStore();
  const { liteMode, setLiteMode } = useSettingsStore();
  const { hasUpdate, latestVersion, dismissed, dismissUpdate, downloading, downloadedPath, installUpdate } = useUpdateStore();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="flex h-screen bg-[var(--bg)]">
      {/* Sidebar */}
      <aside className="w-56 bg-[var(--card-bg)] border-r border-[var(--border)] flex flex-col">
        {/* Logo */}
        <div
          className="h-14 flex items-center gap-3 px-4 border-b border-[var(--border)]"
          data-tauri-drag-region
        >
          <img src="/icon.svg" alt="MineGlance" className="w-8 h-8 rounded-lg" />
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-base text-[var(--text)]">MineGlance</span>
              {user?.plan === "pro" && <span className="pro-badge">PRO</span>}
            </div>
            <span className="text-[10px] text-[var(--text-dim)]">v1.3.5</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-3 px-2">
          {navItems.map(({ path, icon: Icon, label }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-all ${
                  isActive
                    ? "bg-primary/20 text-primary font-medium"
                    : "text-[var(--text-muted)] hover:bg-[var(--card-hover)] hover:text-[var(--text)]"
                }`
              }
            >
              <Icon size={18} />
              <span className="text-sm">{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User Info & Theme Toggle */}
        <div className="border-t border-[var(--border)] p-3">
          {/* Theme Toggle */}
          <button
            onClick={() => setLiteMode(!liteMode)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[var(--text-muted)] hover:bg-[var(--card-hover)] hover:text-[var(--text)] transition-all mb-2"
          >
            {liteMode ? <Sun size={18} /> : <Moon size={18} />}
            <span className="text-sm">{liteMode ? "Light Mode" : "Dark Mode"}</span>
          </button>

          {/* User Info */}
          <div className="px-3 py-2 bg-[var(--bg)] rounded-lg">
            <div className="text-sm font-medium text-[var(--text)] truncate">
              {user?.fullName || user?.email}
            </div>
            <div className="text-xs text-[var(--text-dim)] truncate">{user?.email}</div>
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-danger hover:bg-danger/10 transition-all mt-2"
          >
            <LogOut size={18} />
            <span className="text-sm">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Titlebar */}
        <header
          className="h-10 bg-[var(--card-bg)] border-b border-[var(--border)] flex items-center justify-between px-4"
          data-tauri-drag-region
        >
          <span className="text-sm text-[var(--text-muted)]">
            {navItems.find((item) => item.path === location.pathname)?.label || "Dashboard"}
          </span>
        </header>

        {/* Update Banner */}
        {hasUpdate && !dismissed && (
          <div className={`border-b px-4 py-2 flex items-center justify-between ${
            downloadedPath ? 'bg-green-500/10 border-green-500/30' : 'bg-primary/10 border-primary/30'
          }`}>
            <div className="flex items-center gap-3">
              <Download size={18} className={downloadedPath ? 'text-green-500' : 'text-primary'} />
              <span className="text-sm text-[var(--text)]">
                {downloading ? (
                  <>
                    <span className="font-medium">Downloading update...</span> MineGlance v{latestVersion}
                  </>
                ) : downloadedPath ? (
                  <>
                    <span className="font-medium">Update ready!</span> Click Install to update to v{latestVersion}
                  </>
                ) : (
                  <>
                    <span className="font-medium">Update available!</span> MineGlance v{latestVersion}
                  </>
                )}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {downloadedPath ? (
                <button
                  onClick={installUpdate}
                  className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-lg transition-all"
                >
                  Install & Restart
                </button>
              ) : downloading ? (
                <span className="px-3 py-1 text-sm text-[var(--text-muted)]">
                  Please wait...
                </span>
              ) : null}
              <button
                onClick={dismissUpdate}
                className="p-1 rounded hover:bg-[var(--card-hover)] text-[var(--text-muted)] hover:text-[var(--text)] transition-all"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
