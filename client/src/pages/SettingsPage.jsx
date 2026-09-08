import React, { useState } from 'react';
import { 
  Sun, 
  Moon, 
  ShieldCheck, 
  Lock, 
  Bell, 
  LogOut, 
  CheckCircle2, 
  AlertCircle,
  Laptop,
  KeyRound
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export const SettingsPage = ({ currentUser, onLogout }) => {
  const { theme, setTheme, isDark } = useTheme();

  // Notification toggles
  const [notifications, setNotifications] = useState({
    anomalyAlerts: true,
    policyEnforcement: true,
    weeklyReport: false,
    sessionWarnings: true
  });

  // Password state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState(null);

  // MFA state
  const [mfaEnabled, setMfaEnabled] = useState(true);

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    setPasswordError(null);
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters long.');
      return;
    }
    setPasswordSuccess(true);
    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setTimeout(() => setPasswordSuccess(false), 4000);
  };

  return (
    <div className="space-y-10 max-w-5xl mx-auto">
      {/* Editorial Header */}
      <div className={`p-8 sm:p-10 border border-[#D4AF37]/25 relative transition-colors ${
        isDark ? 'bg-black' : 'bg-white'
      }`}>
        <div className="flex items-center gap-3 mb-3">
          <span className="text-[10px] font-mono tracking-[0.25em] uppercase text-[#D4AF37] border border-[#D4AF37]/40 px-2.5 py-0.5">
            CONFIGURATION CONSOLE
          </span>
          <span className="text-[11px] font-mono text-gray-500">
            SECURITY &amp; PROFILE PREFERENCES
          </span>
        </div>

        <h1 className="font-serif-display text-3xl sm:text-4xl lg:text-5xl font-light tracking-tight">
          Platform Settings
        </h1>
        <p className="text-xs text-gray-400 max-w-2xl mt-3 font-sans leading-relaxed">
          Manage system appearance, password security, cryptographic multi-factor authentication, enterprise notifications, and active session boundaries.
        </p>
      </div>

      {/* 1. APPEARANCE (LIGHT, DARK) */}
      <div className={`p-8 sm:p-10 border border-[#D4AF37]/25 ${
        isDark ? 'bg-black' : 'bg-white'
      }`}>
        <div className="mb-6 pb-4 border-b border-[#D4AF37]/20">
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#D4AF37] block">
            VISUAL SYSTEM
          </span>
          <h2 className="font-serif-display text-2xl font-light tracking-tight mt-1">
            Appearance
          </h2>
          <p className="text-xs font-sans text-gray-400 mt-1">
            Toggle between the near-black editorial aesthetic and the clean high-contrast light theme.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-xl">
          {/* Dark Mode */}
          <div
            onClick={() => setTheme('dark')}
            className={`p-6 border transition-all cursor-pointer flex items-center justify-between ${
              theme === 'dark'
                ? 'border-[#D4AF37] bg-[#D4AF37]/10'
                : 'border-gray-500/30 hover:border-[#D4AF37]/50 opacity-60'
            }`}
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37]">
                <Moon className="w-5 h-5" />
              </div>
              <div>
                <div className="font-serif-display text-base font-medium">Dark Mode</div>
                <div className="text-[11px] font-mono text-gray-400">Black + Golden Yellow</div>
              </div>
            </div>
            {theme === 'dark' && <CheckCircle2 className="w-4 h-4 text-[#D4AF37]" />}
          </div>

          {/* Light Mode */}
          <div
            onClick={() => setTheme('light')}
            className={`p-6 border transition-all cursor-pointer flex items-center justify-between ${
              theme === 'light'
                ? 'border-[#D4AF37] bg-[#D4AF37]/10'
                : 'border-gray-500/30 hover:border-[#D4AF37]/50 opacity-60'
            }`}
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37]">
                <Sun className="w-5 h-5" />
              </div>
              <div>
                <div className="font-serif-display text-base font-medium">Light Mode</div>
                <div className="text-[11px] font-mono text-gray-400">White + Golden Yellow</div>
              </div>
            </div>
            {theme === 'light' && <CheckCircle2 className="w-4 h-4 text-[#D4AF37]" />}
          </div>
        </div>
      </div>

      {/* 2. ACCOUNT (CHANGE PASSWORD) */}
      <div className={`p-8 sm:p-10 border border-[#D4AF37]/25 ${
        isDark ? 'bg-black' : 'bg-white'
      }`}>
        <div className="mb-6 pb-4 border-b border-[#D4AF37]/20">
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#D4AF37] block">
            CREDENTIAL SECURITY
          </span>
          <h2 className="font-serif-display text-2xl font-light tracking-tight mt-1">
            Account &amp; Password
          </h2>
          <p className="text-xs font-sans text-gray-400 mt-1">
            Rotate cryptographic credentials and update user profile attributes.
          </p>
        </div>

        {passwordSuccess && (
          <div className="p-4 border border-emerald-500/50 bg-emerald-500/10 text-emerald-400 text-xs font-mono mb-6 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>Password successfully changed and synced with Active Directory.</span>
          </div>
        )}
        {passwordError && (
          <div className="p-4 border border-red-500/50 bg-red-500/10 text-red-400 text-xs font-mono mb-6 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>{passwordError}</span>
          </div>
        )}

        <form onSubmit={handlePasswordSubmit} className="max-w-xl space-y-4 font-mono text-xs">
          <div>
            <label className="block text-gray-400 uppercase text-[10px] mb-1">Current Password</label>
            <input
              type="password"
              required
              value={passwordForm.currentPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
              placeholder="••••••••••••"
              className="w-full border border-[#D4AF37]/30 bg-transparent px-3 py-2 text-current outline-none focus:border-[#D4AF37]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-400 uppercase text-[10px] mb-1">New Password</label>
              <input
                type="password"
                required
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                placeholder="Min 8 characters"
                className="w-full border border-[#D4AF37]/30 bg-transparent px-3 py-2 text-current outline-none focus:border-[#D4AF37]"
              />
            </div>

            <div>
              <label className="block text-gray-400 uppercase text-[10px] mb-1">Confirm New Password</label>
              <input
                type="password"
                required
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                placeholder="Repeat password"
                className="w-full border border-[#D4AF37]/30 bg-transparent px-3 py-2 text-current outline-none focus:border-[#D4AF37]"
              />
            </div>
          </div>

          <div className="pt-3">
            <button
              type="submit"
              className="px-5 py-2.5 border border-[#D4AF37] bg-[#D4AF37] text-black font-semibold hover:bg-transparent hover:text-[#D4AF37] text-xs font-mono transition-all duration-300 cursor-pointer"
            >
              CHANGE PASSWORD
            </button>
          </div>
        </form>
      </div>

      {/* 3. SECURITY (MFA, ACTIVE SESSIONS, DEVICE TRUST, NOTIFICATIONS) */}
      <div className={`p-8 sm:p-10 border border-[#D4AF37]/25 ${
        isDark ? 'bg-black' : 'bg-white'
      }`}>
        <div className="mb-6 pb-4 border-b border-[#D4AF37]/20">
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#D4AF37] block">
            ZERO TRUST CONTROLS
          </span>
          <h2 className="font-serif-display text-2xl font-light tracking-tight mt-1">
            Security Controls &amp; Alerts
          </h2>
          <p className="text-xs font-sans text-gray-400 mt-1">
            Configure Multi-Factor Authentication (MFA), active sessions, endpoint trust attestations, and notification channels.
          </p>
        </div>

        <div className="space-y-6">
          {/* MFA */}
          <div className="p-6 border border-[#D4AF37]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="font-serif-display text-lg font-medium">
                Multi-Factor Authentication (MFA)
              </div>
              <p className="text-xs font-mono text-gray-400 mt-0.5">
                Hardware WebAuthn FIDO2 and TOTP mobile authenticator challenge.
              </p>
            </div>
            <button
              onClick={() => setMfaEnabled(!mfaEnabled)}
              className={`px-4 py-2 border text-xs font-mono font-semibold transition-colors cursor-pointer ${
                mfaEnabled
                  ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10'
                  : 'border-gray-500 text-gray-400'
              }`}
            >
              {mfaEnabled ? 'ENABLED' : 'DISABLED'}
            </button>
          </div>

          {/* Active Sessions */}
          <div className="p-6 border border-[#D4AF37]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="font-serif-display text-lg font-medium">
                Active Sessions
              </div>
              <p className="text-xs font-mono text-gray-400 mt-0.5">
                Current authenticated sessions: 1 session active (IP: 192.168.1.105, macOS Chrome).
              </p>
            </div>
            <button
              onClick={() => alert('Terminated all remote active sessions.')}
              className="px-4 py-2 border border-[#D4AF37]/40 hover:border-[#D4AF37] text-xs font-mono text-[#D4AF37] transition-colors cursor-pointer"
            >
              REVOKE OTHER SESSIONS
            </button>
          </div>

          {/* Device Trust */}
          <div className="p-6 border border-[#D4AF37]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="font-serif-display text-lg font-medium">
                Device Trust Binding
              </div>
              <p className="text-xs font-mono text-gray-400 mt-0.5">
                Hardware attestation certificate bound to this workstation with 98% trust index.
              </p>
            </div>
            <span className="text-xs font-mono text-emerald-400 px-3 py-1 border border-emerald-500/40">
              TRUST VERIFIED
            </span>
          </div>

          {/* Notifications */}
          <div className="p-6 border border-[#D4AF37]/20 space-y-4">
            <div className="font-serif-display text-lg font-medium">
              Notifications &amp; Security Broadcasts
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifications.anomalyAlerts}
                  onChange={(e) => setNotifications({ ...notifications, anomalyAlerts: e.target.checked })}
                  className="accent-[#D4AF37]"
                />
                <span>Real-Time Anomaly Alerts</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifications.policyEnforcement}
                  onChange={(e) => setNotifications({ ...notifications, policyEnforcement: e.target.checked })}
                  className="accent-[#D4AF37]"
                />
                <span>Policy Enforcement Notifications</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifications.sessionWarnings}
                  onChange={(e) => setNotifications({ ...notifications, sessionWarnings: e.target.checked })}
                  className="accent-[#D4AF37]"
                />
                <span>Off-Hours Session Warnings</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifications.weeklyReport}
                  onChange={(e) => setNotifications({ ...notifications, weeklyReport: e.target.checked })}
                  className="accent-[#D4AF37]"
                />
                <span>Weekly Behavioral Digest</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* 4. SESSION (LOGOUT) */}
      <div className={`p-8 sm:p-10 border border-[#D4AF37]/25 ${
        isDark ? 'bg-black' : 'bg-white'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-red-400 block">
              TERMINATE SESSION
            </span>
            <h2 className="font-serif-display text-2xl font-light tracking-tight mt-1">
              Sign Out &amp; Invalidate Tokens
            </h2>
            <p className="text-xs font-sans text-gray-400 mt-1">
              End your active administrator session and return to the public CyberOrbit home page.
            </p>
          </div>

          <button
            id="btn-settings-logout"
            onClick={onLogout}
            className="px-6 py-2.5 border border-red-500/50 hover:border-red-500 text-red-400 hover:bg-red-500/10 text-xs font-mono font-semibold tracking-wider transition-colors cursor-pointer flex items-center gap-2 shrink-0"
          >
            <LogOut className="w-4 h-4" />
            <span>LOGOUT</span>
          </button>
        </div>
      </div>
    </div>
  );
};
