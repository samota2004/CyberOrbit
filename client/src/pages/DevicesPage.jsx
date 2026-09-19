import React, { useEffect, useMemo, useState } from 'react';
import {
  Laptop,
  Smartphone,
  Search,
  RefreshCw,
  ShieldCheck,
  ShieldAlert,
  ShieldX
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export const DevicesPage = ({
  devices = [],
  users = [],
  onRefreshData
}) => {
  const { isDark } = useTheme();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [updatingId, setUpdatingId] = useState(null);
  const [localDevices, setLocalDevices] = useState(devices);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setLocalDevices(Array.isArray(devices) ? devices : []);
  }, [devices]);

  const refreshDevices = async () => {
    try {
      setRefreshing(true);
      setError('');

      if (onRefreshData) {
        await onRefreshData();
        return;
      }

      const response = await fetch('/api/devices');

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (!data?.success || !Array.isArray(data.devices)) {
        throw new Error(
          data?.error || 'Invalid device response from server'
        );
      }

      setLocalDevices(data.devices);
    } catch (err) {
      console.error('Failed to refresh devices:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to refresh devices'
      );
    } finally {
      setRefreshing(false);
    }
  };

  const enrichedDevices = useMemo(() => {
    return localDevices.map(device => {
      const user =
        users.find(user => user.id === device.userId) ||
        device.user ||
        null;

      return {
        ...device,
        employeeName:
          user?.name ??
          device.userName ??
          null,
        employeeId:
          user?.employeeId ??
          device.employeeId ??
          null,
        browser:
          device.browser ??
          device.browserName ??
          null,
        os:
          device.os ??
          device.operatingSystem ??
          null,
        ipAddress:
          device.ipAddress ??
          device.ip ??
          null,
        lastUsed:
          device.lastSeenAt ??
          device.lastUsed ??
          null,
        activeSession:
          typeof device.activeSession === 'boolean'
            ? device.activeSession
            : typeof device.isActive === 'boolean'
              ? device.isActive
              : null
      };
    });
  }, [localDevices, users]);

  const filteredDevices = useMemo(() => {
    const query = search.trim().toLowerCase();

    return enrichedDevices.filter(device => {
      const searchableValues = [
        device.id,
        device.deviceName,
        device.employeeName,
        device.employeeId,
        device.ipAddress,
        device.os,
        device.browser,
        device.status
      ];

      const matchesSearch =
        !query ||
        searchableValues.some(value =>
          String(value ?? '')
            .toLowerCase()
            .includes(query)
        );

      const matchesStatus =
        statusFilter === 'ALL' ||
        device.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [enrichedDevices, search, statusFilter]);

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

  const formatValue = value => {
    if (
      value === null ||
      value === undefined ||
      value === ''
    ) {
      return '—';
    }

    return String(value);
  };

  const formatTrustScore = value => {
    if (
      value === null ||
      value === undefined ||
      value === ''
    ) {
      return '—';
    }

    const numericValue = Number(value);

    if (!Number.isFinite(numericValue)) {
      return String(value);
    }

    return numericValue.toFixed(2);
  };

  const getStatusClass = status => {
    switch (status) {
      case 'TRUSTED':
        return 'border-[#D4AF37] text-[#D4AF37] bg-[#D4AF37]/10';

      case 'SUSPICIOUS':
        return 'border-orange-500 text-orange-400 bg-orange-500/10';

      case 'REVOKED':
        return 'border-red-500 text-red-400 bg-red-500/10';

      default:
        return 'border-gray-500 text-gray-400 bg-gray-500/5';
    }
  };

  const getStatusIcon = status => {
    switch (status) {
      case 'TRUSTED':
        return <ShieldCheck className="w-3.5 h-3.5" />;

      case 'SUSPICIOUS':
        return <ShieldAlert className="w-3.5 h-3.5" />;

      case 'REVOKED':
        return <ShieldX className="w-3.5 h-3.5" />;

      default:
        return null;
    }
  };

  const getDeviceIcon = device => {
    const type = String(
      device.deviceType ??
      device.type ??
      ''
    ).toUpperCase();

    if (
      type.includes('MOBILE') ||
      type.includes('PHONE') ||
      type.includes('TABLET')
    ) {
      return <Smartphone className="w-4 h-4" />;
    }

    return <Laptop className="w-4 h-4" />;
  };

  const handleToggleTrust = async device => {
    if (!device?.id) {
      return;
    }

    try {
      setUpdatingId(device.id);
      setError('');

      const newTrustState =
        device.isTrusted === true
          ? false
          : true;

      const response = await fetch(
        `/api/devices/${device.id}/trust`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            isTrusted: newTrustState
          })
        }
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.error ||
          data?.message ||
          `HTTP ${response.status}`
        );
      }

      if (data?.device) {
        setLocalDevices(current =>
          current.map(item =>
            item.id === device.id
              ? {
                  ...item,
                  ...data.device
                }
              : item
          )
        );
      }

      if (onRefreshData) {
        await onRefreshData();
      }
    } catch (err) {
      console.error(
        'Failed to update device trust:',
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : 'Failed to update device trust'
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRevoke = async deviceId => {
    if (!deviceId) {
      return;
    }

    try {
      setUpdatingId(deviceId);
      setError('');

      const response = await fetch(
        `/api/devices/${deviceId}/revoke`,
        {
          method: 'POST'
        }
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.error ||
          data?.message ||
          `HTTP ${response.status}`
        );
      }

      if (data?.device) {
        setLocalDevices(current =>
          current.map(device =>
            device.id === deviceId
              ? {
                  ...device,
                  ...data.device
                }
              : device
          )
        );
      }

      if (onRefreshData) {
        await onRefreshData();
      }
    } catch (err) {
      console.error(
        'Failed to revoke device:',
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : 'Failed to revoke device'
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const registeredCount = localDevices.length;

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
                ENDPOINT TELEMETRY
              </span>

              <span className="text-[11px] font-mono text-gray-500">
                HARDWARE POSTURE &amp; CERTIFICATE STATUS
              </span>
            </div>

            <h1 className="font-serif-display text-3xl sm:text-4xl lg:text-5xl font-light tracking-tight">
              Device Trust &amp; Hardware Registry
            </h1>

            <p className="text-xs text-gray-400 max-w-2xl mt-3 font-sans leading-relaxed">
              In CyberOrbit Zero Trust architecture, identity verification is conditional on verified endpoint health, hardware encryption status, and validated device trust scores.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={refreshDevices}
              disabled={refreshing}
              className={`p-2 border transition-colors ${
                isDark
                  ? 'border-[#D4AF37]/30 text-[#D4AF37] hover:border-[#D4AF37]'
                  : 'border-gray-300 text-gray-700 hover:border-[#D4AF37]'
              } disabled:opacity-50`}
              title="Refresh devices"
            >
              <RefreshCw
                className={`w-4 h-4 ${
                  refreshing
                    ? 'animate-spin'
                    : ''
                }`}
              />
            </button>

            <div className="text-right font-mono text-xs">
              <span className="text-gray-500">
                REGISTERED ENDPOINTS:{' '}
              </span>

              <span className="text-[#D4AF37] font-bold">
                {registeredCount} DEVICES
              </span>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="border border-red-500/40 bg-red-500/5 px-4 py-3 text-xs font-mono text-red-400">
          {error}
        </div>
      )}

      <div
        className={`p-4 border border-[#D4AF37]/20 flex flex-col sm:flex-row gap-4 items-center justify-between ${
          isDark ? 'bg-[#0A0C10]' : 'bg-white'
        }`}
      >
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            value={search}
            onChange={e =>
              setSearch(e.target.value)
            }
            placeholder="Search Device ID, Employee, IP, or OS..."
            className={`w-full border text-xs pl-9 pr-3 py-2 outline-none font-mono transition-all ${
              isDark
                ? 'bg-black border-[#D4AF37]/30 text-white focus:border-[#D4AF37]'
                : 'bg-[#F9F9F7] border-gray-300 text-black focus:border-[#D4AF37]'
            }`}
          />

          <Search className="w-3.5 h-3.5 text-[#D4AF37] absolute left-3 top-1/2 -translate-y-1/2" />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto text-xs font-mono">
          <span className="text-gray-400">
            TRUST STATUS:
          </span>

          <select
            value={statusFilter}
            onChange={e =>
              setStatusFilter(e.target.value)
            }
            className={`border text-xs px-3 py-1.5 outline-none font-mono cursor-pointer ${
              isDark
                ? 'bg-black border-[#D4AF37]/30 text-white'
                : 'bg-white border-gray-300 text-black'
            }`}
          >
            <option value="ALL">
              All Endpoints
            </option>

            <option value="TRUSTED">
              Trusted Only
            </option>

            <option value="SUSPICIOUS">
              Suspicious
            </option>

            <option value="REVOKED">
              Revoked
            </option>
          </select>
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
                <th className="py-3.5 px-4">
                  DEVICE ID
                </th>

                <th className="py-3.5 px-4">
                  EMPLOYEE
                </th>

                <th className="py-3.5 px-4">
                  BROWSER
                </th>

                <th className="py-3.5 px-4">
                  OS
                </th>

                <th className="py-3.5 px-4">
                  IP
                </th>

                <th className="py-3.5 px-4 text-center">
                  TRUST STATUS
                </th>

                <th className="py-3.5 px-4 text-center">
                  TRUST SCORE
                </th>

                <th className="py-3.5 px-4">
                  LAST USED
                </th>

                <th className="py-3.5 px-4 text-center">
                  ACTIVE SESSION
                </th>

                <th className="py-3.5 px-4 text-right">
                  ACTION
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#D4AF37]/15 font-mono">
              {filteredDevices.length > 0 ? (
                filteredDevices.map(device => {
                  const isTrusted =
                    device.status === 'TRUSTED';

                  const isRevoked =
                    device.status === 'REVOKED';

                  const isUpdating =
                    updatingId === device.id;

                  return (
                    <tr
                      key={device.id}
                      className="hover:bg-[#D4AF37]/5 transition-colors duration-150"
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="text-[#D4AF37]">
                            {getDeviceIcon(device)}
                          </span>

                          <div>
                            <div className="text-xs font-semibold text-[#D4AF37]">
                              {formatValue(device.id)}
                            </div>

                            {device.deviceName && (
                              <div className="text-[10px] text-gray-500 mt-0.5">
                                {device.deviceName}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-sans">
                        <span className="font-serif-display text-sm font-medium block">
                          {formatValue(
                            device.employeeName
                          )}
                        </span>

                        {device.employeeId && (
                          <span className="text-[10px] font-mono text-gray-500">
                            {device.employeeId}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-gray-400 text-[11px]">
                        {formatValue(
                          device.browser
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-gray-300 text-[11px]">
                        {formatValue(device.os)}
                      </td>

                      <td className="py-3.5 px-4 text-gray-400 text-[11px]">
                        {formatValue(
                          device.ipAddress
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1.5 text-[10px] px-2 py-0.5 border font-semibold ${getStatusClass(
                            device.status
                          )}`}
                        >
                          {getStatusIcon(
                            device.status
                          )}

                          {formatValue(
                            device.status
                          )}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className="font-bold text-xs">
                          {formatTrustScore(
                            device.trustScore
                          )}
                        </span>

                        {device.trustScore !==
                          null &&
                          device.trustScore !==
                            undefined &&
                          device.trustScore !==
                            '' && (
                            <span className="text-[10px] text-gray-500">
                              /100
                            </span>
                          )}
                      </td>

                      <td className="py-3.5 px-4 text-gray-400 text-[11px]">
                        {formatDate(
                          device.lastUsed
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        {device.activeSession ===
                        true ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            CONNECTED
                          </span>
                        ) : device.activeSession ===
                          false ? (
                          <span className="text-gray-500 text-[11px]">
                            IDLE
                          </span>
                        ) : (
                          <span className="text-gray-500 text-[11px]">
                            —
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              handleToggleTrust(
                                device
                              )
                            }
                            disabled={isUpdating}
                            className={`px-2.5 py-1 border text-[10px] cursor-pointer transition-colors disabled:opacity-50 ${
                              isTrusted
                                ? 'border-orange-500/40 text-orange-400 hover:border-orange-500'
                                : 'border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37]/10'
                            }`}
                          >
                            {isUpdating
                              ? 'UPDATING'
                              : isTrusted
                                ? 'UNTRUST'
                                : 'TRUST'}
                          </button>

                          {!isRevoked && (
                            <button
                              type="button"
                              onClick={() =>
                                handleRevoke(
                                  device.id
                                )
                              }
                              disabled={isUpdating}
                              className="px-2 py-1 border border-red-500/40 text-red-400 hover:border-red-500 text-[10px] cursor-pointer transition-colors disabled:opacity-50"
                            >
                              {isUpdating
                                ? 'UPDATING'
                                : 'REVOKE'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={10}
                    className="py-16 text-center"
                  >
                    <Laptop className="w-8 h-8 text-[#D4AF37] mx-auto mb-3" />

                    <div className="text-xs font-mono text-gray-500">
                      {localDevices.length ===
                      0
                        ? 'No registered devices found.'
                        : 'No devices match the specified query.'}
                    </div>

                    {localDevices.length ===
                      0 && (
                      <div className="text-[10px] font-mono text-gray-600 mt-2">
                        Device records will appear here when they are returned by the backend.
                      </div>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};