import React, { useState } from 'react';
import { 
  Laptop, 
  Smartphone, 
  Search, 
  ShieldCheck, 
  ShieldAlert, 
  ShieldX,
  Filter,
  CheckCircle2,
  Lock
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export const DevicesPage = ({ devices = [], users = [], onRefreshData }) => {
  const { isDark } = useTheme();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [updatingId, setUpdatingId] = useState(null);

  // Link device to user if needed
  const enrichedDevices = devices.map((d) => {
    const user = users.find(u => u.id === d.userId);
    return {
      ...d,
      employeeName: user?.name || d.userName || 'Authorized Personnel',
      employeeId: user?.employeeId || 'EMP',
      browser: d.browser || 'Chrome 122 Enterprise',
      os: d.os || (d.deviceType === 'MOBILE' ? 'iOS 17.3' : 'macOS Sonoma 14.4'),
      activeSession: d.status === 'TRUSTED',
      lastUsed: d.lastSeenAt ? new Date(d.lastSeenAt).toLocaleString() : 'Just now'
    };
  });

  const filteredDevices = enrichedDevices.filter((d) => {
    const q = search.toLowerCase();
    const matchesSearch = 
      d.id?.toLowerCase().includes(q) ||
      d.deviceName?.toLowerCase().includes(q) ||
      d.employeeName?.toLowerCase().includes(q) ||
      d.ipAddress?.includes(q) ||
      d.os?.toLowerCase().includes(q);

    const matchesStatus = statusFilter === 'ALL' || d.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleToggleTrust = async (device) => {
    try {
      setUpdatingId(device.id);
      const newTrustState = !device.isTrusted;
      const newScore = newTrustState ? 95 : 25;
      await fetch(`/api/devices/${device.id}/trust`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isTrusted: newTrustState, trustScore: newScore })
      });
      if (onRefreshData) onRefreshData();
    } catch (err) {
      console.error('Failed to update device trust', err);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRevoke = async (deviceId) => {
    try {
      setUpdatingId(deviceId);
      await fetch(`/api/devices/${deviceId}/revoke`, { method: 'POST' });
      if (onRefreshData) onRefreshData();
    } catch (err) {
      console.error('Failed to revoke device', err);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-10">
      {/* Editorial Header */}
      <div className={`p-8 sm:p-10 border border-[#D4AF37]/25 relative transition-colors ${
        isDark ? 'bg-black' : 'bg-white'
      }`}>
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

          <div className="text-right font-mono text-xs">
            <span className="text-gray-500">REGISTERED ENDPOINTS: </span>
            <span className="text-[#D4AF37] font-bold">{devices.length} DEVICES</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className={`p-4 border border-[#D4AF37]/20 flex flex-col sm:flex-row gap-4 items-center justify-between ${
        isDark ? 'bg-[#0A0C10]' : 'bg-white'
      }`}>
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
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
          <span className="text-gray-400">TRUST STATUS:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={`border text-xs px-3 py-1.5 outline-none font-mono cursor-pointer ${
              isDark ? 'bg-black border-[#D4AF37]/30 text-white' : 'bg-white border-gray-300 text-black'
            }`}
          >
            <option value="ALL">All Endpoints</option>
            <option value="TRUSTED">Trusted Only</option>
            <option value="SUSPICIOUS">Suspicious</option>
            <option value="REVOKED">Revoked</option>
          </select>
        </div>
      </div>

      {/* Clean Table Design with Required Columns:
          Device ID, Employee, Browser, OS, IP, Trust Status, Trust Score, Last Used, Active Session */}
      <div className={`border border-[#D4AF37]/25 overflow-hidden ${
        isDark ? 'bg-black' : 'bg-white'
      }`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className={`border-b border-[#D4AF37]/25 font-mono text-[10px] uppercase tracking-[0.15em] ${
              isDark ? 'bg-[#0A0C10] text-[#D4AF37]' : 'bg-[#F9F9F7] text-[#B8860B]'
            }`}>
              <tr>
                <th className="py-3.5 px-4 font-mono">DEVICE ID</th>
                <th className="py-3.5 px-4">EMPLOYEE</th>
                <th className="py-3.5 px-4">BROWSER</th>
                <th className="py-3.5 px-4">OS</th>
                <th className="py-3.5 px-4 font-mono">IP</th>
                <th className="py-3.5 px-4 text-center">TRUST STATUS</th>
                <th className="py-3.5 px-4 text-center">TRUST SCORE</th>
                <th className="py-3.5 px-4 font-mono">LAST USED</th>
                <th className="py-3.5 px-4 text-center">ACTIVE SESSION</th>
                <th className="py-3.5 px-4 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D4AF37]/15 font-mono">
              {filteredDevices.length > 0 ? (
                filteredDevices.map((device) => {
                  const isTrusted = device.status === 'TRUSTED';
                  const isRevoked = device.status === 'REVOKED';
                  const isSuspicious = device.status === 'SUSPICIOUS';

                  return (
                    <tr
                      key={device.id}
                      className="hover:bg-[#D4AF37]/5 transition-colors duration-150 group"
                    >
                      {/* Device ID */}
                      <td className="py-3.5 px-4 text-xs font-semibold text-[#D4AF37]">
                        {device.id.slice(0, 12)}
                      </td>

                      {/* Employee */}
                      <td className="py-3.5 px-4 font-sans">
                        <span className="font-serif-display text-sm font-medium block">
                          {device.employeeName}
                        </span>
                        <span className="text-[10px] font-mono text-gray-500">
                          {device.deviceName}
                        </span>
                      </td>

                      {/* Browser */}
                      <td className="py-3.5 px-4 text-gray-400 text-[11px]">
                        {device.browser}
                      </td>

                      {/* OS */}
                      <td className="py-3.5 px-4 text-gray-300 text-[11px]">
                        {device.os}
                      </td>

                      {/* IP */}
                      <td className="py-3.5 px-4 text-gray-400 text-[11px]">
                        {device.ipAddress}
                      </td>

                      {/* Trust Status */}
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-block text-[10px] px-2 py-0.5 border font-semibold ${
                          isTrusted
                            ? 'border-[#D4AF37] text-[#D4AF37] bg-[#D4AF37]/10'
                            : isSuspicious
                              ? 'border-orange-500 text-orange-400 bg-orange-500/10'
                              : 'border-red-500 text-red-400 bg-red-500/10'
                        }`}>
                          {device.status}
                        </span>
                      </td>

                      {/* Trust Score */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="font-bold text-xs text-current">
                          {device.trustScore}
                        </span>
                        <span className="text-[10px] text-gray-500">/100</span>
                      </td>

                      {/* Last Used */}
                      <td className="py-3.5 px-4 text-gray-400 text-[11px]">
                        {device.lastUsed}
                      </td>

                      {/* Active Session */}
                      <td className="py-3.5 px-4 text-center">
                        {device.activeSession ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            <span>CONNECTED</span>
                          </span>
                        ) : (
                          <span className="text-gray-500 text-[11px]">IDLE</span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleToggleTrust(device)}
                            disabled={updatingId === device.id}
                            className={`px-2.5 py-1 border text-[10px] cursor-pointer transition-colors ${
                              isTrusted
                                ? 'border-orange-500/40 text-orange-400 hover:border-orange-500'
                                : 'border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37]/10'
                            }`}
                          >
                            {isTrusted ? 'UNTRUST' : 'TRUST'}
                          </button>

                          {!isRevoked && (
                            <button
                              onClick={() => handleRevoke(device.id)}
                              disabled={updatingId === device.id}
                              className="px-2 py-1 border border-red-500/40 text-red-400 hover:border-red-500 text-[10px] cursor-pointer transition-colors"
                            >
                              REVOKE
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-xs font-mono text-gray-500">
                    No devices match the specified query.
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
