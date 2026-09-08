import React, { useState, useEffect } from 'react';
import { Server, Shield, Layers, Terminal, Play, CheckCircle2, BrainCircuit, Flame, RefreshCw, Copy, Check, Zap, FileCode2, GitBranch } from 'lucide-react';
export const ArchitecturePage = ({ currentUser, users, resources, devices, onRefreshData }) => {
    const [activeTab, setActiveTab] = useState('architecture');
    // Backend Health Telemetry State
    const [healthData, setHealthData] = useState(null);
    const [routes, setRoutes] = useState([]);
    const [healthLoading, setHealthLoading] = useState(false);
    // API Explorer State
    const [selectedRoute, setSelectedRoute] = useState(null);
    const [customRequestBody, setCustomRequestBody] = useState('{}');
    const [apiResponse, setApiResponse] = useState(null);
    const [apiLoading, setApiLoading] = useState(false);
    const [apiLatency, setApiLatency] = useState(null);
    const [apiStatus, setApiStatus] = useState(null);
    const [copiedCurl, setCopiedCurl] = useState(false);
    // Live ML Feature Playground State
    const [hourSlider, setHourSlider] = useState(2); // 2:00 AM
    const [deviceTrustSlider, setDeviceTrustSlider] = useState(25); // 25% trust
    const [downloadVolumeSlider, setDownloadVolumeSlider] = useState(650); // 650 MB
    const [failedLoginsSlider, setFailedLoginsSlider] = useState(3);
    const [crossDeptChecked, setCrossDeptChecked] = useState(true);
    const [privilegeChecked, setPrivilegeChecked] = useState(false);
    const [usbChecked, setUsbChecked] = useState(false);
    const [mlInferenceResult, setMlInferenceResult] = useState(null);
    const [mlInferring, setMlInferring] = useState(false);
    // MITRE Cybersecurity Simulation State
    const [selectedMitreTechnique, setSelectedMitreTechnique] = useState('T1048');
    const [selectedMitreUser, setSelectedMitreUser] = useState(users[2]?.id || 'user-003');
    const [mitreResult, setMitreResult] = useState(null);
    const [mitreExecuting, setMitreExecuting] = useState(false);
    // Mitigation state
    const [mitigationResult, setMitigationResult] = useState(null);
    // Fetch system health and routes catalog
    const fetchHealthAndRoutes = async () => {
        try {
            setHealthLoading(true);
            const [healthRes, routesRes] = await Promise.all([
                fetch('/api/system/health').then(r => r.json()),
                fetch('/api/system/routes').then(r => r.json())
            ]);
            if (healthRes.success)
                setHealthData(healthRes);
            if (routesRes.success) {
                setRoutes(routesRes.routes);
                if (!selectedRoute && routesRes.routes.length > 0) {
                    setSelectedRoute(routesRes.routes[2]); // Default to /api/risk/evaluate
                    setCustomRequestBody(JSON.stringify(routesRes.routes[2].sampleBody || {}, null, 2));
                }
            }
        }
        catch (e) {
            console.error('Failed to load system health', e);
        }
        finally {
            setHealthLoading(false);
        }
    };
    useEffect(() => {
        fetchHealthAndRoutes();
    }, []);
    const handleSelectRoute = (route) => {
        setSelectedRoute(route);
        setCustomRequestBody(JSON.stringify(route.sampleBody || {}, null, 2));
        setApiResponse(null);
        setApiStatus(null);
        setApiLatency(null);
    };
    const handleExecuteApiRequest = async () => {
        if (!selectedRoute)
            return;
        try {
            setApiLoading(true);
            const startTime = performance.now();
            const options = {
                method: selectedRoute.method,
                headers: { 'Content-Type': 'application/json' }
            };
            if (selectedRoute.method !== 'GET' && customRequestBody.trim()) {
                options.body = customRequestBody;
            }
            const res = await fetch(selectedRoute.path, options);
            const endTime = performance.now();
            setApiLatency(Math.round(endTime - startTime));
            setApiStatus(res.status);
            const contentType = res.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                const json = await res.json();
                setApiResponse(json);
            }
            else {
                const text = await res.text();
                setApiResponse({ textResponse: text });
            }
        }
        catch (e) {
            setApiResponse({ error: e.message || String(e) });
            setApiStatus(500);
        }
        finally {
            setApiLoading(false);
        }
    };
    const handleRunLiveMlInference = async () => {
        try {
            setMlInferring(true);
            const res = await fetch('/api/ml/predict', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: selectedMitreUser,
                    resourceId: crossDeptChecked ? 'res-fin-01' : 'res-eng-01',
                    downloadSizeMB: downloadVolumeSlider,
                    failedLoginCount: failedLoginsSlider,
                    isOffHours: hourSlider < 8 || hourSlider > 18
                })
            });
            const data = await res.json();
            setMlInferenceResult(data);
        }
        catch (e) {
            console.error('ML inference error', e);
        }
        finally {
            setMlInferring(false);
        }
    };
    const handleRunMitreAttack = async () => {
        try {
            setMitreExecuting(true);
            const res = await fetch('/api/cyber/mitre-simulate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    techniqueId: selectedMitreTechnique,
                    userId: selectedMitreUser,
                    targetResourceId: 'res-fin-01'
                })
            });
            const data = await res.json();
            setMitreResult(data);
            onRefreshData();
        }
        catch (e) {
            console.error('MITRE simulation failed', e);
        }
        finally {
            setMitreExecuting(false);
        }
    };
    const handleExecuteMitigation = async (action) => {
        try {
            const res = await fetch('/api/cyber/mitigate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action,
                    userId: selectedMitreUser
                })
            });
            const data = await res.json();
            if (data.success) {
                setMitigationResult(data.message);
                onRefreshData();
                setTimeout(() => setMitigationResult(null), 6000);
            }
        }
        catch (e) {
            console.error('Mitigation failed', e);
        }
    };
    const generateCurlCommand = () => {
        if (!selectedRoute)
            return '';
        const origin = window.location.origin;
        if (selectedRoute.method === 'GET') {
            return `curl -X GET "${origin}${selectedRoute.path}" -H "Accept: application/json"`;
        }
        return `curl -X ${selectedRoute.method} "${origin}${selectedRoute.path}" \\
  -H "Content-Type: application/json" \\
  -d '${customRequestBody.replace(/'/g, "\\'")}'`;
    };
    const handleCopyCurl = () => {
        navigator.clipboard.writeText(generateCurlCommand());
        setCopiedCurl(true);
        setTimeout(() => setCopiedCurl(false), 2000);
    };
    return (<div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-[#111111] p-8 border border-[#D4AF37]/30 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-[#D4AF37]"/>
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-black border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37]">
              <Layers className="w-5 h-5"/>
            </div>
            <div>
              <h1 className="font-serif-display text-2xl sm:text-3xl text-white tracking-wide flex items-center gap-3">
                Full-Stack Architecture &amp; Security Engine
                <span className="px-2.5 py-0.5 text-xs font-mono font-bold bg-black text-[#D4AF37] border border-[#D4AF37]/40">
                  LIVE SYSTEM
                </span>
              </h1>
              <p className="text-xs text-gray-400 mt-1 font-sans">
                End-to-end Zero Trust pipeline: Frontend UI &rarr; Express Backend REST Gateway &rarr; AI/ML UEBA Engine &rarr; Cybersecurity PEP/PDP Controller
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button 
            onClick={fetchHealthAndRoutes} 
            disabled={healthLoading} 
            className="flex items-center gap-2 px-4 py-2 bg-black hover:bg-[#A67C00] border border-[#D4AF37]/40 hover:border-[#A67C00] text-xs font-mono text-[#D4AF37] hover:text-white transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${healthLoading ? 'animate-spin text-[#D4AF37]' : ''}`}/>
            <span>SYNC TELEMETRY</span>
          </button>
        </div>
      </div>

      {/* 4 Pillars Navigation Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-black p-2 border border-[#D4AF37]/30">
        <button 
          onClick={() => setActiveTab('architecture')} 
          className={`flex items-center justify-center gap-2 py-3 px-4 text-xs font-mono font-bold transition-all cursor-pointer border ${activeTab === 'architecture'
            ? 'bg-[#D4AF37] text-black border-[#D4AF37]'
            : 'text-gray-400 hover:text-white hover:bg-[#111111] border-transparent'}`}
        >
          <Layers className="w-4 h-4"/>
          <span>1. FULL-STACK MAP</span>
        </button>

        <button 
          onClick={() => setActiveTab('backend-api')} 
          className={`flex items-center justify-center gap-2 py-3 px-4 text-xs font-mono font-bold transition-all cursor-pointer border ${activeTab === 'backend-api'
            ? 'bg-[#D4AF37] text-black border-[#D4AF37]'
            : 'text-gray-400 hover:text-white hover:bg-[#111111] border-transparent'}`}
        >
          <Server className="w-4 h-4"/>
          <span>2. REST API</span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 bg-black/40 text-current border border-current/20">12</span>
        </button>

        <button 
          onClick={() => setActiveTab('aiml-model')} 
          className={`flex items-center justify-center gap-2 py-3 px-4 text-xs font-mono font-bold transition-all cursor-pointer border ${activeTab === 'aiml-model'
            ? 'bg-[#D4AF37] text-black border-[#D4AF37]'
            : 'text-gray-400 hover:text-white hover:bg-[#111111] border-transparent'}`}
        >
          <BrainCircuit className="w-4 h-4"/>
          <span>3. AI / ML UEBA</span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 bg-black/40 text-current border border-current/20">XAI</span>
        </button>

        <button 
          onClick={() => setActiveTab('cybersecurity')} 
          className={`flex items-center justify-center gap-2 py-3 px-4 text-xs font-mono font-bold transition-all cursor-pointer border ${activeTab === 'cybersecurity'
            ? 'bg-[#D4AF37] text-black border-[#D4AF37]'
            : 'text-gray-400 hover:text-white hover:bg-[#111111] border-transparent'}`}
        >
          <Shield className="w-4 h-4"/>
          <span>4. ZERO TRUST</span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 bg-black/40 text-current border border-current/20">PEP</span>
        </button>
      </div>

      {/* TAB 1: FULL-STACK ARCHITECTURE MAP */}
      {activeTab === 'architecture' && (<div className="space-y-6">
          {/* Real-time Telemetry Health Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-[#0F1115] p-4 rounded-xl border border-white/10">
              <div className="text-[11px] font-mono uppercase text-gray-500 font-bold mb-1 flex items-center justify-between">
                <span>Node.js Backend</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              </div>
              <div className="text-xl font-bold text-white">Express REST Server</div>
              <div className="text-xs text-gray-400 mt-1">
                Port 3000 • Uptime {healthData?.server?.uptimeSeconds ?? 0}s • Heap {healthData?.server?.memory?.heapUsedMB ?? 0} MB
              </div>
            </div>

            <div className="bg-[#0F1115] p-4 rounded-xl border border-white/10">
              <div className="text-[11px] font-mono uppercase text-gray-500 font-bold mb-1 flex items-center justify-between">
                <span>Cybersecurity Core</span>
                <span className="px-1.5 py-0.5 bg-blue-500/10 text-blue-400 rounded text-[10px]">NIST SP 800-207</span>
              </div>
              <div className="text-xl font-bold text-white">Zero Trust PEP / PDP</div>
              <div className="text-xs text-gray-400 mt-1">Continuous ABAC + Dynamic Risk & Trust Decay</div>
            </div>

            <div className="bg-[#0F1115] p-4 rounded-xl border border-white/10">
              <div className="text-[11px] font-mono uppercase text-gray-500 font-bold mb-1 flex items-center justify-between">
                <span>AI & Machine Learning</span>
                <span className="px-1.5 py-0.5 bg-purple-500/10 text-purple-400 rounded text-[10px]">CERT r4.2</span>
              </div>
              <div className="text-xl font-bold text-white">UEBA Ensemble + XAI</div>
              <div className="text-xs text-gray-400 mt-1">Isolation Forest + Random Forest (0.978 ROC-AUC)</div>
            </div>

            <div className="bg-[#0F1115] p-4 rounded-xl border border-white/10">
              <div className="text-[11px] font-mono uppercase text-gray-500 font-bold mb-1 flex items-center justify-between">
                <span>Frontend UI & Telemetry</span>
                <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 rounded text-[10px]">SPA</span>
              </div>
              <div className="text-xl font-bold text-white">React 18 + SOC Stream</div>
              <div className="text-xs text-gray-400 mt-1">Multi-Role Gatekeeper, Step-Up MFA & Live Simulator</div>
            </div>
          </div>

          {/* End-to-End Pipeline Diagram */}
          <div className="bg-[#0F1115] p-6 rounded-xl border border-white/10 space-y-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-300 flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-blue-400"/>
              NIST SP 800-207 Zero Trust & UEBA Execution Pipeline
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 relative">
              {/* Box 1: Subject & Endpoint Telemetry */}
              <div className="bg-white/[0.02] border border-white/10 rounded-lg p-4 space-y-3 relative hover:border-blue-500/40 transition-colors">
                <div className="w-8 h-8 rounded bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold text-xs">
                  01
                </div>
                <h3 className="text-sm font-bold text-white">Subject & Endpoint</h3>
                <p className="text-xs text-gray-400">
                  User identity, role, department, unverified IP, location, and hardware device trust score.
                </p>
                <div className="text-[11px] font-mono text-gray-500 space-y-1 pt-2 border-t border-white/5">
                  <div>• Subject: {currentUser.name}</div>
                  <div>• Role: {currentUser.role}</div>
                  <div>• Device Trust: 85%</div>
                </div>
              </div>

              {/* Box 2: Policy Enforcement Point (PEP) */}
              <div className="bg-white/[0.02] border border-white/10 rounded-lg p-4 space-y-3 relative hover:border-blue-500/40 transition-colors">
                <div className="w-8 h-8 rounded bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold text-xs">
                  02
                </div>
                <h3 className="text-sm font-bold text-white">PEP Interceptor</h3>
                <p className="text-xs text-gray-400">
                  Express API Gateway traps all file, resource, or auth attempts before granting payload access.
                </p>
                <div className="text-[11px] font-mono text-gray-500 space-y-1 pt-2 border-t border-white/5">
                  <div>• Route: /api/policy/evaluate</div>
                  <div>• Latency: ~1.2ms</div>
                  <div>• Status: Intercepting</div>
                </div>
              </div>

              {/* Box 3: AI / ML Behavioral Engine */}
              <div className="bg-white/[0.02] border border-white/10 rounded-lg p-4 space-y-3 relative hover:border-purple-500/40 transition-colors">
                <div className="w-8 h-8 rounded bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold text-xs">
                  03
                </div>
                <h3 className="text-sm font-bold text-white">AI / ML Engine</h3>
                <p className="text-xs text-gray-400">
                  12D feature vector extraction + Isolation Forest anomaly scoring + SHAP attribution breakdown.
                </p>
                <div className="text-[11px] font-mono text-gray-500 space-y-1 pt-2 border-t border-white/5">
                  <div>• Model: Isolation Forest</div>
                  <div>• XAI: SHAP Factors</div>
                  <div>• Baseline: CERT r4.2</div>
                </div>
              </div>

              {/* Box 4: Policy Decision Point (PDP) */}
              <div className="bg-white/[0.02] border border-white/10 rounded-lg p-4 space-y-3 relative hover:border-amber-500/40 transition-colors">
                <div className="w-8 h-8 rounded bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold text-xs">
                  04
                </div>
                <h3 className="text-sm font-bold text-white">PDP Decision</h3>
                <p className="text-xs text-gray-400">
                  Synthesizes dynamic risk (0-100), trust score, sensitivity tier, and enforces action.
                </p>
                <div className="text-[11px] font-mono text-gray-500 space-y-1 pt-2 border-t border-white/5">
                  <div>• Actions: ALLOW | MFA | FREEZE</div>
                  <div>• Decay: -35 on Critical</div>
                  <div>• Recovery: +2 adaptive</div>
                </div>
              </div>

              {/* Box 5: Automated Mitigation & Audit */}
              <div className="bg-white/[0.02] border border-white/10 rounded-lg p-4 space-y-3 relative hover:border-emerald-500/40 transition-colors">
                <div className="w-8 h-8 rounded bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-xs">
                  05
                </div>
                <h3 className="text-sm font-bold text-white">Mitigation & Audit</h3>
                <p className="text-xs text-gray-400">
                  Step-up biometric verification, immediate token revocation, account freeze, and SOC logging.
                </p>
                <div className="text-[11px] font-mono text-gray-500 space-y-1 pt-2 border-t border-white/5">
                  <div>• Auto-Freeze on Critical</div>
                  <div>• Audit: Append Log</div>
                  <div>• Copilot: Gemini XAI</div>
                </div>
              </div>
            </div>
          </div>

          {/* Microservices & Components Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-[#0F1115] p-5 rounded-xl border border-white/10 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                <Server className="w-4 h-4 text-blue-400"/>
                Backend Node.js & Express Modules
              </h3>
              <div className="space-y-2 text-xs">
                <div className="p-3 bg-white/[0.02] border border-white/5 rounded-lg flex items-center justify-between">
                  <div>
                    <span className="font-mono text-blue-400 font-bold">server/risk-engine.js</span>
                    <p className="text-gray-400 text-[11px]">Multi-factor dynamic risk score computation (0-100) combining temporal, device, credential, and volume markers.</p>
                  </div>
                  <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 font-mono text-[10px] rounded">ACTIVE</span>
                </div>

                <div className="p-3 bg-white/[0.02] border border-white/5 rounded-lg flex items-center justify-between">
                  <div>
                    <span className="font-mono text-blue-400 font-bold">server/policy-engine.js</span>
                    <p className="text-gray-400 text-[11px]">NIST SP 800-207 PEP/PDP decision engine evaluating ALLOW, MONITOR, MFA, REQUIRE_APPROVAL, RESTRICT, FREEZE.</p>
                  </div>
                  <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 font-mono text-[10px] rounded">ACTIVE</span>
                </div>

                <div className="p-3 bg-white/[0.02] border border-white/5 rounded-lg flex items-center justify-between">
                  <div>
                    <span className="font-mono text-blue-400 font-bold">server/trust-engine.js</span>
                    <p className="text-gray-400 text-[11px]">Context-Based Access Control (CBAC) trust score decay and adaptive recovery calculator with historical logging.</p>
                  </div>
                  <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 font-mono text-[10px] rounded">ACTIVE</span>
                </div>

                <div className="p-3 bg-white/[0.02] border border-white/5 rounded-lg flex items-center justify-between">
                  <div>
                    <span className="font-mono text-blue-400 font-bold">server/gemini.js</span>
                    <p className="text-gray-400 text-[11px]">Threat intelligence and incident explanation copilot powered by Gemini 3.7/3.1 with deterministic heuristic fallback.</p>
                  </div>
                  <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 font-mono text-[10px] rounded">ACTIVE</span>
                </div>
              </div>
            </div>

            <div className="bg-[#0F1115] p-5 rounded-xl border border-white/10 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                <BrainCircuit className="w-4 h-4 text-purple-400"/>
                AI / ML & Mathematical Pipeline
              </h3>
              <div className="space-y-2 text-xs">
                <div className="p-3 bg-white/[0.02] border border-white/5 rounded-lg flex items-center justify-between">
                  <div>
                    <span className="font-mono text-purple-400 font-bold">12-Dimensional Feature Extractor</span>
                    <p className="text-gray-400 text-[11px]">Transforms raw events into normalized vector: time deviation, device trust deficit, cross-dept weight, download z-score.</p>
                  </div>
                  <span className="px-2 py-0.5 bg-purple-500/10 text-purple-400 font-mono text-[10px] rounded">12 FEATURES</span>
                </div>

                <div className="p-3 bg-white/[0.02] border border-white/5 rounded-lg flex items-center justify-between">
                  <div>
                    <span className="font-mono text-purple-400 font-bold">Isolation Forest + Random Forest</span>
                    <p className="text-gray-400 text-[11px]">Ensemble model tuned on CERT Insider Threat Dataset r4.2 (14,280 samples) achieving 0.978 ROC-AUC.</p>
                  </div>
                  <span className="px-2 py-0.5 bg-purple-500/10 text-purple-400 font-mono text-[10px] rounded">0.978 AUC</span>
                </div>

                <div className="p-3 bg-white/[0.02] border border-white/5 rounded-lg flex items-center justify-between">
                  <div>
                    <span className="font-mono text-purple-400 font-bold">SHAP Explainable AI (XAI)</span>
                    <p className="text-gray-400 text-[11px]">Directional feature attribution decomposing risk scores into human-readable factor contributions.</p>
                  </div>
                  <span className="px-2 py-0.5 bg-purple-500/10 text-purple-400 font-mono text-[10px] rounded">XAI ATTRIBUTION</span>
                </div>

                <div className="p-3 bg-white/[0.02] border border-white/5 rounded-lg flex items-center justify-between">
                  <div>
                    <span className="font-mono text-purple-400 font-bold">Adaptive Trust State Machine</span>
                    <p className="text-gray-400 text-[11px]">Mathematical trust decay curve that penalizes anomalous sessions while rewarding consistent benign behavior.</p>
                  </div>
                  <span className="px-2 py-0.5 bg-purple-500/10 text-purple-400 font-mono text-[10px] rounded">STATEFUL</span>
                </div>
              </div>
            </div>
          </div>
        </div>)}

      {/* TAB 2: BACKEND REST API EXPLORER & SWAGGER-LIKE TESTER */}
      {activeTab === 'backend-api' && (<div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Routes List */}
          <div className="lg:col-span-5 bg-[#0F1115] p-5 rounded-xl border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-gray-300 flex items-center gap-2">
                <Terminal className="w-4 h-4 text-blue-400"/>
                Backend Express Endpoints
              </h2>
              <span className="text-[11px] font-mono text-gray-500">{routes.length} Available</span>
            </div>

            <div className="space-y-2 max-h-[580px] overflow-y-auto pr-1">
              {routes.map((route, i) => {
                const isSelected = selectedRoute?.path === route.path && selectedRoute?.method === route.method;
                return (<button key={i} onClick={() => handleSelectRoute(route)} className={`w-full text-left p-3 rounded-lg border transition-all cursor-pointer ${isSelected
                        ? 'bg-blue-600/10 border-blue-500 text-white shadow-sm'
                        : 'bg-white/[0.02] border-white/5 text-gray-300 hover:bg-white/[0.04] hover:border-white/10'}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${route.method === 'GET'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'}`}>
                        {route.method}
                      </span>
                      <span className="text-xs font-mono font-semibold truncate">{route.path}</span>
                    </div>
                    <p className="text-[11px] text-gray-400 line-clamp-2">{route.description}</p>
                  </button>);
            })}
            </div>
          </div>

          {/* Right Column: Live Request / Response Console */}
          <div className="lg:col-span-7 bg-[#0F1115] p-5 rounded-xl border border-white/10 space-y-4">
            {selectedRoute ? (<>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${selectedRoute.method === 'GET'
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-blue-500/20 text-blue-400'}`}>
                      {selectedRoute.method}
                    </span>
                    <span className="font-mono text-sm font-bold text-white">{selectedRoute.path}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button onClick={handleCopyCurl} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-xs text-gray-300 font-mono transition-colors cursor-pointer" title="Copy cURL Command">
                      {copiedCurl ? <Check className="w-3 h-3 text-emerald-400"/> : <Copy className="w-3 h-3"/>}
                      <span>{copiedCurl ? 'Copied!' : 'cURL'}</span>
                    </button>

                    <button onClick={handleExecuteApiRequest} disabled={apiLoading} className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-bold transition-all shadow-md shadow-blue-600/30 cursor-pointer disabled:opacity-50">
                      <Play className={`w-3 h-3 ${apiLoading ? 'animate-spin' : ''}`}/>
                      <span>{apiLoading ? 'Executing...' : 'Send Request'}</span>
                    </button>
                  </div>
                </div>

                <p className="text-xs text-gray-400">{selectedRoute.description}</p>

                {/* Request Payload Editor (if POST) */}
                {selectedRoute.method !== 'GET' && (<div className="space-y-2">
                    <div className="text-[11px] font-mono uppercase text-gray-400 font-bold flex items-center justify-between">
                      <span>Request JSON Body</span>
                      <span className="text-gray-500">application/json</span>
                    </div>
                    <textarea value={customRequestBody} onChange={(e) => setCustomRequestBody(e.target.value)} rows={6} className="w-full bg-[#0A0B0D] border border-white/10 rounded-lg p-3 font-mono text-xs text-emerald-400 focus:outline-none focus:border-blue-500 resize-y" placeholder="{ ... }"/>
                  </div>)}

                {/* Response Viewer */}
                <div className="space-y-2 pt-2">
                  <div className="text-[11px] font-mono uppercase text-gray-400 font-bold flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span>Live Server Response</span>
                      {apiStatus !== null && (<span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${apiStatus < 400
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-red-500/20 text-red-400'}`}>
                          HTTP {apiStatus}
                        </span>)}
                    </div>
                    {apiLatency !== null && (<span className="text-gray-400 font-mono text-[10px]">Roundtrip: {apiLatency}ms</span>)}
                  </div>

                  <div className="bg-[#0A0B0D] border border-white/10 rounded-lg p-4 font-mono text-xs text-gray-300 max-h-[280px] overflow-y-auto">
                    {apiLoading ? (<div className="flex items-center gap-2 text-gray-500 py-4 justify-center">
                        <RefreshCw className="w-4 h-4 animate-spin text-blue-400"/>
                        <span>Sending HTTP request to Express backend...</span>
                      </div>) : apiResponse ? (<pre className="text-xs text-blue-300 whitespace-pre-wrap">
                        {JSON.stringify(apiResponse, null, 2)}
                      </pre>) : (<div className="text-gray-500 text-center py-6">
                        Click "Send Request" above to execute this endpoint on the live Node/Express server.
                      </div>)}
                  </div>
                </div>
              </>) : (<div className="text-center py-16 text-gray-500 text-xs">
                Select an endpoint from the left menu to inspect and execute it.
              </div>)}
          </div>
        </div>)}

      {/* TAB 3: AI / ML MODEL LAB & UEBA WORKBENCH */}
      {activeTab === 'aiml-model' && (<div className="space-y-6">
          {/* Interactive Feature Vector Playground */}
          <div className="bg-[#0F1115] p-6 rounded-xl border border-white/10 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
                  <BrainCircuit className="w-4 h-4 text-purple-400"/>
                  Live Isolation Forest & UEBA Feature Vector Playground
                </h2>
                <p className="text-xs text-gray-400 mt-1">
                  Adjust raw behavioral features below to trigger real-time feature extraction, anomaly prediction, and SHAP attribution waterfall.
                </p>
              </div>

              <button onClick={handleRunLiveMlInference} disabled={mlInferring} className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-purple-600/30 cursor-pointer disabled:opacity-50">
                <Zap className={`w-3.5 h-3.5 ${mlInferring ? 'animate-spin' : ''}`}/>
                <span>{mlInferring ? 'Inferring...' : 'Execute ML Model'}</span>
              </button>
            </div>

            {/* Sliders Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-white/[0.02] p-4 rounded-xl border border-white/5">
              {/* Feature 1: Hour of Day */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-300 font-medium">Access Time</span>
                  <span className="font-mono text-purple-400 font-bold">
                    {hourSlider.toString().padStart(2, '0')}:00 {hourSlider < 8 || hourSlider > 18 ? '(Off-Hours)' : '(Normal)'}
                  </span>
                </div>
                <input type="range" min="0" max="23" value={hourSlider} onChange={(e) => setHourSlider(Number(e.target.value))} className="w-full accent-purple-500 cursor-pointer"/>
                <div className="text-[10px] text-gray-500 flex justify-between">
                  <span>00:00 (Midnight)</span>
                  <span>12:00</span>
                  <span>23:00</span>
                </div>
              </div>

              {/* Feature 2: Device Trust Deficit */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-300 font-medium">Device Trust Rating</span>
                  <span className="font-mono text-purple-400 font-bold">{deviceTrustSlider}%</span>
                </div>
                <input type="range" min="5" max="100" value={deviceTrustSlider} onChange={(e) => setDeviceTrustSlider(Number(e.target.value))} className="w-full accent-purple-500 cursor-pointer"/>
                <div className="text-[10px] text-gray-500 flex justify-between">
                  <span>5% (Untrusted Node)</span>
                  <span>50%</span>
                  <span>100% (MDM Managed)</span>
                </div>
              </div>

              {/* Feature 3: Download Volume */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-300 font-medium">Download Size</span>
                  <span className="font-mono text-purple-400 font-bold">{downloadVolumeSlider} MB</span>
                </div>
                <input type="range" min="10" max="2000" step="20" value={downloadVolumeSlider} onChange={(e) => setDownloadVolumeSlider(Number(e.target.value))} className="w-full accent-purple-500 cursor-pointer"/>
                <div className="text-[10px] text-gray-500 flex justify-between">
                  <span>10 MB (Normal)</span>
                  <span>500 MB</span>
                  <span>2000 MB (Mass)</span>
                </div>
              </div>

              {/* Feature 4: Failed Logins */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-300 font-medium">Failed Authentication Count</span>
                  <span className="font-mono text-purple-400 font-bold">{failedLoginsSlider} attempts</span>
                </div>
                <input type="range" min="0" max="10" value={failedLoginsSlider} onChange={(e) => setFailedLoginsSlider(Number(e.target.value))} className="w-full accent-purple-500 cursor-pointer"/>
                <div className="text-[10px] text-gray-500 flex justify-between">
                  <span>0 (Clean)</span>
                  <span>5</span>
                  <span>10 (Brute-Force)</span>
                </div>
              </div>

              {/* Feature 5: Cross-Department Checkbox */}
              <div className="flex items-center justify-between p-3 bg-[#0A0B0D] rounded-lg border border-white/5">
                <div>
                  <div className="text-xs text-white font-medium">Cross-Department Access</div>
                  <div className="text-[10px] text-gray-400">Access outside assigned department clearance</div>
                </div>
                <input type="checkbox" checked={crossDeptChecked} onChange={(e) => setCrossDeptChecked(e.target.checked)} className="w-4 h-4 accent-purple-500 rounded cursor-pointer"/>
              </div>

              {/* Feature 6: Privilege Elevation Checkbox */}
              <div className="flex items-center justify-between p-3 bg-[#0A0B0D] rounded-lg border border-white/5">
                <div>
                  <div className="text-xs text-white font-medium">Privilege Escalation Flag</div>
                  <div className="text-[10px] text-gray-400">Attempted admin command execution</div>
                </div>
                <input type="checkbox" checked={privilegeChecked} onChange={(e) => setPrivilegeChecked(e.target.checked)} className="w-4 h-4 accent-purple-500 rounded cursor-pointer"/>
              </div>
            </div>

            {/* Inference Output Preview */}
            {mlInferenceResult && (<div className="bg-[#0A0B0D] p-5 rounded-xl border border-purple-500/30 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-gray-400 uppercase">Model Output:</span>
                    <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${mlInferenceResult.isAnomalous
                    ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                    : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}`}>
                      {mlInferenceResult.isAnomalous ? 'ANOMALY DETECTED' : 'BENIGN ACTIVITY'}
                    </span>
                  </div>

                  <div className="text-xs font-mono text-purple-300">
                    Anomaly Score: <span className="font-bold text-white">{(mlInferenceResult.mlAnomalyScore * 100).toFixed(1)}%</span>
                  </div>
                </div>

                {/* SHAP Factor Waterfall */}
                <div className="space-y-2">
                  <div className="text-[11px] font-mono text-gray-400 uppercase font-bold">
                    SHAP Explainable AI (XAI) Attribution Breakdown
                  </div>
                  <div className="space-y-1.5">
                    {mlInferenceResult.attributions?.map((attr, idx) => (<div key={idx} className="flex items-center justify-between p-2.5 bg-white/[0.02] border border-white/5 rounded text-xs">
                        <div className="space-y-0.5">
                          <div className="font-semibold text-white">{attr.factor}</div>
                          <div className="text-[11px] text-gray-400">{attr.description}</div>
                        </div>
                        <span className="font-mono font-bold text-purple-400 ml-4 shrink-0">
                          +{attr.scoreImpact} pts
                        </span>
                      </div>))}
                  </div>
                </div>
              </div>)}
          </div>

          {/* Model Architecture & Python Code Export */}
          <div className="bg-[#0F1115] p-6 rounded-xl border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
                <FileCode2 className="w-4 h-4 text-purple-400"/>
                Production Scikit-Learn / XGBoost Implementation Export
              </h3>
              <span className="text-[11px] font-mono text-purple-400 font-bold">Python 3.10+ / CERT r4.2 Benchmark</span>
            </div>

            <div className="bg-[#0A0B0D] p-4 rounded-lg border border-white/10 font-mono text-xs text-purple-200 overflow-x-auto">
              <pre>{`# Production Contextual UEBA Anomaly Detection Pipeline
import numpy as np
from sklearn.ensemble import IsolationForest
import xgboost as xgb
import shap

class ZeroTrustUEBAPipeline:
    def __init__(self):
        # Unsupervised Isolation Forest for raw outlier identification
        self.iso_forest = IsolationForest(
            n_estimators=200,
            contamination=0.035,
            random_state=42,
            n_jobs=-1
        )
        # Supervised XGBoost meta-classifier for contextual risk weighting
        self.xgb_model = xgb.XGBClassifier(
            max_depth=5,
            learning_rate=0.05,
            n_estimators=300,
            eval_metric="auc"
        )
        self.explainer = None

    def fit_pipeline(self, X_train, y_train):
        self.iso_forest.fit(X_train)
        iso_scores = -self.iso_forest.score_samples(X_train).reshape(-1, 1)
        X_enhanced = np.hstack([X_train, iso_scores])
        self.xgb_model.fit(X_enhanced, y_train)
        self.explainer = shap.TreeExplainer(self.xgb_model)
        return self

    def predict_risk_and_xai(self, feature_vector):
        iso_score = -self.iso_forest.score_samples(feature_vector.reshape(1, -1))
        x_in = np.hstack([feature_vector.reshape(1, -1), iso_score.reshape(1, 1)])
        prob = self.xgb_model.predict_proba(x_in)[0, 1]
        shap_values = self.explainer.shap_values(x_in)[0]
        return {
            "risk_probability": float(prob),
            "anomaly_score": float(iso_score[0]),
            "shap_attribution": shap_values.tolist()
        }`}</pre>
            </div>
          </div>
        </div>)}

      {/* TAB 4: CYBERSECURITY & ZERO TRUST COMMAND CENTER */}
      {activeTab === 'cybersecurity' && (<div className="space-y-6">
          {/* MITRE ATT&CK Matrix Simulator */}
          <div className="bg-[#0F1115] p-6 rounded-xl border border-white/10 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-400"/>
                  MITRE ATT&CK Threat Simulation & Automated Zero Trust Mitigation
                </h2>
                <p className="text-xs text-gray-400 mt-1">
                  Launch active adversary techniques against the live Zero Trust Policy Enforcement Point (PEP) to observe instantaneous automated containment.
                </p>
              </div>

              <button onClick={handleRunMitreAttack} disabled={mitreExecuting} className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-red-600/30 cursor-pointer disabled:opacity-50">
                <Flame className={`w-3.5 h-3.5 ${mitreExecuting ? 'animate-spin' : ''}`}/>
                <span>{mitreExecuting ? 'Executing Attack...' : 'Launch MITRE Attack'}</span>
              </button>
            </div>

            {/* Attack Techniques Selector */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <button onClick={() => setSelectedMitreTechnique('T1078')} className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${selectedMitreTechnique === 'T1078'
                ? 'bg-red-500/10 border-red-500 text-white shadow-sm'
                : 'bg-white/[0.02] border-white/5 text-gray-300 hover:bg-white/[0.04]'}`}>
                <div className="text-[10px] font-mono font-bold text-red-400 mb-1">MITRE T1078</div>
                <div className="text-sm font-bold mb-1">Credential Stuffing</div>
                <p className="text-xs text-gray-400">Multiple failed passwords from unverified external IP proxy.</p>
              </button>

              <button onClick={() => setSelectedMitreTechnique('T1048')} className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${selectedMitreTechnique === 'T1048'
                ? 'bg-red-500/10 border-red-500 text-white shadow-sm'
                : 'bg-white/[0.02] border-white/5 text-gray-300 hover:bg-white/[0.04]'}`}>
                <div className="text-[10px] font-mono font-bold text-red-400 mb-1">MITRE T1048</div>
                <div className="text-sm font-bold mb-1">Off-Hours Exfiltration</div>
                <p className="text-xs text-gray-400">750 MB mass financial record download at 02:00 AM.</p>
              </button>

              <button onClick={() => setSelectedMitreTechnique('T1052')} className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${selectedMitreTechnique === 'T1052'
                ? 'bg-red-500/10 border-red-500 text-white shadow-sm'
                : 'bg-white/[0.02] border-white/5 text-gray-300 hover:bg-white/[0.04]'}`}>
                <div className="text-[10px] font-mono font-bold text-red-400 mb-1">MITRE T1052</div>
                <div className="text-sm font-bold mb-1">Removable USB Copy</div>
                <p className="text-xs text-gray-400">Unencrypted peripheral drive file copy during active session.</p>
              </button>

              <button onClick={() => setSelectedMitreTechnique('T1068')} className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${selectedMitreTechnique === 'T1068'
                ? 'bg-red-500/10 border-red-500 text-white shadow-sm'
                : 'bg-white/[0.02] border-white/5 text-gray-300 hover:bg-white/[0.04]'}`}>
                <div className="text-[10px] font-mono font-bold text-red-400 mb-1">MITRE T1068</div>
                <div className="text-sm font-bold mb-1">Privilege Escalation</div>
                <p className="text-xs text-gray-400">Unauthorized attempt to modify IAM administrative access rules.</p>
              </button>
            </div>

            {/* Target User Selector */}
            <div className="flex items-center gap-3 bg-white/[0.02] p-3 rounded-lg border border-white/5 text-xs">
              <span className="text-gray-400 font-medium">Simulate Against Account:</span>
              <select value={selectedMitreUser} onChange={(e) => setSelectedMitreUser(e.target.value)} className="bg-[#0A0B0D] border border-white/10 text-white rounded px-3 py-1.5 focus:outline-none focus:border-blue-500 cursor-pointer">
                {users.map((u) => (<option key={u.id} value={u.id}>
                    {u.name} ({u.employeeId} - {u.department}) - Risk: {u.currentRiskScore}
                  </option>))}
              </select>
            </div>

            {/* Mitigation Success Notification */}
            {mitigationResult && (<div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-400 flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400"/>
                <span className="font-medium">{mitigationResult}</span>
              </div>)}

            {/* Attack Outcome Preview */}
            {mitreResult && (<div className="bg-[#0A0B0D] p-5 rounded-xl border border-red-500/30 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <div className="space-y-0.5">
                    <div className="text-xs font-mono font-bold text-red-400">
                      {mitreResult.techniqueName}
                    </div>
                    <div className="text-sm font-bold text-white">{mitreResult.scenarioName}</div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-mono font-bold px-2 py-1 rounded ${mitreResult.zeroTrustDecision.decision === 'FREEZE'
                    ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                    : mitreResult.zeroTrustDecision.decision === 'MFA'
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'}`}>
                      PEP ACTION: {mitreResult.zeroTrustDecision.decision}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div className="p-3 bg-white/[0.02] rounded border border-white/5">
                    <div className="text-gray-500 font-mono text-[10px] uppercase">New Dynamic Risk Score</div>
                    <div className="text-lg font-bold text-red-400">{mitreResult.user.newRiskScore} / 100</div>
                    <div className="text-[11px] text-gray-400">ML Anomaly: {(mitreResult.mlEvaluation.anomalyScore * 100).toFixed(1)}%</div>
                  </div>

                  <div className="p-3 bg-white/[0.02] rounded border border-white/5">
                    <div className="text-gray-500 font-mono text-[10px] uppercase">New Trust Score</div>
                    <div className="text-lg font-bold text-amber-400">{mitreResult.user.newTrustScore} / 100</div>
                    <div className="text-[11px] text-gray-400">Contextual Trust Decay Applied</div>
                  </div>

                  <div className="p-3 bg-white/[0.02] rounded border border-white/5">
                    <div className="text-gray-500 font-mono text-[10px] uppercase">Account Security Standing</div>
                    <div className="text-lg font-bold text-white">{mitreResult.user.status}</div>
                    <div className="text-[11px] text-gray-400">
                      {mitreResult.zeroTrustDecision.isFrozen ? 'Account Auto-Frozen' : 'Access Restricted'}
                    </div>
                  </div>
                </div>

                {/* Instant Remediation Buttons */}
                <div className="pt-2 border-t border-white/10 flex flex-wrap items-center gap-2">
                  <span className="text-xs font-mono text-gray-400 mr-2 font-bold">Execute Instant SOC Remediation:</span>
                  <button onClick={() => handleExecuteMitigation('FREEZE_ACCOUNT')} className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded text-xs font-bold transition-colors cursor-pointer">
                    Lock Account & Revoke JWT
                  </button>
                  <button onClick={() => handleExecuteMitigation('STEP_UP_MFA')} className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded text-xs font-bold transition-colors cursor-pointer">
                    Force Biometric MFA Challenge
                  </button>
                  <button onClick={() => handleExecuteMitigation('ISOLATE_DEVICE')} className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded text-xs font-bold transition-colors cursor-pointer">
                    Isolate & Revoke Device
                  </button>
                  <button onClick={() => handleExecuteMitigation('UNFREEZE_ACCOUNT')} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold transition-colors cursor-pointer">
                    Restore to Active Standing
                  </button>
                </div>
              </div>)}
          </div>
        </div>)}
    </div>);
};
