import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';

export default function ResetPasswordPage() {
  const { isDark } = useTheme();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError('');
    setMessage('');

    if (!token) {
      setError('Invalid or missing password reset token.');
      return;
    }

    if (!password || !confirmPassword) {
      setError('Please fill in both password fields.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          token,
          password,
          newPassword: password
        })
      });

      const data = await response.json();

      if (!response.ok || data.success === false) {
        throw new Error(data.error || 'Unable to reset password.');
      }

      setMessage('Password reset successfully. Redirecting to login...');

      setTimeout(() => {
        window.history.pushState({}, '', '/login');
        window.dispatchEvent(new PopStateEvent('popstate'));
      }, 1500);
    } catch (err) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`min-h-screen flex items-center justify-center px-4 ${
        isDark
          ? 'bg-[#07080A] text-[#F4F4F6]'
          : 'bg-[#F9F9F7] text-[#111317]'
      }`}
    >
      <div
        className={`w-full max-w-md border p-8 shadow-2xl ${
          isDark
            ? 'bg-[#101216] border-white/10'
            : 'bg-white border-black/10'
        }`}
      >
        <div className="mb-8 text-center">
          <p className="text-xs tracking-[0.3em] text-[#C6A14A] uppercase">
            CyberOrbit Security
          </p>

          <h1 className="mt-3 text-3xl font-bold">
            Reset Password
          </h1>

          <p
            className={`mt-2 text-sm ${
              isDark ? 'text-gray-400' : 'text-gray-600'
            }`}
          >
            Create a new secure password for your account.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium">
              New Password
            </label>

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter new password"
              className={`w-full border px-4 py-3 outline-none ${
                isDark
                  ? 'bg-[#07080A] border-white/10 text-white'
                  : 'bg-white border-black/20 text-black'
              }`}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Confirm Password
            </label>

            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              className={`w-full border px-4 py-3 outline-none ${
                isDark
                  ? 'bg-[#07080A] border-white/10 text-white'
                  : 'bg-white border-black/20 text-black'
              }`}
            />
          </div>

          {error && (
            <div className="border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {message && (
            <div className="border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-400">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#C6A14A] px-4 py-3 font-bold text-black transition hover:bg-[#D4AF37] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Updating Password...' : 'Update Password'}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            window.history.pushState({}, '', '/login');
            window.dispatchEvent(new PopStateEvent('popstate'));
          }}
          className="mt-6 w-full text-center text-sm text-[#C6A14A] hover:underline"
        >
          Back to Login
        </button>
      </div>
    </div>
  );
}