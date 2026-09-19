import React, { useEffect, useMemo, useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import { useTheme } from '../context/ThemeContext';

export const AiRiskAnalysisPage = ({
  users = [],
  events = [],
  selectedUserId
}) => {
  const { isDark } = useTheme();

  const [targetUserId, setTargetUserId] = useState(
    selectedUserId && users.some(user => user.id === selectedUserId)
      ? selectedUserId
      : ''
  );

  useEffect(() => {
    if (
      selectedUserId &&
      users.some(user => user.id === selectedUserId)
    ) {
      setTargetUserId(selectedUserId);
    }
  }, [selectedUserId, users]);

  useEffect(() => {
    if (
      targetUserId &&
      !users.some(user => user.id === targetUserId)
    ) {
      setTargetUserId('');
    }
  }, [users, targetUserId]);

  const targetUser = useMemo(() => {
    if (!targetUserId) {
      return null;
    }

    return users.find(user => user.id === targetUserId) || null;
  }, [users, targetUserId]);

  const userEvents = useMemo(() => {
    if (!targetUser) {
      return [];
    }

    return events
      .filter(event => {
        return (
          event.userId === targetUser.id ||
          event.employeeId === targetUser.employeeId ||
          event.user?.id === targetUser.id ||
          event.user?.employeeId === targetUser.employeeId
        );
      })
      .sort((a, b) => {
        const dateA = new Date(
          a.timestamp ||
          a.createdAt ||
          a.time ||
          0
        ).getTime();

        const dateB = new Date(
          b.timestamp ||
          b.createdAt ||
          b.time ||
          0
        ).getTime();

        return dateB - dateA;
      });
  }, [events, targetUser]);

  const hasTelemetry = userEvents.length > 0;

  const latestEvent = userEvents[0] || null;

  const getNumber = (...values) => {
    for (const value of values) {
      if (
        typeof value === 'number' &&
        Number.isFinite(value)
      ) {
        return value;
      }

      if (
        typeof value === 'string' &&
        value.trim() !== ''
      ) {
        const parsed = Number(value);

        if (Number.isFinite(parsed)) {
          return parsed;
        }
      }
    }

    return null;
  };

  const normalizeScore = value => {
    if (value === null || value === undefined) {
      return null;
    }

    const number = Number(value);

    if (!Number.isFinite(number)) {
      return null;
    }

    if (number >= 0 && number <= 1) {
      return number * 100;
    }

    return Math.min(100, Math.max(0, number));
  };

  const riskScore = normalizeScore(
    latestEvent?.metadata?.riskScore,
    latestEvent?.riskScore,
    latestEvent?.riskContribution,
    latestEvent?.metadata?.riskContribution,
    latestEvent?.evaluation?.riskScore,
    latestEvent?.decision?.evaluation?.riskScore
  );

  const trustScore = normalizeScore(
    latestEvent?.metadata?.trustScore,
    latestEvent?.trustScore,
    latestEvent?.evaluation?.trustScore,
    latestEvent?.decision?.evaluation?.trustScore
  );

  const rfProbability = getNumber(
    latestEvent?.metadata?.supervisedProbability,
    latestEvent?.metadata?.rfProbability,
    latestEvent?.supervisedProbability,
    latestEvent?.rfProbability,
    latestEvent?.ml?.supervisedProbability
  );

  const isolationForestScore = getNumber(
    latestEvent?.metadata?.isolationForestScore,
    latestEvent?.metadata?.iforestScore,
    latestEvent?.isolationForestScore,
    latestEvent?.iforestScore,
    latestEvent?.ml?.isolationForestScore
  );

  const authRisk = normalizeScore(
    latestEvent?.metadata?.authenticationRisk,
    latestEvent?.authenticationRisk,
    latestEvent?.metadata?.authRisk,
    latestEvent?.authRisk
  );

  const deviceRisk = normalizeScore(
    latestEvent?.metadata?.deviceRisk,
    latestEvent?.deviceRisk
  );

  const networkRisk = normalizeScore(
    latestEvent?.metadata?.networkRisk,
    latestEvent?.networkRisk
  );

  const dataTransferRisk = normalizeScore(
    latestEvent?.metadata?.dataTransferRisk,
    latestEvent?.dataTransferRisk
  );

  const behaviorRisk =
    isolationForestScore !== null
      ? normalizeScore(isolationForestScore)
      : null;

  const mlRisk =
    rfProbability !== null
      ? normalizeScore(rfProbability)
      : null;

  const riskFactors = [
    {
      name: 'Authentication Risk',
      score: authRisk,
      weight: '15%',
      description:
        'Off-hours access, unusual login geolocation, and MFA challenges'
    },
    {
      name: 'Device Risk',
      score: deviceRisk,
      weight: '15%',
      description:
        'Hardware posture, OS patch version, and endpoint certificate trust'
    },
    {
      name: 'Behavior Risk',
      score: behaviorRisk,
      weight: '25%',
      description:
        'Unsupervised isolation tree variance from user historical baseline'
    },
    {
      name: 'Network Risk',
      score: networkRisk,
      weight: '10%',
      description:
        'Subnet anomalies, cross-department segment access, and DNS egress'
    },
    {
      name: 'Data Transfer Risk',
      score: dataTransferRisk,
      weight: '15%',
      description:
        'Volume of file downloads, USB transfers, and external sync bandwidth'
    },
    {
      name: 'ML Risk',
      score: mlRisk,
      weight: '20%',
      description:
        'Supervised Random Forest classification probability across 25 decision trees'
    }
  ];

  const radarData = riskFactors
    .filter(factor => factor.score !== null)
    .map(factor => ({
      subject: factor.name.replace(' Risk', ''),
      value: factor.score,
      fullMark: 100
    }));

  const riskHistory = userEvents
    .map((event, index) => {
      const eventRisk = normalizeScore(
        event?.metadata?.riskScore,
        event?.riskScore,
        event?.riskContribution,
        event?.metadata?.riskContribution,
        event?.evaluation?.riskScore,
        event?.decision?.evaluation?.riskScore
      );

      const eventMlProbability = getNumber(
        event?.metadata?.supervisedProbability,
        event?.metadata?.rfProbability,
        event?.supervisedProbability,
        event?.rfProbability,
        event?.ml?.supervisedProbability
      );

      if (
        eventRisk === null &&
        eventMlProbability === null
      ) {
        return null;
      }

      return {
        time:
          event.timestamp ||
          event.createdAt ||
          event.time ||
          `Event ${index + 1}`,
        score: eventRisk,
        mlProb:
          eventMlProbability !== null
            ? Math.min(
                100,
                Math.max(0, eventMlProbability <= 1
                  ? eventMlProbability * 100
                  : eventMlProbability)
              )
            : null
      };
    })
    .filter(Boolean)
    .reverse()
    .slice(-20);

  const formatScore = value => {
    if (
      value === null ||
      value === undefined ||
      !Number.isFinite(Number(value))
    ) {
      return 'N/A';
    }

    return Number(value).toFixed(
      Number.isInteger(Number(value)) ? 0 : 1
    );
  };

  const formatProbability = value => {
    if (
      value === null ||
      value === undefined ||
      !Number.isFinite(Number(value))
    ) {
      return 'N/A';
    }

    const normalized =
      Number(value) <= 1
        ? Number(value) * 100
        : Number(value);

    return `${Math.min(100, Math.max(0, normalized)).toFixed(1)}%`;
  };

  return (
    <div className="space-y-10">
      <div
        className={`p-8 sm:p-10 border border-[#D4AF37]/25 relative transition-colors ${
          isDark ? 'bg-black' : 'bg-white'
        }`}
      >
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-[10px] font-mono tracking-[0.25em] uppercase text-[#D4AF37] border border-[#D4AF37]/40 px-2.5 py-0.5">
                MATHEMATICAL EVALUATION
              </span>

              <span className="text-[11px] font-mono text-gray-500">
                RF (25 TREES) + IF (100 TREES)
              </span>
            </div>

            <h1 className="font-serif-display text-4xl sm:text-5xl lg:text-6xl font-light tracking-tight">
              RISK ANALYSIS
            </h1>

            <p className="text-xs text-gray-400 max-w-2xl mt-3 font-sans leading-relaxed">
              Multi-dimensional decomposition of composite behavioral risk
              scores across cryptographic, statistical, and ensemble machine
              learning inference pipelines.
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono">
            <span className="text-gray-400">
              TARGET:
            </span>

            <select
              value={targetUserId}
              onChange={event =>
                setTargetUserId(event.target.value)
              }
              disabled={users.length === 0}
              className={`border text-xs px-3 py-2 outline-none font-mono cursor-pointer ${
                isDark
                  ? 'bg-black border-[#D4AF37]/30 text-white'
                  : 'bg-white border-gray-300 text-black'
              }`}
            >
              <option value="">
                Select Employee
              </option>

              {users.map(user => (
                <option
                  key={user.id}
                  value={user.id}
                >
                  {user.name} ({user.employeeId})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {!targetUser ? (
        <div
          className={`p-12 border border-[#D4AF37]/25 text-center ${
            isDark ? 'bg-black' : 'bg-white'
          }`}
        >
          <div className="text-[#D4AF37] font-mono text-sm tracking-wider">
            NO EMPLOYEE SELECTED
          </div>

          <p className="text-xs text-gray-500 mt-3">
            Select an employee to inspect recorded security telemetry.
          </p>
        </div>
      ) : !hasTelemetry ? (
        <div
          className={`p-12 border border-[#D4AF37]/25 text-center ${
            isDark ? 'bg-black' : 'bg-white'
          }`}
        >
          <div className="text-[#D4AF37] font-mono text-sm tracking-wider">
            NO TELEMETRY AVAILABLE
          </div>

          <p className="text-xs text-gray-400 mt-3">
            {targetUser.name} ({targetUser.employeeId}) has no recorded
            telemetry.
          </p>

          <p className="text-[10px] text-gray-600 font-mono mt-2">
            RISK ANALYSIS WILL APPEAR AFTER ACTUAL ACTIVITY IS RECORDED.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div
              className={`p-6 border border-[#D4AF37]/25 ${
                isDark ? 'bg-[#0A0C10]' : 'bg-white'
              }`}
            >
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#D4AF37] block mb-2">
                RISK SCORE
              </span>

              <div className="font-serif-display text-4xl font-light text-[#D4AF37]">
                {formatScore(riskScore)}
                <span className="text-sm font-mono text-gray-400">
                  {' '}
                  / 100
                </span>
              </div>

              <span className="text-[10px] font-mono text-gray-500 mt-2 block">
                Derived from recorded telemetry
              </span>
            </div>

            <div
              className={`p-6 border border-[#D4AF37]/25 ${
                isDark ? 'bg-[#0A0C10]' : 'bg-white'
              }`}
            >
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#D4AF37] block mb-2">
                TRUST SCORE
              </span>

              <div className="font-serif-display text-4xl font-light">
                {formatScore(trustScore)}
                <span className="text-sm font-mono text-gray-400">
                  {' '}
                  / 100
                </span>
              </div>

              <span className="text-[10px] font-mono text-gray-500 mt-2 block">
                Derived from recorded telemetry
              </span>
            </div>

            <div
              className={`p-6 border border-[#D4AF37]/25 ${
                isDark ? 'bg-[#0A0C10]' : 'bg-white'
              }`}
            >
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#D4AF37] block mb-2">
                ML ANOMALY PROBABILITY
              </span>

              <div className="font-serif-display text-4xl font-light">
                {formatProbability(rfProbability)}
              </div>

              <span className="text-[10px] font-mono text-gray-500 mt-2 block">
                Actual Random Forest telemetry
              </span>
            </div>

            <div
              className={`p-6 border border-[#D4AF37]/25 ${
                isDark ? 'bg-[#0A0C10]' : 'bg-white'
              }`}
            >
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#D4AF37] block mb-2">
                ISOLATION FOREST SCORE
              </span>

              <div className="font-serif-display text-4xl font-light">
                {formatProbability(isolationForestScore)}
              </div>

              <span className="text-[10px] font-mono text-gray-500 mt-2 block">
                Actual Isolation Forest telemetry
              </span>
            </div>
          </div>

          <div
            className={`p-8 sm:p-10 border border-[#D4AF37]/25 ${
              isDark ? 'bg-black' : 'bg-white'
            }`}
          >
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#D4AF37]/20">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#D4AF37] block">
                  COMPONENT ANALYSIS
                </span>

                <h3 className="font-serif-display text-2xl sm:text-3xl font-light tracking-tight mt-1">
                  Risk Vectors &amp; Mathematical Bars
                </h3>
              </div>

              <span className="text-[10px] font-mono text-gray-400">
                NORMALIZED SCALE (0-100)
              </span>
            </div>

            <div className="space-y-6">
              {riskFactors.map((factor, index) => (
                <div
                  key={index}
                  className="space-y-2"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-serif-display text-base font-medium">
                        {factor.name}
                      </span>

                      <span className="text-[9px] font-mono text-[#D4AF37] border border-[#D4AF37]/30 px-1.5 py-0.2">
                        Weight: {factor.weight}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 font-mono text-xs">
                      <span className="text-gray-400 hidden md:inline">
                        {factor.description}
                      </span>

                      <span className="text-[#D4AF37] font-bold text-sm">
                        {factor.score !== null
                          ? `${formatScore(factor.score)} / 100`
                          : 'N/A'}
                      </span>
                    </div>
                  </div>

                  <div className="w-full h-2.5 bg-gray-500/10 border border-[#D4AF37]/20 relative overflow-hidden">
                    {factor.score !== null && (
                      <div
                        className="h-full bg-[#D4AF37] transition-all duration-700 ease-out"
                        style={{
                          width: `${Math.min(
                            100,
                            Math.max(0, factor.score)
                          )}%`
                        }}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div
              className={`lg:col-span-7 p-6 sm:p-8 border border-[#D4AF37]/25 ${
                isDark ? 'bg-black' : 'bg-white'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#D4AF37] block">
                    CHRONOLOGY
                  </span>

                  <h3 className="font-serif-display text-2xl font-light tracking-tight mt-1">
                    Risk &amp; ML Evolution
                  </h3>
                </div>
              </div>

              <div className="h-64 w-full">
                {riskHistory.length > 0 ? (
                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                  >
                    <AreaChart data={riskHistory}>
                      <defs>
                        <linearGradient
                          id="aiGoldArea"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="#D4AF37"
                            stopOpacity={0.3}
                          />

                          <stop
                            offset="95%"
                            stopColor="#D4AF37"
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>

                      <XAxis
                        dataKey="time"
                        stroke={
                          isDark
                            ? '#4B5563'
                            : '#9CA3AF'
                        }
                        fontSize={10}
                        tickLine={false}
                        axisLine={{
                          stroke:
                            'rgba(212,175,55,0.2)'
                        }}
                      />

                      <YAxis
                        stroke={
                          isDark
                            ? '#4B5563'
                            : '#9CA3AF'
                        }
                        fontSize={10}
                        domain={[0, 100]}
                        tickLine={false}
                        axisLine={{
                          stroke:
                            'rgba(212,175,55,0.2)'
                        }}
                      />

                      <Tooltip
                        contentStyle={{
                          backgroundColor: isDark
                            ? '#000000'
                            : '#FFFFFF',
                          borderColor: '#D4AF37',
                          borderWidth: '1px',
                          borderRadius: '0px',
                          fontSize: '0.75rem',
                          fontFamily: 'monospace'
                        }}
                      />

                      <Area
                        type="monotone"
                        dataKey="score"
                        stroke="#D4AF37"
                        strokeWidth={1.75}
                        fillOpacity={1}
                        fill="url(#aiGoldArea)"
                        name="Composite Risk"
                      />

                      <Area
                        type="monotone"
                        dataKey="mlProb"
                        stroke={
                          isDark
                            ? '#FFF'
                            : '#333'
                        }
                        strokeWidth={1.25}
                        fillOpacity={0}
                        name="ML Prob %"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs font-mono text-gray-500">
                    NO HISTORICAL TELEMETRY
                  </div>
                )}
              </div>
            </div>

            <div
              className={`lg:col-span-5 p-6 sm:p-8 border border-[#D4AF37]/25 flex flex-col justify-between ${
                isDark ? 'bg-black' : 'bg-white'
              }`}
            >
              <div>
                <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#D4AF37] block">
                  GEOMETRIC SURFACE
                </span>

                <h3 className="font-serif-display text-2xl font-light tracking-tight mt-1">
                  Multi-Vector Radar
                </h3>
              </div>

              <div className="h-64 my-2">
                {radarData.length > 0 ? (
                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                  >
                    <RadarChart data={radarData}>
                      <PolarGrid
                        stroke={
                          isDark
                            ? 'rgba(212,175,55,0.2)'
                            : 'rgba(197,160,89,0.3)'
                        }
                      />

                      <PolarAngleAxis
                        dataKey="subject"
                        stroke={
                          isDark
                            ? '#9CA3AF'
                            : '#4B5563'
                        }
                        fontSize={9}
                      />

                      <PolarRadiusAxis
                        angle={30}
                        domain={[0, 100]}
                        stroke="#6B7280"
                        fontSize={8}
                      />

                      <Radar
                        name="Risk Level"
                        dataKey="value"
                        stroke="#D4AF37"
                        fill="#D4AF37"
                        fillOpacity={0.25}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs font-mono text-gray-500">
                    NO RISK VECTOR TELEMETRY
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-[#D4AF37]/20 text-[10px] font-mono text-gray-500 text-center">
                User: {targetUser.name} • ID: {targetUser.employeeId}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};