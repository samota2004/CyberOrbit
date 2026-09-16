import React, {
  useState,
  useEffect,
  useCallback
} from 'react';

import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { CopilotModal } from './components/CopilotModal';

import {
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  X
} from 'lucide-react';

import { useTheme } from './context/ThemeContext';

import ResetPasswordPage from './pages/ResetPasswordPage';

import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';

import { DashboardPage } from './pages/DashboardPage';
import { AdminManagementPage } from './pages/AdminManagementPage';

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

const ADMIN_ROLES = [
  'SECURITY_ADMIN',
  'SYSTEM_ADMIN'
];

const EMPLOYEE_ROLES = [
  'EMPLOYEE',
  'MANAGER'
];

const isAdminRole = (role) =>
  ADMIN_ROLES.includes(role);

const isEmployeeRole = (role) =>
  EMPLOYEE_ROLES.includes(role);

const getStoredUser = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const stored =
      localStorage.getItem(
        'zero_trust_user'
      );

    if (!stored) {
      return null;
    }

    return JSON.parse(stored);
  } catch {
    return null;
  }
};

const getUserRole = (user) =>
  user?.roleCode ||
  user?.role ||
  null;

const pathToTab = (pathname) => {
  const clean = (pathname || '')
    .replace(/^\/+|\/+$/g, '')
    .toLowerCase();

  if (!clean) {
    return 'landing';
  }

  if (clean === 'login') {
    return 'login';
  }

  if (clean === 'reset-password') {
    return 'reset-password';
  }

  if (
    clean === 'admin-management' ||
    clean === 'admin-mgmt' ||
    clean === 'administrators'
  ) {
    return 'admin-management';
  }

  if (clean === 'dashboard') {
    return 'dashboard';
  }

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

  if (clean === 'departments') {
    return 'departments';
  }

  if (clean === 'devices') {
    return 'devices';
  }

  if (
    clean === 'risk-analysis' ||
    clean === 'ai-risk'
  ) {
    return 'risk-analysis';
  }

  if (clean === 'xai') {
    return 'xai';
  }

  if (clean === 'alerts') {
    return 'alerts';
  }

  if (clean === 'incidents') {
    return 'incidents';
  }

  if (clean === 'policies') {
    return 'policies';
  }

  if (clean === 'ml-analytics') {
    return 'ml-analytics';
  }

  if (clean === 'audit-logs') {
    return 'audit-logs';
  }

  if (clean === 'simulator') {
    return 'simulator';
  }

  if (clean === 'settings') {
    return 'settings';
  }

  return 'landing';
};

const tabToPath = (tab) => {
  if (tab === 'landing') {
    return '/';
  }

  if (tab === 'login') {
    return '/login';
  }

  if (tab === 'reset-password') {
    return '/reset-password';
  }

  return `/${tab}`;
};

const pageTitles = {
  dashboard:
    'SOC Executive Dashboard',

  'admin-management':
    'Administrator Account Management',

  'employee-dashboard':
    'Employee Security & Trust Portal',

  employees:
    'Employee Governance & Identities',

  departments:
    'Department Risk Intelligence',

  devices:
    'Managed Endpoint Hardware',

  'risk-analysis':
    'AI Behavioral Risk Telemetry',

  xai:
    'Explainable AI Attribution',

  alerts:
    'Real-Time Detections & Alerts',

  incidents:
    'Incident Response & Containment',

  policies:
    'Zero Trust Policy Enforcement',

  'ml-analytics':
    'ML Dual-Ensemble Analytics',

  'audit-logs':
    'Cryptographic Forensic Logs',

  simulator:
    'Threat Telemetry Simulator',

  settings:
    'Administrator Preferences'
};

