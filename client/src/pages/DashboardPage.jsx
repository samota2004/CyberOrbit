import React, { useMemo } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  Radio,
  Shield,
  ShieldAlert,
  Sparkles,
  UserCheck,
  Users,
  Wifi,
  Zap,
} from 'lucide-react';

import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { useTheme } from '../context/ThemeContext';

/* =========================================================
   SMALL UI COMPONENTS
========================================================= */

const MetricCard = ({
  label,
  value,
  description,
  icon: Icon,
  accent = 'gold',
  isDark,
}) => {
  const accentClasses = {
    gold: 'text-[#D4AF37]',
    red: 'text-red-400',
    green: 'text-emerald-400',
    neutral: isDark ? 'text-white' : 'text-[#111111]',
  };

  return (
    <div
      className={`
        group relative overflow-hidden
        border
        transition-all duration-300
        hover:-translate-y-0.5
        ${
          isDark
            ? 'bg-[#0D0D0D] border-white/10 hover:border-[#D4AF37]/50'
            : 'bg-white border-black/10 hover:border-[#D4AF37]/60'
        }
      `}
    >
      <div className="absolute left-0 top-0 h-full w-[2px] bg-[#D4AF37] opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <span
            className={`
              text-[9px] sm:text-[10px]
              uppercase tracking-[0.18em]
              font-mono
              ${isDark ? 'text-gray-500' : 'text-gray-500'}
            `}
          >
            {label}
          </span>

          <div
            className={`
              w-8 h-8
              flex items-center justify-center
              border
              ${
                isDark
                  ? 'border-white/10 bg-white/[0.02]'
                  : 'border-black/10 bg-[#F7F4EC]'
              }
            `}
          >
            <Icon className={`w-4 h-4 ${accentClasses[accent]}`} />
          </div>
        </div>

        <div className="mt-5">
          <div
            className={`
              font-serif-display
              text-3xl sm:text-4xl
              font-light
              tracking-tight
              ${accentClasses[accent]}
            `}
          >
            {value}
          </div>

          <p
            className={`
              mt-2
              text-[10px]
              font-mono
              uppercase
              tracking-wide
              ${isDark ? 'text-gray-500' : 'text-gray-500'}
            `}
          >
            {description}
          </p>
        </div>
      </div>
    </div>
  );
};

const SectionHeader = ({
  eyebrow,
  title,
  description,
  rightContent,
  isDark,
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-7">
      <div>
        <span className="block text-[9px] sm:text-[10px] font-mono uppercase tracking-[0.2em] text-[#D4AF37] mb-2">
          {eyebrow}
        </span>

        <h2
          className={`
            font-serif-display
            text-2xl sm:text-3xl
            font-light
            tracking-tight
            ${isDark ? 'text-white' : 'text-[#111111]'}
          `}
        >
          {title}
        </h2>

        {description && (
          <p
            className={`
              mt-2
              max-w-2xl
              text-xs
              leading-relaxed
              ${isDark ? 'text-gray-500' : 'text-gray-500'}
            `}
          >
            {description}
          </p>
        )}
      </div>

      {rightContent}
    </div>
  );
};

const Panel = ({ children, className = '', isDark }) => {
  return (
    <div
      className={`
        border
        ${
          isDark
            ? 'bg-[#0B0B0B] border-white/10'
            : 'bg-white border-black/10'
        }
        ${className}
      `}
    >
      {children}
    </div>
  );
};

