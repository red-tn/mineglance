import { useState, useEffect } from "react";
import { useWalletStore, Wallet } from "../stores/walletStore";
import { useAuthStore } from "../stores/authStore";
import { Plus, Pencil, Trash2, GripVertical, X, AlertCircle, ExternalLink } from "lucide-react";
import { POOLS, getCoinsForPool } from "../constants/pools";

export default function Wallets() {
  const { wallets, loadWallets, addWallet, updateWallet, removeWallet } = useWalletStore();
  const { user } = useAuthStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWallet, setEditingWallet] = useState<Wallet | null>(null);
  const [isReordering, setIsReordering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    pool: "",
    coin: "",
    address: "",
    power: 0,
    enabled: true,
    apiToken: "",
    // Pro features
    priceAlertEnabled: false,
    priceAlertTarget: null as number | null,
    priceAlertCondition: "above" as "above" | "below",
    payoutPredictionEnabled: true,
    chartEnabled: false,
    chartPeriod: 30,
  });

  useEffect(() => {
    loadWallets();
  }, [loadWallets]);

  const availableCoins = formData.pool ? getCoinsForPool(formData.pool) : [];

  const resetForm = () => {
    setFormData({
      name: "",
      pool: "",
      coin: "",
      address: "",
      power: 0,
      enabled: true,
      apiToken: "",
      priceAlertEnabled: false,
      priceAlertTarget: null,
      priceAlertCondition: "above",
      payoutPredictionEnabled: true,
      chartEnabled: false,
      chartPeriod: 30,
    });
    setEditingWallet(null);
    setError(null);
  };

  const openAddModal = () => {
    // Check wallet limit for free users
    if (user?.plan === "free" && wallets.length >= 2) {
      setError("Free plan limited to 2 wallets. Upgrade to Pro for unlimited.");
      return;
    }
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (wallet: Wallet) => {
    setEditingWallet(wallet);
    setFormData({
      name: wallet.name,
      pool: wallet.pool,
      coin: wallet.coin,
      address: wallet.address,
      power: wallet.power || 0,
      enabled: wallet.enabled,
      apiToken: wallet.apiToken || "",
      priceAlertEnabled: wallet.priceAlertEnabled || false,
      priceAlertTarget: wallet.priceAlertTarget ?? null,
      priceAlertCondition: wallet.priceAlertCondition || "above",
      payoutPredictionEnabled: wallet.payoutPredictionEnabled ?? true,
      chartEnabled: wallet.chartEnabled || false,
      chartPeriod: wallet.chartPeriod || 30,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async () => {
    setError(null);

    if (!formData.name || !formData.pool || !formData.coin || !formData.address) {
      setError("Please fill in all required fields");
      return;
    }

    if (formData.pool === "braiins" && !formData.apiToken) {
      setError("Braiins Pool requires an API auth token from your account settings.");
      return;
    }

    try {
      if (editingWallet) {
        await updateWallet(editingWallet.id, formData);
      } else {
        await addWallet(formData);
      }
      setIsModalOpen(false);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save wallet");
    }
  };

  const handleDelete = async (wallet: Wallet) => {
    if (confirm(`Delete wallet "${wallet.name}"?`)) {
      await removeWallet(wallet.id);
    }
  };

  const handleToggleEnabled = async (wallet: Wallet) => {
    await updateWallet(wallet.id, { enabled: !wallet.enabled });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--text)]">Wallets</h1>
          <p className="text-sm text-[var(--text-muted)]">
            Manage your mining wallets
            {user?.plan === "free" && ` (${wallets.length}/2)`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsReordering(!isReordering)}
            className={`px-4 py-2 rounded-lg border transition-all ${
              isReordering
                ? "bg-primary text-white border-primary"
                : "bg-[var(--card-bg)] border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)]"
            }`}
          >
            {isReordering ? "Done" : "Reorder"}
          </button>
          <button
            onClick={openAddModal}
            className="px-4 py-2 bg-primary hover:bg-primary-light text-white font-semibold rounded-lg transition-all shadow-glow flex items-center gap-2"
          >
            <Plus size={18} />
            Add Wallet
          </button>
        </div>
      </div>

      {/* Free User Limit Warning */}
      {user?.plan === "free" && wallets.length >= 2 && (
        <div className="bg-warning/10 border border-warning/30 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="text-warning flex-shrink-0" size={20} />
          <div className="flex-1">
            <p className="font-medium text-[var(--text)]">Wallet limit reached</p>
            <p className="text-sm text-[var(--text-muted)]">
              Free plan is limited to 2 wallets. Upgrade to Pro for unlimited wallets.
            </p>
          </div>
          <a
            href="https://mineglance.com/#pricing"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-primary hover:bg-primary-light text-white font-semibold rounded-lg transition-all flex items-center gap-2"
          >
            Upgrade
            <ExternalLink size={14} />
          </a>
        </div>
      )}

      {/* Wallet List */}
      <div className="space-y-3">
        {wallets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 bg-[var(--card-bg)] rounded-xl border border-[var(--border)]">
            <div className="text-5xl mb-4">💰</div>
            <p className="text-lg text-[var(--text-muted)] mb-4">No wallets yet</p>
            <button
              onClick={openAddModal}
              className="px-6 py-3 bg-primary hover:bg-primary-light text-white font-semibold rounded-lg transition-all shadow-glow"
            >
              Add Your First Wallet
            </button>
          </div>
        ) : (
          wallets.map((wallet) => (
            <div
              key={wallet.id}
              className={`bg-[var(--card-bg)] rounded-xl p-4 border border-[var(--border)] flex items-center gap-4 ${
                !wallet.enabled ? "opacity-50" : ""
              }`}
            >
              {isReordering && (
                <GripVertical className="text-[var(--text-muted)] cursor-grab" size={20} />
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-[var(--text)]">{wallet.name}</span>
                  <span className="coin-badge">{wallet.coin}</span>
                  {!wallet.enabled && (
                    <span className="text-xs px-2 py-0.5 bg-[var(--border)] rounded text-[var(--text-muted)]">
                      Disabled
                    </span>
                  )}
                </div>
                <p className="text-sm text-[var(--text-muted)] truncate">{wallet.pool}</p>
                <p className="text-xs text-[var(--text-dim)] font-mono truncate">{wallet.address}</p>
              </div>

              {!isReordering && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleEnabled(wallet)}
                    className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${
                      wallet.enabled
                        ? "bg-primary/10 border-primary/30 text-primary"
                        : "bg-[var(--bg)] border-[var(--border)] text-[var(--text-muted)]"
                    }`}
                  >
                    {wallet.enabled ? "Enabled" : "Enable"}
                  </button>
                  <button
                    onClick={() => openEditModal(wallet)}
                    className="p-2 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--card-hover)] transition-all"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(wallet)}
                    className="p-2 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-danger hover:bg-danger/10 transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--card-bg)] rounded-xl p-6 w-full max-w-md border border-[var(--border)]">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-[var(--text)]">
                {editingWallet ? "Edit Wallet" : "Add Wallet"}
              </h2>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  resetForm();
                }}
                className="p-2 rounded-lg hover:bg-[var(--bg)] text-[var(--text-muted)] hover:text-[var(--text)] transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">
                  Wallet Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="My Mining Rig"
                  className="w-full px-4 py-2.5 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-[var(--text)] placeholder:text-[var(--text-dim)] focus:outline-none focus:border-primary transition-colors"
                />
              </div>

              {/* Pool */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">
                  Mining Pool
                </label>
                <select
                  value={formData.pool}
                  onChange={(e) =>
                    setFormData({ ...formData, pool: e.target.value, coin: "" })
                  }
                  className="w-full px-4 py-2.5 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-[var(--text)] focus:outline-none focus:border-primary transition-colors"
                >
                  <option value="">Select a pool</option>
                  {POOLS.map((pool) => (
                    <option key={pool.id} value={pool.id}>
                      {pool.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Coin */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">
                  Coin
                </label>
                <select
                  value={formData.coin}
                  onChange={(e) => setFormData({ ...formData, coin: e.target.value })}
                  disabled={!formData.pool}
                  className="w-full px-4 py-2.5 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-[var(--text)] focus:outline-none focus:border-primary transition-colors disabled:opacity-50"
                >
                  <option value="">Select a coin</option>
                  {availableCoins.map((coin) => (
                    <option key={coin.id} value={coin.id}>
                      {coin.name} ({coin.id})
                    </option>
                  ))}
                </select>
              </div>

              {/* Address */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">
                  {formData.pool === "braiins" ? "Braiins Username" : "Wallet Address"}
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder={formData.pool === "braiins" ? "e.g., edwarzio" : "0x..."}
                  className="w-full px-4 py-2.5 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-[var(--text)] font-mono text-sm placeholder:text-[var(--text-dim)] focus:outline-none focus:border-primary transition-colors"
                />
              </div>

              {/* API Token (Braiins) */}
              {formData.pool === "braiins" && (
                <div>
                  <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">
                    API Auth Token
                  </label>
                  <input
                    type="text"
                    value={formData.apiToken}
                    onChange={(e) => setFormData({ ...formData, apiToken: e.target.value })}
                    placeholder="Your Braiins API token"
                    className="w-full px-4 py-2.5 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-[var(--text)] font-mono text-sm placeholder:text-[var(--text-dim)] focus:outline-none focus:border-primary transition-colors"
                  />
                  <p className="text-xs text-[var(--text-dim)] mt-1">
                    Find this in your Braiins account under Settings &gt; Access Profiles.
                  </p>
                </div>
              )}

              {/* Power */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">
                  Power Consumption (Watts)
                </label>
                <input
                  type="number"
                  value={formData.power || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, power: parseInt(e.target.value) || 0 })
                  }
                  placeholder="0"
                  className="w-full px-4 py-2.5 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-[var(--text)] focus:outline-none focus:border-primary transition-colors"
                />
                <p className="text-xs text-[var(--text-dim)] mt-1">
                  Used for profit calculation
                </p>
              </div>

              {/* Pro Features Section */}
              {user?.plan === "pro" && (
                <div className="border-t border-[var(--border)] pt-4 mt-4">
                  <p className="text-sm font-semibold text-[var(--text)] mb-3 flex items-center gap-2">
                    Pro Features
                    <span className="text-xs px-2 py-0.5 bg-primary/20 text-primary rounded">PRO</span>
                  </p>

                  {/* Price Alert */}
                  <div className="space-y-2 mb-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.priceAlertEnabled}
                        onChange={(e) =>
                          setFormData({ ...formData, priceAlertEnabled: e.target.checked })
                        }
                        className="w-4 h-4 rounded border-[var(--border)] text-primary focus:ring-primary"
                      />
                      <span className="text-sm text-[var(--text)]">Price Alert</span>
                    </label>
                    {formData.priceAlertEnabled && (
                      <div className="ml-6 flex items-center gap-2 text-sm">
                        <span className="text-[var(--text-muted)]">Alert when price goes</span>
                        <select
                          value={formData.priceAlertCondition}
                          onChange={(e) =>
                            setFormData({ ...formData, priceAlertCondition: e.target.value as "above" | "below" })
                          }
                          className="px-2 py-1 bg-[var(--bg)] border border-[var(--border)] rounded text-[var(--text)] text-sm"
                        >
                          <option value="above">above</option>
                          <option value="below">below</option>
                        </select>
                        <span className="text-[var(--text-muted)]">$</span>
                        <input
                          type="number"
                          step="0.0001"
                          value={formData.priceAlertTarget || ""}
                          onChange={(e) =>
                            setFormData({ ...formData, priceAlertTarget: parseFloat(e.target.value) || null })
                          }
                          placeholder="0.00"
                          className="w-24 px-2 py-1 bg-[var(--bg)] border border-[var(--border)] rounded text-[var(--text)] text-sm"
                        />
                      </div>
                    )}
                  </div>

                  {/* Payout Prediction */}
                  <div className="mb-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.payoutPredictionEnabled}
                        onChange={(e) =>
                          setFormData({ ...formData, payoutPredictionEnabled: e.target.checked })
                        }
                        className="w-4 h-4 rounded border-[var(--border)] text-primary focus:ring-primary"
                      />
                      <span className="text-sm text-[var(--text)]">Show Payout Prediction</span>
                    </label>
                    <p className="text-xs text-[var(--text-dim)] ml-6 mt-1">
                      Estimate time until next pool payout
                    </p>
                  </div>

                  {/* Performance Charts */}
                  <div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.chartEnabled}
                        onChange={(e) =>
                          setFormData({ ...formData, chartEnabled: e.target.checked })
                        }
                        className="w-4 h-4 rounded border-[var(--border)] text-primary focus:ring-primary"
                      />
                      <span className="text-sm text-[var(--text)]">Performance Charts</span>
                    </label>
                    {formData.chartEnabled && (
                      <div className="ml-6 mt-2 flex items-center gap-2 text-sm">
                        <span className="text-[var(--text-muted)]">Chart period:</span>
                        <select
                          value={formData.chartPeriod}
                          onChange={(e) =>
                            setFormData({ ...formData, chartPeriod: parseInt(e.target.value) })
                          }
                          className="px-2 py-1 bg-[var(--bg)] border border-[var(--border)] rounded text-[var(--text)] text-sm"
                        >
                          <option value={7}>7 days</option>
                          <option value={30}>30 days</option>
                          <option value={90}>90 days</option>
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="bg-danger/10 border border-danger/30 text-danger text-sm p-3 rounded-lg">
                  {error}
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    resetForm();
                  }}
                  className="flex-1 py-2.5 bg-[var(--bg)] border border-[var(--border)] text-[var(--text-muted)] font-medium rounded-lg hover:bg-[var(--card-hover)] transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  className="flex-1 py-2.5 bg-primary hover:bg-primary-light text-white font-semibold rounded-lg transition-all shadow-glow"
                >
                  {editingWallet ? "Save Changes" : "Add Wallet"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