export default function App() {
  const { isDark } = useTheme();

  const storedUser =
    getStoredUser();

  const [isAuthenticated, setIsAuthenticated] =
    useState(() => {
      if (
        typeof window === 'undefined'
      ) {
        return false;
      }

      return Boolean(
        localStorage.getItem(
          'zero_trust_token'
        )
      );
    });

  const [activeTab, setActiveTab] =
    useState(() => {
      if (
        typeof window === 'undefined'
      ) {
        return 'landing';
      }

      const initialPathTab =
        pathToTab(
          window.location.pathname
        );

      const authed =
        Boolean(
          localStorage.getItem(
            'zero_trust_token'
          )
        );

      if (!authed) {
        if (
          initialPathTab === 'login'
        ) {
          return 'login';
        }

        if (
          initialPathTab ===
          'reset-password'
        ) {
          return 'reset-password';
        }

        return 'landing';
      }

      const initialUser =
        getStoredUser();

      const initialRole =
        getUserRole(
          initialUser
        );

      if (
        initialPathTab === 'login'
      ) {
        return isAdminRole(
          initialRole
        )
          ? 'dashboard'
          : 'employee-dashboard';
      }

      if (
        isEmployeeRole(
          initialRole
        ) &&
        (
          initialPathTab ===
            'dashboard' ||
          initialPathTab ===
            'admin-management'
        )
      ) {
        return 'employee-dashboard';
      }

      return initialPathTab;
    });

  const [loading, setLoading] =
    useState(true);

  const [isRefreshing, setIsRefreshing] =
    useState(false);

  const [currentUser, setCurrentUser] =
    useState(storedUser);

  const [currentUserId, setCurrentUserId] =
    useState(
      storedUser?.id || null
    );

  const [users, setUsers] =
    useState([]);

  const [incidents, setIncidents] =
    useState([]);

  const [resources, setResources] =
    useState([]);

  const [devices, setDevices] =
    useState([]);

  const [accessRequests, setAccessRequests] =
    useState([]);

  const [recentEvents, setRecentEvents] =
    useState([]);

  const [auditLogs, setAuditLogs] =
    useState([]);

  const [stats, setStats] =
    useState(null);

  const [sseStatus, setSseStatus] =
    useState('RECONNECTING');

  const [sseEventCount, setSseEventCount] =
    useState(0);

  const [liveToast, setLiveToast] =
    useState(null);

  const [mobileNavOpen, setMobileNavOpen] =
    useState(false);

  const [copilotOpen, setCopilotOpen] =
    useState(false);

  const [copilotContext, setCopilotContext] =
    useState(undefined);

  const userRole =
    getUserRole(currentUser);

  const isCurrentUserAdmin =
    isAdminRole(userRole);

  const isCurrentUserEmployee =
    isEmployeeRole(userRole);

  useEffect(() => {
    if (!liveToast) {
      return;
    }

    const timer =
      setTimeout(
        () => setLiveToast(null),
        6000
      );

    return () =>
      clearTimeout(timer);
  }, [liveToast]);

  const handleNavigate =
    useCallback(
      (tab) => {
        const authed =
          Boolean(
            localStorage.getItem(
              'zero_trust_token'
            )
          );

        let targetTab =
          tab;

        if (!authed) {
          if (
            tab !== 'landing' &&
            tab !== 'login' &&
            tab !== 'reset-password'
          ) {
            targetTab =
              'landing';
          }
        } else {
          if (
            tab === 'login'
          ) {
            targetTab =
              isCurrentUserAdmin
                ? 'dashboard'
                : 'employee-dashboard';
          }

          if (
            tab === 'admin-management' &&
            !isCurrentUserAdmin
          ) {
            targetTab =
              'employee-dashboard';
          }

          if (
            tab === 'employees' &&
            !isCurrentUserAdmin
          ) {
            targetTab =
              'employee-dashboard';
          }

          if (
            tab === 'departments' &&
            !isCurrentUserAdmin
          ) {
            targetTab =
              'employee-dashboard';
          }

          if (
            tab === 'devices' &&
            !isCurrentUserAdmin
          ) {
            targetTab =
              'employee-dashboard';
          }

          if (
            tab === 'risk-analysis' &&
            !isCurrentUserAdmin
          ) {
            targetTab =
              'employee-dashboard';
          }

          if (
            tab === 'xai' &&
            !isCurrentUserAdmin
          ) {
            targetTab =
              'employee-dashboard';
          }

          if (
            tab === 'alerts' &&
            !isCurrentUserAdmin
          ) {
            targetTab =
              'employee-dashboard';
          }

          if (
            tab === 'incidents' &&
            !isCurrentUserAdmin
          ) {
            targetTab =
              'employee-dashboard';
          }

          if (
            tab === 'ml-analytics' &&
            !isCurrentUserAdmin
          ) {
            targetTab =
              'employee-dashboard';
          }

          if (
            tab === 'audit-logs' &&
            !isCurrentUserAdmin
          ) {
            targetTab =
              'employee-dashboard';
          }

          if (
            tab === 'simulator' &&
            !isCurrentUserAdmin
          ) {
            targetTab =
              'employee-dashboard';
          }

          if (
            tab === 'dashboard' &&
            isCurrentUserEmployee
          ) {
            targetTab =
              'employee-dashboard';
          }

          if (
            tab === 'reset-password'
          ) {
            targetTab =
              'reset-password';
          }
        }

        setActiveTab(
          targetTab
        );

        const targetPath =
          tabToPath(
            targetTab
          );

        if (
          typeof window !==
            'undefined' &&
          window.location.pathname !==
            targetPath
        ) {
          window.history.pushState(
            {},
            '',
            targetPath
          );
        }
      },
      [
        isCurrentUserAdmin,
        isCurrentUserEmployee
      ]
    );

  useEffect(() => {
    const handlePopState =
      () => {
        const pathTab =
          pathToTab(
            window.location.pathname
          );

        const authed =
          Boolean(
            localStorage.getItem(
              'zero_trust_token'
            )
          );

        if (!authed) {
          if (
            pathTab === 'login'
          ) {
            setActiveTab(
              'login'
            );
          } else if (
            pathTab ===
            'reset-password'
          ) {
            setActiveTab(
              'reset-password'
            );
          } else {
            setActiveTab(
              'landing'
            );

            if (
              window.location.pathname !==
              '/'
            ) {
              window.history.replaceState(
                {},
                '',
                '/'
              );
            }
          }

          return;
        }

        const role =
          getUserRole(
            getStoredUser()
          );

        if (
          pathTab === 'login'
        ) {
          const destination =
            isAdminRole(role)
              ? 'dashboard'
              : 'employee-dashboard';

          setActiveTab(
            destination
          );

          window.history.replaceState(
            {},
            '',
            tabToPath(
              destination
            )
          );

          return;
        }

        if (
          pathTab ===
            'admin-management' &&
          !isAdminRole(role)
        ) {
          setActiveTab(
            'employee-dashboard'
          );

          window.history.replaceState(
            {},
            '',
            '/employee-dashboard'
          );

          return;
        }

        if (
          pathTab ===
            'dashboard' &&
          isEmployeeRole(role)
        ) {
          setActiveTab(
            'employee-dashboard'
          );

          window.history.replaceState(
            {},
            '',
            '/employee-dashboard'
          );

          return;
        }

        setActiveTab(
          pathTab
        );
      };

    window.addEventListener(
      'popstate',
      handlePopState
    );

    return () => {
      window.removeEventListener(
        'popstate',
        handlePopState
      );
    };
  }, []);

  useEffect(() => {
    const authed =
      Boolean(
        localStorage.getItem(
          'zero_trust_token'
        )
      );

    const currentTab =
      pathToTab(
        window.location.pathname
      );

    if (
      !authed &&
      currentTab !==
        'landing' &&
      currentTab !==
        'login' &&
      currentTab !==
        'reset-password'
    ) {
      handleNavigate(
        'landing'
      );

      return;
    }

    if (
      authed &&
      currentTab === 'login'
    ) {
      const role =
        getUserRole(
          getStoredUser()
        );

      handleNavigate(
        isAdminRole(role)
          ? 'dashboard'
          : 'employee-dashboard'
      );
    }
  }, [handleNavigate]);

  const handleLogout =
    useCallback(
      () => {
        localStorage.removeItem(
          'zero_trust_token'
        );

        localStorage.removeItem(
          'zero_trust_user'
        );

        sessionStorage.clear();

        setIsAuthenticated(
          false
        );

        setCurrentUser(
          null
        );

        setCurrentUserId(
          null
        );

        setUsers([]);
        setIncidents([]);
        setResources([]);
        setDevices([]);
        setAccessRequests([]);
        setRecentEvents([]);
        setAuditLogs([]);
        setStats(null);

        setActiveTab(
          'landing'
        );

        if (
          typeof window !==
          'undefined'
        ) {
          window.history.replaceState(
            null,
            '',
            '/'
          );
        }
      },
      []
    );

  const handleLoginSuccess =
    useCallback(
      (user) => {
        if (!user?.id) {
          return;
        }

        const role =
          getUserRole(user);

        setCurrentUser(
          user
        );

        setCurrentUserId(
          user.id
        );

        setIsAuthenticated(
          true
        );

        localStorage.setItem(
          'zero_trust_user',
          JSON.stringify(user)
        );

        if (
          isAdminRole(role)
        ) {
          handleNavigate(
            'dashboard'
          );
        } else {
          handleNavigate(
            'employee-dashboard'
          );
        }
      },
      [handleNavigate]
    );

  const safeFetchJson =
    useCallback(
      async (
        url,
        options = {}
      ) => {
        try {
          const token =
            typeof window !==
            'undefined'
              ? localStorage.getItem(
                  'zero_trust_token'
                )
              : null;

          const headers =
            new Headers(
              options.headers || {}
            );

          if (
            token &&
            !headers.has(
              'Authorization'
            )
          ) {
            headers.set(
              'Authorization',
              `Bearer ${token}`
            );
          }

          if (
            currentUserId &&
            !headers.has(
              'x-user-id'
            )
          ) {
            headers.set(
              'x-user-id',
              currentUserId
            );
          }

          const res =
            await fetch(
              url,
              {
                ...options,
                headers
              }
            );

          if (
            res.status === 401
          ) {
            return {
              success: false,
              unauthorized: true,
              error:
                'Authentication required.'
            };
          }

          if (
            !res.ok
          ) {
            return {
              success: false,
              error:
                `HTTP ${res.status}`
            };
          }

          const contentType =
            res.headers.get(
              'content-type'
            );

          if (
            contentType &&
            contentType.includes(
              'application/json'
            )
          ) {
            return await res.json();
          }

          return {
            success: false,
            error:
              'Non-JSON response'
          };
        } catch (error) {
          return {
            success: false,
            error:
              String(error)
          };
        }
      },
      [currentUserId]
    );

  const fetchAllData =
    useCallback(
      async () => {
        if (
          !isAuthenticated
        ) {
          setLoading(
            false
          );

          return;
        }

        setIsRefreshing(
          true
        );

        try {
          const userRequests =
            isCurrentUserAdmin
              ? [
                  safeFetchJson(
                    '/api/users'
                  )
                ]
              : [];

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
            ...userRequests,
            safeFetchJson(
              '/api/incidents'
            ),
            safeFetchJson(
              '/api/resources'
            ),
            safeFetchJson(
              '/api/devices'
            ),
            safeFetchJson(
              '/api/access-requests'
            ),
            safeFetchJson(
              '/api/events'
            ),
            safeFetchJson(
              '/api/audit-logs'
            ),
            safeFetchJson(
              '/api/stats'
            )
          ]);

          if (
            isCurrentUserAdmin &&
            usersRes?.success &&
            usersRes.users
          ) {
            setUsers(
              usersRes.users
            );
          }

          if (
            incidentsRes?.success &&
            incidentsRes.incidents
          ) {
            setIncidents(
              incidentsRes.incidents
            );
          }

          if (
            resourcesRes?.success &&
            resourcesRes.resources
          ) {
            setResources(
              resourcesRes.resources
            );
          }

          if (
            devicesRes?.success &&
            devicesRes.devices
          ) {
            setDevices(
              devicesRes.devices
            );
          }

          if (
            requestsRes?.success &&
            requestsRes.requests
          ) {
            setAccessRequests(
              requestsRes.requests
            );
          }

          if (
            eventsRes?.success &&
            eventsRes.events
          ) {
            setRecentEvents(
              eventsRes.events
            );
          }

          if (
            logsRes?.success &&
            logsRes.logs
          ) {
            setAuditLogs(
              logsRes.logs
            );
          }

          if (
            statsRes?.success &&
            statsRes.stats
          ) {
            setStats(
              statsRes.stats
            );
          }
        } catch (error) {
          console.error(
            'Failed to sync SOC telemetry state:',
            error
          );
        } finally {
          setIsRefreshing(
            false
          );

          setLoading(
            false
          );
        }
      },
      [
        isAuthenticated,
        isCurrentUserAdmin,
        safeFetchJson
      ]
    );

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  useEffect(() => {
    let eventSource =
      null;

    let retryCount = 0;
    let retryTimeout =
      null;

    let isUnmounted =
      false;

    const connectSSE =
      () => {
        if (
          isUnmounted
        ) {
          return;
        }

        try {
          eventSource =
            new EventSource(
              '/api/events/stream'
            );

          eventSource.onopen =
            () => {
              if (
                isUnmounted
              ) {
                return;
              }

              setSseStatus(
                'LIVE'
              );

              retryCount = 0;
            };

          eventSource.onmessage =
            (e) => {
              if (
                isUnmounted
              ) {
                return;
              }

              try {
                const payload =
                  JSON.parse(
                    e.data
                  );

                if (
                  !payload ||
                  !payload.type
                ) {
                  return;
                }

                if (
                  payload.type ===
                  'HEARTBEAT'
                ) {
                  setSseStatus(
                    'LIVE'
                  );

                  return;
                }

                setSseEventCount(
                  (prev) =>
                    prev + 1
                );

                switch (
                  payload.type
                ) {
                  case 'CONNECTED':
                    setSseStatus(
                      'LIVE'
                    );
                    break;

                  case 'ACTIVITY_EVENT': {
                    const ev =
                      payload.data
                        ?.event ||
                      payload.data;

                    if (
                      ev &&
                      ev.id
                    ) {
                      setRecentEvents(
                        (prev) => {
                          const exists =
                            prev.some(
                              (x) =>
                                x.id ===
                                ev.id
                            );

                          if (
                            exists
                          ) {
                            return prev;
                          }

                          return [
                            ev,
                            ...prev
                          ].slice(
                            0,
                            50
                          );
                        }
                      );
                    }

                    break;
                  }

                  case 'TELEMETRY_INGESTED': {
                    const ev =
                      payload.data
                        ?.event;

                    if (
                      ev &&
                      ev.id
                    ) {
                      setRecentEvents(
                        (prev) => {
                          const filtered =
                            prev.filter(
                              (x) =>
                                x.id !==
                                ev.id
                            );

                          return [
                            ev,
                            ...filtered
                          ].slice(
                            0,
                            50
                          );
                        }
                      );

                      const risk =
                        Number(
                          payload.data
                            ?.riskScore ||
                          ev.riskContribution ||
                          0
                        );

                      setLiveToast({
                        id:
                          `toast-${Date.now()}`,
                        title:
                          `Telemetry: ${
                            ev.eventType ||
                            'Event Ingested'
                          }`,
                        message:
                          `Risk ${risk} (${
                            payload.data
                              ?.riskLevel ||
                            'EVALUATED'
                          }) • Action: ${
                            payload.data
                              ?.decision ||
                            ev.policyAction ||
                            'ALLOW'
                          }`,
                        type:
                          risk >= 75
                            ? 'danger'
                            : risk >= 50
                              ? 'warning'
                              : 'info',
                        timestamp:
                          new Date()
                            .toLocaleTimeString()
                      });
                    }

                    break;
                  }

                  case 'POLICY_DECISION': {
                    const dec =
                      payload.data;

                    if (
                      dec &&
                      (
                        dec.decision ===
                          'FREEZE' ||
                        dec.decision ===
                          'RESTRICT' ||
                        dec.requiresMfa
                      )
                    ) {
                      setLiveToast({
                        id:
                          `toast-${Date.now()}`,
                        title:
                          `Zero Trust Policy: ${
                            dec.decision
                          }`,
                        message:
                          dec.reason ||
                          `Action enforced for ${dec.userId}`,
                        type:
                          dec.decision ===
                          'FREEZE'
                            ? 'danger'
                            : 'warning',
                        timestamp:
                          new Date()
                            .toLocaleTimeString()
                      });
                    }

                    break;
                  }

                  case 'CONTAINMENT_ACTION': {
                    const cont =
                      payload.data;

                    if (
                      cont
                    ) {
                      setLiveToast({
                        id:
                          `toast-${Date.now()}`,
                        title:
                          `Containment: ${
                            cont.action
                          }`,
                        message:
                          cont.reason ||
                          'Automated Zero Trust containment active',
                        type:
                          'danger',
                        timestamp:
                          new Date()
                            .toLocaleTimeString()
                      });
                    }

                    break;
                  }

                  case 'INCIDENT_CREATED':
                  case 'NEW_INCIDENT': {
                    const inc =
                      payload.data
                        ?.incident ||
                      payload.data;

                    if (
                      inc &&
                      inc.id
                    ) {
                      setIncidents(
                        (prev) => {
                          const filtered =
                            prev.filter(
                              (x) =>
                                x.id !==
                                inc.id
                            );

                          return [
                            inc,
                            ...filtered
                          ];
                        }
                      );

                      setLiveToast({
                        id:
                          `toast-${Date.now()}`,
                        title:
                          `Security Incident: ${
                            inc.title ||
                            inc.eventType
                          }`,
                        message:
                          `${inc.userName || ''} • Score: ${
                            inc.riskScore ||
                            0
                          } • ${
                            inc.severity ||
                            ''
                          }`,
                        type:
                          'danger',
                        timestamp:
                          new Date()
                            .toLocaleTimeString()
                      });
                    }

                    break;
                  }

                  case 'INCIDENT_RESOLVED': {
                    const inc =
                      payload.data
                        ?.incident ||
                      payload.data;

                    if (
                      inc &&
                      inc.id
                    ) {
                      setIncidents(
                        (prev) =>
                          prev.map(
                            (i) =>
                              i.id ===
                              inc.id
                                ? {
                                    ...i,
                                    ...inc,
                                    status:
                                      'RESOLVED'
                                  }
                                : i
                          )
                      );
                    }

                    break;
                  }

                  case 'RISK_SCORE_CHANGED':
                    if (
                      payload.data &&
                      isCurrentUserAdmin
                    ) {
                      setUsers(
                        (prev) =>
                          prev.map(
                            (u) =>
                              u.id ===
                              payload.data.userId
                                ? {
                                    ...u,
                                    currentRiskScore:
                                      payload.data
                                        .riskScore,
                                    currentRiskLevel:
                                      payload.data
                                        .riskLevel ||
                                      u.currentRiskLevel
                                  }
                                : u
                          )
                      );
                    }

                    break;

                  case 'TRUST_SCORE_CHANGED':
                    if (
                      payload.data &&
                      isCurrentUserAdmin
                    ) {
                      setUsers(
                        (prev) =>
                          prev.map(
                            (u) =>
                              u.id ===
                              payload.data.userId
                                ? {
                                    ...u,
                                    currentTrustScore:
                                      payload.data
                                        .trustScore
                                  }
                                : u
                          )
                      );
                    }

                    break;

                  case 'ACCOUNT_STATUS_CHANGED':
                    if (
                      payload.data &&
                      isCurrentUserAdmin
                    ) {
                      setUsers(
                        (prev) =>
                          prev.map(
                            (u) =>
                              u.id ===
                              payload.data.userId
                                ? {
                                    ...u,
                                    status:
                                      payload.data
                                        .status
                                  }
                                : u
                          )
                      );
                    }

                    break;

                  case 'USER_UPDATED':
                    if (
                      payload.data
                        ?.user &&
                      isCurrentUserAdmin
                    ) {
                      setUsers(
                        (prev) =>
                          prev.map(
                            (u) =>
                              u.id ===
                              payload.data
                                .user.id
                                ? {
                                    ...u,
                                    ...payload
                                      .data
                                      .user
                                  }
                                : u
                          )
                      );
                    }

                    break;

                  case 'DEVICE_UPDATED':
                  case 'DEVICE_REVOKED': {
                    const dev =
                      payload.data
                        ?.device ||
                      payload.data;

                    if (
                      dev &&
                      dev.id
                    ) {
                      setDevices(
                        (prev) =>
                          prev.map(
                            (d) =>
                              d.id ===
                              dev.id
                                ? {
                                    ...d,
                                    ...dev
                                  }
                                : d
                          )
                      );
                    }

                    break;
                  }

                  case 'AUDIT_LOG_ENTRY':
                  case 'AUDIT_LOG': {
                    const log =
                      payload.data
                        ?.entry ||
                      payload.data;

                    if (
                      log &&
                      log.id
                    ) {
                      setAuditLogs(
                        (prev) =>
                          [
                            log,
                            ...prev
                          ].slice(
                            0,
                            100
                          )
                      );
                    }

                    break;
                  }

                  default:
                    break;
                }
              } catch (
                error
              ) {
                console.error(
                  'Failed to parse SSE message:',
                  error
                );
              }
            };

          eventSource.onerror =
            () => {
              if (
                isUnmounted
              ) {
                return;
              }

              eventSource?.close();
              eventSource =
                null;

              retryCount++;

              if (
                retryCount <= 4
              ) {
                setSseStatus(
                  'RECONNECTING'
                );

                retryTimeout =
                  setTimeout(
                    connectSSE,
                    Math.min(
                      1000 *
                        Math.pow(
                          2,
                          retryCount
                        ),
                      10000
                    )
                  );
              } else {
                setSseStatus(
                  'FALLBACK'
                );

                retryTimeout =
                  setTimeout(
                    connectSSE,
                    30000
                  );
              }
            };
        } catch (
          error
        ) {
          setSseStatus(
            'FALLBACK'
          );
        }
      };

    if (
      isAuthenticated
    ) {
      connectSSE();
    }

    return () => {
      isUnmounted =
        true;

      if (
        retryTimeout
      ) {
        clearTimeout(
          retryTimeout
        );
      }

      if (
        eventSource
      ) {
        eventSource.close();
        eventSource =
          null;
      }
    };
  }, [
    isAuthenticated,
    isCurrentUserAdmin
  ]);

  useEffect(() => {
    const pollInterval =
      sseStatus ===
      'LIVE'
        ? 45000
        : 15000;

    const interval =
      setInterval(
        () => {
          if (
            isAuthenticated
          ) {
            fetchAllData();
          }
        },
        pollInterval
      );

    return () =>
      clearInterval(
        interval
      );
  }, [
    fetchAllData,
    sseStatus,
    isAuthenticated
  ]);

  useEffect(() => {
    if (
      !currentUserId
    ) {
      return;
    }

    if (
      !isCurrentUserAdmin
    ) {
      return;
    }

    const refreshedUser =
      users.find(
        (user) =>
          user.id ===
          currentUserId
      );

    if (
      refreshedUser
    ) {
      setCurrentUser(
        (previous) => ({
          ...previous,
          ...refreshedUser
        })
      );
    }
  }, [
    users,
    currentUserId,
    isCurrentUserAdmin
  ]);

  const handleOpenCopilot =
    (context) => {
      setCopilotContext(
        context
      );

      setCopilotOpen(
        true
      );
    };

  const handleFreezeUser =
    async (
      userId
    ) => {
      try {
        const token =
          localStorage.getItem(
            'zero_trust_token'
          );

        if (!token) {
          return;
        }

        await fetch(
          `/api/users/${userId}/freeze`,
          {
            method: 'POST',
            headers: {
              'Content-Type':
                'application/json',
              Authorization:
                `Bearer ${token}`
            },
            body:
              JSON.stringify({
                reason:
                  'SOC manual containment override'
              })
          }
        );

        fetchAllData();
      } catch (
        error
      ) {
        console.error(
          'Failed to freeze user',
          error
        );
      }
    };

  const handleUnfreezeUser =
    async (
      userId
    ) => {
      try {
        const token =
          localStorage.getItem(
            'zero_trust_token'
          );

        if (!token) {
          return;
        }

        await fetch(
          `/api/users/${userId}/unfreeze`,
          {
            method: 'POST',
            headers: {
              Authorization:
                `Bearer ${token}`
            }
          }
        );

        fetchAllData();
      } catch (
        error
      ) {
        console.error(
          'Failed to unfreeze user',
          error
        );
      }
    };

  const handleAddUser =
    (createdUser) => {
      if (
        !createdUser?.id
      ) {
        return;
      }

      setUsers(
        (previous) => [
          createdUser,
          ...previous.filter(
            (user) =>
              user.id !==
              createdUser.id
          )
        ]
      );
    };

  const handleUpdateUser =
    async (
      userId,
      updates
    ) => {
      const token =
        localStorage.getItem(
          'zero_trust_token'
        );

      if (!token) {
        throw new Error(
          'Authentication token not found. Please log in again.'
        );
      }

      const response =
        await fetch(
          `/api/users/${userId}`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type':
                'application/json',
              Authorization:
                `Bearer ${token}`
            },
            body:
              JSON.stringify(
                updates
              )
          }
        );

      const data =
        await response.json();

      if (
        !response.ok
      ) {
        throw new Error(
          data?.error
            ?.message ||
            data?.message ||
            'Failed to update employee.'
        );
      }

      if (
        !data?.user
      ) {
        throw new Error(
          'Updated employee was not returned by the server.'
        );
      }

      setUsers(
        (previous) =>
          previous.map(
            (user) =>
              user.id ===
              userId
                ? data.user
                : user
          )
      );

      return data.user;
    };

  const handleDeleteUser =
    async (
      userId
    ) => {
      const token =
        localStorage.getItem(
          'zero_trust_token'
        );

      if (!token) {
        throw new Error(
          'Authentication token not found. Please log in again.'
        );
      }

      const response =
        await fetch(
          `/api/users/${userId}`,
          {
            method: 'DELETE',
            headers: {
              Authorization:
                `Bearer ${token}`
            }
          }
        );

      const data =
        await response.json();

      if (
        !response.ok
      ) {
        throw new Error(
          data?.error
            ?.message ||
            data?.message ||
            'Failed to delete employee.'
        );
      }

      setUsers(
        (previous) =>
          previous.filter(
            (user) =>
              user.id !==
              userId
          )
      );
    };

  if (
    activeTab ===
    'landing'
  ) {
    return (
      <LandingPage
        onLogin={() =>
          handleNavigate(
            'login'
          )
        }
        onNavigateToLogin={() =>
          handleNavigate(
            'login'
          )
        }
      />
    );
  }

  if (
    activeTab ===
    'login'
  ) {
    return (
      <LoginPage
        users={users}
        onLoginSuccess={
          handleLoginSuccess
        }
        onBackToHome={() =>
          handleNavigate(
            'landing'
          )
        }
      />
    );
  }

  if (
    activeTab ===
    'reset-password'
  ) {
    return (
      <ResetPasswordPage />
    );
  }

  if (
    !isAuthenticated
  ) {
    return (
      <LandingPage
        onLogin={() =>
          handleNavigate(
            'login'
          )
        }
        onNavigateToLogin={() =>
          handleNavigate(
            'login'
          )
        }
      />
    );
  }

  return (
    <div
      className={`
        min-h-screen
        flex flex-col md:flex-row
        overflow-hidden
        font-['Plus_Jakarta_Sans',sans-serif]
        ${
          isDark
            ? 'bg-[#07080A] text-[#F4F4F6]'
            : 'bg-[#F9F9F7] text-[#111317]'
        }
      `}
    >
      <Sidebar
        activeTab={
          activeTab
        }
        onTabChange={
          (tab) => {
            if (
              tab ===
              'copilot'
            ) {
              handleOpenCopilot();
            } else {
              handleNavigate(
                tab
              );
            }
          }
        }
        incidentCount={
          incidents.filter(
            (incident) =>
              incident.status !==
              'RESOLVED'
          ).length
        }
        currentUser={
          currentUser
        }
        onLogout={
          handleLogout
        }
        mobileOpen={
          mobileNavOpen
        }
        onCloseMobile={() =>
          setMobileNavOpen(
            false
          )
        }
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <TopBar
          currentUser={
            currentUser
          }
          currentPageTitle={
            pageTitles[
              activeTab
            ] ||
            'Administrator Portal'
          }
          onOpenCopilot={() =>
            handleOpenCopilot()
          }
          onRefreshData={
            fetchAllData
          }
          isRefreshing={
            isRefreshing
          }
          onLogout={
            handleLogout
          }
          onToggleMobileNav={() =>
            setMobileNavOpen(
              (previous) =>
                !previous
            )
          }
        />

        {liveToast && (
          <div className="absolute bottom-6 right-6 z-50 max-w-md w-full animate-in slide-in-from-bottom-5 fade-in duration-300">
            <div
              className={`
                p-4
                border
                shadow-2xl
                flex items-start gap-3
                ${
                  liveToast.type ===
                  'danger'
                    ? 'bg-red-950/95 border-red-500/50 text-red-100 shadow-red-950/50'
                    : liveToast.type ===
                      'warning'
                      ? 'bg-amber-950/95 border-amber-500/50 text-amber-100 shadow-amber-950/50'
                      : 'bg-emerald-950/95 border-emerald-500/50 text-emerald-100 shadow-emerald-950/50'
                }
                backdrop-blur-md
              `}
            >
              <div className="mt-0.5">
                {liveToast.type ===
                  'danger' && (
                  <ShieldAlert className="w-5 h-5 text-red-400" />
                )}

                {liveToast.type ===
                  'warning' && (
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                )}

                {liveToast.type !==
                  'danger' &&
                  liveToast.type !==
                    'warning' && (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  )}
              </div>

              <div className="flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider">
                    {
                      liveToast.title
                    }
                  </h4>

                  <span className="text-[10px] font-mono opacity-60">
                    {
                      liveToast.timestamp
                    }
                  </span>
                </div>

                <p className="text-xs mt-1 opacity-90">
                  {
                    liveToast.message
                  }
                </p>
              </div>

              <button
                onClick={() =>
                  setLiveToast(
                    null
                  )
                }
                className="text-gray-400 hover:text-white p-1 hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        <main
          id="cyberorbit-main-content"
          className={`
            flex-1
            overflow-y-auto
            p-4 md:p-6 lg:p-8
            transition-colors
            ${
              isDark
                ? 'bg-[#07080A]'
                : 'bg-[#F9F9F7]'
            }
          `}
        >
          <div className="max-w-7xl mx-auto">

            {activeTab ===
              'dashboard' &&
              isCurrentUserAdmin && (
                <DashboardPage
                  users={
                    users
                  }
                  incidents={
                    incidents
                  }
                  recentEvents={
                    recentEvents
                  }
                  onSelectUser={(
                    userId
                  ) => {
                    setCurrentUserId(
                      userId
                    );

                    handleNavigate(
                      'employees'
                    );
                  }}
                  onSelectIncident={() =>
                    handleNavigate(
                      'incidents'
                    )
                  }
                  onNavigateToSimulator={() =>
                    handleNavigate(
                      'simulator'
                    )
                  }
                  onNavigateToCopilot={() =>
                    handleOpenCopilot()
                  }
                  onNavigateToAdminManagement={() =>
                    handleNavigate(
                      'admin-management'
                    )
                  }
                  onFreezeUser={
                    handleFreezeUser
                  }
                  onUnfreezeUser={
                    handleUnfreezeUser
                  }
                />
              )}

            {activeTab ===
              'admin-management' &&
              isCurrentUserAdmin && (
                <AdminManagementPage
                  currentUser={
                    currentUser
                  }
                  onBack={() =>
                    handleNavigate(
                      'dashboard'
                    )
                  }
                />
              )}

            {activeTab ===
              'employee-dashboard' &&
              (
                isCurrentUserAdmin ||
                isCurrentUserEmployee
              ) && (
                <EmployeeDashboard
                  currentUser={
                    currentUser
                  }
                  users={
                    users
                  }
                  events={
                    recentEvents
                  }
                  devices={
                    devices
                  }
                  isAdminView={
                    isCurrentUserAdmin
                  }
                  onOpenAccessRequestModal={() =>
                    handleNavigate(
                      'policies'
                    )
                  }
                />
              )}

            {activeTab ===
              'employees' &&
              isCurrentUserAdmin && (
                <EmployeeManagementPage
                  users={
                    users
                  }
                  onAddUser={
                    handleAddUser
                  }
                  onUpdateUser={
                    handleUpdateUser
                  }
                  onDeleteUser={
                    handleDeleteUser
                  }
                  onFreezeUser={
                    handleFreezeUser
                  }
                  onUnfreezeUser={
                    handleUnfreezeUser
                  }
                />
              )}

            {activeTab ===
              'departments' &&
              isCurrentUserAdmin && (
                <DepartmentsPage
                  users={
                    users
                  }
                  incidents={
                    incidents
                  }
                  onSelectUser={(
                    userId
                  ) => {
                    setCurrentUserId(
                      userId
                    );

                    handleNavigate(
                      'employees'
                    );
                  }}
                />
              )}

            {activeTab ===
              'devices' &&
              isCurrentUserAdmin && (
                <DevicesPage
                  devices={
                    devices
                  }
                  users={
                    users
                  }
                  onRefreshData={
                    fetchAllData
                  }
                />
              )}

            {activeTab ===
              'risk-analysis' &&
              isCurrentUserAdmin && (
                <AiRiskAnalysisPage
                  users={
                    users
                  }
                  events={
                    recentEvents
                  }
                  selectedUserId={
                    currentUserId
                  }
                  onSelectUser={(
                    userId
                  ) =>
                    setCurrentUserId(
                      userId
                    )
                  }
                />
              )}

            {activeTab ===
              'xai' &&
              isCurrentUserAdmin && (
                <ExplainableAiPage
                  users={
                    users
                  }
                  events={
                    recentEvents
                  }
                  incidents={
                    incidents
                  }
                  onSelectUser={(
                    userId
                  ) => {
                    setCurrentUserId(
                      userId
                    );

                    handleNavigate(
                      'risk-analysis'
                    );
                  }}
                />
              )}

            {activeTab ===
              'alerts' &&
              isCurrentUserAdmin && (
                <AlertsPage
                  users={
                    users
                  }
                  events={
                    recentEvents
                  }
                  incidents={
                    incidents
                  }
                  onSelectUser={(
                    userId
                  ) => {
                    setCurrentUserId(
                      userId
                    );

                    handleNavigate(
                      'employees'
                    );
                  }}
                  onSelectIncident={() =>
                    handleNavigate(
                      'incidents'
                    )
                  }
                />
              )}

            {activeTab ===
              'incidents' &&
              isCurrentUserAdmin && (
                <IncidentsPage
                  incidents={
                    incidents
                  }
                  users={
                    users
                  }
                  currentUser={
                    currentUser
                  }
                  onRefreshData={
                    fetchAllData
                  }
                  onOpenCopilot={
                    handleOpenCopilot
                  }
                />
              )}

            {activeTab ===
              'policies' && (
                <PoliciesPage
                  onRefreshData={
                    fetchAllData
                  }
                />
              )}

            {activeTab ===
              'ml-analytics' &&
              isCurrentUserAdmin && (
                <MlAnalyticsPage />
              )}

            {activeTab ===
              'audit-logs' &&
              isCurrentUserAdmin && (
                <AuditLogsPage
                  auditLogs={
                    auditLogs
                  }
                  currentUser={
                    currentUser
                  }
                  onRefreshData={
                    fetchAllData
                  }
                />
              )}

            {activeTab ===
              'simulator' &&
              isCurrentUserAdmin && (
                <SimulatorPage
                  users={
                    users
                  }
                  resources={
                    resources
                  }
                  devices={
                    devices
                  }
                  onRefreshData={
                    fetchAllData
                  }
                  onOpenCopilot={
                    handleOpenCopilot
                  }
                />
              )}

            {activeTab ===
              'settings' && (
                <SettingsPage
                  currentUser={
                    currentUser
                  }
                  onLogout={
                    handleLogout
                  }
                />
              )}
          </div>
        </main>
      </div>

      <CopilotModal
        isOpen={
          copilotOpen
        }
        onClose={() =>
          setCopilotOpen(
            false
          )
        }
        context={
          copilotContext
        }
      />
    </div>
  );
}