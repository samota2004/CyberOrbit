import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { CopilotModal } from './components/CopilotModal';
import { ShieldAlert, CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';
import { useTheme } from './context/ThemeContext';
import ResetPasswordPage from "./pages/ResetPasswordPage";
// Public Pages
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';

// Admin-Only Protected Pages
import { DashboardPage } from './pages/DashboardPage';
import { EmployeeDashboard } from './pages/EmployeeDashboard';
import { EmployeeManagementPage } from './pages/EmployeeManagementPage';
import { DepartmentsPage } from './pages/DepartmentsPage';
import { DevicesPage } from './pages/DevicesPage';
import { AiRiskAnalysisPage } from './pages/AiRiskAnalysisPage';
import { ExplainableAiPage } from './pages/ExplainableAiPage';
import { AlertsPage } from './pages/AlertsPage';
import { IncidentsPage } from './pages/IncidentsPage';
import { PoliciesPage } from './pages/PoliciesPage';
import { MlAnalyticsPage } from './pages/MlAnalyticsPage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { SimulatorPage } from './pages/SimulatorPage';
import { SettingsPage } from './pages/SettingsPage';

// Route helper functions
const pathToTab = (pathname) => {
  const clean = (pathname || '')
    .replace(/^\/+|\/+$/g, '')
    .toLowerCase();

  if (!clean) return 'landing';
  if (clean === 'login') return 'login';
  if (clean === 'reset-password') return 'reset-password';

  if (clean === 'dashboard') return 'dashboard';
  if (
    clean === 'employee-dashboard' ||
    clean === 'my-trust' ||
    clean === 'employee-portal' ||
    clean === 'trust-portal'
  ) {
    return 'employee-dashboard';
  }

  if (
    clean === 'employees' ||
    clean === 'employee-mgmt' ||
    clean === 'users'
  ) {
    return 'employees';
  }

  if (clean === 'departments') return 'departments';
  if (clean === 'devices') return 'devices';
  if (clean === 'risk-analysis' || clean === 'ai-risk') return 'risk-analysis';
  if (clean === 'xai') return 'xai';
  if (clean === 'alerts') return 'alerts';
  if (clean === 'incidents') return 'incidents';
  if (clean === 'policies') return 'policies';
  if (clean === 'ml-analytics') return 'ml-analytics';
  if (clean === 'audit-logs') return 'audit-logs';
  if (clean === 'simulator') return 'simulator';
  if (clean === 'settings') return 'settings';

  return 'landing';
};

const tabToPath = (tab) => {
  if (tab === 'landing') return '/';
  if (tab === 'login') return '/login';
  if (tab === 'reset-password') return '/reset-password';

  return `/${tab}`;
};

const pageTitles = {
  dashboard: 'SOC Executive Dashboard',
  'employee-dashboard': 'Employee Security & Trust Portal',
  employees: 'Employee Governance & Identities',
  departments: 'Department Risk Intelligence',
  devices: 'Managed Endpoint Hardware',
  'risk-analysis': 'AI Behavioral Risk Telemetry',
  xai: 'Explainable AI Attribution',
  alerts: 'Real-Time Detections & Alerts',
  incidents: 'Incident Response & Containment',
  policies: 'Zero Trust Policy Enforcement',
  'ml-analytics': 'ML Dual-Ensemble Analytics',
  'audit-logs': 'Cryptographic Forensic Logs',
  simulator: 'Threat Telemetry Simulator',
  settings: 'Administrator Preferences'
};

export default function App() {
  const { isDark } = useTheme();

  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    if (typeof window === 'undefined') return false;
    return Boolean(localStorage.getItem('zero_trust_token'));
  });

  // Routing State - defaults to landing on public access
  const [activeTab, setActiveTab] = useState(() => {
  if (typeof window === 'undefined') return 'landing';

  const initialPathTab = pathToTab(window.location.pathname);
  const authed = Boolean(localStorage.getItem('zero_trust_token'));

  if (!authed) {
    if (initialPathTab === 'login') return 'login';
    if (initialPathTab === 'reset-password') return 'reset-password';

    return 'landing';
  }

  if (initialPathTab === 'login') return 'dashboard';

  return initialPathTab;
});

  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Core Platform State
  const [users, setUsers] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [resources, setResources] = useState([]);
  const [devices, setDevices] = useState([]);
  const [accessRequests, setAccessRequests] = useState([]);
  const [recentEvents, setRecentEvents] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [stats, setStats] = useState(null);

  // Real-Time SSE Stream State
  const [sseStatus, setSseStatus] = useState('RECONNECTING');
  const [sseEventCount, setSseEventCount] = useState(0);
  const [liveToast, setLiveToast] = useState(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Auto-dismiss toast
  useEffect(() => {
    if (!liveToast) return;
    const timer = setTimeout(() => setLiveToast(null), 6000);
    return () => clearTimeout(timer);
  }, [liveToast]);

  // Active Administrator Persona - Alex Rivera (SOC Lead)
  const [currentUserId, setCurrentUserId] = useState('user-001');

  // Copilot Modal State
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [copilotContext, setCopilotContext] = useState(undefined);

  // Navigation controller ensuring route protection & URL synchronization
  const handleNavigate = useCallback((tab) => {
  const authed = Boolean(localStorage.getItem('zero_trust_token'));
  let targetTab = tab;

  if (!authed) {
    if (
      tab !== 'landing' &&
      tab !== 'login' &&
      tab !== 'reset-password'
    ) {
      targetTab = 'landing';
    }
  } else {
    if (tab === 'login' || tab === 'reset-password') {
      targetTab = tab === 'reset-password'
        ? 'reset-password'
        : 'dashboard';
    }
  }

  setActiveTab(targetTab);

  const targetPath = tabToPath(targetTab);

  if (
    typeof window !== 'undefined' &&
    window.location.pathname !== targetPath
  ) {
    window.history.pushState({}, '', targetPath);
  }
}, []);

  // Handle browser back/forward buttons
  useEffect(() => {
  const handlePopState = () => {
    const pathTab = pathToTab(window.location.pathname);
    const authed = Boolean(localStorage.getItem('zero_trust_token'));

    if (!authed) {
      if (pathTab === 'login') {
        setActiveTab('login');
      } else if (pathTab === 'reset-password') {
        setActiveTab('reset-password');
      } else {
        setActiveTab('landing');

        if (window.location.pathname !== '/') {
          window.history.replaceState({}, '', '/');
        }
      }
    } else {
      if (pathTab === 'login') {
        setActiveTab('dashboard');
        window.history.replaceState({}, '', '/dashboard');
      } else if (pathTab === 'reset-password') {
        setActiveTab('reset-password');
      } else {
        setActiveTab(pathTab);
      }
    }
  };

  window.addEventListener('popstate', handlePopState);

  return () => {
    window.removeEventListener('popstate', handlePopState);
  };
}, []);

  // Enforce route protection on initial mount
  useEffect(() => {
  const authed = Boolean(localStorage.getItem('zero_trust_token'));
  const currentTab = pathToTab(window.location.pathname);

  if (
    !authed &&
    currentTab !== 'landing' &&
    currentTab !== 'login' &&
    currentTab !== 'reset-password'
  ) {
    handleNavigate('landing');
  } else if (authed && currentTab === 'login') {
    handleNavigate('dashboard');
  }
}, [handleNavigate]);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('zero_trust_token');
    localStorage.removeItem('zero_trust_user');
    sessionStorage.clear();
    setIsAuthenticated(false);
    handleNavigate('landing');
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', '/');
    }
  }, [handleNavigate]);

  const handleLoginSuccess = useCallback((user) => {
    if (user?.id) setCurrentUserId(user.id);
    setIsAuthenticated(true);
    if (user?.role === 'EMPLOYEE') {
      handleNavigate('employee-dashboard');
    } else {
      handleNavigate('dashboard');
    }
  }, [handleNavigate]);

  // Safe JSON fetch helper with JWT Authorization header
  const safeFetchJson = async (url, options) => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('zero_trust_token') : null;
      const headers = new Headers(options?.headers || {});
      if (token && !headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      if (currentUserId && !headers.has('x-user-id')) {
        headers.set('x-user-id', currentUserId);
      }
      const res = await fetch(url, { ...options, headers });
      if (!res.ok) return { success: false, error: `HTTP ${res.status}` };
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await res.json();
      }
      return { success: false, error: 'Non-JSON response' };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  };

  const fetchAllData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [
        usersRes, 
        incidentsRes, 
        resourcesRes, 
        devicesRes, 
        requestsRes, 
        eventsRes, 
        logsRes, 
        statsRes
      ] = await Promise.all([
        safeFetchJson('/api/users'),
        safeFetchJson('/api/incidents'),
        safeFetchJson('/api/resources'),
        safeFetchJson('/api/devices'),
        safeFetchJson('/api/access-requests'),
        safeFetchJson('/api/events'),
        safeFetchJson('/api/audit-logs'),
        safeFetchJson('/api/stats')
      ]);

      if (usersRes?.success && usersRes.users) setUsers(usersRes.users);
      if (incidentsRes?.success && incidentsRes.incidents) setIncidents(incidentsRes.incidents);
      if (resourcesRes?.success && resourcesRes.resources) setResources(resourcesRes.resources);
      if (devicesRes?.success && devicesRes.devices) setDevices(devicesRes.devices);
      if (requestsRes?.success && requestsRes.requests) setAccessRequests(requestsRes.requests);
      if (eventsRes?.success && eventsRes.events) setRecentEvents(eventsRes.events);
      if (logsRes?.success && logsRes.logs) setAuditLogs(logsRes.logs);
      if (statsRes?.success && statsRes.stats) setStats(statsRes.stats);
    } catch (err) {
      console.error('Failed to sync SOC telemetry state:', err);
    } finally {
      setIsRefreshing(false);
      setLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Real-Time Server-Sent Events (SSE) Stream Integration
  useEffect(() => {
    let eventSource = null;
    let retryCount = 0;
    let retryTimeout = null;
    let isUnmounted = false;

    const connectSSE = () => {
      if (isUnmounted) return;
      try {
        eventSource = new EventSource('/api/events/stream');

        eventSource.onopen = () => {
          if (isUnmounted) return;
          setSseStatus('LIVE');
          retryCount = 0;
        };

        eventSource.onmessage = (e) => {
          if (isUnmounted) return;
          try {
            const payload = JSON.parse(e.data);
            if (!payload || !payload.type) return;

            if (payload.type === 'HEARTBEAT') {
              setSseStatus('LIVE');
              return;
            }

            setSseEventCount((prev) => prev + 1);

            switch (payload.type) {
              case 'CONNECTED':
                setSseStatus('LIVE');
                break;
              case 'ACTIVITY_EVENT': {
                const ev = payload.data?.event || payload.data;
                if (ev && ev.id) {
                  setRecentEvents((prev) => {
                    const exists = prev.some((x) => x.id === ev.id);
                    if (exists) return prev;
                    return [ev, ...prev].slice(0, 50);
                  });
                }
                break;
              }
              case 'TELEMETRY_INGESTED': {
                const ev = payload.data?.event;
                if (ev && ev.id) {
                  setRecentEvents((prev) => {
                    const filtered = prev.filter((x) => x.id !== ev.id);
                    return [ev, ...filtered].slice(0, 50);
                  });
                  setLiveToast({
                    id: `toast-${Date.now()}`,
                    title: `Telemetry: ${ev.eventType || 'Event Ingested'}`,
                    message: `Risk ${payload.data.riskScore || ev.riskContribution} (${payload.data.riskLevel || 'EVALUATED'}) • Action: ${payload.data.decision || 'ALLOW'}`,
                    type: (payload.data.riskScore || 0) >= 75 ? 'danger' : ((payload.data.riskScore || 0) >= 50 ? 'warning' : 'info'),
                    timestamp: new Date().toLocaleTimeString()
                  });
                }
                break;
              }
              case 'POLICY_DECISION': {
                const dec = payload.data;
                if (dec && (dec.decision === 'FREEZE' || dec.decision === 'RESTRICT' || dec.requiresMfa)) {
                  setLiveToast({
                    id: `toast-${Date.now()}`,
                    title: `Zero Trust Policy: ${dec.decision}`,
                    message: `${dec.reason || `Action enforced for ${dec.userId}`}`,
                    type: dec.decision === 'FREEZE' ? 'danger' : 'warning',
                    timestamp: new Date().toLocaleTimeString()
                  });
                }
                break;
              }
              case 'CONTAINMENT_ACTION': {
                const cont = payload.data;
                if (cont) {
                  setLiveToast({
                    id: `toast-${Date.now()}`,
                    title: `Containment: ${cont.action}`,
                    message: `${cont.reason || 'Automated Zero Trust containment active'}`,
                    type: 'danger',
                    timestamp: new Date().toLocaleTimeString()
                  });
                }
                break;
              }
              case 'INCIDENT_CREATED':
              case 'NEW_INCIDENT': {
                const inc = payload.data?.incident || payload.data;
                if (inc && inc.id) {
                  setIncidents((prev) => {
                    const filtered = prev.filter((x) => x.id !== inc.id);
                    return [inc, ...filtered];
                  });
                  setLiveToast({
                    id: `toast-${Date.now()}`,
                    title: `Security Incident: ${inc.title || inc.eventType}`,
                    message: `${inc.userName} • Score: ${inc.riskScore} • ${inc.severity}`,
                    type: 'danger',
                    timestamp: new Date().toLocaleTimeString()
                  });
                }
                break;
              }
              case 'INCIDENT_RESOLVED': {
                const inc = payload.data?.incident || payload.data;
                if (inc && inc.id) {
                  setIncidents((prev) => prev.map((i) => (i.id === inc.id ? { ...i, ...inc, status: 'RESOLVED' } : i)));
                }
                break;
              }
              case 'RISK_SCORE_CHANGED':
                if (payload.data) {
                  setUsers((prev) => prev.map((u) => u.id === payload.data.userId
                    ? {
                      ...u,
                      currentRiskScore: payload.data.riskScore,
                      currentRiskLevel: payload.data.riskLevel || u.currentRiskLevel
                    }
                    : u));
                }
                break;
              case 'TRUST_SCORE_CHANGED':
                if (payload.data) {
                  setUsers((prev) => prev.map((u) => u.id === payload.data.userId
                    ? { ...u, currentTrustScore: payload.data.trustScore }
                    : u));
                }
                break;
              case 'ACCOUNT_STATUS_CHANGED':
                if (payload.data) {
                  setUsers((prev) => prev.map((u) => u.id === payload.data.userId
                    ? { ...u, status: payload.data.status }
                    : u));
                }
                break;
              case 'USER_UPDATED':
                if (payload.data?.user) {
                  setUsers((prev) => prev.map((u) => (u.id === payload.data.user.id ? { ...u, ...payload.data.user } : u)));
                }
                break;
              case 'DEVICE_UPDATED':
              case 'DEVICE_REVOKED': {
                const dev = payload.data?.device || payload.data;
                if (dev && dev.id) {
                  setDevices((prev) => prev.map((d) => (d.id === dev.id ? { ...d, ...dev } : d)));
                }
                break;
              }
              case 'AUDIT_LOG_ENTRY':
              case 'AUDIT_LOG': {
                const log = payload.data?.entry || payload.data;
                if (log && log.id) {
                  setAuditLogs((prev) => [log, ...prev].slice(0, 100));
                }
                break;
              }
              default:
                break;
            }
          } catch (err) {
            console.error('Failed to parse SSE message:', err);
          }
        };

        eventSource.onerror = () => {
          if (isUnmounted) return;
          eventSource?.close();
          eventSource = null;
          retryCount++;
          if (retryCount <= 4) {
            setSseStatus('RECONNECTING');
            retryTimeout = setTimeout(connectSSE, Math.min(1000 * Math.pow(2, retryCount), 10000));
          } else {
            setSseStatus('FALLBACK');
            retryTimeout = setTimeout(connectSSE, 30000);
          }
        };
      } catch (e) {
        setSseStatus('FALLBACK');
      }
    };

    connectSSE();

    return () => {
      isUnmounted = true;
      if (retryTimeout) clearTimeout(retryTimeout);
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
    };
  }, [fetchAllData]);

  // Fallback Polling
  useEffect(() => {
    const pollInterval = sseStatus === 'LIVE' ? 45000 : 15000;
    const interval = setInterval(() => {
      fetchAllData();
    }, pollInterval);
    return () => clearInterval(interval);
  }, [fetchAllData, sseStatus]);

  const currentUser = users.find(u => u.id === currentUserId) || users[0] || {
    id: 'user-001',
    employeeId: 'EMP001',
    name: 'Alex Rivera',
    email: 'alex.rivera@cyberorbit.corp',
    department: 'Security',
    role: 'SECURITY_ADMIN',
    currentRiskScore: 12,
    currentRiskLevel: 'LOW',
    currentTrustScore: 98,
    status: 'ACTIVE'
  };

  const handleOpenCopilot = (context) => {
    setCopilotContext(context);
    setCopilotOpen(true);
  };

  const handleFreezeUser = async (userId) => {
    try {
      await fetch(`/api/users/${userId}/freeze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'SOC manual containment override' })
      });
      fetchAllData();
    } catch (err) {
      console.error('Failed to freeze user', err);
    }
  };

  const handleUnfreezeUser = async (userId) => {
    try {
      await fetch(`/api/users/${userId}/unfreeze`, { method: 'POST' });
      fetchAllData();
    } catch (err) {
      console.error('Failed to unfreeze user', err);
    }
  };

  const handleAddUser = (newUserData) => {
    const newUser = {
      id: `user-${Date.now()}`,
      employeeId: newUserData.employeeId || `EMP${users.length + 1}`,
      name: newUserData.name || 'New Employee',
      email: newUserData.email || 'employee@cyberorbit.corp',
      department: newUserData.department || 'Engineering',
      role: newUserData.role || 'EMPLOYEE',
      currentRiskScore: 15,
      currentRiskLevel: 'LOW',
      currentTrustScore: 98,
      status: newUserData.status || 'ACTIVE',
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString()
    };
    setUsers(prev => [newUser, ...prev]);
  };

  const handleUpdateUser = (userId, updates) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...updates } : u));
  };

  const handleDeleteUser = (userId) => {
    setUsers(prev => prev.filter(u => u.id !== userId));
  };

// 1. PUBLIC LANDING PAGE
if (activeTab === 'landing') {
  return (
    <LandingPage
      onLogin={() => handleNavigate('login')}
      onNavigateToLogin={() => handleNavigate('login')}
    />
  );
}
  // 2. PUBLIC ADMIN-ONLY LOGIN & MFA PAGE
  if (activeTab === 'login') {
    return (
      <LoginPage 
        users={users} 
        onLoginSuccess={handleLoginSuccess} 
        onBackToHome={() => handleNavigate('landing')}
      />
    );
  }
  // 3. PUBLIC RESET PASSWORD PAGE
if (activeTab === 'reset-password') {
  return <ResetPasswordPage />;
}

  // If user is unauthenticated, redirect to LandingPage
  if (!isAuthenticated) {
    return (
      <LandingPage 
        onLogin={() => handleNavigate('login')}
        onNavigateToLogin={() => handleNavigate('login')}
      />
    );
  }

  return (
    <div className={`min-h-screen flex flex-col md:flex-row overflow-hidden font-['Plus_Jakarta_Sans',sans-serif] ${
      isDark ? 'bg-[#07080A] text-[#F4F4F6]' : 'bg-[#F9F9F7] text-[#111317]'
    }`}>
      {/* Left Navigation Sidebar - Admin Only */}
      <Sidebar 
        activeTab={activeTab} 
        onTabChange={(tab) => {
          if (tab === 'copilot') {
            handleOpenCopilot();
          } else {
            handleNavigate(tab);
          }
        }} 
        incidentCount={incidents.filter(i => i.status !== 'RESOLVED').length} 
        currentUser={currentUser} 
        onLogout={handleLogout}
        mobileOpen={mobileNavOpen}
        onCloseMobile={() => setMobileNavOpen(false)}
      />

      {/* Main Admin App Layout */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Clean Executive Top Bar */}
        <TopBar 
          currentUser={currentUser}
          currentPageTitle={pageTitles[activeTab] || 'Administrator Portal'}
          onOpenCopilot={() => handleOpenCopilot()}
          onRefreshData={fetchAllData}
          isRefreshing={isRefreshing}
          onLogout={handleLogout}
          onToggleMobileNav={() => setMobileNavOpen(prev => !prev)}
        />

        {/* Live Event Floating Toast Notification */}
        {liveToast && (
          <div className="absolute bottom-6 right-6 z-50 max-w-md w-full animate-in slide-in-from-bottom-5 fade-in duration-300">
            <div className={`p-4 border shadow-2xl flex items-start gap-3 ${
              liveToast.type === 'danger'
                ? 'bg-red-950/95 border-red-500/50 text-red-100 shadow-red-950/50'
                : liveToast.type === 'warning'
                  ? 'bg-amber-950/95 border-amber-500/50 text-amber-100 shadow-amber-950/50'
                  : 'bg-emerald-950/95 border-emerald-500/50 text-emerald-100 shadow-emerald-950/50'
            } backdrop-blur-md`}>
              <div className="mt-0.5">
                {liveToast.type === 'danger' && <ShieldAlert className="w-5 h-5 text-red-400" />}
                {liveToast.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-400" />}
                {liveToast.type !== 'danger' && liveToast.type !== 'warning' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
              </div>

              <div className="flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider">{liveToast.title}</h4>
                  <span className="text-[10px] font-mono opacity-60">{liveToast.timestamp}</span>
                </div>
                <p className="text-xs mt-1 opacity-90">{liveToast.message}</p>
              </div>

              <button 
                onClick={() => setLiveToast(null)} 
                className="text-gray-400 hover:text-white p-1 hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Scrollable Page Body */}
        <main 
          id="cyberorbit-main-content" 
          className={`flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 transition-colors ${
            isDark ? 'bg-[#07080A]' : 'bg-[#F9F9F7]'
          }`}
        >
          <div className="max-w-7xl mx-auto">
            {/* 1. Dashboard */}
            {activeTab === 'dashboard' && (
              <DashboardPage 
                users={users} 
                incidents={incidents} 
                recentEvents={recentEvents} 
                onSelectUser={(userId) => {
                  setCurrentUserId(userId);
                  handleNavigate('employees');
                }} 
                onSelectIncident={() => {
                  handleNavigate('incidents');
                }} 
                onNavigateToSimulator={() => handleNavigate('simulator')} 
                onNavigateToCopilot={() => handleOpenCopilot()} 
                onFreezeUser={handleFreezeUser} 
                onUnfreezeUser={handleUnfreezeUser}
              />
            )}

            {/* 1b. Employee Security & Trust Portal */}
            {activeTab === 'employee-dashboard' && (
              <EmployeeDashboard 
                currentUser={currentUser}
                events={recentEvents}
                devices={devices}
                onOpenAccessRequestModal={() => handleNavigate('policies')}
              />
            )}

            {/* 2. Employees */}
            {activeTab === 'employees' && (
              <EmployeeManagementPage 
                users={users} 
                onAddUser={handleAddUser} 
                onUpdateUser={handleUpdateUser} 
                onDeleteUser={handleDeleteUser} 
                onFreezeUser={handleFreezeUser} 
                onUnfreezeUser={handleUnfreezeUser}
              />
            )}

            {/* 3. Departments */}
            {activeTab === 'departments' && (
              <DepartmentsPage 
                users={users} 
                incidents={incidents} 
                onSelectUser={(userId) => {
                  setCurrentUserId(userId);
                  handleNavigate('employees');
                }}
              />
            )}

            {/* 4. Devices */}
            {activeTab === 'devices' && (
              <DevicesPage 
                devices={devices} 
                users={users} 
                onRefreshData={fetchAllData}
              />
            )}

            {/* 5. Risk Analysis */}
            {activeTab === 'risk-analysis' && (
              <AiRiskAnalysisPage 
                users={users} 
                events={recentEvents} 
                selectedUserId={currentUserId} 
                onSelectUser={(userId) => setCurrentUserId(userId)}
              />
            )}

            {/* 6. Explainable AI */}
            {activeTab === 'xai' && (
              <ExplainableAiPage 
                users={users} 
                events={recentEvents} 
                incidents={incidents} 
                onSelectUser={(userId) => {
                  setCurrentUserId(userId);
                  handleNavigate('risk-analysis');
                }}
              />
            )}

            {/* 7. Alerts */}
            {activeTab === 'alerts' && (
              <AlertsPage 
                users={users} 
                events={recentEvents} 
                incidents={incidents} 
                onSelectUser={(userId) => {
                  setCurrentUserId(userId);
                  handleNavigate('employees');
                }} 
                onSelectIncident={() => handleNavigate('incidents')}
              />
            )}

            {/* 8. Incidents */}
            {activeTab === 'incidents' && (
              <IncidentsPage 
                incidents={incidents} 
                users={users} 
                currentUser={currentUser} 
                onRefreshData={fetchAllData} 
                onOpenCopilot={handleOpenCopilot}
              />
            )}

            {/* 9. Policy Engine */}
            {activeTab === 'policies' && (
              <PoliciesPage onRefreshData={fetchAllData} />
            )}

            {/* 10. ML Analytics */}
            {activeTab === 'ml-analytics' && (
              <MlAnalyticsPage />
            )}

            {/* 11. Audit Logs */}
            {activeTab === 'audit-logs' && (
              <AuditLogsPage 
                auditLogs={auditLogs} 
                currentUser={currentUser} 
                onRefreshData={fetchAllData}
              />
            )}

            {/* 12. Simulator */}
            {activeTab === 'simulator' && (
              <SimulatorPage 
                users={users} 
                resources={resources} 
                devices={devices} 
                onRefreshData={fetchAllData} 
                onOpenCopilot={handleOpenCopilot}
              />
            )}

            {/* 13. Settings */}
            {activeTab === 'settings' && (
              <SettingsPage 
                currentUser={currentUser} 
                onLogout={handleLogout}
              />
            )}
          </div>
        </main>
      </div>

      {/* Persistent Gemini AI SOC Copilot Drawer / Modal */}
      <CopilotModal 
        isOpen={copilotOpen} 
        onClose={() => setCopilotOpen(false)} 
        context={copilotContext}
      />
    </div>
  );
}
