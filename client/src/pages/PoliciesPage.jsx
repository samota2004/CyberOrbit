import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Sliders, 
  CheckCircle2, 
  AlertTriangle, 
  RotateCcw, 
  Save,
  ArrowRight,
  User,
  Laptop,
  Activity,
  Gauge,
  ShieldCheck,
  Scale,
  Lock
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export const PoliciesPage = ({ onRefreshData }) => {
  const { isDark } = useTheme();

  const [config, setConfig] = useState({
    lowRiskMax: 39,
    mediumRiskMax: 59,
    highRiskMax: 74,
    veryHighRiskMax: 89,
    criticalThreshold: 90,
    mfaThreshold: 60,
    approvalThreshold: 75,
    restrictionThreshold: 90,
    crossDeptRiskPenalty: 28,
    untrustedDevicePenalty: 25,
    offHoursPenalty: 20,
    largeDownloadThresholdMB: 150,
    autoFreezeOnCritical: true,
    adaptiveTrustRecoveryRate: 3
  });

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/api/policies')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.config) {
          setConfig(data.config);
        }
      })
      .catch(err => console.error('Failed to load policies', err));
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSaveSuccess(false);
      const res = await fetch('/api/policies', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      const data = await res.json();
      if (data.success) {
        setSaveSuccess(true);
        if (onRefreshData) onRefreshData();
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        setError(data.error?.message || 'Failed to update policy config.');
      }
    } catch (err) {
      setError('Connection error while updating policies.');
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefaults = () => {
    setConfig({
      lowRiskMax: 39,
      mediumRiskMax: 59,
      highRiskMax: 74,
      veryHighRiskMax: 89,
      criticalThreshold: 90,
      mfaThreshold: 60,
      approvalThreshold: 75,
      restrictionThreshold: 90,
      crossDeptRiskPenalty: 28,
      untrustedDevicePenalty: 25,
      offHoursPenalty: 20,
      largeDownloadThresholdMB: 150,
      autoFreezeOnCritical: true,
      adaptiveTrustRecoveryRate: 3
    });
  };

  // Zero Trust Decision Flow Steps:
  // USER → DEVICE → BEHAVIOR → RISK → TRUST → POLICY → ACTION
  const decisionFlowSteps = [
    {
      step: '01',
      name: 'USER',
      label: 'Identity & Role',
      desc: 'Role RBAC, Dept, working hours baseline, verified MFA history.'
    },
    {
      step: '02',
      name: 'DEVICE',
      label: 'Hardware Attestation',
      desc: 'OS patch version, TPM certificate, disk encryption, managed status.'
    },
    {
      step: '03',
      name: 'BEHAVIOR',
      label: 'UEBA Telemetry',
      desc: 'Temporal anomalies, data download volume, shell invocation, USB mounts.'
    },
    {
      step: '04',
      name: 'RISK',
      label: 'RF + IF Inference',
      desc: 'Supervised 25-tree RF probability + 100-tree Isolation Forest anomaly.'
    },
    {
      step: '05',
      name: 'TRUST',
      label: 'Bayesian Curve',
      desc: 'Dynamic credit standing decays on alerts; restorative recovery.'
    },
    {
      step: '06',
      name: 'POLICY',
      label: 'PDP Evaluation',
      desc: 'Autonomous rules evaluate threshold matrices and MITRE tactics.'
    },
    {
      step: '07',
      name: 'ACTION',
      label: 'Enforcement PEP',
      desc: 'Autonomous containment triggered at network edge proxy.'
    }
  ];

  // Actions: ALLOW, MONITOR, MFA, REQUIRE APPROVAL, RESTRICT, FREEZE
  const policyActions = [
    {
      name: 'ALLOW',
      threshold: `Risk < 40`,
      tag: 'SAFE',
      border: 'border-emerald-500/40',
      color: 'text-emerald-400',
      desc: 'Unrestricted session authorized for baseline operational resources.'
    },
    {
      name: 'MONITOR',
      threshold: `Risk 40 - ${config.mfaThreshold - 1}`,
      tag: 'OBSERVE',
      border: 'border-[#D4AF37]/40',
      color: 'text-[#D4AF37]',
      desc: 'Session allowed with continuous high-frequency telemetry logging.'
    },
    {
      name: 'MFA',
      threshold: `Risk >= ${config.mfaThreshold}`,
      tag: 'CHALLENGE',
      border: 'border-orange-500/40',
      color: 'text-orange-400',
      desc: 'Cryptographic Step-Up MFA prompt required before grant.'
    },
    {
      name: 'REQUIRE APPROVAL',
      threshold: `Risk >= ${config.approvalThreshold}`,
      tag: 'SUPERVISOR',
      border: 'border-orange-500',
      color: 'text-orange-300',
      desc: 'Request routed to manager or SOC lead before access token issuance.'
    },
    {
      name: 'RESTRICT',
      threshold: `Risk >= ${config.restrictionThreshold}`,
      tag: 'CONTAINMENT',
      border: 'border-red-500/40',
      color: 'text-red-400',
      desc: 'Revoke external internet, download, and sensitive DB permissions.'
    },
    {
      name: 'FREEZE',
      threshold: `Critical (Risk >= ${config.criticalThreshold})`,
      tag: 'ISOLATION',
      border: 'border-red-500',
      color: 'text-red-300',
      desc: 'Instantly terminate all OAuth sessions and lock identity account.'
    }
  ];

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
                POLICY DECISION POINT (PDP)
              </span>
              <span className="text-[11px] font-mono text-gray-500">
                CONTINUOUS ZERO TRUST GOVERNANCE
              </span>
            </div>

            <h1 className="font-serif-display text-3xl sm:text-4xl lg:text-5xl font-light tracking-tight">
              Zero Trust Policy Engine
            </h1>
            <p className="text-xs text-gray-400 max-w-2xl mt-3 font-sans leading-relaxed">
              Every request traverses a strict 7-stage Zero Trust pipeline. Dynamic thresholds translate real-time risk scores into deterministic enforcement actions.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleResetDefaults}
              className="px-4 py-2 border border-[#D4AF37]/40 hover:border-[#D4AF37] text-xs font-mono text-gray-300 hover:text-white transition-colors cursor-pointer flex items-center gap-2"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>DEFAULTS</span>
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 border border-[#D4AF37] bg-[#D4AF37] text-black hover:bg-transparent hover:text-[#D4AF37] text-xs font-mono font-semibold tracking-wider transition-all duration-300 cursor-pointer flex items-center gap-2"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'SAVING...' : 'SAVE POLICIES'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Success / Error Banners */}
      {saveSuccess && (
        <div className="p-4 border border-emerald-500/50 bg-emerald-500/10 text-emerald-400 text-xs font-mono flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>Policies successfully updated and synchronized with PDP edge enforcers.</span>
        </div>
      )}
      {error && (
        <div className="p-4 border border-red-500/50 bg-red-500/10 text-red-400 text-xs font-mono flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Elegant Zero Trust Decision Flow Process Visualization:
          USER → DEVICE → BEHAVIOR → RISK → TRUST → POLICY → ACTION */}
      <div className={`p-8 sm:p-10 border border-[#D4AF37]/25 ${
        isDark ? 'bg-black' : 'bg-white'
      }`}>
        <div className="mb-6 pb-4 border-b border-[#D4AF37]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#D4AF37] block">
              DECISION PIPELINE
            </span>
            <h3 className="font-serif-display text-2xl font-light tracking-tight mt-1">
              Zero Trust Evaluation Flow
            </h3>
          </div>
          <span className="text-[10px] font-mono text-gray-500">
            NIST SP 800-207 COMPLIANT
          </span>
        </div>

        {/* Process Flow Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {decisionFlowSteps.map((step, idx) => (
            <div
              key={step.name}
              className="p-4 border border-[#D4AF37]/25 hover:border-[#D4AF37] transition-all relative flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono text-[#D4AF37]">
                    {step.step}
                  </span>
                  {idx < decisionFlowSteps.length - 1 && (
                    <span className="text-[#D4AF37]/40 text-xs font-mono hidden lg:inline">→</span>
                  )}
                </div>
                <h4 className="font-serif-display text-xl font-light tracking-tight">
                  {step.name}
                </h4>
                <div className="text-[10px] font-mono text-gray-400 uppercase mt-0.5">
                  {step.label}
                </div>
              </div>
              <p className="text-[11px] font-sans text-gray-400 mt-3 leading-relaxed">
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Action Enforcements Grid:
          ALLOW, MONITOR, MFA, REQUIRE APPROVAL, RESTRICT, FREEZE */}
      <div className={`p-8 sm:p-10 border border-[#D4AF37]/25 ${
        isDark ? 'bg-black' : 'bg-white'
      }`}>
        <div className="mb-6 pb-4 border-b border-[#D4AF37]/20">
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#D4AF37] block">
            POLICY ACTIONS
          </span>
          <h3 className="font-serif-display text-2xl font-light tracking-tight mt-1">
            Deterministic PEP Action Matrix
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {policyActions.map((act) => (
            <div
              key={act.name}
              className={`p-6 border ${act.border} bg-transparent flex flex-col justify-between space-y-3`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-gray-500 uppercase">ACTION TRIGGER</span>
                  <span className={`text-[9px] font-mono px-2 py-0.5 border ${act.border} ${act.color} font-bold`}>
                    {act.tag}
                  </span>
                </div>
                <h4 className={`font-serif-display text-2xl font-light mt-2 ${act.color}`}>
                  {act.name}
                </h4>
                <div className="text-xs font-mono text-gray-400 mt-1">
                  Threshold: <strong className="text-current">{act.threshold}</strong>
                </div>
              </div>
              <p className="text-xs font-sans text-gray-400 leading-relaxed pt-2 border-t border-[#D4AF37]/15">
                {act.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Policy Configuration Parameters Form */}
      <div className={`p-8 sm:p-10 border border-[#D4AF37]/25 ${
        isDark ? 'bg-black' : 'bg-white'
      }`}>
        <div className="mb-6 pb-4 border-b border-[#D4AF37]/20">
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#D4AF37] block">
            THRESHOLD ADJUSTMENTS
          </span>
          <h3 className="font-serif-display text-2xl font-light tracking-tight mt-1">
            Dynamic Enforcement Thresholds
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 font-mono text-xs">
          {/* MFA Trigger */}
          <div className="space-y-2 p-4 border border-[#D4AF37]/20">
            <label className="text-gray-400 uppercase text-[10px] block">
              Step-Up MFA Risk Trigger
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                value={config.mfaThreshold}
                onChange={(e) => setConfig({ ...config, mfaThreshold: Number(e.target.value) })}
                className="w-24 border border-[#D4AF37]/40 bg-transparent px-3 py-1.5 text-white font-bold outline-none"
              />
              <span className="text-gray-500 text-[11px]">Points (0-100)</span>
            </div>
          </div>

          {/* Approval Threshold */}
          <div className="space-y-2 p-4 border border-[#D4AF37]/20">
            <label className="text-gray-400 uppercase text-[10px] block">
              Supervisor Approval Risk
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                value={config.approvalThreshold}
                onChange={(e) => setConfig({ ...config, approvalThreshold: Number(e.target.value) })}
                className="w-24 border border-[#D4AF37]/40 bg-transparent px-3 py-1.5 text-white font-bold outline-none"
              />
              <span className="text-gray-500 text-[11px]">Points (0-100)</span>
            </div>
          </div>

          {/* Critical Threshold */}
          <div className="space-y-2 p-4 border border-[#D4AF37]/20">
            <label className="text-gray-400 uppercase text-[10px] block">
              Automated Freeze Trigger
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                value={config.criticalThreshold}
                onChange={(e) => setConfig({ ...config, criticalThreshold: Number(e.target.value) })}
                className="w-24 border border-[#D4AF37]/40 bg-transparent px-3 py-1.5 text-white font-bold outline-none"
              />
              <span className="text-gray-500 text-[11px]">Points (0-100)</span>
            </div>
          </div>

          {/* Large Download Threshold */}
          <div className="space-y-2 p-4 border border-[#D4AF37]/20">
            <label className="text-gray-400 uppercase text-[10px] block">
              DLP Max Daily Download
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                value={config.largeDownloadThresholdMB}
                onChange={(e) => setConfig({ ...config, largeDownloadThresholdMB: Number(e.target.value) })}
                className="w-24 border border-[#D4AF37]/40 bg-transparent px-3 py-1.5 text-white font-bold outline-none"
              />
              <span className="text-gray-500 text-[11px]">MB / session</span>
            </div>
          </div>

          {/* Cross Dept Penalty */}
          <div className="space-y-2 p-4 border border-[#D4AF37]/20">
            <label className="text-gray-400 uppercase text-[10px] block">
              Cross-Dept Access Penalty
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                value={config.crossDeptRiskPenalty}
                onChange={(e) => setConfig({ ...config, crossDeptRiskPenalty: Number(e.target.value) })}
                className="w-24 border border-[#D4AF37]/40 bg-transparent px-3 py-1.5 text-white font-bold outline-none"
              />
              <span className="text-gray-500 text-[11px]">Risk Added</span>
            </div>
          </div>

          {/* Untrusted Device Penalty */}
          <div className="space-y-2 p-4 border border-[#D4AF37]/20">
            <label className="text-gray-400 uppercase text-[10px] block">
              Untrusted Device Penalty
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                value={config.untrustedDevicePenalty}
                onChange={(e) => setConfig({ ...config, untrustedDevicePenalty: Number(e.target.value) })}
                className="w-24 border border-[#D4AF37]/40 bg-transparent px-3 py-1.5 text-white font-bold outline-none"
              />
              <span className="text-gray-500 text-[11px]">Risk Added</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
