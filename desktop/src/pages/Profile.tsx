import { useAuthStore } from "../stores/authStore";
import { User, Mail, Calendar, CreditCard, Shield, ExternalLink } from "lucide-react";

export default function Profile() {
  const { user } = useAuthStore();

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getPlanBadge = () => {
    if (user?.plan === "pro") {
      const billingText = user.billingType
        ? ` - ${user.billingType.charAt(0).toUpperCase() + user.billingType.slice(1)}`
        : "";
      return (
        <span className="px-3 py-1 bg-primary/20 text-primary font-semibold rounded-full text-sm">
          PRO{billingText}
        </span>
      );
    }
    return (
      <span className="px-3 py-1 bg-[var(--border)] text-[var(--text-muted)] font-semibold rounded-full text-sm">
        Free
      </span>
    );
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-[var(--text)]">Profile</h1>
        <p className="text-sm text-[var(--text-muted)]">Your account information</p>
      </div>

      {/* User Info Card */}
      <section className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] overflow-hidden">
        <div className="p-6">
          {/* Avatar & Name */}
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
              <User size={32} className="text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[var(--text)]">
                {user?.fullName || "User"}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                {getPlanBadge()}
              </div>
            </div>
          </div>

          {/* Info Grid */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-[var(--text)]">
              <Mail size={18} className="text-[var(--text-muted)]" />
              <span>{user?.email}</span>
            </div>

            {user?.plan === "pro" && (
              <>
                <div className="flex items-center gap-3 text-[var(--text)]">
                  <CreditCard size={18} className="text-[var(--text-muted)]" />
                  <span>
                    {user.billingType === "lifetime"
                      ? "Lifetime Access"
                      : `Subscription renews ${formatDate(user.subscriptionEndDate)}`}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Security */}
      <section className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--border)]">
          <h2 className="font-semibold text-[var(--text)]">Security</h2>
        </div>

        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield size={20} className="text-primary" />
              <div>
                <p className="font-medium text-[var(--text)]">Two-Factor Authentication</p>
                <p className="text-sm text-[var(--text-muted)]">
                  Manage 2FA in your web dashboard
                </p>
              </div>
            </div>
            <a
              href="https://www.mineglance.com/dashboard/profile"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] font-medium rounded-lg hover:bg-[var(--card-hover)] transition-all flex items-center gap-2"
            >
              Manage
              <ExternalLink size={14} />
            </a>
          </div>
        </div>
      </section>

      {/* Account Actions */}
      <section className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--border)]">
          <h2 className="font-semibold text-[var(--text)]">Account</h2>
        </div>

        <div className="p-4 space-y-3">
          <a
            href="https://www.mineglance.com/dashboard"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-between p-3 bg-[var(--bg)] border border-[var(--border)] rounded-lg hover:bg-[var(--card-hover)] transition-all"
          >
            <span className="font-medium text-[var(--text)]">Open Web Dashboard</span>
            <ExternalLink size={16} className="text-[var(--text-muted)]" />
          </a>

          <a
            href="https://www.mineglance.com/dashboard/subscription"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-between p-3 bg-[var(--bg)] border border-[var(--border)] rounded-lg hover:bg-[var(--card-hover)] transition-all"
          >
            <span className="font-medium text-[var(--text)]">Manage Subscription</span>
            <ExternalLink size={16} className="text-[var(--text-muted)]" />
          </a>

          {user?.plan === "free" && (
            <a
              href="https://mineglance.com/#pricing"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 p-3 bg-primary hover:bg-primary-light text-white font-semibold rounded-lg transition-all shadow-glow"
            >
              Upgrade to Pro - $59/year
              <ExternalLink size={14} />
            </a>
          )}
        </div>
      </section>
    </div>
  );
}
