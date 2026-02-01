import { useEffect } from "react";
import { useSettingsStore } from "../stores/settingsStore";
import { Moon, Sun, Bell, Monitor, Clock, Zap } from "lucide-react";

const REFRESH_OPTIONS = [
  { value: 1, label: "1 minute" },
  { value: 5, label: "5 minutes" },
  { value: 15, label: "15 minutes" },
  { value: 30, label: "30 minutes" },
  { value: 60, label: "1 hour" },
  { value: 180, label: "3 hours" },
];

const CURRENCY_OPTIONS = [
  { value: "USD", label: "USD ($)" },
  { value: "EUR", label: "EUR (\u20AC)" },
  { value: "GBP", label: "GBP (\u00A3)" },
  { value: "CAD", label: "CAD ($)" },
  { value: "AUD", label: "AUD ($)" },
];

export default function Settings() {
  const {
    liteMode,
    refreshInterval,
    electricityCost,
    currency,
    startOnBoot,
    minimizeToTray,
    showNotifications,
    loadSettings,
    setLiteMode,
    setRefreshInterval,
    setElectricityCost,
    setCurrency,
    setStartOnBoot,
    setMinimizeToTray,
    setShowNotifications,
  } = useSettingsStore();

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-[var(--text)]">Settings</h1>
        <p className="text-sm text-[var(--text-muted)]">Configure your MineGlance experience</p>
      </div>

      {/* Appearance */}
      <section className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--border)]">
          <h2 className="font-semibold text-[var(--text)]">Appearance</h2>
        </div>

        <div className="p-4 space-y-4">
          {/* Theme Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {liteMode ? <Sun size={20} className="text-warning" /> : <Moon size={20} className="text-primary" />}
              <div>
                <p className="font-medium text-[var(--text)]">Theme</p>
                <p className="text-sm text-[var(--text-muted)]">
                  {liteMode ? "Light mode" : "Dark mode"}
                </p>
              </div>
            </div>
            <button
              onClick={() => setLiteMode(!liteMode)}
              className={`w-12 h-6 rounded-full transition-all ${
                liteMode ? "bg-primary" : "bg-[var(--border)]"
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  liteMode ? "translate-x-6" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>
        </div>
      </section>

      {/* Mining Settings */}
      <section className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--border)]">
          <h2 className="font-semibold text-[var(--text)]">Mining</h2>
        </div>

        <div className="p-4 space-y-4">
          {/* Refresh Interval */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Clock size={20} className="text-[var(--text-muted)]" />
              <div>
                <p className="font-medium text-[var(--text)]">Auto Refresh</p>
                <p className="text-sm text-[var(--text-muted)]">How often to update stats</p>
              </div>
            </div>
            <select
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(parseInt(e.target.value))}
              className="px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-[var(--text)] focus:outline-none focus:border-primary"
            >
              {REFRESH_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <p className="text-xs text-[var(--text-muted)] pl-8">
            Note: Most pools update worker status every 10-15 minutes. Shorter intervals won't detect offline workers faster.
          </p>

          {/* Electricity Cost */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Zap size={20} className="text-warning" />
              <div>
                <p className="font-medium text-[var(--text)]">Electricity Cost</p>
                <p className="text-sm text-[var(--text-muted)]">Per kWh for profit calculation</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[var(--text-muted)]">$</span>
              <input
                type="number"
                step="0.01"
                value={electricityCost}
                onChange={(e) => setElectricityCost(parseFloat(e.target.value) || 0)}
                className="w-20 px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-[var(--text)] text-right focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          {/* Currency */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-lg text-[var(--text-muted)]">$</span>
              <div>
                <p className="font-medium text-[var(--text)]">Currency</p>
                <p className="text-sm text-[var(--text-muted)]">Display currency for values</p>
              </div>
            </div>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-[var(--text)] focus:outline-none focus:border-primary"
            >
              {CURRENCY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Desktop Settings */}
      <section className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--border)]">
          <h2 className="font-semibold text-[var(--text)]">Desktop App</h2>
        </div>

        <div className="p-4 space-y-4">
          {/* Start on Boot */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Monitor size={20} className="text-[var(--text-muted)]" />
              <div>
                <p className="font-medium text-[var(--text)]">Start on Boot</p>
                <p className="text-sm text-[var(--text-muted)]">Launch when computer starts</p>
              </div>
            </div>
            <button
              onClick={() => setStartOnBoot(!startOnBoot)}
              className={`w-12 h-6 rounded-full transition-all ${
                startOnBoot ? "bg-primary" : "bg-[var(--border)]"
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  startOnBoot ? "translate-x-6" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>

          {/* Minimize to Tray */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Monitor size={20} className="text-[var(--text-muted)]" />
              <div>
                <p className="font-medium text-[var(--text)]">Minimize to Tray</p>
                <p className="text-sm text-[var(--text-muted)]">Keep running in system tray</p>
              </div>
            </div>
            <button
              onClick={() => setMinimizeToTray(!minimizeToTray)}
              className={`w-12 h-6 rounded-full transition-all ${
                minimizeToTray ? "bg-primary" : "bg-[var(--border)]"
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  minimizeToTray ? "translate-x-6" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>

          {/* Notifications */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell size={20} className="text-[var(--text-muted)]" />
              <div>
                <p className="font-medium text-[var(--text)]">Notifications</p>
                <p className="text-sm text-[var(--text-muted)]">Worker offline & profit alerts</p>
              </div>
            </div>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className={`w-12 h-6 rounded-full transition-all ${
                showNotifications ? "bg-primary" : "bg-[var(--border)]"
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  showNotifications ? "translate-x-6" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>
        </div>
      </section>

      {/* Version */}
      <div className="text-center text-sm text-[var(--text-dim)]">
        MineGlance Desktop v1.3.6
      </div>
    </div>
  );
}
