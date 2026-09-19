import React, { useMemo, useState } from 'react';
import {
  Search,
  X,
  ShieldAlert,
  Lock,
  Unlock,
  UserRound,
  Laptop,
  Clock,
  RefreshCw
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const normalizeValue = value => {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value);
};

const getIncidentId = incident =>
  incident?.incidentId ||
  incident?.id ||
  incident?._id ||
  '';

const getIncidentTitle = incident =>
  incident?.title ||
  incident?.eventType ||
  incident?.type ||
  'Security Incident';

const getUserDepartment = user =>
  user?.departmentName ||
  user?.department ||
  user?.departmentCode ||
  '';

const getUserStatus = user =>
  user?.status ||
  user?.accountStatus ||
  (user?.isFrozen || user?.accountFrozen ? 'FROZEN' : 'ACTIVE');

const getUserRiskScore = user =>
  user?.riskScore ??
  user?.currentRiskScore ??
  null;

const getUserRiskLevel = user =>
  user?.riskLevel ||
  user?.currentRiskLevel ||
  '';

const getUserTrustScore = user =>
  user?.trustScore ??
  user?.currentTrustScore ??
  null;

export const AlertsPage = ({
  users = [],
  incidents = [],
  currentUser,
  onRefreshData,
  onSelectUser,
  onSelectIncident
}) => {
  const { isDark } = useTheme();

  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [updatingUserId, setUpdatingUserId] = useState(null);
  const [actionError, setActionError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const isAuthorized =
    !currentUser ||
    currentUser.role === 'SECURITY_ADMIN' ||
    currentUser.role === 'SYSTEM_ADMIN';

  const userMap = useMemo(() => {
    const map = new Map();

    users.forEach(user => {
      if (!user) {
        return;
      }

      if (user.id !== undefined && user.id !== null) {
        map.set(String(user.id), user);
      }

      if (user._id !== undefined && user._id !== null) {
        map.set(String(user._id), user);
      }

      if (user.email) {
        map.set(`email:${String(user.email).toLowerCase()}`, user);
      }
    });

    return map;
  }, [users]);

  const getIncidentUser = incident => {
    if (!incident) {
      return null;
    }

    const userId = incident.userId;

    if (userId !== undefined && userId !== null) {
      const user =
        userMap.get(String(userId)) ||
        userMap.get(`email:${String(userId).toLowerCase()}`);

      if (user) {
        return user;
      }
    }

    if (incident.userEmail) {
      return (
        userMap.get(
          `email:${String(incident.userEmail).toLowerCase()}`
        ) || null
      );
    }

    return null;
  };

  const alerts = useMemo(() => {
    return incidents
      .filter(Boolean)
      .map(incident => {
        const user = getIncidentUser(incident);

        return {
          incident,
          user,
          id: getIncidentId(incident),
          severity: incident.severity || 'UNKNOWN',
          type: getIncidentTitle(incident),
          employeeName:
            user?.name ||
            incident.userName ||
            'Unknown Employee',
          employeeEmail:
            user?.email ||
            incident.userEmail ||
            '',
          employeeId:
            user?.employeeId ||
            incident.employeeId ||
            '',
          userId:
            incident.userId ||
            user?.id ||
            user?._id ||
            '',
          department:
            getUserDepartment(user) ||
            incident.userDepartment ||
            '',
          device:
            incident.deviceName ||
            incident.deviceId ||
            incident.device ||
            'Unknown Device',
          riskScore:
            incident.riskScore ??
            incident.risk ??
            null,
          detectedAt:
            incident.detectedAt ||
            incident.createdAt ||
            incident.timestamp ||
            null,
          status:
            incident.status ||
            'OPEN',
          details:
            incident.description ||
            incident.details ||
            'No incident description available.',
          recommendedAction:
            incident.recommendedAction ||
            '',
          contributingFactors:
            Array.isArray(incident.contributingFactors)
              ? incident.contributingFactors
              : [],
          accountStatus: getUserStatus(user),
          riskLevel: getUserRiskLevel(user),
          userRiskScore: getUserRiskScore(user),
          trustScore: getUserTrustScore(user)
        };
      });
  }, [incidents, userMap]);

  const severityOptions = useMemo(() => {
    const values = new Set();

    incidents.forEach(incident => {
      if (incident?.severity) {
        values.add(String(incident.severity).toUpperCase());
      }
    });

    ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].forEach(value => {
      values.add(value);
    });

    return Array.from(values);
  }, [incidents]);

  const statusOptions = useMemo(() => {
    const values = new Set();

    incidents.forEach(incident => {
      if (incident?.status) {
        values.add(String(incident.status).toUpperCase());
      }
    });

    ['OPEN', 'UNDER_REVIEW', 'RESOLVED'].forEach(value => {
      values.add(value);
    });

    return Array.from(values);
  }, [incidents]);

  const filteredAlerts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return alerts.filter(alert => {
      const searchableValues = [
        alert.id,
        alert.type,
        alert.employeeName,
        alert.employeeEmail,
        alert.employeeId,
        alert.department,
        alert.device,
        alert.severity,
        alert.status,
        alert.details,
        alert.recommendedAction
      ];

      const matchesSearch =
        !query ||
        searchableValues.some(value =>
          normalizeValue(value)
            .toLowerCase()
            .includes(query)
        );

      const matchesSeverity =
        severityFilter === 'ALL' ||
        String(alert.severity).toUpperCase() === severityFilter;

      const matchesStatus =
        statusFilter === 'ALL' ||
        String(alert.status).toUpperCase() === statusFilter;

      return (
        matchesSearch &&
        matchesSeverity &&
        matchesStatus
      );
    });
  }, [
    alerts,
    searchQuery,
    severityFilter,
    statusFilter
  ]);

  const totalCount = alerts.length;

  const criticalCount = alerts.filter(
    alert =>
      String(alert.severity).toUpperCase() === 'CRITICAL' &&
      String(alert.status).toUpperCase() !== 'RESOLVED'
  ).length;

  const openCount = alerts.filter(
    alert =>
      String(alert.status).toUpperCase() === 'OPEN'
  ).length;

  const unresolvedCount = alerts.filter(
    alert =>
      String(alert.status).toUpperCase() !== 'RESOLVED'
  ).length;

  const getSeverityStyle = severity => {
    switch (String(severity).toUpperCase()) {
      case 'CRITICAL':
        return 'border-red-500 text-red-400 bg-red-500/10';
      case 'HIGH':
        return 'border-orange-500 text-orange-400 bg-orange-500/10';
      case 'MEDIUM':
        return 'border-[#D4AF37] text-[#D4AF37] bg-[#D4AF37]/10';
      case 'LOW':
        return 'border-emerald-500 text-emerald-400 bg-emerald-500/10';
      default:
        return 'border-gray-500 text-gray-400 bg-gray-500/10';
    }
  };

  const getStatusStyle = status => {
    switch (String(status).toUpperCase()) {
      case 'OPEN':
        return 'border-red-500 text-red-400 bg-red-500/10';
      case 'UNDER_REVIEW':
        return 'border-orange-500 text-orange-400 bg-orange-500/10';
      case 'RESOLVED':
        return 'border-emerald-500 text-emerald-400 bg-emerald-500/10';
      default:
        return 'border-gray-500 text-gray-400 bg-gray-500/10';
    }
  };

  const formatDate = value => {
    if (!value) {
      return '—';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return String(value);
    }

    return date.toLocaleString();
  };

  const handleRefresh = async () => {
    if (!onRefreshData) {
      return;
    }

    try {
      setRefreshing(true);
      await onRefreshData();
    } catch (error) {
      console.error('Failed to refresh alerts:', error);
      setActionError(
        error.message || 'Failed to refresh alerts.'
      );
    } finally {
      setRefreshing(false);
    }
  };

  const handleFreeze = async userId => {
    if (!userId || !isAuthorized) {
      return;
    }

    try {
      setActionError('');
      setUpdatingUserId(userId);

      const response = await fetch(
        `/api/users/${userId}/freeze`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(currentUser?.id
              ? { 'x-user-id': currentUser.id }
              : {})
          },
          body: JSON.stringify({
            reason: 'Security incident containment',
            source: 'ALERT_RESPONSE'
          })
        }
      );

      const data = await response
        .json()
        .catch(() => ({}));

      if (!response.ok || data.success === false) {
        throw new Error(
          data?.error?.message ||
          data?.message ||
          `Unable to freeze account. Status ${response.status}`
        );
      }

      if (onRefreshData) {
        await onRefreshData();
      }

      setSelectedAlert(current => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          accountStatus:
            data?.user?.status ||
            data?.user?.accountStatus ||
            'FROZEN'
        };
      });
    } catch (error) {
      console.error(
        'Failed to freeze user account:',
        error
      );

      setActionError(
        error.message ||
        'Failed to freeze user account.'
      );
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleUnfreeze = async userId => {
    if (!userId || !isAuthorized) {
      return;
    }

    try {
      setActionError('');
      setUpdatingUserId(userId);

      const response = await fetch(
        `/api/users/${userId}/unfreeze`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(currentUser?.id
              ? { 'x-user-id': currentUser.id }
              : {})
          }
        }
      );

      const data = await response
        .json()
        .catch(() => ({}));

      if (!response.ok || data.success === false) {
        throw new Error(
          data?.error?.message ||
          data?.message ||
          `Unable to unfreeze account. Status ${response.status}`
        );
      }

      if (onRefreshData) {
        await onRefreshData();
      }

      setSelectedAlert(current => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          accountStatus:
            data?.user?.status ||
            data?.user?.accountStatus ||
            'ACTIVE'
        };
      });
    } catch (error) {
      console.error(
        'Failed to unfreeze user account:',
        error
      );

      setActionError(
        error.message ||
        'Failed to unfreeze user account.'
      );
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleOpenAlert = alert => {
    setActionError('');
    setSelectedAlert(alert);

    if (onSelectIncident && alert.incident) {
      onSelectIncident(alert.incident);
    }

    if (onSelectUser && alert.user) {
      onSelectUser(alert.user);
    }
  };

  return (
    <div className="space-y-8">
      <div
        className={`p-8 sm:p-10 border border-[#D4AF37]/25 relative ${
          isDark ? 'bg-black' : 'bg-white'
        }`}
      >
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-[10px] font-mono tracking-[0.25em] uppercase text-[#D4AF37] border border-[#D4AF37]/40 px-2.5 py-0.5">
                SOC ALERT INBOX
              </span>

              <span className="text-[11px] font-mono text-gray-500">
                REAL-TIME THREAT TRIAGE
              </span>
            </div>

            <h1 className="font-serif-display text-3xl sm:text-4xl lg:text-5xl font-light tracking-tight">
              Security Alerts &amp; Behavioral Warnings
            </h1>

            <p className="text-xs text-gray-400 max-w-2xl mt-3 font-sans leading-relaxed">
              Security alerts are generated dynamically from persisted incident records and current employee risk state.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right font-mono text-xs">
              <span className="text-gray-500">
                ACTIVE UNRESOLVED:{' '}
              </span>

              <span className="text-[#D4AF37] font-bold">
                {unresolvedCount}
              </span>
            </div>

            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="px-3 py-2 border border-[#D4AF37]/40 text-[#D4AF37] hover:bg-[#D4AF37]/10 text-xs font-mono flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${
                  refreshing ? 'animate-spin' : ''
                }`}
              />

              {refreshing
                ? 'REFRESHING...'
                : 'REFRESH'}
            </button>
          </div>
        </div>
      </div>

      <div
        className={`p-4 border border-[#D4AF37]/20 flex flex-col md:flex-row gap-4 items-center justify-between ${
          isDark ? 'bg-[#0A0C10]' : 'bg-white'
        }`}
      >
        <div className="relative w-full md:w-96">
          <input
            type="text"
            value={searchQuery}
            onChange={event =>
              setSearchQuery(event.target.value)
            }
            placeholder="Search incident ID, employee, device..."
            className={`w-full border text-xs pl-9 pr-3 py-2 outline-none font-mono ${
              isDark
                ? 'bg-black border-[#D4AF37]/30 text-white focus:border-[#D4AF37]'
                : 'bg-[#F9F9F7] border-gray-300 text-black focus:border-[#D4AF37]'
            }`}
          />

          <Search className="w-3.5 h-3.5 text-[#D4AF37] absolute left-3 top-1/2 -translate-y-1/2" />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto font-mono text-xs">
          <div className="flex items-center gap-2">
            <span className="text-gray-400">
              SEVERITY:
            </span>

            <select
              value={severityFilter}
              onChange={event =>
                setSeverityFilter(event.target.value)
              }
              className={`border text-xs px-3 py-1.5 outline-none ${
                isDark
                  ? 'bg-black border-[#D4AF37]/30 text-white'
                  : 'bg-white border-gray-300 text-black'
              }`}
            >
              <option value="ALL">
                All Severities
              </option>

              {severityOptions.map(severity => (
                <option
                  key={severity}
                  value={severity}
                >
                  {severity.replaceAll('_', ' ')}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-gray-400">
              STATUS:
            </span>

            <select
              value={statusFilter}
              onChange={event =>
                setStatusFilter(event.target.value)
              }
              className={`border text-xs px-3 py-1.5 outline-none ${
                isDark
                  ? 'bg-black border-[#D4AF37]/30 text-white'
                  : 'bg-white border-gray-300 text-black'
              }`}
            >
              <option value="ALL">
                All Statuses
              </option>

              {statusOptions.map(status => (
                <option
                  key={status}
                  value={status}
                >
                  {status.replaceAll('_', ' ')}
                </option>
              ))}
            </select>
          </div>

          <span className="px-2 py-1 border border-[#D4AF37]/40 text-[#D4AF37]">
            {totalCount} TOTAL
          </span>

          <span className="px-2 py-1 border border-red-500/40 text-red-400">
            {criticalCount} CRITICAL
          </span>

          <span className="px-2 py-1 border border-orange-500/40 text-orange-400">
            {openCount} OPEN
          </span>
        </div>
      </div>

      <div
        className={`border border-[#D4AF37]/25 overflow-hidden ${
          isDark ? 'bg-black' : 'bg-white'
        }`}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead
              className={`border-b border-[#D4AF37]/25 font-mono text-[10px] uppercase tracking-[0.15em] ${
                isDark
                  ? 'bg-[#0A0C10] text-[#D4AF37]'
                  : 'bg-[#F9F9F7] text-[#B8860B]'
              }`}
            >
              <tr>
                <th className="py-3.5 px-4 text-center">
                  SEVERITY
                </th>

                <th className="py-3.5 px-4">
                  INCIDENT
                </th>

                <th className="py-3.5 px-4">
                  EMPLOYEE
                </th>

                <th className="py-3.5 px-4">
                  DEVICE
                </th>

                <th className="py-3.5 px-4 text-center">
                  RISK
                </th>

                <th className="py-3.5 px-4">
                  DETECTED
                </th>

                <th className="py-3.5 px-4 text-center">
                  ACCOUNT
                </th>

                <th className="py-3.5 px-4 text-center">
                  STATUS
                </th>

                <th className="py-3.5 px-4 text-right">
                  ACTION
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#D4AF37]/15 font-mono">
              {filteredAlerts.length > 0 ? (
                filteredAlerts.map(alert => (
                  <tr
                    key={alert.id || `${alert.type}-${alert.detectedAt}`}
                    className="hover:bg-[#D4AF37]/5 transition-colors"
                  >
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-block text-[9px] px-2 py-0.5 border font-bold ${getSeverityStyle(
                          alert.severity
                        )}`}
                      >
                        {alert.severity}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-serif-display text-sm font-medium block">
                        {alert.type}
                      </span>

                      <span className="text-[10px] text-gray-500">
                        {alert.id || '—'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="text-xs block">
                        {alert.employeeName}
                      </span>

                      <span className="text-[10px] text-gray-500 block">
                        {alert.employeeEmail || '—'}
                      </span>

                      <span className="text-[10px] text-gray-500">
                        {alert.department || '—'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-gray-400 text-[11px]">
                      <div className="flex items-center gap-2">
                        <Laptop className="w-3.5 h-3.5" />
                        <span>
                          {alert.device}
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span className="text-xs font-bold text-[#D4AF37]">
                        {alert.riskScore ?? '—'}
                      </span>

                      {alert.riskScore !== null &&
                        alert.riskScore !== undefined && (
                          <span className="text-[10px] text-gray-500">
                            /100
                          </span>
                        )}
                    </td>

                    <td className="py-3.5 px-4 text-gray-400 text-[11px]">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3 h-3" />
                        {formatDate(alert.detectedAt)}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`text-[9px] px-2 py-0.5 border font-semibold ${
                          alert.accountStatus === 'FROZEN'
                            ? 'border-red-500 text-red-400 bg-red-500/10'
                            : alert.accountStatus === 'ACTIVE'
                              ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10'
                              : 'border-gray-500 text-gray-400'
                        }`}
                      >
                        {alert.accountStatus || 'UNKNOWN'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`text-[9px] px-2 py-0.5 border font-semibold ${getStatusStyle(
                          alert.status
                        )}`}
                      >
                        {alert.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() =>
                          handleOpenAlert(alert)
                        }
                        className="px-3 py-1.5 border border-[#D4AF37]/40 text-[#D4AF37] hover:bg-[#D4AF37]/10 text-[10px] cursor-pointer"
                      >
                        REVIEW
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={9}
                    className="py-14 text-center text-xs text-gray-500"
                  >
                    No incidents match the current criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedAlert && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm">
          <div
            className={`w-full max-w-xl h-full overflow-y-auto p-7 border-l border-[#D4AF37]/30 ${
              isDark
                ? 'bg-black text-white'
                : 'bg-white text-black'
            }`}
          >
            <div className="flex items-center justify-between border-b border-[#D4AF37]/20 pb-4">
              <div>
                <span className="text-[10px] font-mono tracking-[0.2em] text-[#D4AF37]">
                  INCIDENT INVESTIGATION
                </span>

                <h2 className="font-serif-display text-2xl mt-1">
                  {selectedAlert.type}
                </h2>

                <span className="text-[10px] font-mono text-gray-500">
                  {selectedAlert.id || '—'}
                </span>
              </div>

              <button
                onClick={() =>
                  setSelectedAlert(null)
                }
                className="text-gray-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-5 mt-6">
              <div className="flex gap-2">
                <span
                  className={`px-2 py-1 border text-[9px] font-bold ${getSeverityStyle(
                    selectedAlert.severity
                  )}`}
                >
                  {selectedAlert.severity}
                </span>

                <span
                  className={`px-2 py-1 border text-[9px] font-bold ${getStatusStyle(
                    selectedAlert.status
                  )}`}
                >
                  {selectedAlert.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 border border-[#D4AF37]/20">
                  <span className="text-[9px] text-gray-500 block mb-1">
                    INCIDENT RISK
                  </span>

                  <span className="text-2xl font-bold text-[#D4AF37]">
                    {selectedAlert.riskScore ?? '—'}
                  </span>

                  {selectedAlert.riskScore !== null &&
                    selectedAlert.riskScore !== undefined && (
                      <span className="text-xs text-gray-500">
                        /100
                      </span>
                    )}
                </div>

                <div className="p-4 border border-[#D4AF37]/20">
                  <span className="text-[9px] text-gray-500 block mb-1">
                    ACCOUNT RISK
                  </span>

                  <span className="text-2xl font-bold text-[#D4AF37]">
                    {selectedAlert.userRiskScore ?? '—'}
                  </span>

                  {selectedAlert.userRiskScore !== null &&
                    selectedAlert.userRiskScore !== undefined && (
                      <span className="text-xs text-gray-500">
                        /100
                      </span>
                    )}
                </div>
              </div>

              <div className="p-4 border border-[#D4AF37]/20 space-y-3">
                <div className="flex items-center gap-2 text-[#D4AF37]">
                  <UserRound className="w-4 h-4" />

                  <span className="font-mono text-xs">
                    EMPLOYEE
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-gray-500 block">
                      Name
                    </span>

                    <span>
                      {selectedAlert.employeeName || '—'}
                    </span>
                  </div>

                  <div>
                    <span className="text-gray-500 block">
                      Employee ID
                    </span>

                    <span>
                      {selectedAlert.employeeId || '—'}
                    </span>
                  </div>

                  <div>
                    <span className="text-gray-500 block">
                      Email
                    </span>

                    <span>
                      {selectedAlert.employeeEmail || '—'}
                    </span>
                  </div>

                  <div>
                    <span className="text-gray-500 block">
                      Department
                    </span>

                    <span>
                      {selectedAlert.department || '—'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-4 border border-[#D4AF37]/20">
                <span className="text-[9px] text-[#D4AF37] font-mono block mb-3">
                  ACCOUNT SECURITY STATE
                </span>

                <div className="flex items-center justify-between gap-4">
                  <div>
                    <span className="text-xs text-gray-500 block">
                      Current account status
                    </span>

                    <span
                      className={`font-mono text-sm font-bold ${
                        selectedAlert.accountStatus === 'FROZEN'
                          ? 'text-red-400'
                          : 'text-emerald-400'
                      }`}
                    >
                      {selectedAlert.accountStatus || 'UNKNOWN'}
                    </span>
                  </div>

                  {selectedAlert.userId &&
                    isAuthorized && (
                      selectedAlert.accountStatus ===
                      'FROZEN' ? (
                        <button
                          onClick={() =>
                            handleUnfreeze(
                              selectedAlert.userId
                            )
                          }
                          disabled={
                            updatingUserId ===
                            selectedAlert.userId
                          }
                          className="px-4 py-2 border border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10 text-xs font-mono flex items-center gap-2 disabled:opacity-50"
                        >
                          <Unlock className="w-4 h-4" />

                          {updatingUserId ===
                          selectedAlert.userId
                            ? 'UNFREEZING...'
                            : 'UNFREEZE ACCOUNT'}
                        </button>
                      ) : (
                        <button
                          onClick={() =>
                            handleFreeze(
                              selectedAlert.userId
                            )
                          }
                          disabled={
                            updatingUserId ===
                            selectedAlert.userId
                          }
                          className="px-4 py-2 border border-red-500/50 text-red-400 hover:bg-red-500/10 text-xs font-mono flex items-center gap-2 disabled:opacity-50"
                        >
                          <Lock className="w-4 h-4" />

                          {updatingUserId ===
                          selectedAlert.userId
                            ? 'FREEZING...'
                            : 'FREEZE ACCOUNT'}
                        </button>
                      )
                    )}
                </div>
              </div>

              {actionError && (
                <div className="p-3 border border-red-500/40 bg-red-500/5 text-red-400 text-xs font-mono flex gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0" />

                  <span>{actionError}</span>
                </div>
              )}

              <div className="p-4 border border-[#D4AF37]/20">
                <span className="text-[9px] text-[#D4AF37] font-mono block mb-2">
                  INCIDENT DESCRIPTION
                </span>

                <p className="text-xs leading-relaxed text-gray-300">
                  {selectedAlert.details}
                </p>
              </div>

              {selectedAlert.recommendedAction && (
                <div className="p-4 border border-[#D4AF37]/20">
                  <span className="text-[9px] text-[#D4AF37] font-mono block mb-2">
                    RECOMMENDED ACTION
                  </span>

                  <p className="text-xs">
                    {selectedAlert.recommendedAction}
                  </p>
                </div>
              )}

              {selectedAlert.contributingFactors.length >
                0 && (
                <div className="p-4 border border-[#D4AF37]/20">
                  <span className="text-[9px] text-[#D4AF37] font-mono block mb-3">
                    CONTRIBUTING FACTORS
                  </span>

                  <div className="space-y-2">
                    {selectedAlert.contributingFactors.map(
                      (factor, index) => (
                        <div
                          key={`${selectedAlert.id}-${index}`}
                          className="p-2 border border-[#D4AF37]/10 text-xs"
                        >
                          {factor}
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}

              <div className="p-4 border border-[#D4AF37]/20 text-xs font-mono space-y-2">
                <div className="flex justify-between gap-4">
                  <span className="text-gray-500">
                    Detected
                  </span>

                  <span>
                    {formatDate(
                      selectedAlert.detectedAt
                    )}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-500">
                    Risk Level
                  </span>

                  <span>
                    {selectedAlert.riskLevel || '—'}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-500">
                    Trust Score
                  </span>

                  <span>
                    {selectedAlert.trustScore ?? '—'}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-500">
                    Device
                  </span>

                  <span>
                    {selectedAlert.device || '—'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};