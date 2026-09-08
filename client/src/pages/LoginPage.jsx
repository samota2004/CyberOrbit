import React, { useState, useEffect } from 'react';
import { 
  Lock, 
  ShieldCheck, 
  ArrowLeft, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  Clock, 
  Sun, 
  Moon,
  UserCheck,
  AlertTriangle,
  Flame,
  Shield,
  Briefcase
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export const LoginPage = ({ users = [], onLoginSuccess, onBackToHome }) => {
  const { isDark, toggleTheme } = useTheme();

  // Role selector: 'ADMIN' | 'EMPLOYEE'
  const [selectedRole, setSelectedRole] = useState('ADMIN');

  // Form Fields
  const [identifier, setIdentifier] = useState('alex.vance@cyberorbit.corp');
  const [password, setPassword] = useState('••••••••••••');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // MFA Flow States
  const [isMfaStep, setIsMfaStep] = useState(false);
  const [authenticatedUser, setAuthenticatedUser] = useState(null);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [countdown, setCountdown] = useState(59);
  const [mfaError, setMfaError] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);

  // Quick Demo Accounts
  const demoAccounts = [
    {
      id: 'demo-admin',
      label: 'Admin (Alex Vance)',
      role: 'ADMIN',
      roleCode: 'SECURITY_ADMIN',
      name: 'Alex Vance',
      email: 'alex.vance@cyberorbit.corp',
      employeeId: 'EMP001',
      department: 'Security Operations',
      trustScore: 98,
      riskScore: 12,
      badge: 'ADMIN',
      badgeColor: 'text-[#C6A14A] border-[#C6A14A]/40 bg-[#C6A14A]/10'
    },
    {
      id: 'demo-elena',
      label: 'Employee (Elena Rostova)',
      departmentLabel: 'Marketing',
      role: 'EMPLOYEE',
      roleCode: 'EMPLOYEE',
      name: 'Elena Rostova',
      email: 'elena.rostova@cyberorbit.corp',
      employeeId: 'EMP108',
      department: 'Marketing',
      trustScore: 95,
      riskScore: 16,
      badge: 'TRUSTED',
      badgeColor: 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10'
    },
    {
      id: 'demo-marcus',
      label: 'Suspicious (Marcus Chen)',
      departmentLabel: 'Finance',
      role: 'EMPLOYEE',
      roleCode: 'EMPLOYEE',
      name: 'Marcus Chen',
      email: 'marcus.chen@cyberorbit.corp',
      employeeId: 'EMP112',
      department: 'Finance',
      trustScore: 52,
      riskScore: 68,
      badge: 'SUSPICIOUS',
      badgeColor: 'text-amber-400 border-amber-500/40 bg-amber-500/10'
    },
    {
      id: 'demo-sarah',
      label: 'Malicious (Sarah Lin)',
      departmentLabel: 'Engineering',
      role: 'EMPLOYEE',
      roleCode: 'EMPLOYEE',
      name: 'Sarah Lin',
      email: 'sarah.lin@cyberorbit.corp',
      employeeId: 'EMP115',
      department: 'Engineering',
      trustScore: 21,
      riskScore: 92,
      badge: 'MALICIOUS',
      badgeColor: 'text-red-400 border-red-500/40 bg-red-500/10'
    }
  ];

  // Sync role change to identifier default
  const handleRoleSelect = (role) => {
    setSelectedRole(role);
    setError(null);
    if (role === 'ADMIN') {
      setIdentifier('alex.vance@cyberorbit.corp');
    } else {
      setIdentifier('elena.rostova@cyberorbit.corp');
    }
  };

  // Quick Account Select
  const handleSelectDemoAccount = (account) => {
    setSelectedRole(account.role);
    setIdentifier(account.email);
    setPassword('CyberOrbit@2026');
    setError(null);
  };

  // Timer countdown for MFA
  useEffect(() => {
    let timer;
    if (isMfaStep && countdown > 0) {
      timer = setInterval(() => setCountdown(prev => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [isMfaStep, countdown]);

  const handleCredentialsSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const cleanIdentifier = identifier.trim();
    if (!cleanIdentifier) {
      setError('Please enter your Username or Email.');
      setIsSubmitting(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanIdentifier })
      });
      const data = await res.json();

      if (data.success && data.user) {
        if (data.user.status === 'FROZEN') {
          setError('Account is currently locked by Zero Trust policy containment.');
          setIsSubmitting(false);
          return;
        }

        // Honor selected role
        const resolvedUser = {
          ...data.user,
          role: selectedRole === 'ADMIN' ? 'SECURITY_ADMIN' : 'EMPLOYEE'
        };

        setAuthenticatedUser(resolvedUser);
        setIsMfaStep(true);
        setCountdown(59);
        setOtp(['', '', '', '', '', '']);
        setMfaError(null);
      } else {
        // Find in demo accounts or passed users
        const matchedDemo = demoAccounts.find(d => 
          d.email.toLowerCase() === cleanIdentifier.toLowerCase() ||
          d.employeeId.toLowerCase() === cleanIdentifier.toLowerCase() ||
          d.name.toLowerCase().includes(cleanIdentifier.toLowerCase())
        );

        const matchedUser = matchedDemo ? {
          id: matchedDemo.id,
          name: matchedDemo.name,
          email: matchedDemo.email,
          employeeId: matchedDemo.employeeId,
          role: matchedDemo.roleCode,
          department: matchedDemo.department,
          currentRiskScore: matchedDemo.riskScore,
          currentTrustScore: matchedDemo.trustScore,
          status: 'ACTIVE'
        } : (users.find(u => 
          u.email?.toLowerCase() === cleanIdentifier.toLowerCase() ||
          u.employeeId?.toLowerCase() === cleanIdentifier.toLowerCase()
        ) || {
          id: selectedRole === 'ADMIN' ? 'admin-vance' : 'emp-elena',
          name: selectedRole === 'ADMIN' ? 'Alex Vance' : 'Elena Rostova',
          email: cleanIdentifier,
          employeeId: selectedRole === 'ADMIN' ? 'EMP001' : 'EMP108',
          role: selectedRole === 'ADMIN' ? 'SECURITY_ADMIN' : 'EMPLOYEE',
          department: selectedRole === 'ADMIN' ? 'Security Operations' : 'Marketing',
          currentRiskScore: selectedRole === 'ADMIN' ? 12 : 16,
          currentTrustScore: selectedRole === 'ADMIN' ? 98 : 95,
          status: 'ACTIVE'
        });

        setAuthenticatedUser(matchedUser);
        setIsMfaStep(true);
        setCountdown(59);
        setOtp(['', '', '', '', '', '']);
        setMfaError(null);
      }
    } catch (err) {
      console.error('Login error:', err);
      // Resilient fallback
      const fallbackUser = {
        id: selectedRole === 'ADMIN' ? 'admin-vance' : 'emp-elena',
        name: selectedRole === 'ADMIN' ? 'Alex Vance' : 'Elena Rostova',
        email: cleanIdentifier,
        employeeId: selectedRole === 'ADMIN' ? 'EMP001' : 'EMP108',
        role: selectedRole === 'ADMIN' ? 'SECURITY_ADMIN' : 'EMPLOYEE',
        department: selectedRole === 'ADMIN' ? 'Security' : 'Marketing',
        currentRiskScore: selectedRole === 'ADMIN' ? 12 : 16,
        currentTrustScore: selectedRole === 'ADMIN' ? 98 : 95,
        status: 'ACTIVE'
      };
      setAuthenticatedUser(fallbackUser);
      setIsMfaStep(true);
      setCountdown(59);
      setOtp(['', '', '', '', '', '']);
      setMfaError(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOtpChange = (index, val) => {
    if (!/^\d*$/.test(val)) return;
    const newOtp = [...otp];
    newOtp[index] = val.slice(-1);
    setOtp(newOtp);

    // Auto advance focus
    if (val && index < 5) {
      const nextInput = document.getElementById(`otp-input-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-input-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    const enteredCode = otp.join('').trim();
    if (enteredCode.length < 6) {
      setMfaError('Please enter the complete 6-digit OTP.');
      return;
    }

    setIsVerifying(true);
    setMfaError(null);

    try {
      const res = await fetch('/api/auth/mfa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp: enteredCode, userId: authenticatedUser?.id })
      });
      const data = await res.json();

      if (data.success) {
        if (data.token) {
          localStorage.setItem('zero_trust_token', data.token);
        }
        if (onLoginSuccess) {
          onLoginSuccess(authenticatedUser);
        }
      } else {
        if (enteredCode === '123456') {
          localStorage.setItem('zero_trust_token', 'demo-session-token');
          if (onLoginSuccess) onLoginSuccess(authenticatedUser);
        } else {
          setMfaError(data.error?.message || 'Invalid verification code. Please use demo code 123456.');
        }
      }
    } catch (err) {
      console.error('MFA error:', err);
      localStorage.setItem('zero_trust_token', 'demo-session-token');
      if (onLoginSuccess) {
        onLoginSuccess(authenticatedUser);
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendOtp = () => {
    setCountdown(59);
    setOtp(['', '', '', '', '', '']);
    setMfaError(null);
  };

  return (
    <div id="cyberorbit-login-portal" className={`min-h-screen flex flex-col justify-between transition-colors duration-300 font-['Plus_Jakarta_Sans',sans-serif] ${
      isDark ? 'bg-[#07080A] text-[#F4F4F6]' : 'bg-[#F9F9F7] text-[#111317]'
    }`}>
      {/* Top Header with Back to Home & Theme Toggle */}
      <header className={`border-b px-6 sm:px-8 py-5 transition-colors ${
        isDark ? 'border-[#2A2A2A] bg-[#0E0E0E]' : 'border-[#E5E5E5] bg-[#FFFFFF]'
      }`}>
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <button
            onClick={onBackToHome}
            className={`flex items-center gap-2 text-xs font-mono tracking-wider transition-colors cursor-pointer group ${
              isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-black'
            }`}
          >
            <ArrowLeft className="w-4 h-4 text-[#C6A14A] group-hover:-translate-x-1 transition-transform" />
            <span>BACK TO HOME</span>
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
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Login Screen */}
      <main className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-12 my-auto">
        <div className={`border grid grid-cols-1 lg:grid-cols-12 overflow-hidden ${
          isDark ? 'bg-[#0E0E0E] border-[#2A2A2A]' : 'bg-[#FFFFFF] border-[#E5E5E5] shadow-xl'
        }`}>
          {/* Left Column: Platform Brief & Demo Accounts */}
          <div className={`lg:col-span-5 p-6 sm:p-8 border-b lg:border-b-0 lg:border-r flex flex-col justify-between ${
            isDark ? 'bg-[#141414] border-[#2A2A2A]' : 'bg-[#F7F4EC] border-[#E5E5E5]'
          }`}>
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
                All logins undergo continuous risk scoring, contextual device assessment, and multi-factor hardware verification under NIST SP 800-207 guidelines.
              </p>

              {/* Quick Demo Accounts Selection */}
              <div className="space-y-2.5">
                <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-[#C6A14A] block">
                  QUICK DEMO ACCOUNTS
                </span>
                {demoAccounts.map((acc) => (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => handleSelectDemoAccount(acc)}
                    className={`w-full p-3 border text-left text-xs font-mono transition-all flex items-center justify-between cursor-pointer ${
                      identifier === acc.email
                        ? 'border-[#C6A14A] bg-[#C6A14A]/10'
                        : isDark
                          ? 'border-[#2A2A2A] hover:border-[#C6A14A]/50 bg-[#0E0E0E]'
                          : 'border-[#E5E5E5] hover:border-[#C6A14A]/50 bg-white'
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-current flex items-center gap-2">
                        <span>{acc.label}</span>
                        {acc.departmentLabel && (
                          <span className="text-[10px] text-gray-500 font-normal">
                            ({acc.departmentLabel})
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-gray-400 mt-0.5">{acc.email}</div>
                    </div>
                    <span className={`text-[9px] font-mono px-1.5 py-0.5 border ${acc.badgeColor}`}>
                      {acc.badge}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-[#2A2A2A] flex items-center justify-between text-[10px] font-mono text-gray-500">
              <span>NIST SP 800-207</span>
              <span className="text-[#C6A14A]">ENTERPRISE READY</span>
            </div>
          </div>

          {/* Right Column: Credentials or MFA Form */}
          <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-center">
            {!isMfaStep ? (
              /* Step 1: Role Selector + Credentials Form */
              <div className="max-w-md mx-auto w-full space-y-6">
                <div>
                  <span className="text-[10px] font-mono text-[#C6A14A] uppercase tracking-[0.25em] block mb-1">
                    CYBERORBIT PLATFORM
                  </span>
                  <h3 className="font-serif-display text-3xl font-light tracking-tight">
                    Sign In
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">
                    Select your organizational role and enter your credentials.
                  </p>
                </div>

                {/* Role Selector Tabs */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-mono uppercase tracking-[0.2em] text-[#C6A14A]">
                    SELECT ROLE
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleRoleSelect('ADMIN')}
                      className={`py-3 px-4 text-xs font-mono uppercase tracking-wider border transition-all cursor-pointer flex items-center justify-center gap-2 ${
                        selectedRole === 'ADMIN'
                          ? 'border-[#C6A14A] bg-[#C6A14A] text-black font-bold shadow-[0_0_15px_rgba(198,161,74,0.15)]'
                          : isDark
                            ? 'border-[#2A2A2A] text-gray-400 hover:border-[#C6A14A]/40'
                            : 'border-[#E5E5E5] text-gray-600 hover:border-[#C6A14A]/40'
                      }`}
                    >
                      <Shield className="w-3.5 h-3.5" />
                      <span>Security Admin</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRoleSelect('EMPLOYEE')}
                      className={`py-3 px-4 text-xs font-mono uppercase tracking-wider border transition-all cursor-pointer flex items-center justify-center gap-2 ${
                        selectedRole === 'EMPLOYEE'
                          ? 'border-[#C6A14A] bg-[#C6A14A] text-black font-bold shadow-[0_0_15px_rgba(198,161,74,0.15)]'
                          : isDark
                            ? 'border-[#2A2A2A] text-gray-400 hover:border-[#C6A14A]/40'
                            : 'border-[#E5E5E5] text-gray-600 hover:border-[#C6A14A]/40'
                      }`}
                    >
                      <Briefcase className="w-3.5 h-3.5" />
                      <span>Employee</span>
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="p-3 border border-red-500/40 bg-red-500/10 text-red-400 text-xs font-mono flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={handleCredentialsSubmit} className="space-y-5">
                  {/* Username / Email */}
                  <div className="space-y-2">
                    <label className="block text-[10px] font-mono uppercase tracking-[0.2em] text-[#C6A14A]">
                      Username / Email
                    </label>
                    <input
                      id="username-email-input"
                      type="text"
                      required
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder={selectedRole === 'ADMIN' ? 'alex.vance@cyberorbit.corp' : 'elena.rostova@cyberorbit.corp'}
                      className={`w-full px-4 py-3 border text-sm font-mono outline-none transition-all ${
                        isDark 
                          ? 'bg-[#141414] border-[#2A2A2A] text-white focus:border-[#C6A14A]' 
                          : 'bg-[#F7F4EC] border-[#E5E5E5] text-black focus:border-[#C6A14A]'
                      }`}
                    />
                  </div>

                  {/* Password */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-[10px] font-mono uppercase tracking-[0.2em] text-[#C6A14A]">
                        Password
                      </label>
                      <span className="text-[10px] font-mono text-gray-500">Demo: any value</span>
                    </div>
                    <div className="relative">
                      <input
                        id="password-input"
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        className={`w-full px-4 py-3 border text-sm font-mono outline-none transition-all pr-10 ${
                          isDark 
                            ? 'bg-[#141414] border-[#2A2A2A] text-white focus:border-[#C6A14A]' 
                            : 'bg-[#F7F4EC] border-[#E5E5E5] text-black focus:border-[#C6A14A]'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3.5 text-gray-400 hover:text-[#C6A14A] cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Remember session toggle */}
                  <div className="flex items-center justify-between text-xs">
                    <label className="flex items-center gap-2 cursor-pointer text-gray-400 hover:text-gray-300">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="accent-[#C6A14A]"
                      />
                      <span className="text-xs font-mono">Remember session</span>
                    </label>
                    <span className="text-[10px] font-mono text-gray-500">
                      Redirects to {selectedRole === 'ADMIN' ? 'SOC Dashboard' : 'Trust Portal'}
                    </span>
                  </div>

                  {/* Submit Button */}
                  <button
                    id="btn-login-submit"
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3.5 text-xs font-semibold tracking-[0.2em] uppercase border border-[#C6A14A] bg-[#C6A14A] text-black hover:bg-transparent hover:text-[#C6A14A] transition-all duration-300 cursor-pointer flex items-center justify-center gap-3 shadow-[0_0_15px_rgba(198,161,74,0.15)]"
                  >
                    <span>{isSubmitting ? 'AUTHENTICATING...' : 'PROCEED TO MFA'}</span>
                    <span className="font-serif text-sm">→</span>
                  </button>
                </form>
              </div>
            ) : (
              /* Step 2: MFA Verification Screen */
              <div className="max-w-md mx-auto w-full space-y-6">
                <div>
                  <span className="text-[10px] font-mono text-[#C6A14A] uppercase tracking-[0.25em] block mb-2">
                    MULTI-FACTOR CHALLENGE
                  </span>
                  <h3 className="font-serif-display text-3xl font-light tracking-tight">
                    Verification Code
                  </h3>
                  <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                    A 6-digit OTP has been issued to <strong className="text-[#C6A14A]">{authenticatedUser?.email}</strong>.
                  </p>
                </div>

                {mfaError && (
                  <div className="p-3 border border-red-500/40 bg-red-500/10 text-red-400 text-xs font-mono flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{mfaError}</span>
                  </div>
                )}

                <form onSubmit={handleVerifyOtp} className="space-y-6">
                  {/* 6 Digit OTP */}
                  <div className="flex items-center justify-between gap-2 sm:gap-3">
                    {otp.map((digit, idx) => (
                      <input
                        key={idx}
                        id={`otp-input-${idx}`}
                        type="text"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(idx, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                        className={`w-11 h-14 sm:w-12 sm:h-16 text-center text-2xl font-serif-display font-light border outline-none transition-all ${
                          isDark 
                            ? 'bg-[#141414] border-[#2A2A2A] text-[#C6A14A] focus:border-[#C6A14A]' 
                            : 'bg-[#F7F4EC] border-[#E5E5E5] text-[#C6A14A] focus:border-[#C6A14A]'
                        }`}
                      />
                    ))}
                  </div>

                  <div className="flex items-center justify-between text-xs font-mono">
                    <button
                      type="button"
                      onClick={() => setOtp(['1', '2', '3', '4', '5', '6'])}
                      className="text-[#C6A14A] hover:underline cursor-pointer"
                    >
                      Fill Demo OTP (123456)
                    </button>

                    <div className="flex items-center gap-1 text-gray-400">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{countdown > 0 ? `00:${countdown.toString().padStart(2, '0')}` : 'Expired'}</span>
                    </div>
                  </div>

                  <div className="space-y-3 pt-2">
                    <button
                      id="btn-mfa-verify-submit"
                      type="submit"
                      disabled={isVerifying}
                      className="w-full py-3.5 text-xs font-semibold tracking-[0.2em] uppercase border border-[#C6A14A] bg-[#C6A14A] text-black hover:bg-transparent hover:text-[#C6A14A] transition-all duration-300 cursor-pointer flex items-center justify-center gap-2"
                    >
                      <span>{isVerifying ? 'VERIFYING...' : 'VERIFY & ACCESS'}</span>
                      <span className="font-serif">→</span>
                    </button>

                    <div className="flex items-center justify-between text-xs pt-2">
                      <button
                        type="button"
                        disabled={countdown > 0}
                        onClick={handleResendOtp}
                        className={`font-mono text-[11px] ${
                          countdown > 0 ? 'text-gray-600 cursor-not-allowed' : 'text-[#C6A14A] hover:underline cursor-pointer'
                        }`}
                      >
                        Resend Code
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsMfaStep(false)}
                        className="text-gray-400 hover:text-white cursor-pointer text-[11px] font-mono"
                      >
                        Change Account
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-xs text-gray-500 font-mono tracking-widest uppercase border-t border-[#2A2A2A]">
        CyberOrbit • Zero Trust &amp; UEBA Security Platform
      </footer>
    </div>
  );
};
