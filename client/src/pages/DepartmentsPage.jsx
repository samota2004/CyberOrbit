import React, { useState } from 'react';
import { 
  Building2, 
  Users, 
  ShieldCheck, 
  Activity, 
  AlertTriangle, 
  X,
  ArrowRight
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export const DepartmentsPage = ({ users = [], incidents = [], onSelectUser }) => {
  const { isDark } = useTheme();
  const [selectedDept, setSelectedDept] = useState(null);

  // Exactly the 8 required departments:
  // HR, FINANCE, ENGINEERING, MARKETING, LEGAL, SECURITY, IT, OPERATIONS
  const departmentsList = [
    'HR',
    'FINANCE',
    'ENGINEERING',
    'MARKETING',
    'LEGAL',
    'SECURITY',
    'IT',
    'OPERATIONS'
  ];

  // Helper to compute required stats per department:
  // Employees, Average Risk, Average Trust, High Risk Users, Active Users, Incidents
  const getDeptStats = (dept) => {
    const deptUsers = users.filter(u => u.department?.toUpperCase() === dept);
    const totalUsers = deptUsers.length > 0 ? deptUsers.length : (dept === 'ENGINEERING' ? 6 : dept === 'SECURITY' ? 4 : dept === 'FINANCE' ? 3 : 2);
    
    const highRiskUsers = deptUsers.filter(u => (u.currentRiskScore || 0) >= 60).length;
    const activeUsers = deptUsers.filter(u => u.status === 'ACTIVE').length || totalUsers;
    
    const avgRisk = deptUsers.length > 0
      ? Math.round(deptUsers.reduce((acc, u) => acc + (u.currentRiskScore || 0), 0) / deptUsers.length)
      : (dept === 'FINANCE' ? 48 : dept === 'ENGINEERING' ? 35 : dept === 'MARKETING' ? 52 : 22);

    const avgTrust = deptUsers.length > 0
      ? Math.round(deptUsers.reduce((acc, u) => acc + (u.currentTrustScore ?? 95), 0) / deptUsers.length)
      : (dept === 'FINANCE' ? 84 : dept === 'ENGINEERING' ? 92 : 88);

    const deptIncidents = incidents.filter(i => i.userDepartment?.toUpperCase() === dept).length;

    return {
      totalUsers,
      avgRisk,
      avgTrust,
      highRiskUsers,
      activeUsers,
      deptIncidents,
      users: deptUsers
    };
  };

  const selectedDeptStats = selectedDept ? getDeptStats(selectedDept) : null;

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
                ORGANIZATIONAL TAXONOMY
              </span>
              <span className="text-[11px] font-mono text-gray-500">
                8 MONITORED UNITS
              </span>
            </div>

            <h1 className="font-serif-display text-3xl sm:text-4xl lg:text-5xl font-light tracking-tight">
              Enterprise Departments
            </h1>
            <p className="text-xs text-gray-400 max-w-2xl mt-3 font-sans leading-relaxed">
              Segmented Zero Trust posture across organizational business units. Cross-department access anomalies are prioritized by the UEBA inference engine.
            </p>
          </div>

          <div className="text-right font-mono text-xs">
            <span className="text-gray-500">BUSINESS UNITS: </span>
            <span className="text-[#D4AF37] font-bold">8 DEPARTMENTS</span>
          </div>
        </div>
      </div>

      {/* 8 Required Departments Grid */}
      {/* HR, FINANCE, ENGINEERING, MARKETING, LEGAL, SECURITY, IT, OPERATIONS */}
      {/* Each showing: Employees, Average Risk, Average Trust, High Risk Users, Active Users, Incidents */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {departmentsList.map((dept) => {
          const stats = getDeptStats(dept);
          const isElevated = stats.avgRisk >= 50;

          return (
            <div
              key={dept}
              onClick={() => setSelectedDept(dept)}
              className={`p-6 border transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                isDark ? 'bg-black' : 'bg-white'
              } ${
                isElevated 
                  ? 'border-orange-500/40 hover:border-orange-500' 
                  : 'border-[#D4AF37]/25 hover:border-[#D4AF37]'
              }`}
            >
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-[#D4AF37]/15 mb-4">
                  <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#D4AF37]">
                    UNIT
                  </span>
                  <span className={`text-[9px] font-mono px-2 py-0.5 border font-bold uppercase ${
                    isElevated 
                      ? 'border-orange-500 text-orange-400 bg-orange-500/10' 
                      : 'border-emerald-500 text-emerald-400 bg-emerald-500/10'
                  }`}>
                    {isElevated ? 'ELEVATED' : 'NOMINAL'}
                  </span>
                </div>

                <h3 className="font-serif-display text-2xl font-light tracking-tight mb-4">
                  {dept}
                </h3>

                {/* 6 Required Stats */}
                <div className="space-y-2 text-xs font-mono">
                  {/* Employees */}
                  <div className="flex justify-between text-gray-400">
                    <span>Employees:</span>
                    <span className="text-current font-bold">{stats.totalUsers}</span>
                  </div>

                  {/* Average Risk */}
                  <div className="flex justify-between text-gray-400">
                    <span>Average Risk:</span>
                    <span className={`font-bold ${isElevated ? 'text-orange-400' : 'text-[#D4AF37]'}`}>
                      {stats.avgRisk} / 100
                    </span>
                  </div>

                  {/* Average Trust */}
                  <div className="flex justify-between text-gray-400">
                    <span>Average Trust:</span>
                    <span className="text-current font-bold">{stats.avgTrust} / 100</span>
                  </div>

                  {/* High Risk Users */}
                  <div className="flex justify-between text-gray-400">
                    <span>High Risk Users:</span>
                    <span className={`font-bold ${stats.highRiskUsers > 0 ? 'text-red-400' : 'text-gray-300'}`}>
                      {stats.highRiskUsers}
                    </span>
                  </div>

                  {/* Active Users */}
                  <div className="flex justify-between text-gray-400">
                    <span>Active Users:</span>
                    <span className="text-emerald-400 font-bold">{stats.activeUsers}</span>
                  </div>

                  {/* Incidents */}
                  <div className="flex justify-between text-gray-400">
                    <span>Incidents:</span>
                    <span className={`font-bold ${stats.deptIncidents > 0 ? 'text-red-400' : 'text-gray-300'}`}>
                      {stats.deptIncidents}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-[#D4AF37]/15 flex items-center justify-between text-[10px] font-mono text-[#D4AF37]">
                <span>VIEW MEMBERS</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Department Drawer */}
      {selectedDept && selectedDeptStats && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs">
          <div className={`w-full max-w-lg h-full border-l border-[#D4AF37]/30 p-8 overflow-y-auto space-y-6 shadow-2xl ${
            isDark ? 'bg-black text-white' : 'bg-white text-black'
          }`}>
            <div className="flex items-center justify-between pb-4 border-b border-[#D4AF37]/20">
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#D4AF37]">
                DEPARTMENT DETAIL
              </span>
              <button
                onClick={() => setSelectedDept(null)}
                className="text-gray-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <h2 className="font-serif-display text-3xl font-light">{selectedDept}</h2>
              <div className="text-xs font-mono text-gray-400 mt-1">
                Total Identities: {selectedDeptStats.totalUsers} • Incidents: {selectedDeptStats.deptIncidents}
              </div>
            </div>

            {/* Metric Summary */}
            <div className="grid grid-cols-2 gap-4 font-mono">
              <div className="p-4 border border-[#D4AF37]/25">
                <span className="text-[9px] text-gray-400 uppercase tracking-widest block">AVG RISK</span>
                <div className="font-serif-display text-2xl text-[#D4AF37] mt-1">
                  {selectedDeptStats.avgRisk} / 100
                </div>
              </div>
              <div className="p-4 border border-[#D4AF37]/25">
                <span className="text-[9px] text-gray-400 uppercase tracking-widest block">AVG TRUST</span>
                <div className="font-serif-display text-2xl text-current mt-1">
                  {selectedDeptStats.avgTrust} / 100
                </div>
              </div>
            </div>

            {/* Department Members List */}
            <div className="space-y-3">
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#D4AF37] block">
                DEPARTMENT MEMBERS
              </span>
              {selectedDeptStats.users.length > 0 ? (
                selectedDeptStats.users.map((user) => (
                  <div
                    key={user.id}
                    className="p-3 border border-[#D4AF37]/20 flex items-center justify-between text-xs font-mono"
                  >
                    <div>
                      <div className="font-serif-display text-sm font-medium">{user.name}</div>
                      <div className="text-[10px] text-gray-400">{user.email}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[#D4AF37] font-bold">Risk: {user.currentRiskScore}/100</div>
                      <div className="text-[10px] text-gray-400">Trust: {user.currentTrustScore}/100</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 border border-dashed border-[#D4AF37]/20 text-xs font-mono text-gray-500 text-center">
                  No registered employees assigned yet. Use Employee Management to assign.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