const RiskBadge = ({ score }) => {
  let label = 'SAFE';
  let classes =
    'border-emerald-500/30 bg-emerald-500/5 text-emerald-400';

  if (score >= 75) {
    label = 'CRITICAL';
    classes = 'border-red-500/40 bg-red-500/5 text-red-400';
  } else if (score >= 60) {
    label = 'HIGH';
    classes = 'border-orange-500/40 bg-orange-500/5 text-orange-400';
  } else if (score >= 40) {
    label = 'MEDIUM';
    classes = 'border-[#D4AF37]/40 bg-[#D4AF37]/5 text-[#D4AF37]';
  }

  return (
    <span
      className={`
        inline-flex items-center gap-1.5
        px-2 py-1
        border
        text-[9px]
        font-mono
        tracking-wider
        ${classes}
      `}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
};

const StatusBadge = ({ status }) => {
  const normalized = status || 'ACTIVE';

  let classes =
    'border-emerald-500/30 text-emerald-400 bg-emerald-500/5';

  if (normalized === 'FROZEN') {
    classes = 'border-red-500/40 text-red-400 bg-red-500/5';
  } else if (normalized === 'RESTRICTED') {
    classes = 'border-orange-500/40 text-orange-400 bg-orange-500/5';
  }

  return (
    <span
      className={`
        inline-flex
        px-2 py-1
        border
        text-[9px]
        font-mono
        uppercase
        tracking-wider
        ${classes}
      `}
    >
      {normalized}
    </span>
  );
};

const EmptyState = ({ message, isDark }) => (
  <div
    className={`
      min-h-[150px]
      flex items-center justify-center
      text-center
      border
      border-dashed
      ${
        isDark
          ? 'border-white/10 text-gray-600'
          : 'border-black/10 text-gray-500'
      }
    `}
  >
    <div>
      <div className="text-[10px] font-mono uppercase tracking-wider">
        No data
      </div>
      <p className="mt-2 text-xs">{message}</p>
    </div>
  </div>
);

/* =========================================================
   MAIN DASHBOARD
========================================================= */

export const DashboardPage = ({
  users = [],
  incidents = [],
  recentEvents = [],
  onSelectUser,
  onSelectIncident,
  onNavigateToSimulator,
  onNavigateToCopilot,
  onFreezeUser,
  onUnfreezeUser,
}) => {
  const { isDark } = useTheme();

  /* =======================================================
     CORE METRICS
  ======================================================= */

  const totalEmployees = users.length;

  const onlineUsers = users.filter((user) => {
    if (user.status === 'ACTIVE') return true;

    if (!user.lastLoginAt) return false;

    const lastLogin = new Date(user.lastLoginAt).getTime();

    if (Number.isNaN(lastLogin)) return false;

    return lastLogin > Date.now() - 24 * 60 * 60 * 1000;
  }).length;

  const highRisk = users.filter(
    (user) => Number(user.currentRiskScore || 0) >= 60
  ).length;

  const mediumRisk = users.filter((user) => {
    const score = Number(user.currentRiskScore || 0);

    return score >= 40 && score < 60;
  }).length;

  const safeUsers = users.filter(
    (user) => Number(user.currentRiskScore || 0) < 40
  ).length;

  const criticalIncidents = incidents.filter(
    (incident) =>
      incident.severity === 'CRITICAL' &&
      incident.status !== 'RESOLVED'
  ).length;

  const avgTrustScore =
    totalEmployees > 0
      ? Math.round(
          users.reduce(
            (sum, user) =>
              sum + Number(user.currentTrustScore ?? 0),
            0
          ) / totalEmployees
        )
      : null;

  const avgRiskScore =
    totalEmployees > 0
      ? Math.round(
          users.reduce(
            (sum, user) =>
              sum + Number(user.currentRiskScore ?? 0),
            0
          ) / totalEmployees
        )
      : null;

  /* =======================================================
     RISK DISTRIBUTION
  ======================================================= */

  const riskDistData = useMemo(() => {
    const safe = users.filter(
      (user) => Number(user.currentRiskScore || 0) < 40
    ).length;

    const medium = users.filter((user) => {
      const score = Number(user.currentRiskScore || 0);
      return score >= 40 && score < 60;
    }).length;

    const high = users.filter((user) => {
      const score = Number(user.currentRiskScore || 0);
      return score >= 60 && score < 75;
    }).length;

    const critical = users.filter(
      (user) => Number(user.currentRiskScore || 0) >= 75
    ).length;

    return [
      {
        name: 'Safe',
        value: safe,
        color: '#D4AF37',
      },
      {
        name: 'Medium',
        value: medium,
        color: '#E5D39A',
      },
      {
        name: 'High',
        value: high,
        color: '#C8792A',
      },
      {
        name: 'Critical',
        value: critical,
        color: '#C94C4C',
      },
    ].filter((item) => item.value > 0);
  }, [users]);

  /* =======================================================
     EVENT ANALYSIS
  ======================================================= */

  const recentAlerts = recentEvents
    .filter(
      (event) =>
        event.isAnomalous ||
        Number(event.riskContribution || 0) >= 50 ||
        event.severity === 'CRITICAL' ||
        event.severity === 'HIGH'
    )
    .slice(0, 6);

  const activeIncidents = incidents
    .filter((incident) => incident.status !== 'RESOLVED')
    .slice(0, 6);

  /* =======================================================
     DEPARTMENTS - REAL DATA ONLY
  ======================================================= */

  const departments = useMemo(() => {
    const map = {};

    users.forEach((user) => {
      const department = user.department || 'Unassigned';

      if (!map[department]) {
        map[department] = {
          name: department,
          users: [],
        };
      }

      map[department].users.push(user);
    });

    return Object.values(map)
      .map((department) => {
        const scores = department.users.map((user) =>
          Number(user.currentRiskScore || 0)
        );

        const avg =
          scores.length > 0
            ? Math.round(
                scores.reduce((sum, score) => sum + score, 0) /
                  scores.length
              )
            : 0;

        return {
          ...department,
          count: department.users.length,
          risk: avg,
        };
      })
      .sort((a, b) => b.risk - a.risk);
  }, [users]);

  /* =======================================================
     THREAT CATEGORIES - REAL INCIDENT DATA
  ======================================================= */

  const threatDistribution = useMemo(() => {
    if (!incidents.length) return [];

    const categories = {};

    incidents.forEach((incident) => {
      const title = String(
        incident.title ||
          incident.eventType ||
          incident.type ||
          'Uncategorized Threat'
      );

      let category = 'Other Security Event';

      const lower = title.toLowerCase();

      if (
        lower.includes('privilege') ||
        lower.includes('escalation')
      ) {
        category = 'Privilege Escalation';
      } else if (
        lower.includes('exfiltration') ||
        lower.includes('data')
      ) {
        category = 'Data Exfiltration';
      } else if (
        lower.includes('hour') ||
        lower.includes('after') ||
        lower.includes('off-hours')
      ) {
        category = 'Off-Hours Anomaly';
      } else if (
        lower.includes('usb') ||
        lower.includes('hardware') ||
        lower.includes('device')
      ) {
        category = 'Unapproved Hardware';
      } else if (
        lower.includes('shell') ||
        lower.includes('command')
      ) {
        category = 'Shell / Command Activity';
      }

      categories[category] = (categories[category] || 0) + 1;
    });

    const total = incidents.length;

    return Object.entries(categories)
      .map(([type, count]) => ({
        type,
        count,
        percentage:
          total > 0
            ? Math.round((count / total) * 100)
            : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [incidents]);

  /* =======================================================
     AUTHENTICATION DATA
     ======================================================= */

  const authenticationData = useMemo(() => {
    if (!recentEvents.length) return [];

    const buckets = {};

    recentEvents.forEach((event) => {
      if (!event.timestamp) return;

      const date = new Date(event.timestamp);

      if (Number.isNaN(date.getTime())) return;

      const hour = date.getHours();
      const label = `${String(hour).padStart(2, '0')}:00`;

      if (!buckets[label]) {
        buckets[label] = {
          time: label,
          logins: 0,
        };
      }

      const eventType = String(
        event.eventType || ''
      ).toLowerCase();

      if (
        eventType.includes('login') ||
        eventType.includes('authentication') ||
        eventType.includes('auth')
      ) {
        buckets[label].logins += 1;
      }
    });

    return Object.values(buckets).sort((a, b) =>
      a.time.localeCompare(b.time)
    );
  }, [recentEvents]);

  /* =======================================================
     REAL POSTURE DATA
  ======================================================= */

  const postureData = useMemo(() => {
    if (!users.length) return [];

    return [
      {
        label: 'Current',
        risk: avgRiskScore ?? 0,
        trust: avgTrustScore ?? 0,
      },
    ];
  }, [users, avgRiskScore, avgTrustScore]);

  /* =======================================================
     TOOLTIP STYLE
  ======================================================= */

  const tooltipStyle = {
    backgroundColor: isDark ? '#0B0B0B' : '#FFFFFF',
    border: '1px solid rgba(212,175,55,0.5)',
    borderRadius: '0px',
    color: isDark ? '#FFFFFF' : '#111111',
    fontSize: '11px',
    fontFamily: 'monospace',
  };

  const axisColor = isDark ? '#555555' : '#A3A3A3';

  return (
    <div
      id="cyberorbit-dashboard"
      className={`
        min-h-full
        pb-10
        ${
          isDark
            ? 'text-white'
            : 'text-[#111111]'
        }
      `}
    >
      {/* =====================================================
          HERO
      ===================================================== */}

      <section
        className={`
          relative
          overflow-hidden
          border
          p-6 sm:p-8 lg:p-10
          ${
            isDark
              ? 'bg-[#0B0B0B] border-white/10'
              : 'bg-[#F7F4EC] border-black/10'
          }
        `}
      >
        <div className="absolute right-0 top-0 w-40 h-40 border-l border-b border-[#D4AF37]/20 pointer-events-none" />

        <div className="relative flex flex-col xl:flex-row xl:items-end justify-between gap-8">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-3 mb-5">
              <span className="inline-flex items-center gap-2 text-[9px] font-mono uppercase tracking-[0.2em] text-[#D4AF37]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] animate-pulse" />
                CyberOrbit Security Operations
              </span>

              <span className="text-[9px] font-mono uppercase tracking-wider text-gray-500">
                Live Monitoring
              </span>
            </div>

            <h1 className="font-serif-display text-4xl sm:text-5xl lg:text-6xl font-light tracking-tight leading-[0.95]">
              Security
              <span className="block italic text-[#D4AF37]">
                Operations Center
              </span>
            </h1>

            <p
              className={`
                mt-6
                max-w-2xl
                text-sm
                leading-7
                ${
                  isDark
                    ? 'text-gray-400'
                    : 'text-gray-600'
                }
              `}
            >
              Continuous behavioral intelligence across identities,
              devices and security events — providing a unified
              view of organizational risk and trust posture.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 shrink-0">
            <button
              id="dashboard-btn-simulator"
              onClick={onNavigateToSimulator}
              className="
                group
                inline-flex items-center justify-center gap-2
                px-5 py-3
                bg-[#D4AF37]
                border border-[#D4AF37]
                text-black
                text-[10px]
                font-mono
                font-semibold
                uppercase
                tracking-[0.12em]
                transition-all duration-300
                hover:bg-transparent
                hover:text-[#D4AF37]
              "
            >
              <Radio className="w-3.5 h-3.5" />
              Threat Simulator
              <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </button>

            <button
              id="dashboard-btn-copilot"
              onClick={onNavigateToCopilot}
              className={`
                inline-flex items-center justify-center gap-2
                px-5 py-3
                border
                text-[10px]
                font-mono
                uppercase
                tracking-[0.12em]
                text-[#D4AF37]
                transition-all duration-300
                hover:bg-[#D4AF37]
                hover:text-black
                ${
                  isDark
                    ? 'border-[#D4AF37]/40'
                    : 'border-[#D4AF37]/60'
                }
              `}
            >
              <Sparkles className="w-3.5 h-3.5" />
              AI Copilot
            </button>
          </div>
        </div>
      </section>

      {/* =====================================================
          KPI STRIP
      ===================================================== */}

      <section className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-[#D4AF37]">
              Security Intelligence
            </span>
          </div>

          <span className="hidden sm:block text-[9px] font-mono uppercase tracking-wider text-gray-500">
            Continuous Monitoring
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          <MetricCard
            label="Total Employees"
            value={totalEmployees}
            description="Monitored identities"
            icon={Users}
            accent="neutral"
            isDark={isDark}
          />

          <MetricCard
            label="Online Users"
            value={onlineUsers}
            description="Active sessions"
            icon={Wifi}
            accent="gold"
            isDark={isDark}
          />

          <MetricCard
            label="High Risk"
            value={highRisk}
            description="Risk score ≥ 60"
            icon={ShieldAlert}
            accent={highRisk > 0 ? 'red' : 'neutral'}
            isDark={isDark}
          />

          <MetricCard
            label="Medium Risk"
            value={mediumRisk}
            description="Risk score 40–59"
            icon={Activity}
            accent="gold"
            isDark={isDark}
          />

          <MetricCard
            label="Safe Users"
            value={safeUsers}
            description="Risk score < 40"
            icon={UserCheck}
            accent="green"
            isDark={isDark}
          />

          <MetricCard
            label="Critical Incidents"
            value={criticalIncidents}
            description="Pending containment"
            icon={AlertTriangle}
            accent={criticalIncidents > 0 ? 'red' : 'neutral'}
            isDark={isDark}
          />
        </div>
      </section>

      {/* =====================================================
          POSTURE + RISK DISTRIBUTION
      ===================================================== */}

      <section className="mt-8 grid grid-cols-1 xl:grid-cols-12 gap-5">
        <Panel
          isDark={isDark}
          className="xl:col-span-8 p-6 sm:p-8"
        >
          <SectionHeader
            eyebrow="Posture Intelligence"
            title="Risk & Trust Overview"
            description="Current organization-wide behavioral risk and trust posture derived from monitored identities."
            isDark={isDark}
            rightContent={
              <div className="flex gap-6">
                <div>
                  <span className="block text-[9px] font-mono text-gray-500 uppercase">
                    Risk
                  </span>
                  <span className="text-xl font-serif-display text-[#D4AF37]">
                    {avgRiskScore ?? '—'}
                  </span>
                </div>

                <div>
                  <span className="block text-[9px] font-mono text-gray-500 uppercase">
                    Trust
                  </span>
                  <span className="text-xl font-serif-display">
                    {avgTrustScore ?? '—'}
                  </span>
                </div>
              </div>
            }
          />

          {postureData.length > 0 ? (
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={postureData}>
                  <defs>
                    <linearGradient
                      id="cyberOrbitRiskGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="#D4AF37"
                        stopOpacity={0.22}
                      />
                      <stop
                        offset="100%"
                        stopColor="#D4AF37"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>

                  <CartesianGrid
                    vertical={false}
                    stroke={
                      isDark
                        ? 'rgba(255,255,255,0.05)'
                        : 'rgba(0,0,0,0.06)'
                    }
                  />

                  <XAxis
                    dataKey="label"
                    stroke={axisColor}
                    tickLine={false}
                    axisLine={false}
                    fontSize={10}
                  />

                  <YAxis
                    domain={[0, 100]}
                    stroke={axisColor}
                    tickLine={false}
                    axisLine={false}
                    fontSize={10}
                  />

                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value, name) => [
                      `${value}/100`,
                      name === 'risk'
                        ? 'Composite Risk'
                        : 'Fleet Trust',
                    ]}
                  />

                  <Area
                    type="monotone"
                    dataKey="risk"
                    stroke="#D4AF37"
                    strokeWidth={2}
                    fill="url(#cyberOrbitRiskGradient)"
                    name="risk"
                  />

                  <Line
                    type="monotone"
                    dataKey="trust"
                    stroke={
                      isDark
                        ? '#E5E7EB'
                        : '#4B5563'
                    }
                    strokeWidth={1.5}
                    dot={false}
                    name="trust"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState
              message="Risk and trust telemetry will appear as monitored identities are available."
              isDark={isDark}
            />
          )}
        </Panel>

        <Panel
          isDark={isDark}
          className="xl:col-span-4 p-6 sm:p-8"
        >
          <SectionHeader
            eyebrow="Risk Classification"
            title="Risk Distribution"
            description="Current employee distribution by behavioral risk tier."
            isDark={isDark}
          />

          {riskDistData.length > 0 ? (
            <>
              <div className="relative h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={riskDistData}
                      cx="50%"
                      cy="50%"
                      innerRadius={62}
                      outerRadius={84}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {riskDistData.map((entry) => (
                        <Cell
                          key={entry.name}
                          fill={entry.color}
                          stroke={
                            isDark
                              ? '#0B0B0B'
                              : '#FFFFFF'
                          }
                          strokeWidth={2}
                        />
                      ))}
                    </Pie>

                    <Tooltip
                      contentStyle={tooltipStyle}
                    />
                  </PieChart>
                </ResponsiveContainer>

                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-center">
                    <span className="block text-[9px] font-mono uppercase text-gray-500">
                      Total
                    </span>

                    <span className="font-serif-display text-3xl font-light">
                      {totalEmployees}
                    </span>
                  </div>
                </div>
              </div>

              <div
                className={`
                  border-t pt-5 space-y-3
                  ${
                    isDark
                      ? 'border-white/10'
                      : 'border-black/10'
                  }
                `}
              >
                {riskDistData.map((item) => {
                  const percentage =
                    totalEmployees > 0
                      ? Math.round(
                          (item.value /
                            totalEmployees) *
                            100
                        )
                      : 0;

                  return (
                    <div
                      key={item.name}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2 h-2"
                          style={{
                            backgroundColor:
                              item.color,
                          }}
                        />

                        <span className="text-xs">
                          {item.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 font-mono">
                        <span className="text-[10px] text-gray-500">
                          {percentage}%
                        </span>

                        <span className="text-xs font-semibold">
                          {item.value}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <EmptyState
              message="No employee risk data available."
              isDark={isDark}
            />
          )}
        </Panel>
      </section>

      {/* =====================================================
          AUTHENTICATION
      ===================================================== */}

      <section className="mt-5">
        <Panel isDark={isDark} className="p-6 sm:p-8">
          <SectionHeader
            eyebrow="Access Intelligence"
            title="Authentication Activity"
            description="Observed authentication events from the available telemetry stream."
            isDark={isDark}
            rightContent={
              <div className="flex items-center gap-2 text-[9px] font-mono uppercase text-gray-500">
                <Clock3 className="w-3.5 h-3.5 text-[#D4AF37]" />
                Event-derived
              </div>
            }
          />

          {authenticationData.length > 0 ? (
            <div className="h-[230px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={authenticationData}>
                  <CartesianGrid
                    vertical={false}
                    stroke={
                      isDark
                        ? 'rgba(255,255,255,0.05)'
                        : 'rgba(0,0,0,0.06)'
                    }
                  />

                  <XAxis
                    dataKey="time"
                    stroke={axisColor}
                    tickLine={false}
                    axisLine={false}
                    fontSize={10}
                  />

                  <YAxis
                    allowDecimals={false}
                    stroke={axisColor}
                    tickLine={false}
                    axisLine={false}
                    fontSize={10}
                  />

                  <Tooltip
                    contentStyle={tooltipStyle}
                  />

                  <Line
                    type="monotone"
                    dataKey="logins"
                    stroke="#D4AF37"
                    strokeWidth={2}
                    dot={{
                      r: 3,
                      fill: isDark
                        ? '#0B0B0B'
                        : '#FFFFFF',
                      stroke: '#D4AF37',
                      strokeWidth: 2,
                    }}
                    name="Authentication Events"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState
              message="Authentication history will appear as telemetry events are received."
              isDark={isDark}
            />
          )}
        </Panel>
      </section>

      {/* =====================================================
          ORGANIZATIONAL INTELLIGENCE
      ===================================================== */}

      <section className="mt-5 grid grid-cols-1 xl:grid-cols-12 gap-5">
        <Panel
          isDark={isDark}
          className="xl:col-span-8 p-6 sm:p-8"
        >
          <SectionHeader
            eyebrow="Organizational Exposure"
            title="Department Risk Intelligence"
            description="Average behavioral risk calculated from monitored users within each department."
            isDark={isDark}
          />

          {departments.length > 0 ? (
            <div className="space-y-5">
              {departments.map((department) => (
                <div key={department.name}>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="text-sm font-medium">
                        {department.name}
                      </span>

                      <span className="ml-2 text-[10px] font-mono text-gray-500">
                        {department.count}{' '}
                        {department.count === 1
                          ? 'user'
                          : 'users'}
                      </span>
                    </div>

                    <span
                      className={`
                        text-xs font-mono font-semibold
                        ${
                          department.risk >= 75
                            ? 'text-red-400'
                            : department.risk >= 60
                            ? 'text-orange-400'
                            : department.risk >= 40
                            ? 'text-[#D4AF37]'
                            : 'text-emerald-400'
                        }
                      `}
                    >
                      {department.risk}/100
                    </span>
                  </div>

                  <div
                    className={`
                      h-2
                      overflow-hidden
                      ${
                        isDark
                          ? 'bg-white/5'
                          : 'bg-black/5'
                      }
                    `}
                  >
                    <div
                      className={`
                        h-full
                        transition-all duration-700
                        ${
                          department.risk >= 75
                            ? 'bg-red-500'
                            : department.risk >= 60
                            ? 'bg-orange-500'
                            : department.risk >= 40
                            ? 'bg-[#D4AF37]'
                            : 'bg-emerald-500'
                        }
                      `}
                      style={{
                        width: `${Math.min(
                          100,
                          department.risk
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              message="No department identities are currently available."
              isDark={isDark}
            />
          )}
        </Panel>

        <Panel
          isDark={isDark}
          className="xl:col-span-4 p-6 sm:p-8"
        >
          <SectionHeader
            eyebrow="Threat Taxonomy"
            title="Threat Distribution"
            description="Incident categories derived from the current incident stream."
            isDark={isDark}
          />

          {threatDistribution.length > 0 ? (
            <div className="space-y-5">
              {threatDistribution.map(
                (threat, index) => (
                  <div key={threat.type}>
                    <div className="flex justify-between gap-3 mb-2">
                      <span className="text-xs text-gray-400">
                        {threat.type}
                      </span>

                      <span className="text-[10px] font-mono">
                        {threat.count} ·{' '}
                        {threat.percentage}%
                      </span>
                    </div>

                    <div
                      className={`
                        h-1.5
                        ${
                          isDark
                            ? 'bg-white/5'
                            : 'bg-black/5'
                        }
                      `}
                    >
                      <div
                        className="h-full bg-[#D4AF37]"
                        style={{
                          width: `${threat.percentage}%`,
                          opacity:
                            1 -
                            index *
                              0.12,
                        }}
                      />
                    </div>
                  </div>
                )
              )}
            </div>
          ) : (
            <EmptyState
              message="No categorized incidents are currently available."
              isDark={isDark}
            />
          )}
        </Panel>
      </section>

      {/* =====================================================
          EMPLOYEE TABLE
      ===================================================== */}

      <section className="mt-5">
        <Panel isDark={isDark} className="overflow-hidden">
          <div className="p-6 sm:p-8 pb-5">
            <SectionHeader
              eyebrow="Identity Governance"
              title="Employee Intelligence"
              description="Continuous identity, risk, trust and session monitoring."
              isDark={isDark}
              rightContent={
                <div className="text-right">
                  <span className="block text-[9px] font-mono uppercase text-gray-500">
                    Monitored
                  </span>

                  <span className="font-serif-display text-2xl">
                    {totalEmployees}
                  </span>
                </div>
              }
            />
          </div>

          {users.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[950px] text-left">
                <thead>
                  <tr
                    className={`
                      border-y
                      text-[9px]
                      font-mono
                      uppercase
                      tracking-[0.15em]
                      ${
                        isDark
                          ? 'border-white/10 text-gray-500'
                          : 'border-black/10 text-gray-500'
                      }
                    `}
                  >
                    <th className="px-6 py-4">
                      Employee
                    </th>

                    <th className="px-4 py-4">
                      Department
                    </th>

                    <th className="px-4 py-4">
                      Risk
                    </th>

                    <th className="px-4 py-4">
                      Trust
                    </th>

                    <th className="px-4 py-4">
                      Status
                    </th>

                    <th className="px-4 py-4">
                      Last Login
                    </th>

                    <th className="px-4 py-4">
                      Trust State
                    </th>

                    <th className="px-6 py-4">
                      Session
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {users.map((user) => {
                    const risk = Number(
                      user.currentRiskScore ?? 0
                    );

                    const trust = Number(
                      user.currentTrustScore ?? 0
                    );

                    const initials =
                      user.name
                        ?.split(' ')
                        .map(
                          (part) =>
                            part[0]
                        )
                        .join('')
                        .slice(0, 2)
                        .toUpperCase() ||
                      'U';

                    return (
                      <tr
                        key={user.id}
                        onClick={() =>
                          onSelectUser &&
                          onSelectUser(
                            user.id
                          )
                        }
                        className={`
                          group
                          border-b
                          cursor-pointer
                          transition-colors
                          ${
                            isDark
                              ? 'border-white/5 hover:bg-white/[0.025]'
                              : 'border-black/5 hover:bg-[#F7F4EC]/60'
                          }
                        `}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div
                              className="
                                w-9 h-9
                                flex items-center justify-center
                                border border-[#D4AF37]/40
                                bg-[#D4AF37]/5
                                text-[#D4AF37]
                                text-[10px]
                                font-mono
                                font-bold
                              "
                            >
                              {initials}
                            </div>

                            <div>
                              <div className="text-sm font-medium">
                                {user.name ||
                                  'Unnamed Employee'}
                              </div>

                              <div className="mt-0.5 text-[10px] font-mono text-gray-500">
                                {user.email ||
                                  user.employeeId ||
                                  'No identifier'}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <span className="text-xs text-gray-400">
                            {user.department ||
                              'Unassigned'}
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          <div>
                            <span
                              className={`
                                text-sm
                                font-mono
                                font-semibold
                                ${
                                  risk >=
                                  75
                                    ? 'text-red-400'
                                    : risk >=
                                      60
                                    ? 'text-orange-400'
                                    : risk >=
                                      40
                                    ? 'text-[#D4AF37]'
                                    : 'text-emerald-400'
                                }
                              `}
                            >
                              {risk}
                            </span>

                            <span className="text-[9px] font-mono text-gray-600">
                              /100
                            </span>
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <div>
                            <span className="text-sm font-mono font-semibold">
                              {trust}
                            </span>

                            <span className="text-[9px] font-mono text-gray-600">
                              /100
                            </span>
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <StatusBadge
                            status={user.status}
                          />
                        </td>

                        <td className="px-4 py-4">
                          <span className="text-[10px] font-mono text-gray-500">
                            {user.lastLoginAt
                              ? new Date(
                                  user.lastLoginAt
                                ).toLocaleString(
                                  [],
                                  {
                                    dateStyle:
                                      'medium',
                                    timeStyle:
                                      'short',
                                  }
                                )
                              : '—'}
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          <RiskBadge
                            score={risk}
                          />
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span
                              className={`
                                w-1.5 h-1.5 rounded-full
                                ${
                                  user.status ===
                                  'FROZEN'
                                    ? 'bg-red-500'
                                    : 'bg-emerald-400'
                                }
                              `}
                            />

                            <span className="text-[10px] font-mono text-gray-500">
                              {user.status ===
                              'FROZEN'
                                ? 'Terminated'
                                : 'Active'}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-6 pb-8">
              <EmptyState
                message="No monitored employees are currently available."
                isDark={isDark}
              />
            </div>
          )}
        </Panel>
      </section>

      {/* =====================================================
          ALERTS + INCIDENTS
      ===================================================== */}

      <section className="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* ALERTS */}

        <Panel isDark={isDark} className="p-6 sm:p-8">
          <SectionHeader
            eyebrow="Anomaly Stream"
            title="Recent Alerts"
            description="Highest-priority events from the available telemetry stream."
            isDark={isDark}
            rightContent={
              <span
                className="
                  inline-flex items-center gap-2
                  text-[9px]
                  font-mono
                  uppercase
                  tracking-wider
                  text-[#D4AF37]
                "
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] animate-pulse" />
                Live
              </span>
            }
          />

          {recentAlerts.length > 0 ? (
            <div className="space-y-3">
              {recentAlerts.map((event) => {
                const critical =
                  event.severity ===
                    'CRITICAL' ||
                  event.isAnomalous;

                return (
                  <div
                    key={event.id}
                    className={`
                      group
                      border
                      p-4
                      transition-all
                      ${
                        critical
                          ? isDark
                            ? 'border-red-500/20 bg-red-500/[0.025]'
                            : 'border-red-500/20 bg-red-50/30'
                          : isDark
                          ? 'border-white/10 hover:border-[#D4AF37]/30'
                          : 'border-black/10 hover:border-[#D4AF37]/40'
                      }
                    `}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`
                          mt-0.5
                          w-8 h-8
                          flex items-center justify-center
                          border
                          ${
                            critical
                              ? 'border-red-500/30 text-red-400'
                              : 'border-[#D4AF37]/30 text-[#D4AF37]'
                          }
                        `}
                      >
                        {critical ? (
                          <ShieldAlert className="w-3.5 h-3.5" />
                        ) : (
                          <Activity className="w-3.5 h-3.5" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <span className="text-sm font-medium">
                            {event.eventType ||
                              'Security Event'}
                          </span>

                          <span className="text-[9px] font-mono text-gray-500">
                            {event.timestamp
                              ? new Date(
                                  event.timestamp
                                ).toLocaleTimeString()
                              : '—'}
                          </span>
                        </div>

                        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                          <span className="text-[10px] font-mono text-gray-500">
                            {event.userName ||
                              'Unknown user'}
                            {event.userDepartment
                              ? ` · ${event.userDepartment}`
                              : ''}
                          </span>

                          <span className="text-[10px] font-mono text-[#D4AF37]">
                            Risk{' '}
                            {event.riskContribution ??
                              '—'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState
              message="No active threat alerts in the current queue."
              isDark={isDark}
            />
          )}
        </Panel>

        {/* INCIDENTS */}

        <Panel isDark={isDark} className="p-6 sm:p-8">
          <SectionHeader
            eyebrow="SOC Investigations"
            title="Active Incidents"
            description="Security incidents requiring monitoring, investigation or containment."
            isDark={isDark}
            rightContent={
              <button
                onClick={onSelectIncident}
                className="
                  inline-flex items-center gap-1
                  text-[9px]
                  font-mono
                  uppercase
                  tracking-wider
                  text-[#D4AF37]
                  hover:underline
                "
              >
                View all
                <ArrowUpRight className="w-3 h-3" />
              </button>
            }
          />

          {activeIncidents.length > 0 ? (
            <div className="space-y-3">
              {activeIncidents.map((incident) => (
                <button
                  key={incident.id}
                  onClick={() =>
                    onSelectIncident &&
                    onSelectIncident(
                      incident.id
                    )
                  }
                  className={`
                    w-full
                    text-left
                    border
                    p-4
                    transition-all
                    ${
                      isDark
                        ? 'border-white/10 hover:border-[#D4AF37]/40'
                        : 'border-black/10 hover:border-[#D4AF37]/50'
                    }
                  `}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex gap-3">
                      <div className="mt-1">
                        <span
                          className={`
                            block w-2 h-2 rounded-full
                            ${
                              incident.severity ===
                              'CRITICAL'
                                ? 'bg-red-500'
                                : incident.severity ===
                                  'HIGH'
                                ? 'bg-orange-500'
                                : 'bg-[#D4AF37]'
                            }
                          `}
                        />
                      </div>

                      <div>
                        <h4 className="text-sm font-medium">
                          {incident.title ||
                            incident.eventType ||
                            'Security Incident'}
                        </h4>

                        <p className="mt-1 text-[10px] font-mono text-gray-500">
                          {incident.userName ||
                            'Unknown user'}
                          {incident.userDepartment
                            ? ` · ${incident.userDepartment}`
                            : ''}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`
                        shrink-0
                        text-[9px]
                        font-mono
                        uppercase
                        tracking-wider
                        ${
                          incident.severity ===
                          'CRITICAL'
                            ? 'text-red-400'
                            : incident.severity ===
                              'HIGH'
                            ? 'text-orange-400'
                            : 'text-[#D4AF37]'
                        }
                      `}
                    >
                      {incident.severity ||
                        'UNKNOWN'}
                    </span>
                  </div>

                  <div
                    className={`
                      mt-4 pt-3
                      border-t
                      flex items-center justify-between
                      ${
                        isDark
                          ? 'border-white/5'
                          : 'border-black/5'
                      }
                    `}
                  >
                    <span className="text-[9px] font-mono uppercase text-gray-500">
                      Status
                    </span>

                    <span className="text-[9px] font-mono uppercase text-gray-400">
                      {incident.status ||
                        'OPEN'}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <EmptyState
              message="No open security incidents. All monitored incidents are currently resolved."
              isDark={isDark}
            />
          )}
        </Panel>
      </section>

      {/* =====================================================
          FOOTER STATUS
      ===================================================== */}

      <section
        className={`
          mt-5
          flex flex-col sm:flex-row
          items-start sm:items-center
          justify-between
          gap-4
          border-t
          pt-5
          ${
            isDark
              ? 'border-white/10'
              : 'border-black/10'
          }
        `}
      >
        <div className="flex items-center gap-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />

          <div>
            <span className="block text-[9px] font-mono uppercase tracking-wider text-gray-500">
              CyberOrbit Monitoring Status
            </span>

            <span className="text-xs">
              Security intelligence layer operational
            </span>
          </div>
        </div>

        <div className="flex items-center gap-5 text-[9px] font-mono uppercase tracking-wider text-gray-500">
          <span className="flex items-center gap-1.5">
            <Zap className="w-3 h-3 text-[#D4AF37]" />
            Continuous Evaluation
          </span>

          <span className="flex items-center gap-1.5">
            <Shield className="w-3 h-3 text-[#D4AF37]" />
            Identity Monitoring
          </span>
        </div>
      </section>
    </div>
  );
};