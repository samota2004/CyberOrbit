import React, { useState } from 'react';
import { RiskBadge, PolicyActionBadge } from './Badges';
import { Sparkles, ShieldAlert, ChevronDown, ChevronUp, Cpu } from 'lucide-react';

export const XaiExplanationCard = ({ evaluation, onAskCopilot }) => {
    const [expanded, setExpanded] = useState(true);
    const [aiInsight, setAiInsight] = useState(null);
    const [loadingAi, setLoadingAi] = useState(false);

    if (!evaluation) return null;

    const fetchAiExplanation = async () => {
        try {
            setLoadingAi(true);
            const res = await fetch('/api/copilot/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: `Explain this security evaluation in detail: Risk Score ${evaluation.riskScore} (${evaluation.riskLevel}), Action ${evaluation.policyEnforced}, Signals: ${evaluation.contributingFactors?.map(f => f.factor).join(', ')}. What should the SOC analyst do?`,
                    context: { userId: evaluation.userId }
                })
            });
            const data = await res.json();
            if (data.success) {
                setAiInsight(data.reply);
            }
        }
        catch (err) {
            console.error('Failed to fetch AI explanation', err);
        }
        finally {
            setLoadingAi(false);
        }
    };

    return (
      <div className="bg-[#111111] border border-[#D4AF37]/30 p-6 shadow-2xl text-gray-100 relative overflow-hidden transition-all">
        {/* Top Gold Accent Border */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-[#D4AF37]"/>

        {/* Header bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-[#D4AF37]/20">
          <div className="flex items-center gap-3">
            <div className="p-2 border border-[#D4AF37]/40 bg-black">
              <Cpu className="w-5 h-5 text-[#D4AF37]"/>
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h3 className="font-serif-display text-xl sm:text-2xl font-normal tracking-wide text-white">
                  Zero Trust Decision &amp; XAI Diagnostics
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 border border-[#D4AF37]/30 text-[#D4AF37] bg-black">
                  UEBA ENSEMBLE
                </span>
              </div>
              <p className="text-xs text-gray-400 font-mono mt-0.5">
                Evaluated at {evaluation.timestamp ? new Date(evaluation.timestamp).toLocaleTimeString() : 'Current Session'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <RiskBadge level={evaluation.riskLevel} score={evaluation.riskScore}/>
            <PolicyActionBadge action={evaluation.policyEnforced}/>
          </div>
        </div>

        {/* Main Grid: Score dials & Natural language summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 py-5 items-center">
          <div className="flex items-center justify-around bg-black p-4 border border-[#D4AF37]/20">
            <div className="text-center">
              <span className="text-[9px] font-mono uppercase tracking-widest text-gray-500 block mb-1">Risk Index</span>
              <span className="text-2xl font-mono font-bold text-[#D4AF37]">
                {evaluation.riskScore}
                <span className="text-xs text-gray-500 font-normal">/100</span>
              </span>
            </div>

            <div className="h-8 w-px bg-[#D4AF37]/20"/>

            <div className="text-center">
              <span className="text-[9px] font-mono uppercase tracking-widest text-gray-500 block mb-1">Anomaly</span>
              <span className="text-xl font-mono font-bold text-gray-200">
                {((evaluation.mlAnomalyScore ?? 0) * 100).toFixed(0)}%
              </span>
            </div>

            <div className="h-8 w-px bg-[#D4AF37]/20"/>

            <div className="text-center">
              <span className="text-[9px] font-mono uppercase tracking-widest text-gray-500 block mb-1">Trust</span>
              <span className="text-xl font-mono font-bold text-[#D4AF37]">
                {evaluation.trustScore}
              </span>
            </div>
          </div>

          <div className="md:col-span-3 bg-black p-4 border border-[#D4AF37]/20 flex flex-col justify-center">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#D4AF37] font-semibold mb-1 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5"/>
              Policy Rationale &amp; Inference Explanation
            </span>
            <p className="text-xs text-gray-300 leading-relaxed font-sans">
              {evaluation.explanationText || 'Continuous baseline verification active. Multi-feature anomaly detection evaluated normal operational context.'}
            </p>
          </div>
        </div>

        {/* Feature Attribution List (SHAP-style) */}
        <div className="mt-2">
          <button 
            onClick={() => setExpanded(!expanded)} 
            className="flex items-center justify-between w-full text-xs font-mono tracking-wider text-gray-300 hover:text-[#D4AF37] py-2 border-t border-[#D4AF37]/20 transition-colors"
          >
            <span className="flex items-center gap-2">
              <span className="uppercase text-[#D4AF37]">EXPLAINABLE AI (XAI) CONTRIBUTING SIGNAL DECOMPOSITION</span>
              <span className="text-[10px] text-gray-500">
                ({evaluation.contributingFactors?.length || 0} factors)
              </span>
            </span>
            {expanded ? <ChevronUp className="w-4 h-4 text-[#D4AF37]"/> : <ChevronDown className="w-4 h-4 text-[#D4AF37]"/>}
          </button>

          {expanded && (
            <div className="mt-3 space-y-2">
              {evaluation.contributingFactors?.map((factor, index) => {
                  const maxPossibleImpact = 35;
                  const impactPercent = Math.min(100, Math.round((factor.scoreImpact / maxPossibleImpact) * 100));
                  return (
                    <div key={index} className="bg-black border border-[#D4AF37]/20 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono px-2 py-0.5 border border-[#D4AF37]/40 text-[#D4AF37] bg-black">
                            {factor.category}
                          </span>
                          <span className="font-semibold text-gray-200">{factor.factor}</span>
                        </div>
                        <p className="text-gray-400 text-[11px] font-sans">{factor.description}</p>
                      </div>

                      <div className="flex items-center gap-3 sm:w-48 justify-end">
                        <div className="w-24 bg-neutral-800 h-1.5 overflow-hidden">
                          <div 
                            className={`h-full ${factor.scoreImpact > 20 ? 'bg-red-500' : (factor.scoreImpact > 10 ? 'bg-amber-500' : 'bg-[#D4AF37]')}`} 
                            style={{ width: `${impactPercent}%` }}
                          />
                        </div>
                        <span className={`font-mono text-xs font-bold w-12 text-right ${factor.scoreImpact > 0 ? 'text-[#D4AF37]' : 'text-gray-400'}`}>
                          {factor.scoreImpact > 0 ? `+${factor.scoreImpact}` : '0'} pts
                        </span>
                      </div>
                    </div>
                  );
              })}
            </div>
          )}
        </div>

        {/* Gemini AI Copilot Integration Section */}
        <div className="mt-5 pt-4 border-t border-[#D4AF37]/20 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#D4AF37] animate-pulse"/>
              <span className="text-xs font-mono uppercase tracking-wider text-[#D4AF37] font-semibold">Gemini AI Threat Analysis</span>
            </div>

            <button 
              onClick={fetchAiExplanation} 
              disabled={loadingAi} 
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-black border border-[#D4AF37] text-[#D4AF37] hover:bg-[#A67C00] hover:text-white hover:border-[#A67C00] text-xs font-mono tracking-wider transition-all disabled:opacity-50 cursor-pointer"
            >
              {loadingAi ? (
                <>
                  <span className="w-3 h-3 border-2 border-[#D4AF37] border-t-transparent animate-spin"/>
                  <span>ANALYZING TELEMETRY...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5"/>
                  <span>GENERATE FORENSIC SUMMARY</span>
                </>
              )}
            </button>
          </div>

          {aiInsight && (
            <div className="mt-2 p-4 bg-black border border-[#D4AF37]/40 text-xs text-gray-200 leading-relaxed font-sans whitespace-pre-line">
              {aiInsight}
            </div>
          )}
        </div>
      </div>
    );
};

