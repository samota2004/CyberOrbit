import React from 'react';
import { 
  Shield, 
  ShieldCheck, 
  Laptop, 
  CheckCircle2, 
  Lock, 
  Activity, 
  TrendingUp, 
  FileText,
  Clock,
  Wifi,
  Monitor,
  Smartphone,
  AlertCircle
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { useTheme } from '../context/ThemeContext';

export const EmployeeDashboard = ({ 
  currentUser, 
  events = [], 
  devices = [], 
  onOpenAccessRequestModal 
}) => {
  const { isDark } = useTheme();

  // Filter events and devices for this employee
  const userEvents = events.filter(e => e.userId === currentUser?.id);
  const userDevices = devices.filter(d => d.userId === currentUser?.id);
  const displayEvents = userEvents.length > 0 ? userEvents : events.slice(0, 8);
  const displayDevices = userDevices.length > 0 ? userDevices : [
    {
      id: 'dev-001',
      deviceName: `${currentUser?.name || 'User'}'s MacBook Pro`,
      deviceType: 'LAPTOP',
      os: 'macOS Sonoma 14.4',
      browser: 'Chrome 122 Enterprise',
      ipAddress: '192.168.1.105',
      trustScore: 98,
      status: 'TRUSTED',
      lastSeen: 'Just now',
      isCurrentDevice: true
    },
    {
      id: 'dev-002',
      deviceName: 'Corporate iPhone 15',
      deviceType: 'MOBILE',
      os: 'iOS 17.3',
      browser: 'Mobile Safari',
      ipAddress: '10.200.4.12',
      trustScore: 92,
      status: 'TRUSTED',
      lastSeen: '2 hours ago',
      isCurrentDevice: false
    }
  ];

  // Security Status mapping
  const riskScore = currentUser?.currentRiskScore ?? 15;
  const trustScore = currentUser?.currentTrustScore ?? 95;

  const getSecurityStatus = (score) => {
    if (score < 40) return { label: 'HEALTHY & SAFE', color: 'text-emerald-400', border: 'border-[#D4AF37]/30' };
    if (score < 60) return { label: 'ELEVATED MONITORING', color: 'text-[#D4AF37]', border: 'border-[#D4AF37]' };
    if (score < 75) return { label: 'RESTRICTED PRIVILEGES', color: 'text-orange-400', border: 'border-orange-500/50' };
    return { label: 'FROZEN / CONTAINED', color: 'text-red-400', border: 'border-red-500/50' };
  };

  const status = getSecurityStatus(riskScore);

  // Time Series Trend Data
  const trendData = [
    { time: '09:00', trust: 98, risk: 10, logins: 1 },
    { time: '11:00', trust: 96, risk: 14, logins: 2 },
    { time: '13:00', trust: 94, risk: 18, logins: 1 },
    { time: '15:00', trust: 92, risk: 22, logins: 3 },
    { time: '17:00', trust: 90, risk: 20, logins: 2 },
    { time: 'Now', trust: trustScore, risk: riskScore, logins: 1 }
  ];

  // Activity distribution
  const activityDist = [
    { name: 'Auth & Login', value: 35, color: '#D4AF37' },
    { name: 'Resource Access', value: 45, color: '#E6C875' },
    { name: 'File Transfer', value: 15, color: '#F39C12' },
    { name: 'Security Check', value: 5, color: '#888888' }
  ];

  return (
    <div className="space-y-10">
      {/* Editorial Profile Header */}
      <div className={`p-8 sm:p-10 border border-[#D4AF37]/25 relative transition-colors ${
        isDark ? 'bg-black' : 'bg-white'
      }`}>
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-[10px] font-mono tracking-[0.25em] uppercase text-[#D4AF37] border border-[#D4AF37]/40 px-2.5 py-0.5">
                EMPLOYEE SECURITY CENTER
              </span>
              <span className="text-[11px] font-mono text-gray-500">
                ID: {currentUser?.employeeId || 'EMP001'}
              </span>
            </div>

            <h1 className="font-serif-display text-3xl sm:text-4xl lg:text-5xl font-light tracking-tight">
              {currentUser?.name || 'Employee Profile'}
            </h1>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-3 text-xs font-mono text-gray-400">
              <div>
                <span className="text-gray-500">DEPARTMENT: </span>
                <span className="text-current font-semibold">{currentUser?.department || 'Engineering'}</span>
              </div>
              <div>
                <span className="text-gray-500">ROLE: </span>
                <span className="text-current font-semibold">{currentUser?.role?.replace('_', ' ') || 'EMPLOYEE'}</span>
              </div>
              <div>
                <span className="text-gray-500">SECURITY STATUS: </span>
                <span className={`font-semibold ${status.color}`}>{status.label}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={onOpenAccessRequestModal}
              className="px-5 py-2.5 border border-[#D4AF37] bg-[#D4AF37] text-black hover:bg-transparent hover:text-[#D4AF37] text-xs font-mono font-semibold tracking-wider transition-all duration-300 cursor-pointer flex items-center gap-2"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>REQUEST ACCESS</span>
            </button>
          </div>
        </div>
      </div>

      {/* Top 4 Metric Overview: Trust Score, Risk Score, Status, Active Sessions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Trust Score */}
        <div className={`p-6 border border-[#D4AF37]/25 ${
          isDark ? 'bg-[#0A0C10]' : 'bg-white'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#D4AF37]">
              TRUST SCORE
            </span>
            <ShieldCheck className="w-4 h-4 text-[#D4AF37]" />
          </div>
          <div className="font-serif-display text-4xl font-light text-current">
            {trustScore} <span className="text-sm font-mono text-gray-400">/ 100</span>
          </div>
          <p className="text-[11px] font-sans text-gray-400 mt-2">
            Bayesian trust standing across telemetry epochs
          </p>
        </div>

        {/* Current Risk Score */}
        <div className={`p-6 border border-[#D4AF37]/25 ${
          isDark ? 'bg-[#0A0C10]' : 'bg-white'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#D4AF37]">
              CURRENT RISK
            </span>
            <Activity className="w-4 h-4 text-[#D4AF37]" />
          </div>
          <div className="font-serif-display text-4xl font-light text-[#D4AF37]">
            {riskScore} <span className="text-sm font-mono text-gray-400">/ 100</span>
          </div>
          <p className="text-[11px] font-sans text-gray-400 mt-2">
            Evaluated by supervised RF and IF anomaly models
          </p>
        </div>

        {/* Security Status */}
        <div className={`p-6 border border-[#D4AF37]/25 ${
          isDark ? 'bg-[#0A0C10]' : 'bg-white'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#D4AF37]">
              POLICY POSTURE
            </span>
            <Lock className="w-4 h-4 text-[#D4AF37]" />
          </div>
          <div className={`font-serif-display text-2xl font-light ${status.color}`}>
            {status.label}
          </div>
          <p className="text-[11px] font-sans text-gray-400 mt-2">
            Account state: {currentUser?.status || 'ACTIVE'}
          </p>
        </div>

        {/* Active Sessions */}
        <div className={`p-6 border border-[#D4AF37]/25 ${
          isDark ? 'bg-[#0A0C10]' : 'bg-white'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#D4AF37]">
              ACTIVE SESSIONS
            </span>
            <Laptop className="w-4 h-4 text-[#D4AF37]" />
          </div>
          <div className="font-serif-display text-4xl font-light text-current">
            {displayDevices.length} <span className="text-sm font-mono text-gray-400">Devices</span>
          </div>
          <p className="text-[11px] font-sans text-gray-400 mt-2">
            Authenticated endpoints in active compliance
          </p>
        </div>
      </div>

      {/* 4 Required Charts: Risk Trend, Trust Trend, Login Activity, Activity Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Risk Trend & Trust Trend (8 cols) */}
        <div className={`lg:col-span-8 p-6 sm:p-8 border border-[#D4AF37]/25 ${
          isDark ? 'bg-black' : 'bg-white'
        }`}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#D4AF37] block">
                BEHAVIORAL POSTURE
              </span>
              <h3 className="font-serif-display text-2xl font-light tracking-tight mt-1">
                Risk &amp; Trust Trend
              </h3>
            </div>
            <div className="flex items-center gap-4 text-xs font-mono">
              <span className="flex items-center gap-1.5 text-[#D4AF37]">
                <span className="w-2.5 h-0.5 bg-[#D4AF37]" />
                Risk
              </span>
              <span className="flex items-center gap-1.5 text-gray-400">
                <span className="w-2.5 h-0.5 bg-gray-400" />
                Trust
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="empRiskGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#D4AF37" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="time" 
                  stroke={isDark ? '#4B5563' : '#9CA3AF'} 
                  fontSize={10} 
                  tickLine={false}
                  axisLine={{ stroke: isDark ? 'rgba(212,175,55,0.2)' : 'rgba(197,160,89,0.3)' }}
                />
                <YAxis 
                  stroke={isDark ? '#4B5563' : '#9CA3AF'} 
                  fontSize={10} 
                  domain={[0, 100]}
                  tickLine={false}
                  axisLine={{ stroke: isDark ? 'rgba(212,175,55,0.2)' : 'rgba(197,160,89,0.3)' }}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: isDark ? '#000000' : '#FFFFFF',
                    borderColor: '#D4AF37',
                    borderWidth: '1px',
                    borderRadius: '0px',
                    fontSize: '0.75rem',
                    fontFamily: 'monospace'
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="risk" 
                  stroke="#D4AF37" 
                  strokeWidth={1.75} 
                  fillOpacity={1} 
                  fill="url(#empRiskGrad)" 
                  name="Risk Score"
                />
                <Area 
                  type="monotone" 
                  dataKey="trust" 
                  stroke={isDark ? '#E5E7EB' : '#4B5563'} 
                  strokeWidth={1.25} 
                  fillOpacity={0} 
                  name="Trust Score"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Activity Distribution (4 cols) */}
        <div className={`lg:col-span-4 p-6 sm:p-8 border border-[#D4AF37]/25 flex flex-col justify-between ${
          isDark ? 'bg-black' : 'bg-white'
        }`}>
          <div>
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#D4AF37] block">
              BREAKDOWN
            </span>
            <h3 className="font-serif-display text-2xl font-light tracking-tight mt-1">
              Activity Distribution
            </h3>
          </div>

          <div className="h-44 my-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={activityDist}
                  cx="50%"
                  cy="50%"
                  innerRadius={48}
                  outerRadius={68}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {activityDist.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke={isDark ? '#000' : '#FFF'} strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{
                    backgroundColor: isDark ? '#000000' : '#FFFFFF',
                    borderColor: '#D4AF37',
                    borderWidth: '1px',
                    borderRadius: '0px',
                    fontSize: '0.75rem',
                    fontFamily: 'monospace'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-2 pt-3 border-t border-[#D4AF37]/20">
            {activityDist.map((d, i) => (
              <div key={i} className="flex items-center justify-between text-xs font-mono">
                <span className="flex items-center gap-2 text-gray-400">
                  <span className="w-2 h-2" style={{ backgroundColor: d.color }} />
                  {d.name}
                </span>
                <span className="font-semibold text-current">{d.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Login Activity Chart */}
      <div className={`p-6 sm:p-8 border border-[#D4AF37]/25 ${
        isDark ? 'bg-black' : 'bg-white'
      }`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#D4AF37] block">
              AUTHENTICATION HISTORY
            </span>
            <h3 className="font-serif-display text-2xl font-light tracking-tight mt-1">
              Login Activity
            </h3>
          </div>
          <span className="text-[10px] font-mono text-gray-500">HOURLY LOGIN ATTEMPTS</span>
        </div>

        <div className="h-44 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData}>
              <XAxis 
                dataKey="time" 
                stroke={isDark ? '#4B5563' : '#9CA3AF'} 
                fontSize={10} 
                tickLine={false}
                axisLine={{ stroke: isDark ? 'rgba(212,175,55,0.2)' : 'rgba(197,160,89,0.3)' }}
              />
              <YAxis 
                stroke={isDark ? '#4B5563' : '#9CA3AF'} 
                fontSize={10}
                tickLine={false}
                axisLine={{ stroke: isDark ? 'rgba(212,175,55,0.2)' : 'rgba(197,160,89,0.3)' }}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: isDark ? '#000000' : '#FFFFFF',
                  borderColor: '#D4AF37',
                  borderWidth: '1px',
                  borderRadius: '0px',
                  fontSize: '0.75rem',
                  fontFamily: 'monospace'
                }}
              />
              <Line 
                type="monotone" 
                dataKey="logins" 
                stroke="#D4AF37" 
                strokeWidth={2} 
                dot={{ stroke: '#D4AF37', strokeWidth: 1.5, r: 3, fill: isDark ? '#000' : '#FFF' }}
                name="Logins"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Device Information & Active Sessions */}
      <div className={`p-6 sm:p-8 border border-[#D4AF37]/25 ${
        isDark ? 'bg-black' : 'bg-white'
      }`}>
        <div className="flex items-center justify-between mb-6 pb-3 border-b border-[#D4AF37]/20">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#D4AF37] block">
              AUTHORIZED HARDWARE
            </span>
            <h3 className="font-serif-display text-2xl font-light tracking-tight mt-1">
              Device Information &amp; Active Sessions
            </h3>
          </div>
          <span className="text-[10px] font-mono text-[#D4AF37] border border-[#D4AF37]/30 px-2.5 py-0.5">
            CRYPTOGRAPHIC ENDPOINT ATTESTATION
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {displayDevices.map((dev) => (
            <div 
              key={dev.id}
              className={`p-5 border ${
                dev.isCurrentDevice 
                  ? 'border-[#D4AF37] bg-[#D4AF37]/5' 
                  : 'border-[#D4AF37]/25 bg-transparent'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 border border-[#D4AF37]/40 flex items-center justify-center">
                    {dev.deviceType === 'MOBILE' ? (
                      <Smartphone className="w-5 h-5 text-[#D4AF37]" />
                    ) : (
                      <Laptop className="w-5 h-5 text-[#D4AF37]" />
                    )}
                  </div>
                  <div>
                    <div className="font-serif-display text-base font-medium flex items-center gap-2">
                      <span>{dev.deviceName}</span>
                      {dev.isCurrentDevice && (
                        <span className="text-[9px] font-mono px-1.5 py-0.2 border border-[#D4AF37] text-[#D4AF37]">
                          CURRENT
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] font-mono text-gray-400 mt-0.5">
                      {dev.os} • {dev.browser}
                    </div>
                  </div>
                </div>

                <span className="text-[10px] font-mono px-2 py-0.5 border border-[#D4AF37] text-[#D4AF37]">
                  TRUST {dev.trustScore}%
                </span>
              </div>

              <div className="mt-4 pt-3 border-t border-[#D4AF37]/15 flex items-center justify-between text-[11px] font-mono text-gray-400">
                <span>IP: {dev.ipAddress}</span>
                <span>Active: {dev.lastSeen || 'Recently'}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activities & Security Events */}
      <div className={`p-6 sm:p-8 border border-[#D4AF37]/25 ${
        isDark ? 'bg-black' : 'bg-white'
      }`}>
        <div className="flex items-center justify-between mb-6 pb-3 border-b border-[#D4AF37]/20">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#D4AF37] block">
              USER AUDIT LOG
            </span>
            <h3 className="font-serif-display text-2xl font-light tracking-tight mt-1">
              Recent Activities &amp; Security Events
            </h3>
          </div>
          <span className="text-[10px] font-mono text-gray-500">
            RECORDED BY ZERO TRUST PDP
          </span>
        </div>

        <div className="space-y-3">
          {displayEvents.map((evt) => (
            <div 
              key={evt.id} 
              className={`p-4 border text-xs transition-all ${
                evt.isAnomalous || (evt.riskContribution && evt.riskContribution >= 50)
                  ? 'border-red-500/40 bg-red-500/5'
                  : 'border-[#D4AF37]/20 bg-transparent'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-serif-display text-sm font-medium">
                  {evt.eventType} {evt.resourceName ? `→ ${evt.resourceName}` : ''}
                </span>
                <span className="text-[10px] font-mono text-gray-500">
                  {new Date(evt.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <div className="flex items-center justify-between text-gray-400 text-[11px] font-mono">
                <span>Location / Device: {evt.ipAddress || 'Corporate Intranet'}</span>
                <span className="text-[#D4AF37]">
                  Risk: {evt.riskContribution || 15}/100
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
