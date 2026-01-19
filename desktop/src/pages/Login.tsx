import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../stores/authStore";
import { Eye, EyeOff, ArrowLeft, ExternalLink } from "lucide-react";

export default function Login() {
  const navigate = useNavigate();
  const { isAuthenticated, requires2FA, error, login, verify2FA, clearError } = useAuthStore();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<"credentials" | "password" | "2fa">("credentials");

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (requires2FA) {
      setStep("2fa");
    }
  }, [requires2FA]);

  const handleCredentialsContinue = () => {
    if (email.trim()) {
      setStep("password");
      clearError();
    }
  };

  const handleLogin = async () => {
    setIsLoading(true);
    clearError();

    const result = await login(email, password);

    setIsLoading(false);

    if (result.success && !result.requires2FA && !result.requiresPasswordSetup) {
      navigate("/", { replace: true });
    }
  };

  const handle2FAVerify = async () => {
    setIsLoading(true);
    clearError();

    const result = await verify2FA(totpCode);

    setIsLoading(false);

    if (result.success) {
      navigate("/", { replace: true });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === "Enter") {
      action();
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-[var(--card-bg)] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <img src="/icon.svg" alt="MineGlance" className="w-12 h-12" />
          </div>
          <h1 className="text-2xl font-bold text-[var(--text)]">Welcome to MineGlance</h1>
          <p className="text-[var(--text-muted)] mt-2">
            Sign in to sync your wallets
          </p>
        </div>

        {/* Credentials Step (Email only) */}
        {step === "credentials" && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyPress={(e) => handleKeyPress(e, handleCredentialsContinue)}
                placeholder="your@email.com"
                className="w-full px-4 py-3 bg-[var(--card-bg)] border border-[var(--border)] rounded-lg text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-primary transition-colors"
                autoFocus
              />
            </div>

            <button
              onClick={handleCredentialsContinue}
              disabled={!email.trim()}
              className="w-full py-3 bg-primary hover:bg-primary-light text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-glow"
            >
              Continue
            </button>

            <div className="text-center">
              <p className="text-xs text-[var(--text-dim)]">
                Don't have an account?{" "}
                <a
                  href="https://mineglance.com/#pricing"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-1"
                >
                  Sign up <ExternalLink size={12} />
                </a>
              </p>
            </div>
          </div>
        )}

        {/* Password Step */}
        {step === "password" && (
          <div className="space-y-4">
            <button
              onClick={() => {
                setStep("credentials");
                clearError();
              }}
              className="flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--text)] transition-colors mb-2"
            >
              <ArrowLeft size={18} />
              <span className="text-sm">Back</span>
            </button>

            <div className="bg-primary/10 border border-primary/30 rounded-lg p-3 mb-4">
              <p className="text-sm text-[var(--text)]">Signing in as <strong>{email}</strong></p>
            </div>

            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={(e) => handleKeyPress(e, handleLogin)}
                placeholder="Enter your password"
                className="w-full px-4 py-3 pr-12 bg-[var(--card-bg)] border border-[var(--border)] rounded-lg text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-primary transition-colors"
                autoFocus
              />
              <button
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text)]"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            {error && (
              <div className="bg-danger/10 border border-danger/30 text-danger text-sm p-3 rounded-lg">
                {error}
              </div>
            )}

            <button
              onClick={handleLogin}
              disabled={isLoading || !password.trim()}
              className="w-full py-3 bg-primary hover:bg-primary-light text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-glow"
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </button>

            <p className="text-center text-sm">
              <a
                href="https://www.mineglance.com/reset-password"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--text-muted)] hover:text-primary transition-colors"
              >
                Forgot password?
              </a>
            </p>
          </div>
        )}

        {/* 2FA Step */}
        {step === "2fa" && (
          <div className="space-y-4">
            <button
              onClick={() => {
                setStep("password");
                clearError();
              }}
              className="flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--text)] transition-colors mb-2"
            >
              <ArrowLeft size={18} />
              <span className="text-sm">Back</span>
            </button>

            <div className="bg-primary/10 border border-primary/30 rounded-lg p-3 mb-4">
              <p className="text-sm text-[var(--text)]">
                Enter the code from your authenticator app
              </p>
            </div>

            <input
              type="text"
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 8))}
              onKeyPress={(e) => handleKeyPress(e, handle2FAVerify)}
              placeholder="000000"
              maxLength={8}
              className="w-full px-4 py-4 bg-[var(--card-bg)] border border-[var(--border)] rounded-lg text-[var(--text)] text-center text-2xl font-mono tracking-widest placeholder:text-[var(--text-muted)] focus:outline-none focus:border-primary transition-colors"
              autoFocus
            />

            <p className="text-center text-xs text-[var(--text-dim)]">
              You can also use a backup code
            </p>

            {error && (
              <div className="bg-danger/10 border border-danger/30 text-danger text-sm p-3 rounded-lg">
                {error}
              </div>
            )}

            <button
              onClick={handle2FAVerify}
              disabled={isLoading || totpCode.length < 6}
              className="w-full py-3 bg-primary hover:bg-primary-light text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-glow"
            >
              {isLoading ? "Verifying..." : "Verify"}
            </button>
          </div>
        )}

        {/* Version */}
        <p className="text-center text-xs text-[var(--text-dim)] mt-8">MineGlance Desktop v1.0.0</p>
      </div>
    </div>
  );
}
