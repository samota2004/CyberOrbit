import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  ArrowUpDown, 
  ChevronLeft, 
  ChevronRight, 
  ShieldCheck, 
  Lock, 
  Unlock, 
  RotateCcw, 
  X,
  Sparkles,
  Laptop
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export const UsersPage = ({ users = [], devices = [], onRefreshData, onOpenCopilot }) => {
  const { isDark } = useTheme();

  // Search, Filter, Sort, Pagination States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [selectedRiskTier, setSelectedRiskTier] = useState('ALL');
  const [sortField, setSortField] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // Selected User Detail Drawer
  const [selectedUser, setSelectedUser] = useState(null);
  const [userDrawerOpen, setUserDrawerOpen] = useState(false);
  const [userDetails, setUserDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const departments = ['ALL', 'HR', 'Finance', 'Engineering', 'IT', 'Security', 'Sales', 'Marketing', 'Legal', 'Operations'];

  // Filtered and Sorted Users
  const processedUsers = useMemo(() => {
    let result = users.filter((u) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = 
        u.name?.toLowerCase().includes(q) ||
        u.employeeId?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q);

      const matchesDept = selectedDept === 'ALL' || u.department?.toUpperCase() === selectedDept.toUpperCase();

      const risk = u.currentRiskScore || 0;
      const matchesRisk = 
        selectedRiskTier === 'ALL' ||
        (selectedRiskTier === 'HIGH' && risk >= 60) ||
        (selectedRiskTier === 'MEDIUM' && risk >= 40 && risk < 60) ||
        (selectedRiskTier === 'LOW' && risk < 40);

      return matchesSearch && matchesDept && matchesRisk;
    });

    result.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (typeof valA === 'string') {
        valA = valA.toLowerCase();
        valB = valB.toLowerCase();
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [users, searchQuery, selectedDept, selectedRiskTier, sortField, sortOrder]);

  const totalPages = Math.ceil(processedUsers.length / pageSize) || 1;
  const paginatedUsers = processedUsers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const openUserDetails = async (user) => {
    setSelectedUser(user);
    setUserDrawerOpen(true);
    setLoadingDetails(true);
    try {
      const res = await fetch(`/api/users/${user.id}`);
      const data = await res.json();
      if (data.success) {
        setUserDetails(data);
      }
    } catch (err) {
      console.error('Failed to fetch user details', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleFreeze = async (userId) => {
    try {
      await fetch(`/api/users/${userId}/freeze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'SOC manual containment' })
      });
      if (onRefreshData) onRefreshData();
      if (selectedUser?.id === userId) {
        openUserDetails({ ...selectedUser, status: 'FROZEN' });
      }
    } catch (err) {
      console.error('Failed to freeze user', err);
    }
  };

  const handleUnfreeze = async (userId) => {
    try {
      await fetch(`/api/users/${userId}/unfreeze`, { method: 'POST' });
      if (onRefreshData) onRefreshData();
      if (selectedUser?.id === userId) {
        openUserDetails({ ...selectedUser, status: 'ACTIVE', currentRiskScore: 20, currentRiskLevel: 'LOW' });
      }
    } catch (err) {
      console.error('Failed to unfreeze user', err);
    }
  };

  const handleResetRisk = async (userId) => {
    try {
      await fetch(`/api/users/${userId}/reset-risk`, { method: 'POST' });
      if (onRefreshData) onRefreshData();
      if (selectedUser?.id === userId) {
        openUserDetails({ ...selectedUser, currentRiskScore: 15, currentRiskLevel: 'LOW', currentTrustScore: 95 });
      }
    } catch (err) {
      console.error('Failed to recalibrate risk', err);
    }
  };

  return (
    <div className="space-y-10">
      {/* Page Title & Context */}
      <div className={`p-8 sm:p-10 border border-[#D4AF37]/25 relative transition-colors ${
        isDark ? 'bg-black' : 'bg-white'
      }`}>
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-[10px] font-mono tracking-[0.25em] uppercase text-[#D4AF37] border border-[#D4AF37]/40 px-2.5 py-0.5">
                ENTERPRISE REGISTRY
              </span>
              <span className="text-[11px] font-mono text-gray-500">
                CONTINUOUS ACCESS DIRECTORY
              </span>
            </div>

            <h1 className="font-serif-display text-3xl sm:text-4xl lg:text-5xl font-light tracking-tight">
              Employee Directory &amp; Risk Posture
            </h1>
            <p className="text-xs text-gray-400 max-w-2xl mt-3 font-sans leading-relaxed">
              Real-time user identity inventory with dynamic UEBA risk scoring, Bayesian trust calculation, active session counts, and one-click containment actions.
            </p>
          </div>

          <div className="text-right font-mono text-xs">
            <span className="text-gray-500">TOTAL IDENTITIES: </span>
            <span className="text-[#D4AF37] font-bold">{users.length}</span>
          </div>
        </div>
      </div>

      {/* Filter, Search & Sort Controls */}
      <div className={`p-4 border border-[#D4AF37]/20 flex flex-col md:flex-row gap-4 items-center justify-between ${
        isDark ? 'bg-[#0A0C10]' : 'bg-white'
      }`}>
        {/* Search */}
        <div className="relative w-full md:w-80">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search employee, ID, or email..."
            className={`w-full border text-xs pl-9 pr-3 py-2 outline-none font-mono transition-all ${
              isDark 
                ? 'bg-black border-[#D4AF37]/30 text-white focus:border-[#D4AF37]' 
                : 'bg-[#F9F9F7] border-gray-300 text-black focus:border-[#D4AF37]'
            }`}
          />
          <Search className="w-3.5 h-3.5 text-[#D4AF37] absolute left-3 top-1/2 -translate-y-1/2" />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Department Filter */}
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-gray-400">DEPT:</span>
            <select
              value={selectedDept}
              onChange={(e) => {
                setSelectedDept(e.target.value);
                setCurrentPage(1);
              }}
              className={`border text-xs px-2.5 py-1.5 outline-none font-mono cursor-pointer ${
                isDark ? 'bg-black border-[#D4AF37]/30 text-white' : 'bg-white border-gray-300 text-black'
              }`}
            >
              {departments.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* Risk Tier Filter */}
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-gray-400">RISK TIER:</span>
            <select
              value={selectedRiskTier}
              onChange={(e) => {
                setSelectedRiskTier(e.target.value);
                setCurrentPage(1);
              }}
              className={`border text-xs px-2.5 py-1.5 outline-none font-mono cursor-pointer ${
                isDark ? 'bg-black border-[#D4AF37]/30 text-white' : 'bg-white border-gray-300 text-black'
              }`}
            >
              <option value="ALL">All Levels</option>
              <option value="HIGH">High (60+)</option>
              <option value="MEDIUM">Medium (40-59)</option>
              <option value="LOW">Safe (&lt;40)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Full-Width Sophisticated Table */}
      {/* Required Columns: PHOTO, EMPLOYEE, DEPARTMENT, RISK, TRUST, STATUS, LAST LOGIN, TRUST BADGE, ACTIVE SESSION */}
      <div className={`border border-[#D4AF37]/25 overflow-hidden ${
        isDark ? 'bg-black' : 'bg-white'
      }`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className={`border-b border-[#D4AF37]/25 font-mono text-[10px] uppercase tracking-[0.15em] ${
              isDark ? 'bg-[#0A0C10] text-[#D4AF37]' : 'bg-[#F9F9F7] text-[#B8860B]'
            }`}>
              <tr>
                <th className="py-3.5 px-4 w-12 text-center">PHOTO</th>
                <th 
                  className="py-3.5 px-4 cursor-pointer hover:text-current select-none"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center gap-1">
                    <span>EMPLOYEE</span>
                    <ArrowUpDown className="w-3 h-3 opacity-60" />
                  </div>
                </th>
                <th 
                  className="py-3.5 px-4 cursor-pointer hover:text-current select-none"
                  onClick={() => handleSort('department')}
                >
                  <div className="flex items-center gap-1">
                    <span>DEPARTMENT</span>
                    <ArrowUpDown className="w-3 h-3 opacity-60" />
                  </div>
                </th>
                <th 
                  className="py-3.5 px-4 cursor-pointer hover:text-current select-none text-center"
                  onClick={() => handleSort('currentRiskScore')}
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>RISK</span>
                    <ArrowUpDown className="w-3 h-3 opacity-60" />
                  </div>
                </th>
                <th 
                  className="py-3.5 px-4 cursor-pointer hover:text-current select-none text-center"
                  onClick={() => handleSort('currentTrustScore')}
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>TRUST</span>
                    <ArrowUpDown className="w-3 h-3 opacity-60" />
                  </div>
                </th>
                <th className="py-3.5 px-4">STATUS</th>
                <th className="py-3.5 px-4 font-mono">LAST LOGIN</th>
                <th className="py-3.5 px-4 text-center">TRUST BADGE</th>
                <th className="py-3.5 px-4 text-center">ACTIVE SESSION</th>
                <th className="py-3.5 px-4 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D4AF37]/15">
              {paginatedUsers.length > 0 ? (
                paginatedUsers.map((u) => {
                  const initials = u.name?.split(' ').map(n => n[0]).join('') || 'U';
                  const isHighRisk = (u.currentRiskScore || 0) >= 60;
                  const isFrozen = u.status === 'FROZEN';
                  const trustScore = u.currentTrustScore ?? 95;
                  const activeSessionsCount = devices.filter(d => d.userId === u.id).length || 1;

                  return (
                    <tr 
                      key={u.id}
                      className="hover:bg-[#D4AF37]/5 transition-colors duration-150 group"
                    >
                      {/* PHOTO */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="w-8 h-8 rounded-none border border-[#D4AF37]/40 flex items-center justify-center font-serif-display text-xs font-semibold text-[#D4AF37] bg-transparent mx-auto group-hover:border-[#D4AF37]">
                          {initials}
                        </div>
                      </td>

                      {/* EMPLOYEE */}
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => openUserDetails(u)}
                          className="font-serif-display text-sm font-medium hover:text-[#D4AF37] transition-colors text-left block"
                        >
                          {u.name}
                        </button>
                        <span className="text-[10px] font-mono text-gray-400 block">
                          {u.employeeId} • {u.email}
                        </span>
                      </td>

                      {/* DEPARTMENT */}
                      <td className="py-3.5 px-4">
                        <span className="font-mono text-xs">{u.department}</span>
                        <span className="text-[10px] font-mono text-gray-500 block">
                          {u.role?.replace('_', ' ')}
                        </span>
                      </td>

                      {/* RISK */}
                      <td className="py-3.5 px-4 text-center">
                        <span className={`font-mono text-xs font-bold px-2 py-0.5 border ${
                          isHighRisk
                            ? 'border-red-500 text-red-400 bg-red-500/10'
                            : (u.currentRiskScore || 0) >= 40
                              ? 'border-[#D4AF37] text-[#D4AF37] bg-[#D4AF37]/10'
                              : 'border-emerald-500 text-emerald-400 bg-emerald-500/10'
                        }`}>
                          {u.currentRiskScore ?? 15}
                        </span>
                      </td>

                      {/* TRUST */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="font-mono text-xs font-bold text-current">
                          {trustScore}
                        </span>
                        <span className="text-[10px] font-mono text-gray-500">/100</span>
                      </td>

                      {/* STATUS */}
                      <td className="py-3.5 px-4">
                        <span className={`text-[10px] font-mono px-2 py-0.5 border uppercase font-semibold ${
                          isFrozen
                            ? 'border-red-500 text-red-400 bg-red-500/10'
                            : u.status === 'RESTRICTED'
                              ? 'border-orange-500 text-orange-400'
                              : 'border-[#D4AF37]/40 text-[#D4AF37]'
                        }`}>
                          {u.status}
                        </span>
                      </td>

                      {/* LAST LOGIN */}
                      <td className="py-3.5 px-4 font-mono text-[11px] text-gray-400">
                        {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : 'Today'}
                      </td>

                      {/* TRUST BADGE */}
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-flex items-center gap-1 text-[9px] font-mono px-2 py-0.5 border ${
                          trustScore >= 85
                            ? 'border-[#D4AF37] text-[#D4AF37]'
                            : trustScore >= 60
                              ? 'border-gray-500 text-gray-400'
                              : 'border-red-500 text-red-400'
                        }`}>
                          <ShieldCheck className="w-3 h-3" />
                          <span>{trustScore >= 85 ? 'HIGH TRUST' : (trustScore >= 60 ? 'PROBATION' : 'AT RISK')}</span>
                        </span>
                      </td>

                      {/* ACTIVE SESSION */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center gap-1 text-xs font-mono text-gray-300">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          <span>{activeSessionsCount} active</span>
                        </span>
                      </td>

                      {/* ACTION */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openUserDetails(u)}
                            className="px-2.5 py-1 border border-[#D4AF37]/30 hover:border-[#D4AF37] text-[10px] font-mono text-[#D4AF37] transition-colors cursor-pointer"
                          >
                            INSPECT
                          </button>
                          {isFrozen ? (
                            <button
                              onClick={() => handleUnfreeze(u.id)}
                              className="px-2 py-1 border border-emerald-500 text-[10px] font-mono text-emerald-400 hover:bg-emerald-500/10 cursor-pointer"
                            >
                              UNFREEZE
                            </button>
                          ) : (
                            <button
                              onClick={() => handleFreeze(u.id)}
                              className="px-2 py-1 border border-red-500/50 text-[10px] font-mono text-red-400 hover:bg-red-500/10 cursor-pointer"
                            >
                              FREEZE
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
                    No employees match the specified filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className={`p-4 border-t border-[#D4AF37]/20 flex items-center justify-between font-mono text-xs ${
          isDark ? 'bg-[#0A0C10]' : 'bg-[#F9F9F7]'
        }`}>
          <span className="text-gray-400 text-[11px]">
            Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, processedUsers.length)} of {processedUsers.length} employees
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className={`p-1.5 border transition-colors cursor-pointer ${
                currentPage === 1
                  ? 'border-gray-500/20 text-gray-600 cursor-not-allowed'
                  : 'border-[#D4AF37]/30 text-[#D4AF37] hover:border-[#D4AF37]'
              }`}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            <span className="px-2 text-xs text-[#D4AF37]">
              {currentPage} / {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className={`p-1.5 border transition-colors cursor-pointer ${
                currentPage === totalPages
                  ? 'border-gray-500/20 text-gray-600 cursor-not-allowed'
                  : 'border-[#D4AF37]/30 text-[#D4AF37] hover:border-[#D4AF37]'
              }`}
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* User Detail Side Drawer */}
      {userDrawerOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs">
          <div className={`w-full max-w-lg h-full border-l border-[#D4AF37]/30 p-8 overflow-y-auto space-y-6 shadow-2xl ${
            isDark ? 'bg-black text-white' : 'bg-white text-black'
          }`}>
            <div className="flex items-center justify-between pb-4 border-b border-[#D4AF37]/20">
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#D4AF37]">
                IDENTITY INSPECTOR
              </span>
              <button
                onClick={() => setUserDrawerOpen(false)}
                className="text-gray-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Profile Summary */}
            <div>
              <div className="font-serif-display text-3xl font-light">{selectedUser.name}</div>
              <div className="text-xs font-mono text-gray-400 mt-1">
                {selectedUser.employeeId} • {selectedUser.department} • {selectedUser.email}
              </div>
            </div>

            {/* Scores */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 border border-[#D4AF37]/25">
                <span className="text-[9px] font-mono text-gray-400 uppercase tracking-widest block">TRUST SCORE</span>
                <div className="font-serif-display text-3xl text-current mt-1">
                  {selectedUser.currentTrustScore ?? 95} / 100
                </div>
              </div>
              <div className="p-4 border border-[#D4AF37]/25">
                <span className="text-[9px] font-mono text-gray-400 uppercase tracking-widest block">CURRENT RISK</span>
                <div className="font-serif-display text-3xl text-[#D4AF37] mt-1">
                  {selectedUser.currentRiskScore ?? 15} / 100
                </div>
              </div>
            </div>

            {/* Baseline Parameters */}
            <div className="p-5 border border-[#D4AF37]/20 space-y-2 text-xs font-mono">
              <span className="text-[10px] text-[#D4AF37] tracking-widest uppercase block mb-2">
                BEHAVIORAL BASELINES
              </span>
              <div className="flex justify-between text-gray-400">
                <span>Normal Hours:</span>
                <span className="text-current">09:00 - 18:00</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Avg Daily Downloads:</span>
                <span className="text-current">4 files / day</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Max Safe Volume:</span>
                <span className="text-current">500 MB</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Primary Office:</span>
                <span className="text-current">HQ Campus</span>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="space-y-3 pt-4 border-t border-[#D4AF37]/20">
              <span className="text-[10px] font-mono text-gray-400 tracking-widest uppercase block">
                SOC CONTAINMENT CONTROLS
              </span>

              <div className="grid grid-cols-2 gap-3">
                {selectedUser.status === 'FROZEN' ? (
                  <button
                    onClick={() => handleUnfreeze(selectedUser.id)}
                    className="py-2.5 border border-emerald-500 text-emerald-400 text-xs font-mono hover:bg-emerald-500/10 cursor-pointer"
                  >
                    UNFREEZE ACCOUNT
                  </button>
                ) : (
                  <button
                    onClick={() => handleFreeze(selectedUser.id)}
                    className="py-2.5 border border-red-500 text-red-400 text-xs font-mono hover:bg-red-500/10 cursor-pointer"
                  >
                    FREEZE ACCOUNT
                  </button>
                )}

                <button
                  onClick={() => handleResetRisk(selectedUser.id)}
                  className="py-2.5 border border-[#D4AF37]/40 hover:border-[#D4AF37] text-[#D4AF37] text-xs font-mono cursor-pointer"
                >
                  RECALIBRATE RISK
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
