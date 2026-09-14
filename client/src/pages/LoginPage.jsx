import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  AlertCircle,
  Eye,
  EyeOff,
  Clock,
  Sun,
  Moon,
  Shield
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export const LoginPage = ({
  onLoginSuccess,
  onBackToHome
}) => {
  const { isDark, toggleTheme } = useTheme();

  // =========================
  // ADMIN ACCOUNTS
  // =========================
  const [admins, setAdmins] = useState([]);
  const [isLoadingAdmins, setIsLoadingAdmins] = useState(true);
  const [adminLoadError, setAdminLoadError] = useState(null);

  // =========================
  // LOGIN STATES
  // =========================
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // =========================
  // FORGOT PASSWORD STATES
  // =========================
  const [showForgotPassword, setShowForgotPassword] =
    useState(false);

  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotMessage, setForgotMessage] = useState(null);
  const [isSendingReset, setIsSendingReset] = useState(false);

  // =========================
  // MFA STATES
  // =========================
  const [isMfaStep, setIsMfaStep] = useState(false);

  const [authenticatedUser, setAuthenticatedUser] =
    useState(null);

  const [challengeId, setChallengeId] = useState(null);

  const [otp, setOtp] = useState([
    '',
    '',
    '',
    '',
    '',
    ''
  ]);

  const [countdown, setCountdown] = useState(300);

  const [mfaError, setMfaError] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);

  // =========================
  // LOAD ADMINS FROM DATABASE
  // =========================
  useEffect(() => {
    let isMounted = true;

    const loadAdmins = async () => {
      setIsLoadingAdmins(true);
      setAdminLoadError(null);

      try {
        const res = await fetch('/api/auth/admins', {
          method: 'GET',
          headers: {
            Accept: 'application/json'
          }
        });

        let data = null;

        try {
          data = await res.json();
        } catch {
          data = null;
        }

        if (!res.ok || !data?.success) {
          throw new Error(
            data?.error?.message ||
              'Unable to load administrator accounts.'
          );
        }

        const adminList = Array.isArray(data.admins)
          ? data.admins
          : [];

        if (!isMounted) {
          return;
        }

        setAdmins(adminList);

        // Automatically select the first admin
        // only when no email has already been selected.
        if (adminList.length > 0) {
          setIdentifier((current) => {
            if (current.trim()) {
              return current;
            }

            return adminList[0].email || '';
          });

          setForgotEmail((current) => {
            if (current.trim()) {
              return current;
            }

            return adminList[0].email || '';
          });
        }
      } catch (err) {
        console.error('Admin list error:', err);

        if (!isMounted) {
          return;
        }

        setAdmins([]);
        setAdminLoadError(
          'Unable to load administrator accounts.'
        );
      } finally {
        if (isMounted) {
          setIsLoadingAdmins(false);
        }
      }
    };

    loadAdmins();

    return () => {
      isMounted = false;
    };
  }, []);

  // =========================
  // MFA COUNTDOWN
  // =========================
  useEffect(() => {
    let timer;

    if (isMfaStep && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }

          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timer) {
        clearInterval(timer);
      }
    };
  }, [isMfaStep, countdown]);

  // =========================
  // START MFA
  // =========================
  const startMfa = (user, newChallengeId) => {
    setAuthenticatedUser(user);
    setChallengeId(newChallengeId);
    setIsMfaStep(true);
    setCountdown(300);

    setOtp([
      '',
      '',
      '',
      '',
      '',
      ''
    ]);

    setMfaError(null);
  };

  // =========================
  // SELECT ADMIN
  // =========================
  const handleSelectAdmin = (admin) => {
    if (!admin?.email) {
      return;
    }

    setIdentifier(admin.email);
    setForgotEmail(admin.email);
    setPassword('');
    setError(null);
    setForgotMessage(null);
  };

  // =========================
  // ADMIN ROLE LABEL
  // =========================
  const getAdminRoleLabel = (role) => {
    if (role === 'SYSTEM_ADMIN') {
      return 'SYSTEM ADMIN';
    }

    return 'SECURITY ADMIN';
  };

  // =========================
  // LOGIN
  // =========================
  const handleCredentialsSubmit = async (e) => {
    e.preventDefault();

    setError(null);
    setIsSubmitting(true);

    const cleanIdentifier =
      identifier.trim().toLowerCase();

    if (!cleanIdentifier) {
      setError('Please enter your admin email.');
      setIsSubmitting(false);
      return;
    }

    if (!password) {
      setError('Please enter your password.');
      setIsSubmitting(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify({
          email: cleanIdentifier,
          password
        })
      });

      let data = null;

      try {
        data = await res.json();
      } catch {
        data = null;
      }

      // =========================
      // LOGIN FAILED
      // =========================
      if (!res.ok || !data?.success) {
        setError(
          data?.error?.message ||
            'Invalid admin email or password.'
        );

        return;
      }

      // =========================
      // ADMIN ROLE CHECK
      // =========================
      const isAdmin =
        data.user?.role === 'SECURITY_ADMIN' ||
        data.user?.role === 'SYSTEM_ADMIN' ||
        data.user?.roleCode === 'SECURITY_ADMIN' ||
        data.user?.roleCode === 'SYSTEM_ADMIN';

      if (!isAdmin) {
        setError(
          'Access denied. Only administrator accounts can log in.'
        );

        return;
      }

      // =========================
      // FROZEN ACCOUNT
      // =========================
      if (data.user?.status === 'FROZEN') {
        setError(
          'Account is currently locked by Zero Trust policy containment.'
        );

        return;
      }

      // =========================
      // MFA REQUIRED
      // =========================
      if (
        data.requiresMfa &&
        data.challengeId &&
        data.user
      ) {
        startMfa(
          data.user,
          data.challengeId
        );

        return;
      }

      setError(
        'Authentication challenge was not created. Please try again.'
      );
    } catch (err) {
      console.error('Login error:', err);

      setError(
        'Unable to connect to the authentication server. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // =========================
  // OTP CHANGE
  // =========================
  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) {
      return;
    }

    const newOtp = [...otp];

    newOtp[index] = value.slice(-1);

    setOtp(newOtp);
    setMfaError(null);

    if (value && index < 5) {
      const nextInput =
        document.getElementById(
          `otp-input-${index + 1}`
        );

      nextInput?.focus();
    }
  };

  // =========================
  // OTP BACKSPACE
  // =========================
  const handleOtpKeyDown = (index, e) => {
    if (
      e.key === 'Backspace' &&
      !otp[index] &&
      index > 0
    ) {
      const previousInput =
        document.getElementById(
          `otp-input-${index - 1}`
        );

      previousInput?.focus();
    }
  };

  // =========================
  // VERIFY OTP
  // =========================
  const handleVerifyOtp = async (e) => {
    e.preventDefault();

    const enteredCode =
      otp.join('').trim();

    if (enteredCode.length !== 6) {
      setMfaError(
        'Please enter the complete 6-digit OTP.'
      );

      return;
    }

    if (!challengeId) {
      setMfaError(
        'Authentication challenge is missing. Please return to login.'
      );

      return;
    }

    if (countdown === 0) {
      setMfaError(
        'This OTP has expired. Please request a new code.'
      );

      return;
    }

    setIsVerifying(true);
    setMfaError(null);

    try {
      const res = await fetch(
        '/api/auth/mfa/verify',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json'
          },
          body: JSON.stringify({
            challengeId,
            otp: enteredCode
          })
        }
      );

      let data = null;

      try {
        data = await res.json();
      } catch {
        data = null;
      }

      // =========================
      // OTP FAILED
      // =========================
      if (!res.ok || !data?.success) {
        setMfaError(
          data?.error?.message ||
            'Invalid verification code.'
        );

        return;
      }

      // =========================
      // FINAL TOKEN
      // =========================
      if (!data.token) {
        setMfaError(
          'Authentication completed without a valid session token.'
        );

        return;
      }

      localStorage.setItem(
        'zero_trust_token',
        data.token
      );

      if (rememberMe) {
        localStorage.setItem(
          'zero_trust_remember',
          'true'
        );
      } else {
        localStorage.removeItem(
          'zero_trust_remember'
        );
      }

      // =========================
      // LOGIN SUCCESS
      // =========================
      if (onLoginSuccess) {
        onLoginSuccess(
          data.user || authenticatedUser
        );
      }
    } catch (err) {
      console.error('MFA error:', err);

      setMfaError(
        'Unable to verify OTP. Please try again.'
      );
    } finally {
      setIsVerifying(false);
    }
  };

  // =========================
  // RESEND OTP
  // =========================
  const handleResendOtp = async () => {
    if (!challengeId) {
      setMfaError(
        'Authentication challenge is missing.'
      );

      return;
    }

    setMfaError(null);
    setIsResending(true);

    try {
      const res = await fetch(
        '/api/auth/mfa/resend',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json'
          },
          body: JSON.stringify({
            challengeId
          })
        }
      );

      let data = null;

      try {
        data = await res.json();
      } catch {
        data = null;
      }

      if (!res.ok || !data?.success) {
        setMfaError(
          data?.error?.message ||
            'Unable to resend OTP.'
        );

        return;
      }

      if (data.challengeId) {
        setChallengeId(data.challengeId);
      }

      setOtp([
        '',
        '',
        '',
        '',
        '',
        ''
      ]);

      setCountdown(300);

      setTimeout(() => {
        document
          .getElementById('otp-input-0')
          ?.focus();
      }, 50);
    } catch (err) {
      console.error(
        'Resend OTP error:',
        err
      );

      setMfaError(
        'Unable to resend OTP. Please try again.'
      );
    } finally {
      setIsResending(false);
    }
  };

  // =========================
  // FORGOT PASSWORD
  // =========================
  const handleForgotPassword = async (e) => {
    e.preventDefault();

    setForgotMessage(null);
    setError(null);

    const cleanEmail =
      forgotEmail.trim().toLowerCase();

    if (!cleanEmail) {
      setForgotMessage(
        'Please enter your admin email.'
      );

      return;
    }

    setIsSendingReset(true);

    try {
      const res = await fetch(
        '/api/auth/forgot-password',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json'
          },
          body: JSON.stringify({
            email: cleanEmail
          })
        }
      );

      let data = null;

      try {
        data = await res.json();
      } catch {
        data = null;
      }

      if (!res.ok || !data?.success) {
        setForgotMessage(
          data?.error?.message ||
            'Unable to process your password reset request.'
        );

        return;
      }

      setForgotMessage(
        data.message ||
          'If this admin email exists, password reset instructions have been sent.'
      );
    } catch (err) {
      console.error(
        'Forgot password error:',
        err
      );

      setForgotMessage(
        'Unable to connect to the authentication server. Please try again.'
      );
    } finally {
      setIsSendingReset(false);
    }
  };

  // =========================
  // BACK TO LOGIN
  // =========================
  const handleBackToLogin = () => {
    setShowForgotPassword(false);
    setForgotMessage(null);
    setError(null);
  };

  // =========================
  // BACK FROM MFA
  // =========================
  const handleBackFromMfa = () => {
    setIsMfaStep(false);
    setChallengeId(null);
    setAuthenticatedUser(null);

    setOtp([
      '',
      '',
      '',
      '',
      '',
      ''
    ]);

    setMfaError(null);
    setCountdown(0);
  };

  // =========================
  // FORMAT COUNTDOWN
  // =========================
  const formatCountdown = () => {
    const minutes =
      Math.floor(countdown / 60);

    const seconds =
      countdown % 60;

    return `${minutes
      .toString()
      .padStart(2, '0')}:${seconds
      .toString()
      .padStart(2, '0')}`;
  };

  return (
    <div
      id="cyberorbit-login-portal"
      className={`min-h-screen flex flex-col justify-between transition-colors duration-300 font-['Plus_Jakarta_Sans',sans-serif] ${
        isDark
          ? 'bg-[#07080A] text-[#F4F4F6]'
          : 'bg-[#F9F9F7] text-[#111317]'
      }`}
    >
      {/* =========================
          HEADER
      ========================= */}
      <header
        className={`border-b px-6 sm:px-8 py-5 transition-colors ${
          isDark
            ? 'border-[#2A2A2A] bg-[#0E0E0E]'
            : 'border-[#E5E5E5] bg-[#FFFFFF]'
        }`}
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <button
            onClick={onBackToHome}
            className={`flex items-center gap-2 text-xs font-mono tracking-wider transition-colors cursor-pointer group ${
              isDark
                ? 'text-gray-400 hover:text-white'
                : 'text-gray-600 hover:text-black'
            }`}
          >
            <ArrowLeft className="w-4 h-4 text-[#C6A14A] group-hover:-translate-x-1 transition-transform" />

            <span>
              BACK TO HOME
            </span>
          </button>

          <div className="flex items-center gap-4">
            <span className="text-[11px] font-mono text-[#C6A14A] tracking-[0.2em] uppercase hidden sm:inline">
              SECURE AUTHENTICATION GATEWAY
            </span>

            <button
              onClick={toggleTheme}
              className={`p-2 border transition-colors cursor-pointer ${
                isDark
                  ? 'border-[#2A2A2A] text-[#C6A14A] hover:bg-white/5'
                  : 'border-[#E5E5E5] text-[#C6A14A] hover:bg-black/5'
              }`}
              title="Toggle Theme"
              type="button"
            >
              {isDark ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* =========================
          MAIN
      ========================= */}
      <main className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-12 my-auto">
        <div
          className={`border grid grid-cols-1 lg:grid-cols-12 overflow-hidden ${
            isDark
              ? 'bg-[#0E0E0E] border-[#2A2A2A]'
              : 'bg-[#FFFFFF] border-[#E5E5E5] shadow-xl'
          }`}
        >
          {/* =========================
              LEFT COLUMN
          ========================= */}
          <div
            className={`lg:col-span-5 p-6 sm:p-8 border-b lg:border-b-0 lg:border-r flex flex-col justify-between ${
              isDark
                ? 'bg-[#141414] border-[#2A2A2A]'
                : 'bg-[#F7F4EC] border-[#E5E5E5]'
            }`}
          >
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full bg-[#C6A14A]" />

                <span className="text-[10px] font-mono tracking-[0.25em] text-[#C6A14A] uppercase">
                  CYBERORBIT ZERO TRUST
                </span>
              </div>

              <h2 className="font-serif-display text-2xl sm:text-3xl font-light tracking-tight leading-snug">
                Continuous Trust &amp; Behavioral Verification
              </h2>

              <div className="w-16 h-[1px] bg-[#C6A14A] my-4" />

              <p className="text-xs text-gray-400 font-sans leading-relaxed mb-6">
                All logins undergo continuous risk scoring,
                contextual device assessment, and multi-factor
                hardware verification under NIST SP 800-207
                guidelines.
              </p>

              {/* =========================
                  DATABASE ADMINS
              ========================= */}
              <div className="space-y-2.5">
                <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-[#C6A14A] block">
                  AUTHORIZED ADMINS
                </span>

                {isLoadingAdmins ? (
                  <div
                    className={`w-full p-4 border text-xs font-mono ${
                      isDark
                        ? 'border-[#2A2A2A] bg-[#0E0E0E] text-gray-400'
                        : 'border-[#E5E5E5] bg-white text-gray-500'
                    }`}
                  >
                    Loading administrator accounts...
                  </div>
                ) : adminLoadError ? (
                  <div className="w-full p-4 border border-red-500/40 bg-red-500/10 text-red-400 text-xs font-mono">
                    {adminLoadError}
                  </div>
                ) : admins.length === 0 ? (
                  <div
                    className={`w-full p-4 border text-xs font-mono ${
                      isDark
                        ? 'border-[#2A2A2A] bg-[#0E0E0E] text-gray-400'
                        : 'border-[#E5E5E5] bg-white text-gray-500'
                    }`}
                  >
                    No active administrator accounts found.
                  </div>
                ) : (
                  admins.map((admin) => {
                    const adminEmail =
                      String(admin?.email || '').toLowerCase();

                    const selectedEmail =
                      String(identifier || '').toLowerCase();

                    const isSelected =
                      adminEmail &&
                      selectedEmail === adminEmail;

                    // Support both possible backend names.
                    const adminRole =
                      admin.role ||
                      admin.roleCode ||
                      '';

                    return (
                      <button
                        key={admin.id}
                        type="button"
                        onClick={() =>
                          handleSelectAdmin(admin)
                        }
                        className={`w-full p-3 border text-left text-xs font-mono transition-all flex items-center justify-between cursor-pointer ${
                          isSelected
                            ? 'border-[#C6A14A] bg-[#C6A14A]/10'
                            : isDark
                              ? 'border-[#2A2A2A] hover:border-[#C6A14A]/50 bg-[#0E0E0E]'
                              : 'border-[#E5E5E5] hover:border-[#C6A14A]/50 bg-white'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="font-semibold text-current flex items-center gap-2">
                            <span>
                              {admin.name}
                            </span>
                          </div>

                          <div className="text-[10px] text-gray-400 mt-0.5 break-all">
                            {admin.email}
                          </div>

                          {admin.departmentCode && (
                            <div className="text-[9px] text-gray-500 mt-1 uppercase">
                              {String(
                                admin.departmentCode
                              ).replaceAll('_', ' ')}
                            </div>
                          )}
                        </div>

                        <span className="text-[9px] font-mono px-1.5 py-0.5 border text-[#C6A14A] border-[#C6A14A]/40 bg-[#C6A14A]/10 shrink-0 ml-3">
                          {getAdminRoleLabel(adminRole)}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            <div
              className={`pt-6 mt-6 border-t flex items-center justify-between text-[10px] font-mono text-gray-500 ${
                isDark
                  ? 'border-[#2A2A2A]'
                  : 'border-[#E5E5E5]'
              }`}
            >
              <span>
                NIST SP 800-207
              </span>

              <span className="text-[#C6A14A]">
                ENTERPRISE READY
              </span>
            </div>
          </div>

          {/* =========================
              RIGHT COLUMN
          ========================= */}
          <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-center">

            {/* =========================
                FORGOT PASSWORD
            ========================= */}
            {showForgotPassword ? (
              <div className="max-w-md mx-auto w-full space-y-6">
                <div>
                  <span className="text-[10px] font-mono text-[#C6A14A] uppercase tracking-[0.25em] block mb-1">
                    ACCOUNT RECOVERY
                  </span>

                  <h3 className="font-serif-display text-3xl font-light tracking-tight">
                    Forgot Password
                  </h3>

                  <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                    Enter your Security Admin email address
                    to receive password reset instructions.
                  </p>
                </div>

                {forgotMessage && (
                  <div
                    className={`p-3 border text-xs font-mono flex items-center gap-2 ${
                      forgotMessage
                        .toLowerCase()
                        .includes('sent')
                        ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                        : 'border-red-500/40 bg-red-500/10 text-red-400'
                    }`}
                  >
                    <AlertCircle className="w-4 h-4 shrink-0" />

                    <span>
                      {forgotMessage}
                    </span>
                  </div>
                )}

                <form
                  onSubmit={handleForgotPassword}
                  className="space-y-5"
                >
                  <div className="space-y-2">
                    <label className="block text-[10px] font-mono uppercase tracking-[0.2em] text-[#C6A14A]">
                      Admin Email
                    </label>

                    <input
                      type="email"
                      required
                      value={forgotEmail}
                      onChange={(e) =>
                        setForgotEmail(
                          e.target.value
                        )
                      }
                      placeholder="admin@example.com"
                      className={`w-full px-4 py-3 border text-sm font-mono outline-none transition-all ${
                        isDark
                          ? 'bg-[#141414] border-[#2A2A2A] text-white focus:border-[#C6A14A]'
                          : 'bg-[#F7F4EC] border-[#E5E5E5] text-black focus:border-[#C6A14A]'
                      }`}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSendingReset}
                    className="w-full py-3.5 text-xs font-semibold tracking-[0.2em] uppercase border border-[#C6A14A] bg-[#C6A14A] text-black hover:bg-transparent hover:text-[#C6A14A] transition-all duration-300 cursor-pointer flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span>
                      {isSendingReset
                        ? 'PROCESSING...'
                        : 'SEND RESET INSTRUCTIONS'}
                    </span>

                    <span className="font-serif text-sm">
                      →
                    </span>
                  </button>
                </form>

                <button
                  type="button"
                  onClick={handleBackToLogin}
                  className="w-full text-center text-[11px] font-mono text-gray-400 hover:text-[#C6A14A] cursor-pointer"
                >
                  ← BACK TO LOGIN
                </button>
              </div>
            ) : !isMfaStep ? (
              /* =========================
                 LOGIN SCREEN
              ========================= */
              <div className="max-w-md mx-auto w-full space-y-6">
                <div>
                  <span className="text-[10px] font-mono text-[#C6A14A] uppercase tracking-[0.25em] block mb-1">
                    CYBERORBIT PLATFORM
                  </span>

                  <h3 className="font-serif-display text-3xl font-light tracking-tight">
                    Sign In
                  </h3>

                  <p className="text-xs text-gray-400 mt-1">
                    Sign in with your Security Admin credentials.
                  </p>
                </div>

                {/* ADMIN ROLE */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-mono uppercase tracking-[0.2em] text-[#C6A14A]">
                    ACCESS ROLE
                  </label>

                  <div className="border border-[#C6A14A] bg-[#C6A14A] text-black py-3 px-4 text-xs font-mono uppercase tracking-wider flex items-center justify-center gap-2 font-bold">
                    <Shield className="w-3.5 h-3.5" />

                    <span>
                      Security Admin
                    </span>
                  </div>
                </div>

                {error && (
                  <div className="p-3 border border-red-500/40 bg-red-500/10 text-red-400 text-xs font-mono flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />

                    <span>
                      {error}
                    </span>
                  </div>
                )}

                <form
                  onSubmit={handleCredentialsSubmit}
                  className="space-y-5"
                >
                  {/* EMAIL */}
                  <div className="space-y-2">
                    <label className="block text-[10px] font-mono uppercase tracking-[0.2em] text-[#C6A14A]">
                      Admin Email
                    </label>

                    <input
                      id="username-email-input"
                      type="email"
                      required
                      value={identifier}
                      onChange={(e) =>
                        setIdentifier(
                          e.target.value
                        )
                      }
                      placeholder="admin@example.com"
                      className={`w-full px-4 py-3 border text-sm font-mono outline-none transition-all ${
                        isDark
                          ? 'bg-[#141414] border-[#2A2A2A] text-white focus:border-[#C6A14A]'
                          : 'bg-[#F7F4EC] border-[#E5E5E5] text-black focus:border-[#C6A14A]'
                      }`}
                    />
                  </div>

                  {/* PASSWORD */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-[10px] font-mono uppercase tracking-[0.2em] text-[#C6A14A]">
                        Password
                      </label>

                      <button
                        type="button"
                        onClick={() => {
                          setForgotEmail(
                            identifier
                          );

                          setShowForgotPassword(
                            true
                          );

                          setError(null);
                        }}
                        className="text-[10px] font-mono text-[#C6A14A] hover:underline cursor-pointer"
                      >
                        Forgot Password?
                      </button>
                    </div>

                    <div className="relative">
                      <input
                        id="password-input"
                        type={
                          showPassword
                            ? 'text'
                            : 'password'
                        }
                        required
                        value={password}
                        onChange={(e) =>
                          setPassword(
                            e.target.value
                          )
                        }
                        placeholder="Enter your password"
                        className={`w-full px-4 py-3 border text-sm font-mono outline-none transition-all pr-10 ${
                          isDark
                            ? 'bg-[#141414] border-[#2A2A2A] text-white focus:border-[#C6A14A]'
                            : 'bg-[#F7F4EC] border-[#E5E5E5] text-black focus:border-[#C6A14A]'
                        }`}
                      />

                      <button
                        type="button"
                        onClick={() =>
                          setShowPassword(
                            !showPassword
                          )
                        }
                        className="absolute right-3 top-3.5 text-gray-400 hover:text-[#C6A14A] cursor-pointer"
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* REMEMBER SESSION */}
                  <div className="flex items-center justify-between text-xs">
                    <label className="flex items-center gap-2 cursor-pointer text-gray-400 hover:text-gray-300">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) =>
                          setRememberMe(
                            e.target.checked
                          )
                        }
                        className="accent-[#C6A14A]"
                      />

                      <span className="text-xs font-mono">
                        Remember session
                      </span>
                    </label>

                    <span className="text-[10px] font-mono text-gray-500">
                      Redirects to SOC Dashboard
                    </span>
                  </div>

                  {/* LOGIN BUTTON */}
                  <button
                    id="btn-login-submit"
                    type="submit"
                    disabled={
                      isSubmitting ||
                      isLoadingAdmins ||
                      admins.length === 0
                    }
                    className="w-full py-3.5 text-xs font-semibold tracking-[0.2em] uppercase border border-[#C6A14A] bg-[#C6A14A] text-black hover:bg-transparent hover:text-[#C6A14A] transition-all duration-300 cursor-pointer flex items-center justify-center gap-3 shadow-[0_0_15px_rgba(198,161,74,0.15)] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span>
                      {isSubmitting
                        ? 'AUTHENTICATING...'
                        : 'PROCEED TO MFA'}
                    </span>

                    <span className="font-serif text-sm">
                      →
                    </span>
                  </button>
                </form>
              </div>
            ) : (
              /* =========================
                 MFA SCREEN
              ========================= */
              <div className="max-w-md mx-auto w-full space-y-6">
                <div>
                  <span className="text-[10px] font-mono text-[#C6A14A] uppercase tracking-[0.25em] block mb-2">
                    MULTI-FACTOR CHALLENGE
                  </span>

                  <h3 className="font-serif-display text-3xl font-light tracking-tight">
                    Verification Code
                  </h3>

                  <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                    A 6-digit OTP has been issued to{' '}
                    <strong className="text-[#C6A14A]">
                      {authenticatedUser?.email}
                    </strong>
                    .
                  </p>
                </div>

                {mfaError && (
                  <div className="p-3 border border-red-500/40 bg-red-500/10 text-red-400 text-xs font-mono flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />

                    <span>
                      {mfaError}
                    </span>
                  </div>
                )}

                <form
                  onSubmit={handleVerifyOtp}
                  className="space-y-6"
                >
                  {/* OTP INPUTS */}
                  <div className="flex items-center justify-between gap-2 sm:gap-3">
                    {otp.map((digit, idx) => (
                      <input
                        key={idx}
                        id={`otp-input-${idx}`}
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={1}
                        value={digit}
                        disabled={isVerifying}
                        onChange={(e) =>
                          handleOtpChange(
                            idx,
                            e.target.value
                          )
                        }
                        onKeyDown={(e) =>
                          handleOtpKeyDown(
                            idx,
                            e
                          )
                        }
                        className={`w-11 h-14 sm:w-12 sm:h-16 text-center text-2xl font-serif-display font-light border outline-none transition-all ${
                          isDark
                            ? 'bg-[#141414] border-[#2A2A2A] text-[#C6A14A] focus:border-[#C6A14A]'
                            : 'bg-[#F7F4EC] border-[#E5E5E5] text-[#C6A14A] focus:border-[#C6A14A]'
                        }`}
                      />
                    ))}
                  </div>

                  {/* OTP TIMER */}
                  <div className="flex items-center justify-between text-xs font-mono">
                    <div className="flex items-center gap-1 text-gray-400">
                      <Clock className="w-3.5 h-3.5" />

                      <span>
                        {countdown > 0
                          ? formatCountdown()
                          : 'Expired'}
                      </span>
                    </div>

                    <span className="text-[10px] text-gray-500">
                      OTP expires in 5 minutes
                    </span>
                  </div>

                  {/* VERIFY */}
                  <div className="space-y-3 pt-2">
                    <button
                      id="btn-mfa-verify-submit"
                      type="submit"
                      disabled={
                        isVerifying ||
                        countdown === 0
                      }
                      className="w-full py-3.5 text-xs font-semibold tracking-[0.2em] uppercase border border-[#C6A14A] bg-[#C6A14A] text-black hover:bg-transparent hover:text-[#C6A14A] transition-all duration-300 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span>
                        {isVerifying
                          ? 'VERIFYING...'
                          : 'VERIFY & ACCESS'}
                      </span>

                      <span className="font-serif">
                        →
                      </span>
                    </button>

                    <div className="flex items-center justify-between text-xs pt-2">
                      <button
                        type="button"
                        disabled={
                          countdown > 0 ||
                          isResending
                        }
                        onClick={
                          handleResendOtp
                        }
                        className={`font-mono text-[11px] ${
                          countdown > 0 ||
                          isResending
                            ? 'text-gray-600 cursor-not-allowed'
                            : 'text-[#C6A14A] hover:underline cursor-pointer'
                        }`}
                      >
                        {isResending
                          ? 'Sending...'
                          : 'Resend Code'}
                      </button>

                      <button
                        type="button"
                        onClick={
                          handleBackFromMfa
                        }
                        className="text-gray-400 hover:text-white cursor-pointer text-[11px] font-mono"
                      >
                        Back to Login
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* =========================
          FOOTER
      ========================= */}
      <footer
        className={`py-6 text-center text-xs text-gray-500 font-mono tracking-widest uppercase border-t ${
          isDark
            ? 'border-[#2A2A2A]'
            : 'border-[#E5E5E5]'
        }`}
      >
        CyberOrbit • Zero Trust &amp; UEBA Security Platform
      </footer>
    </div>
  );
};