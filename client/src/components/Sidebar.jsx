import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  UserCheck,
  Users, 
  Building2, 
  Laptop, 
  Activity, 
  Sparkles, 
  ShieldAlert, 
  Shield, 
  BrainCircuit, 
  FileText, 
  FlaskConical, 
  Settings, 
  ChevronRight, 
  LogOut,
  X,
  UserCog
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export const Sidebar = ({ 
  activeTab, 
  onTabChange, 
  incidentCount = 0, 
  currentUser, 
  onLogout,
  mobileOpen = false,
  onCloseMobile
}) => {
  const { isDark } = useTheme();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleCollapsed = () => {
    setIsCollapsed(!isCollapsed);
  };

  const handleTabSelect = (tabId) => {
    if (onTabChange) {
      onTabChange(tabId);
    }

    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  const isCurrentUserAdmin =
    currentUser?.role === 'SECURITY_ADMIN' ||
    currentUser?.role === 'SYSTEM_ADMIN' ||
    currentUser?.roleCode === 'SECURITY_ADMIN' ||
    currentUser?.roleCode === 'SYSTEM_ADMIN';

  const navSections = [
    {
      title: 'Dashboard',
      items: [
        {
          id: 'dashboard',
          label: 'Admin Dashboard',
          icon: LayoutDashboard,
          badge: null
        },
        {
          id: 'employee-dashboard',
          label: 'Employee Dashboard',
          icon: UserCheck,
          badge: null
        }
      ]
    },
    {
      title: 'Security',
      items: [
        {
          id: 'risk-analysis',
          label: 'Risk Analysis',
          icon: Activity,
          badge: null
        },
        {
          id: 'xai',
          label: 'Explainable AI',
          icon: Sparkles,
          badge: 'XAI'
        },
        {
          id: 'devices',
          label: 'Device Trust',
          icon: Laptop,
          badge: null
        },
        {
          id: 'incidents',
          label: 'Alerts / Incidents',
          icon: ShieldAlert,
          badge: incidentCount > 0 ? incidentCount : null
        },
        {
          id: 'policies',
          label: 'Policy Engine',
          icon: Shield,
          badge: null
        }
      ]
    },
    {
      title: 'Monitoring',
      items: [
        {
          id: 'audit-logs',
          label: 'Audit Logs',
          icon: FileText,
          badge: null
        },
        ...(isCurrentUserAdmin
          ? [
              {
                id: 'admin-management',
                label: 'Admin Management',
                icon: UserCog,
                badge: null
              }
            ]
          : []),
        {
          id: 'employees',
          label: 'Employee Management',
          icon: Users,
          badge: null
        },
        {
          id: 'departments',
          label: 'Departments',
          icon: Building2,
          badge: null
        },
        {
          id: 'ml-analytics',
          label: 'ML Analytics',
          icon: BrainCircuit,
          badge: null
        },
        {
          id: 'simulator',
          label: 'Threat Simulator',
          icon: FlaskConical,
          badge: 'SIM'
        }
      ]
    },
    {
      title: 'System',
      items: [
        {
          id: 'settings',
          label: 'Settings',
          icon: Settings,
          badge: null
        }
      ]
    }
  ];

  const adminName = currentUser?.name || 'Alex Rivera';

  const adminRole =
    currentUser?.role === 'SECURITY_ADMIN' ||
    currentUser?.roleCode === 'SECURITY_ADMIN'
      ? 'SOC Lead'
      : currentUser?.role === 'SYSTEM_ADMIN' ||
        currentUser?.roleCode === 'SYSTEM_ADMIN'
        ? 'System Admin'
        : 'Security Analyst';

  const sidebarContent = (
    <aside 
      id="cyberorbit-sidebar" 
      className={`h-full border-r transition-all duration-300 flex flex-col z-30 shrink-0 select-none ${
        isDark
          ? 'bg-[#0E0E0E] border-[#2A2A2A] text-white'
          : 'bg-[#FFFFFF] border-[#E5E5E5] text-[#0E0E0E]'
      } ${isCollapsed ? 'w-20' : 'w-64'}`}
    >
      <div
        className={`p-4 border-b flex items-center justify-between ${
          isDark ? 'border-[#2A2A2A]' : 'border-[#E5E5E5]'
        }`}
      >
        {!isCollapsed ? (
          <button 
            id="btn-sidebar-dashboard"
            onClick={() => handleTabSelect('dashboard')}
            className="flex items-center gap-3 text-left group cursor-pointer"
            title="CyberOrbit Platform"
          >
            <div className="w-8 h-8 rounded-sm border border-[#C6A14A] bg-[#C6A14A]/10 flex items-center justify-center shrink-0 group-hover:border-[#C6A14A] transition-colors">
              <div className="w-2.5 h-2.5 rounded-full bg-[#C6A14A]" />
            </div>

            <div className="min-w-0">
              <div className="font-serif-display text-xl tracking-wider font-semibold leading-none text-current">
                CyberOrbit
              </div>

              <div className="text-[9px] font-mono text-[#C6A14A] tracking-wider uppercase mt-1">
                Zero Trust Security Platform
              </div>
            </div>
          </button>
        ) : (
          <button 
            onClick={() => handleTabSelect('dashboard')}
            className="w-8 h-8 rounded-sm border border-[#C6A14A] bg-[#C6A14A]/10 flex items-center justify-center mx-auto cursor-pointer"
            title="CyberOrbit Platform"
          >
            <div className="w-2.5 h-2.5 rounded-full bg-[#C6A14A]" />
          </button>
        )}

        {mobileOpen && (
          <button 
            onClick={onCloseMobile}
            className="md:hidden p-1 text-gray-400 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-4 custom-scrollbar">
        {navSections.map((section, sIdx) => (
          <div key={sIdx} className="space-y-1">
            {!isCollapsed ? (
              <div
                className={`text-[10px] font-mono px-3 pt-2 pb-1 uppercase tracking-[0.15em] font-medium ${
                  isDark ? 'text-[#6B6B6B]' : 'text-[#6B6B6B]'
                }`}
              >
                {section.title}
              </div>
            ) : (
              <div className="text-center text-[9px] text-[#6B6B6B] my-1">
                •••
              </div>
            )}

            {section.items.map((item) => {
              const Icon = item.icon;

              const isActive =
                activeTab === item.id ||
                (
                  item.id === 'employees' &&
                  (
                    activeTab === 'users' ||
                    activeTab === 'employee-mgmt'
                  )
                ) ||
                (
                  item.id === 'risk-analysis' &&
                  activeTab === 'ai-risk'
                );

              return (
                <button
                  key={item.id}
                  id={`nav-tab-${item.id}`}
                  onClick={() => handleTabSelect(item.id)}
                  title={isCollapsed ? item.label : undefined}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-mono rounded-sm transition-all duration-150 cursor-pointer ${
                    isActive
                      ? isDark
                        ? 'bg-[#C6A14A]/15 text-[#C6A14A] border-l-2 border-[#C6A14A] font-semibold'
                        : 'bg-[#C6A14A]/15 text-[#A98532] border-l-2 border-[#C6A14A] font-semibold'
                      : isDark
                        ? 'text-gray-300 hover:text-white hover:bg-white/5'
                        : 'text-gray-700 hover:text-black hover:bg-black/5'
                  } ${
                    isCollapsed
                      ? 'justify-center px-0'
                      : ''
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive
                        ? 'text-[#C6A14A]'
                        : 'opacity-70'
                    }`}
                  />

                  {!isCollapsed && (
                    <span className="flex-1 text-left truncate tracking-wide">
                      {item.label}
                    </span>
                  )}

                  {!isCollapsed && item.badge !== null && (
                    <span
                      className={`text-[8px] font-mono px-1.5 py-0.5 uppercase tracking-wider font-semibold border rounded-xs ${
                        isActive
                          ? 'border-[#C6A14A] text-[#C6A14A]'
                          : typeof item.badge === 'number'
                            ? 'border-red-500/40 text-red-500 bg-red-500/10'
                            : 'border-[#C6A14A]/40 text-[#C6A14A]'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      <div
        className={`p-3 border-t space-y-2 ${
          isDark
            ? 'border-[#2A2A2A]'
            : 'border-[#E5E5E5]'
        }`}
      >
        {!isCollapsed && (
          <div
            className={`p-2.5 border rounded-sm flex items-center justify-between text-xs ${
              isDark
                ? 'bg-[#141414] border-[#2A2A2A]'
                : 'bg-[#F7F4EC] border-[#E5E5E5]'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-sm border border-[#C6A14A] bg-[#C6A14A]/20 text-[#C6A14A] flex items-center justify-center font-mono font-bold text-[10px] shrink-0">
                {adminName
                  .split(' ')
                  .map(n => n[0])
                  .join('')
                  .slice(0, 2)}
              </div>

              <div className="min-w-0 truncate">
                <div className="font-semibold text-[11px] truncate leading-tight">
                  {adminName}
                </div>

                <div className="text-[9px] font-mono text-[#C6A14A] tracking-wider uppercase">
                  {adminRole}
                </div>
              </div>
            </div>

            {onLogout && (
              <button
                id="btn-sidebar-logout"
                onClick={onLogout}
                title="Logout"
                className="text-gray-400 hover:text-red-500 p-1 cursor-pointer transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        <button
          id="btn-sidebar-collapse"
          onClick={toggleCollapsed}
          className={`hidden md:flex w-full items-center justify-center gap-2 p-1.5 text-xs transition-colors cursor-pointer ${
            isDark
              ? 'text-gray-400 hover:text-[#C6A14A]'
              : 'text-gray-600 hover:text-[#C6A14A]'
          }`}
        >
          <ChevronRight
            className={`w-3.5 h-3.5 transition-transform duration-200 ${
              isCollapsed ? '' : 'rotate-180'
            }`}
          />

          {!isCollapsed && (
            <span className="text-[11px] font-mono uppercase tracking-wider">
              Collapse Sidebar
            </span>
          )}
        </button>
      </div>
    </aside>
  );

  return (
    <>
      <div className="hidden md:block h-full">
        {sidebarContent}
      </div>

      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div 
            className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />

          <div className="relative w-72 max-w-[80vw] h-full shadow-2xl">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};