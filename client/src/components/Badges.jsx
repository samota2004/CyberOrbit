import React from 'react';

export const RiskBadge = ({ level, score }) => {
    const configs = {
        LOW: { bg: 'bg-[#D4AF37]/10', text: 'text-[#D4AF37]', border: 'border-[#D4AF37]/30' },
        MEDIUM: { bg: 'bg-[#D4AF37]/15', text: 'text-[#E5C158]', border: 'border-[#D4AF37]/40' },
        HIGH: { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30' },
        VERY_HIGH: { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/35' },
        CRITICAL: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/40' }
    };
    const c = configs[level] || configs.LOW;
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-mono tracking-wider uppercase border ${c.bg} ${c.text} ${c.border}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${c.text.replace('text-', 'bg-')}`}/>
        {level?.replace('_', ' ')}
        {typeof score === 'number' && <span className="font-mono text-[10px] opacity-80">({score})</span>}
      </span>
    );
};

export const SeverityBadge = ({ severity }) => {
    const map = {
        LOW: { bg: 'bg-white/5', text: 'text-gray-300', border: 'border-white/15' },
        MEDIUM: { bg: 'bg-[#D4AF37]/10', text: 'text-[#D4AF37]', border: 'border-[#D4AF37]/30' },
        HIGH: { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30' },
        CRITICAL: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/40' }
    };
    const c = map[severity] || map.LOW;
    return (
      <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider border ${c.bg} ${c.text} ${c.border}`}>
        {severity}
      </span>
    );
};

export const StatusBadge = ({ status }) => {
    const map = {
        ACTIVE: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
        RESTRICTED: { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30' },
        FROZEN: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/40' },
        SUSPENDED: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/40' },
        TRUSTED: { bg: 'bg-[#D4AF37]/10', text: 'text-[#D4AF37]', border: 'border-[#D4AF37]/30' },
        SUSPICIOUS: { bg: 'bg-orange-500/15', text: 'text-orange-400', border: 'border-orange-500/30' },
        REVOKED: { bg: 'bg-white/5', text: 'text-gray-400', border: 'border-white/10' },
        OPEN: { bg: 'bg-red-500/15', text: 'text-red-400', border: 'border-red-500/30' },
        UNDER_REVIEW: { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30' },
        APPROVED: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
        REJECTED: { bg: 'bg-white/5', text: 'text-gray-400', border: 'border-white/10' },
        RESOLVED: { bg: 'bg-[#D4AF37]/15', text: 'text-[#D4AF37]', border: 'border-[#D4AF37]/30' },
        PENDING: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
    };
    const c = map[status] || { bg: 'bg-white/5', text: 'text-gray-400', border: 'border-white/10' };
    return (
      <span className={`inline-flex items-center px-2 py-0.5 text-[11px] font-mono uppercase tracking-wider border ${c.bg} ${c.text} ${c.border}`}>
        {status?.replace('_', ' ')}
      </span>
    );
};

export const PolicyActionBadge = ({ action }) => {
    const map = {
        ALLOW: { bg: 'bg-[#D4AF37]/10', text: 'text-[#D4AF37]', border: 'border-[#D4AF37]/30', label: 'ALLOW ACCESS' },
        MONITOR: { bg: 'bg-white/10', text: 'text-gray-200', border: 'border-white/20', label: 'MONITOR TELEMETRY' },
        MFA: { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30', label: 'REQUIRE STEP-UP MFA' },
        REQUIRE_APPROVAL: { bg: 'bg-orange-500/15', text: 'text-orange-400', border: 'border-orange-500/30', label: 'REQUIRE ADMIN APPROVAL' },
        RESTRICT: { bg: 'bg-red-500/15', text: 'text-red-400', border: 'border-red-500/30', label: 'RESTRICT RESOURCE' },
        FREEZE: { bg: 'bg-red-600/25', text: 'text-red-400', border: 'border-red-500/50', label: 'FREEZE ACCOUNT' }
    };
    const c = map[action] || map.ALLOW;
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-mono tracking-wider uppercase border ${c.bg} ${c.text} ${c.border}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${c.text.replace('text-', 'bg-')} animate-pulse`}/>
        {c.label}
      </span>
    );
};

