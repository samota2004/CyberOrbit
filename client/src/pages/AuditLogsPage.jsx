import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  Download, 
  Calendar, 
  Lock, 
  ShieldCheck, 
  AlertCircle,
  FileSpreadsheet,
  FileText
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export const AuditLogsPage = ({ auditLogs = [], currentUser, onRefreshData }) => {
  const { isDark } = useTheme();

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [dateRange, setDateRange] = useState('7D'); // 24H, 7D, 30D, ALL
  const [exporting, setExporting] = useState(null);
  const [exportError, setExportError] = useState(null);

  const isAuthorized = !currentUser || currentUser.role === 'SECURITY_ADMIN' || currentUser.role === 'SYSTEM_ADMIN';

  // Enrich audit logs to guarantee USER, ACTION, DEVICE, TIME, POLICY DECISION, RISK, STATUS
  const enrichedLogs = useMemo(() => {
    return auditLogs.map((log) => {
      const userStr = log.userName || log.actorName || log.targetUserName || 'System Agent';
      const actionStr = log.action || 'POLICY_EVALUATION';
      const deviceStr = log.deviceName || (log.details && log.details.deviceName) || 'Corporate Host';
      const timeStr = log.timestamp ? new Date(log.timestamp).toLocaleString() : 'Recent';
      const policyDecision = log.policyDecision || (log.details && log.details.decision) || (log.severity === 'CRITICAL' ? 'FREEZE' : log.severity === 'HIGH' ? 'MFA_CHALLENGE' : 'ALLOW');
      const riskScore = log.riskScore ?? (log.details && log.details.riskScore) ?? (log.severity === 'CRITICAL' ? 88 : log.severity === 'HIGH' ? 65 : 20);
      const status = log.status || (log.severity === 'CRITICAL' ? 'ENFORCED' : 'RECORDED');

      return {
        id: log.id,
        user: userStr,
        action: actionStr,
        device: deviceStr,
        time: timeStr,
        policyDecision,
        risk: riskScore,
        status,
        category: log.category || 'POLICY',
        severity: log.severity || 'LOW',
        raw: log
      };
    });
  }, [auditLogs]);

  const filteredLogs = useMemo(() => {
    return enrichedLogs.filter((log) => {
      const q = search.toLowerCase();
      const matchesSearch = 
        log.user.toLowerCase().includes(q) ||
        log.action.toLowerCase().includes(q) ||
        log.device.toLowerCase().includes(q) ||
        log.policyDecision.toLowerCase().includes(q) ||
        log.id?.toLowerCase().includes(q);

      const matchesCat = categoryFilter === 'ALL' || log.category === categoryFilter;

      return matchesSearch && matchesCat;
    });
  }, [enrichedLogs, search, categoryFilter]);

  const handleExport = async (format) => {
    try {
      setExportError(null);
      setExporting(format);
      const params = new URLSearchParams();
      params.set('format', format);
      if (categoryFilter !== 'ALL') params.set('category', categoryFilter);
      if (search.trim()) params.set('search', search.trim());
      if (currentUser?.id) params.set('userId', currentUser.id);

      const res = await fetch(`/api/audit-logs/export?${params.toString()}`, {
        headers: {
          'x-user-id': currentUser?.id || ''
        }
      });

      if (!res.ok) {
        throw new Error(`Export failed with HTTP status ${res.status}`);
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `cyberorbit-audit-ledger-${dateStr}.${format}`;
      const downloadAnchor = document.createElement('a');
      downloadAnchor.href = url;
      downloadAnchor.download = filename;
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export audit logs:', err);
      setExportError(err.message || 'Failed to export audit log records.');
    } finally {
      setExporting(null);
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
                COMPLIANCE LEDGER
              </span>
              <span className="text-[11px] font-mono text-gray-500">
                TAMPER-EVIDENT AUDIT TRAIL
              </span>
            </div>

            <h1 className="font-serif-display text-3xl sm:text-4xl lg:text-5xl font-light tracking-tight">
              Security Audit Logs
            </h1>
            <p className="text-xs text-gray-400 max-w-2xl mt-3 font-sans leading-relaxed">
              Cryptographically timestamped record of every Zero Trust policy decision, authentication attempt, administrative intervention, and risk transition.
            </p>
          </div>

          {/* Export Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleExport('csv')}
              disabled={exporting !== null}
              className="px-4 py-2 border border-[#D4AF37]/40 hover:border-[#D4AF37] text-[#D4AF37] text-xs font-mono transition-colors cursor-pointer flex items-center gap-2"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>{exporting === 'csv' ? 'EXPORTING...' : 'EXPORT CSV'}</span>
            </button>
            <button
              onClick={() => handleExport('json')}
              disabled={exporting !== null}
              className="px-4 py-2 border border-[#D4AF37] bg-[#D4AF37] text-black hover:bg-transparent hover:text-[#D4AF37] text-xs font-mono font-semibold transition-all duration-300 cursor-pointer flex items-center gap-2"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{exporting === 'json' ? 'EXPORTING...' : 'EXPORT JSON'}</span>
            </button>
          </div>
        </div>
      </div>

      {exportError && (
        <div className="p-4 border border-red-500/50 bg-red-500/10 text-red-400 text-xs font-mono">
          {exportError}
        </div>
      )}

      {/* Filter, Search, Date Range Bar */}
      <div className={`p-4 border border-[#D4AF37]/20 flex flex-col md:flex-row gap-4 items-center justify-between ${
        isDark ? 'bg-[#0A0C10]' : 'bg-white'
      }`}>
        {/* Search */}
        <div className="relative w-full md:w-80">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search User, Action, Device, or Decision..."
            className={`w-full border text-xs pl-9 pr-3 py-2 outline-none font-mono transition-all ${
              isDark 
                ? 'bg-black border-[#D4AF37]/30 text-white focus:border-[#D4AF37]' 
                : 'bg-[#F9F9F7] border-gray-300 text-black focus:border-[#D4AF37]'
            }`}
          />
          <Search className="w-3.5 h-3.5 text-[#D4AF37] absolute left-3 top-1/2 -translate-y-1/2" />
        </div>

        {/* Filters & Date Range */}
        <div className="flex flex-wrap items-center gap-4 w-full md:w-auto text-xs font-mono">
          {/* Category Filter */}
          <div className="flex items-center gap-2">
            <span className="text-gray-400">CATEGORY:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className={`border text-xs px-2.5 py-1.5 outline-none font-mono cursor-pointer ${
                isDark ? 'bg-black border-[#D4AF37]/30 text-white' : 'bg-white border-gray-300 text-black'
              }`}
            >
              <option value="ALL">All Categories</option>
              <option value="SECURITY">Security</option>
              <option value="POLICY">Policy</option>
              <option value="AUTH">Authentication</option>
              <option value="ACCESS">Access Control</option>
              <option value="ADMIN">Administrative</option>
            </select>
          </div>

          {/* Date Range Selector */}
          <div className="flex items-center gap-2">
            <span className="text-gray-400">RANGE:</span>
            <div className="flex border border-[#D4AF37]/30">
              {['24H', '7D', '30D', 'ALL'].map((range) => (
                <button
                  key={range}
                  onClick={() => setDateRange(range)}
                  className={`px-2.5 py-1 text-[10px] font-mono cursor-pointer transition-colors ${
                    dateRange === range
                      ? 'bg-[#D4AF37] text-black font-semibold'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Professional Security Audit Table */}
      {/* Required Columns: USER, ACTION, DEVICE, TIME, POLICY DECISION, RISK, STATUS */}
      <div className={`border border-[#D4AF37]/25 overflow-hidden ${
        isDark ? 'bg-black' : 'bg-white'
      }`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className={`border-b border-[#D4AF37]/25 font-mono text-[10px] uppercase tracking-[0.15em] ${
              isDark ? 'bg-[#0A0C10] text-[#D4AF37]' : 'bg-[#F9F9F7] text-[#B8860B]'
            }`}>
              <tr>
                <th className="py-3.5 px-4">USER</th>
                <th className="py-3.5 px-4">ACTION</th>
                <th className="py-3.5 px-4">DEVICE</th>
                <th className="py-3.5 px-4 font-mono">TIME</th>
                <th className="py-3.5 px-4 text-center">POLICY DECISION</th>
                <th className="py-3.5 px-4 text-center">RISK</th>
                <th className="py-3.5 px-4 text-right">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D4AF37]/15 font-mono">
              {filteredLogs.length > 0 ? (
                filteredLogs.map((log) => {
                  const isHighRisk = log.risk >= 60;
                  const isCriticalDecision = log.policyDecision === 'FREEZE' || log.policyDecision === 'RESTRICT';

                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-[#D4AF37]/5 transition-colors duration-150 group"
                    >
                      {/* USER */}
                      <td className="py-3.5 px-4">
                        <span className="font-serif-display text-sm font-medium block">
                          {log.user}
                        </span>
                        <span className="text-[10px] text-gray-500">
                          {log.id.slice(0, 10)}
                        </span>
                      </td>

                      {/* ACTION */}
                      <td className="py-3.5 px-4 text-gray-300 text-[11px]">
                        {log.action}
                      </td>

                      {/* DEVICE */}
                      <td className="py-3.5 px-4 text-gray-400 text-[11px]">
                        {log.device}
                      </td>

                      {/* TIME */}
                      <td className="py-3.5 px-4 text-gray-400 text-[11px]">
                        {log.time}
                      </td>

                      {/* POLICY DECISION */}
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-block text-[10px] px-2 py-0.5 border font-semibold ${
                          isCriticalDecision
                            ? 'border-red-500 text-red-400 bg-red-500/10'
                            : log.policyDecision === 'MFA_CHALLENGE' || log.policyDecision === 'MONITOR'
                              ? 'border-[#D4AF37] text-[#D4AF37] bg-[#D4AF37]/10'
                              : 'border-emerald-500 text-emerald-400 bg-emerald-500/10'
                        }`}>
                          {log.policyDecision}
                        </span>
                      </td>

                      {/* RISK */}
                      <td className="py-3.5 px-4 text-center">
                        <span className={`font-bold text-xs ${
                          isHighRisk ? 'text-red-400' : 'text-[#D4AF37]'
                        }`}>
                          {log.risk}
                        </span>
                        <span className="text-[10px] text-gray-500">/100</span>
                      </td>

                      {/* STATUS */}
                      <td className="py-3.5 px-4 text-right">
                        <span className="text-[10px] text-gray-400 uppercase">
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xs font-mono text-gray-500">
                    No security audit logs match the query.
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
