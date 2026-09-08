import React, { useState } from 'react';
import { SeverityBadge, StatusBadge } from '../components/Badges';
import { AlertOctagon, Search, Sparkles, ShieldAlert, FileSpreadsheet, FileCode, Lock, XCircle } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export const IncidentsPage = ({ incidents, users, currentUser, onRefreshData, onOpenCopilot }) => {
    const { isDark } = useTheme();
    const [selectedIncident, setSelectedIncident] = useState(null);
    const [filterSeverity, setFilterSeverity] = useState('ALL');
    const [filterStatus, setFilterStatus] = useState('ALL');
    const [search, setSearch] = useState('');
    const [resolutionNotes, setResolutionNotes] = useState('');
    const [resolving, setResolving] = useState(false);
    const [generatingAi, setGeneratingAi] = useState(false);
    const [exporting, setExporting] = useState(null);
    const [exportError, setExportError] = useState(null);

    const isAuthorized = !currentUser || currentUser.role === 'SECURITY_ADMIN' || currentUser.role === 'SYSTEM_ADMIN';

    const filteredIncidents = incidents.filter(i => {
        const matchesSev = filterSeverity === 'ALL' || i.severity === filterSeverity;
        const matchesStat = filterStatus === 'ALL' || i.status === filterStatus;
        const matchesSearch = !search.trim() ||
            i.id.toLowerCase().includes(search.toLowerCase()) ||
            i.userName.toLowerCase().includes(search.toLowerCase()) ||
            i.userDepartment.toLowerCase().includes(search.toLowerCase()) ||
            i.eventType.toLowerCase().includes(search.toLowerCase()) ||
            (i.title && i.title.toLowerCase().includes(search.toLowerCase()));
        return matchesSev && matchesStat && matchesSearch;
    });

    const openCount = incidents.filter(i => i.status === 'OPEN').length;
    const criticalCount = incidents.filter(i => i.severity === 'CRITICAL' && i.status !== 'RESOLVED').length;

    const handleExport = async (format) => {
        try {
            setExportError(null);
            setExporting(format);
            const params = new URLSearchParams();
            params.set('format', format);
            if (filterSeverity !== 'ALL') params.set('severity', filterSeverity);
            if (filterStatus !== 'ALL') params.set('status', filterStatus);
            if (search.trim()) params.set('search', search.trim());
            if (currentUser?.id) params.set('userId', currentUser.id);

            const res = await fetch(`/api/incidents/export?${params.toString()}`, {
                headers: {
                    'x-user-id': currentUser?.id || ''
                }
            });
            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.error?.message || `Export failed with status ${res.status}`);
            }
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const dateStr = new Date().toISOString().split('T')[0];
            const filename = `cyberorbit-incidents-${dateStr}.${format}`;
            const downloadAnchor = document.createElement('a');
            downloadAnchor.href = url;
            downloadAnchor.download = filename;
            document.body.appendChild(downloadAnchor);
            downloadAnchor.click();
            downloadAnchor.remove();
            window.URL.revokeObjectURL(url);
        }
        catch (err) {
            console.error('Failed to export incidents:', err);
            setExportError(err.message || 'Failed to export incident reports.');
        }
        finally {
            setExporting(null);
        }
    };

    const handleGenerateAiExplanation = async (incidentId) => {
        try {
            setGeneratingAi(true);
            const res = await fetch(`/api/incidents/${incidentId}/ai-explain`, { method: 'POST' });
            const data = await res.json();
            if (data.success && selectedIncident) {
                setSelectedIncident({ ...selectedIncident, aiExplanation: data.explanation });
                onRefreshData();
            }
        }
        catch (err) {
            console.error('Failed to generate AI explanation', err);
        }
        finally {
            setGeneratingAi(false);
        }
    };

    const handleResolveIncident = async (incidentId, status) => {
        try {
            setResolving(true);
            const res = await fetch(`/api/incidents/${incidentId}/resolve`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ resolutionNotes, newStatus: status })
            });
            const data = await res.json();
            if (data.success) {
                setSelectedIncident(data.incident);
                setResolutionNotes('');
                onRefreshData();
            }
        }
        catch (err) {
            console.error('Failed to resolve incident', err);
        }
        finally {
            setResolving(false);
        }
    };

    return (
      <div className="space-y-6">
        {/* SECTION 1: Editorial Hero Header (Authoritative Black & Gold) */}
        <div className="bg-[#07080A] border border-[#D4AF37]/35 p-8 shadow-2xl relative overflow-hidden flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-[#D4AF37]"/>
          
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="px-2.5 py-0.5 border border-[#D4AF37]/40 text-[#D4AF37] bg-black text-xs font-mono tracking-widest uppercase">
                SECURITY OPERATIONS
              </span>
              <span className="text-xs text-gray-400 font-mono">
                Threat Containment &amp; Forensic Auditing
              </span>
            </div>
            <h1 className="font-serif-display text-3xl sm:text-4xl text-white font-normal tracking-wide">
              Insider Threat Incident Queue
            </h1>
            <p className="text-xs text-gray-400 max-w-2xl mt-2 leading-relaxed font-sans">
              Investigate automated behavioral alerts, review multi-signal XAI feature attributions, consult Gemini AI root cause analysis, and execute automated containment resolutions.
            </p>
          </div>

          {/* Incident Export Actions */}
          <div className="flex flex-wrap items-center gap-3">
            {!isAuthorized && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 border border-amber-500/40 bg-black text-amber-300 text-xs font-mono">
                <Lock className="w-3.5 h-3.5"/>
                <span>SOC Admin Required</span>
              </div>
            )}

            <button 
              onClick={() => handleExport('json')} 
              disabled={!isAuthorized || exporting !== null} 
              title={isAuthorized ? 'Export filtered incidents as structured JSON' : 'Requires Security Admin permissions'} 
              className={`px-4 py-2 text-xs font-mono tracking-wider border transition-all flex items-center gap-2 cursor-pointer ${isAuthorized && exporting === null
                ? 'bg-black text-[#D4AF37] border-[#D4AF37]/50 hover:border-[#D4AF37] hover:bg-[#D4AF37] hover:text-black'
                : 'bg-black text-gray-600 border-gray-800 cursor-not-allowed opacity-50'}`}
            >
              <FileCode className="w-4 h-4"/>
              <span>{exporting === 'json' ? 'EXPORTING JSON...' : 'EXPORT JSON'}</span>
            </button>

            <button 
              onClick={() => handleExport('csv')} 
              disabled={!isAuthorized || exporting !== null} 
              title={isAuthorized ? 'Export filtered incidents as CSV spreadsheet' : 'Requires Security Admin permissions'} 
              className={`px-4 py-2 text-xs font-mono font-bold tracking-wider border transition-all flex items-center gap-2 cursor-pointer ${isAuthorized && exporting === null
                ? 'bg-[#D4AF37] text-black border-[#D4AF37] hover:bg-[#B8860B] hover:text-white hover:border-[#B8860B]'
                : 'bg-black text-gray-600 border-gray-800 cursor-not-allowed opacity-50'}`}
            >
              <FileSpreadsheet className="w-4 h-4"/>
              <span>{exporting === 'csv' ? 'EXPORTING CSV...' : 'EXPORT CSV'}</span>
            </button>
          </div>
        </div>

        {exportError && (
          <div className="bg-black border border-red-500/40 p-4 flex items-center justify-between text-xs text-red-400 font-mono">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-red-400 flex-shrink-0"/>
              <span>{exportError}</span>
            </div>
            <button onClick={() => setExportError(null)} className="text-red-400 hover:text-white cursor-pointer">
              <XCircle className="w-4 h-4"/>
            </button>
          </div>
        )}

        {/* SECTION 2: Filter & Queue Controls Bar (Crisp White / Light Card) */}
        <div className={`p-4 border transition-colors shadow-sm flex flex-wrap items-center justify-between gap-4 text-xs ${
          isDark ? 'bg-[#0E1015] border-[#D4AF37]/25 text-white' : 'bg-white border-gray-200 text-[#111317]'
        }`}>
          <div className="relative w-full sm:w-80">
            <input 
              type="text" 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              placeholder="Search incident ID, user, event..." 
              className={`w-full border pl-9 pr-3 py-2 text-xs outline-none font-mono transition-all ${
                isDark 
                  ? 'bg-black border-[#D4AF37]/30 text-white focus:border-[#D4AF37]' 
                  : 'bg-[#F9F9F7] border-gray-300 text-black focus:border-[#D4AF37]'
              }`}
            />
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2"/>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-gray-400 font-mono text-[11px] uppercase">Severity:</span>
              <select 
                value={filterSeverity} 
                onChange={(e) => setFilterSeverity(e.target.value)} 
                className={`border px-3 py-1.5 text-xs outline-none font-mono focus:border-[#D4AF37] ${
                  isDark ? 'bg-black border-[#D4AF37]/30 text-white' : 'bg-white border-gray-300 text-black'
                }`}
              >
                <option value="ALL">All Severities</option>
                <option value="CRITICAL">Critical Only</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-gray-400 font-mono text-[11px] uppercase">Status:</span>
              <select 
                value={filterStatus} 
                onChange={(e) => setFilterStatus(e.target.value)} 
                className={`border px-3 py-1.5 text-xs outline-none font-mono focus:border-[#D4AF37] ${
                  isDark ? 'bg-black border-[#D4AF37]/30 text-white' : 'bg-white border-gray-300 text-black'
                }`}
              >
                <option value="ALL">All Statuses</option>
                <option value="OPEN">Open</option>
                <option value="UNDER_REVIEW">Under Review</option>
                <option value="RESOLVED">Resolved</option>
              </select>
            </div>

            {/* Quick Metrics Badges */}
            <div className="flex items-center gap-2 pl-2 border-l border-gray-300 dark:border-gray-800">
              <span className="px-2 py-0.5 text-[10px] font-mono border border-[#D4AF37]/40 text-[#D4AF37] bg-[#D4AF37]/10">
                {incidents.length} TOTAL
              </span>
              <span className="px-2 py-0.5 text-[10px] font-mono border border-red-500/40 text-red-500 bg-red-500/10">
                {criticalCount} CRITICAL
              </span>
              <span className="px-2 py-0.5 text-[10px] font-mono border border-amber-500/40 text-amber-500 bg-amber-500/10">
                {openCount} OPEN
              </span>
            </div>
          </div>
        </div>

        {/* SECTION 3 & 4: Main Grid (Queue List + Investigation Inspector) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Incident List Cards (5 cols) */}
          <div className="lg:col-span-5 space-y-3">
            {filteredIncidents.length === 0 ? (
              <div className={`border p-8 text-center text-xs font-mono ${
                isDark ? 'bg-[#0E1015] border-[#D4AF37]/20 text-gray-400' : 'bg-white border-gray-200 text-gray-500 shadow-sm'
              }`}>
                No incidents matching current criteria.
              </div>
            ) : (
              filteredIncidents.map(inc => {
                const isSelected = selectedIncident?.id === inc.id;
                return (
                  <div 
                    key={inc.id} 
                    onClick={() => setSelectedIncident(inc)} 
                    className={`p-4 border transition-all cursor-pointer relative shadow-sm hover:shadow-md ${
                      isSelected
                        ? 'bg-[#07080A] border-2 border-[#D4AF37] shadow-xl text-white'
                        : isDark 
                          ? 'bg-[#0A0C10] border-[#D4AF37]/20 hover:border-[#D4AF37]/60 hover:bg-[#07080A] text-gray-200' 
                          : 'bg-white border-gray-200 hover:border-[#D4AF37] hover:bg-[#FBFBFA] text-[#111317]'
                    }`}
                  >
                    {isSelected && <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-[#D4AF37]"/>}
                    
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`font-mono font-bold text-xs ${isSelected ? 'text-[#D4AF37]' : 'text-current'}`}>
                          {inc.id}
                        </span>
                        <SeverityBadge severity={inc.severity}/>
                      </div>
                      <StatusBadge status={inc.status}/>
                    </div>

                    <div className={`font-semibold text-xs mb-1 ${isSelected ? 'text-white' : 'text-current'}`}>
                      {inc.userName} <span className="text-gray-400 font-mono text-[11px]">({inc.userDepartment})</span>
                    </div>

                    <p className="text-[11px] text-gray-400 font-mono truncate mb-2">
                      {inc.eventType} • Risk Index: <strong className="text-[#D4AF37]">{inc.riskScore}/100</strong>
                    </p>

                    <div className="flex items-center justify-between text-[10px] text-gray-400 font-mono pt-2 border-t border-gray-200 dark:border-[#D4AF37]/15">
                      <span>{new Date(inc.detectedAt).toLocaleString()}</span>
                      <span className="text-[#D4AF37] font-semibold">{inc.recommendedAction}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Right Column: Detailed Investigation Console (7 cols - Black Shell with White/Gold Sub-cards) */}
          <div className="lg:col-span-7">
            {selectedIncident ? (
              <div className="bg-[#07080A] border border-[#D4AF37]/35 p-6 shadow-2xl space-y-5 text-gray-200 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-[#D4AF37]"/>
                
                {/* Console Header */}
                <div className="flex items-center justify-between pb-4 border-b border-[#D4AF37]/25">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono font-bold text-sm text-[#D4AF37]">{selectedIncident.id}</span>
                      <SeverityBadge severity={selectedIncident.severity}/>
                      <StatusBadge status={selectedIncident.status}/>
                    </div>
                    <h3 className="font-serif-display text-xl text-white">
                      {selectedIncident.eventType} - {selectedIncident.userName}
                    </h3>
                  </div>

                  <button 
                    onClick={() => onOpenCopilot({ incidentId: selectedIncident.id, userId: selectedIncident.userId })} 
                    className="px-3.5 py-1.5 bg-black border border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black text-xs font-mono font-bold tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                  >
                    <Sparkles className="w-3.5 h-3.5"/>
                    <span>ASK COPILOT</span>
                  </button>
                </div>

                {/* Sub-Card Strip: 5 Crisp Metric Boxes */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 text-xs">
                  <div className="bg-[#0E1015] p-3 border border-[#D4AF37]/25">
                    <span className="text-[9px] font-mono uppercase text-gray-400 block mb-1">Risk Index</span>
                    <span className="text-xl font-bold font-mono text-[#D4AF37]">{selectedIncident.riskScore}/100</span>
                  </div>
                  <div className="bg-[#0E1015] p-3 border border-[#D4AF37]/25">
                    <span className="text-[9px] font-mono uppercase text-gray-400 block mb-1">Action Enforced</span>
                    <span className="text-xs font-bold font-mono text-gray-100">{selectedIncident.recommendedAction}</span>
                  </div>
                  <div className="bg-[#0E1015] p-3 border border-[#D4AF37]/25">
                    <span className="text-[9px] font-mono uppercase text-gray-400 block mb-1">Containment</span>
                    <span className="text-xs font-bold font-mono text-gray-100">{selectedIncident.adminActionTaken || 'Pending'}</span>
                  </div>
                  {typeof selectedIncident.supervisedProbability === 'number' && (
                    <div className="bg-[#0E1015] p-3 border border-[#D4AF37]/25">
                      <span className="text-[9px] font-mono uppercase text-gray-400 block mb-1">Supervised ML</span>
                      <span className="text-xs font-bold font-mono text-[#D4AF37]">{(selectedIncident.supervisedProbability * 100).toFixed(1)}%</span>
                    </div>
                  )}
                  {typeof selectedIncident.isolationForestScore === 'number' && (
                    <div className="bg-[#0E1015] p-3 border border-[#D4AF37]/25">
                      <span className="text-[9px] font-mono uppercase text-gray-400 block mb-1">Isolation Forest</span>
                      <span className="text-xs font-bold font-mono text-emerald-400">{(selectedIncident.isolationForestScore * 100).toFixed(1)}%</span>
                    </div>
                  )}
                </div>

                {/* Golden Yellow Accent Section: XAI Diagnostic Rationale */}
                {selectedIncident.xaiExplanation && (
                  <div className="p-4 bg-[#D4AF37]/10 border-l-4 border-[#D4AF37] border-y border-r border-[#D4AF37]/25 space-y-1 text-xs">
                    <span className="font-mono text-[10px] uppercase text-[#D4AF37] font-bold block">
                      XAI Feature Attribution Rationale
                    </span>
                    <p className="text-gray-200 font-sans text-xs leading-relaxed">{selectedIncident.xaiExplanation}</p>
                  </div>
                )}

                {/* Behavioral Telemetry Signals */}
                <div className="space-y-2">
                  <h4 className="font-bold text-xs font-mono uppercase text-[#D4AF37] tracking-wider">
                    Contributing Behavioral Telemetry Signals:
                  </h4>
                  <div className="space-y-1.5">
                    {selectedIncident.contributingFactors?.map((f, i) => (
                      <div key={i} className="flex items-center gap-2.5 p-2.5 bg-black/80 border border-[#D4AF37]/20 text-xs">
                        <span className="w-1.5 h-1.5 bg-[#D4AF37] shrink-0"/>
                        <span className="text-gray-200 font-sans">{f}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Gemini AI Root Cause Investigation Card */}
                <div className="p-4 bg-black border border-[#D4AF37]/35 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[#D4AF37]"/>
                      <h4 className="font-mono text-xs font-semibold text-[#D4AF37] uppercase tracking-wider">
                        Gemini Threat Forensics
                      </h4>
                    </div>

                    <button 
                      onClick={() => handleGenerateAiExplanation(selectedIncident.id)} 
                      disabled={generatingAi} 
                      className="text-xs font-mono text-[#D4AF37] hover:text-white underline disabled:opacity-50 cursor-pointer"
                    >
                      {generatingAi ? 'ANALYZING...' : 'REFRESH AI REPORT'}
                    </button>
                  </div>

                  <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-line font-sans">
                    {selectedIncident.aiExplanation || 'AI forensic summary pending analysis.'}
                  </p>
                </div>

                {/* White / Light Remediation Box */}
                <div className="p-4 bg-white text-black border border-[#D4AF37]/40 space-y-3 shadow-md">
                  <h4 className="font-bold text-xs font-mono uppercase text-[#111317] tracking-wider">
                    SOC Analyst Resolution &amp; Remediation:
                  </h4>
                  <textarea 
                    rows={2} 
                    value={resolutionNotes} 
                    onChange={(e) => setResolutionNotes(e.target.value)} 
                    placeholder="Enter containment justification, mitigation notes, or adjustment reason..." 
                    className="w-full bg-[#F9F9F7] border border-gray-300 p-3 text-xs text-black outline-none focus:border-[#D4AF37] resize-none font-sans"
                  />

                  <div className="flex gap-3">
                    <button 
                      onClick={() => handleResolveIncident(selectedIncident.id, 'UNDER_REVIEW')} 
                      disabled={resolving} 
                      className="flex-1 py-2.5 px-3 bg-black border border-black text-amber-300 hover:bg-gray-900 text-xs font-mono font-bold tracking-wider transition-all disabled:opacity-50 cursor-pointer"
                    >
                      MARK UNDER REVIEW
                    </button>
                    <button 
                      onClick={() => handleResolveIncident(selectedIncident.id, 'RESOLVED')} 
                      disabled={resolving} 
                      className="flex-1 py-2.5 px-3 bg-[#D4AF37] hover:bg-[#B8860B] text-black font-mono font-bold text-xs tracking-wider transition-all disabled:opacity-50 cursor-pointer border border-[#D4AF37] hover:border-[#B8860B] shadow-sm"
                    >
                      RESOLVE &amp; CLOSE
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className={`border border-dashed p-12 text-center space-y-3 ${
                isDark ? 'bg-[#0E1015] border-[#D4AF37]/25 text-gray-400' : 'bg-white border-gray-300 text-gray-500 shadow-sm'
              }`}>
                <AlertOctagon className="w-10 h-10 mx-auto text-[#D4AF37]/60"/>
                <p className="font-serif-display text-xl text-current">Select an Incident to Investigate</p>
                <p className="text-xs text-gray-400 font-sans max-w-sm mx-auto">
                  Click any alert from the queue to view full forensic signals, ML isolation forest scores, root cause explanations, and containment execution.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
};


