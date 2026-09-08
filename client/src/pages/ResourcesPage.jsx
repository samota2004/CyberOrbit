import React, { useState } from 'react';
import { ShieldCheck, Search, Play, KeyRound } from 'lucide-react';
import { AccessRequestModal } from '../components/AccessRequestModal';
import { XaiExplanationCard } from '../components/XaiExplanationCard';

export const ResourcesPage = ({ resources, currentUser, onRefreshData, onOpenCopilot }) => {
    const [search, setSearch] = useState('');
    const [deptFilter, setDeptFilter] = useState('ALL');
    const [testingResourceId, setTestingResourceId] = useState(null);
    const [testResult, setTestResult] = useState(null);
    const [requestModalOpen, setRequestModalOpen] = useState(false);

    const departments = ['ALL', 'HR', 'Finance', 'Engineering', 'IT', 'Security', 'Sales', 'Marketing'];

    const filteredResources = resources.filter(r => {
        const matchesSearch = r.name.toLowerCase().includes(search.toLowerCase()) || r.description.toLowerCase().includes(search.toLowerCase());
        const matchesDept = deptFilter === 'ALL' || r.department === deptFilter;
        return matchesSearch && matchesDept;
    });

    const handleTestAccess = async (resource) => {
        try {
            setTestingResourceId(resource.id);
            const res = await fetch('/api/resources/test-access', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: currentUser.id,
                    resourceId: resource.id
                })
            });
            const data = await res.json();
            if (data.success) {
                setTestResult(data);
            }
        }
        catch (err) {
            console.error('Failed to test resource access', err);
        }
        finally {
            setTestingResourceId(null);
        }
    };

    const getSensitivityColor = (sens) => {
        switch (sens) {
            case 'HIGHLY_SENSITIVE': return 'border-red-500/40 text-red-400 bg-black';
            case 'CONFIDENTIAL': return 'border-orange-500/40 text-orange-400 bg-black';
            case 'INTERNAL': return 'border-[#D4AF37]/40 text-[#D4AF37] bg-black';
            default: return 'border-white/20 text-gray-300 bg-black';
        }
    };

    return (
      <div className="space-y-8">
        {/* Editorial Header */}
        <div className="bg-[#111111] border border-[#D4AF37]/30 p-8 shadow-2xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-[#D4AF37]"/>
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="px-2.5 py-0.5 border border-[#D4AF37]/40 text-[#D4AF37] bg-black text-xs font-mono tracking-widest uppercase">
                PROTECTED ASSET REPOSITORY
              </span>
              <span className="text-xs text-gray-400 font-mono">
                Policy Enforcement Point (PEP) Controls
              </span>
            </div>
            <h1 className="font-serif-display text-3xl sm:text-4xl text-white font-normal tracking-wide">
              Enterprise Resources &amp; Target Assets
            </h1>
            <p className="text-xs text-gray-400 max-w-2xl mt-2 leading-relaxed font-sans">
              Enterprise resources governed under strict Attribute-Based Access Control (ABAC). Test real-time access under the currently active user persona.
            </p>
          </div>

          <button 
            onClick={() => setRequestModalOpen(true)} 
            className="px-5 py-2.5 bg-[#D4AF37] hover:bg-[#A67C00] text-black hover:text-white font-mono font-bold text-xs tracking-wider transition-all shadow-md flex items-center gap-2 self-start md:self-auto cursor-pointer border border-[#D4AF37] hover:border-[#A67C00]"
          >
            <KeyRound className="w-4 h-4"/>
            <span>REQUEST ACCESS</span>
          </button>
        </div>

        {/* Filter & Persona Context Bar */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-[#111111] p-4 border border-[#D4AF37]/20 text-xs">
          <div className="relative w-full sm:w-80">
            <input 
              type="text" 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              placeholder="Search enterprise assets..." 
              className="w-full bg-black border border-[#D4AF37]/30 pl-9 pr-3 py-2 text-white outline-none focus:border-[#D4AF37] font-mono text-xs"
            />
            <Search className="w-4 h-4 text-[#D4AF37] absolute left-3 top-1/2 -translate-y-1/2"/>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-center">
            <span className="text-gray-400 font-mono text-[11px]">DEPARTMENT:</span>
            <select 
              value={deptFilter} 
              onChange={(e) => setDeptFilter(e.target.value)} 
              className="bg-black border border-[#D4AF37]/30 px-3 py-1.5 text-white outline-none font-mono text-xs cursor-pointer"
            >
              {departments.map(d => (<option key={d} value={d}>{d}</option>))}
            </select>
          </div>
        </div>

        {/* Active User Context Pill */}
        <div className="bg-[#111111] p-3.5 border border-[#D4AF37]/20 flex items-center justify-between text-xs text-gray-300">
          <div className="flex items-center gap-2">
            <span className="text-gray-400 font-mono text-[11px] uppercase">Evaluation Persona:</span>
            <strong className="text-white font-serif-display text-sm">{currentUser.name}</strong>
            <span className="font-mono text-[#D4AF37]">[{currentUser.department} - {currentUser.role}]</span>
            <span className="text-gray-400 font-mono">• Trust: {currentUser.currentTrustScore}%</span>
          </div>
          <span className="text-[11px] font-mono text-gray-400 hidden sm:inline">
            Switch persona in the header to simulate different identities
          </span>
        </div>

        {/* Resources Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredResources.map(resource => {
              const isCrossDept = !currentUser.baseline?.allowedDepartments?.includes(resource.department);
              const isTesting = testingResourceId === resource.id;
              return (
                <div 
                  key={resource.id} 
                  className="bg-[#111111] border border-[#D4AF37]/20 hover:border-[#D4AF37] p-6 shadow-lg flex flex-col justify-between space-y-4 transition-all"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 border ${getSensitivityColor(resource.sensitivity)}`}>
                        {resource.sensitivity}
                      </span>
                      <span className="text-xs font-mono text-gray-400">
                        Dept: <strong className="text-white">{resource.department}</strong>
                      </span>
                    </div>

                    <h3 className="font-serif-display text-xl text-white mb-2">{resource.name}</h3>
                    <p className="text-xs text-gray-400 leading-relaxed mb-4 font-sans">
                      {resource.description}
                    </p>

                    <div className="bg-black p-3.5 border border-[#D4AF37]/15 space-y-2 text-xs text-gray-400 font-mono">
                      <div className="flex justify-between">
                        <span>Authorized Roles:</span>
                        <span className="text-gray-200">{resource.requiredRole.join(', ')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Cross-Dept Context:</span>
                        <span className={isCrossDept ? 'text-orange-400 font-bold' : 'text-[#D4AF37]'}>
                          {isCrossDept ? 'YES (Elevates Risk)' : 'NO (Permitted Dept)'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#D4AF37]/20">
                    <button 
                      onClick={() => handleTestAccess(resource)} 
                      disabled={isTesting} 
                      className="w-full py-2.5 px-4 bg-black hover:bg-[#A67C00] hover:text-white text-[#D4AF37] border border-[#D4AF37]/40 hover:border-[#A67C00] text-xs font-mono tracking-wider transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5"/>
                      <span>{isTesting ? 'EVALUATING PEP POLICY...' : 'TEST REAL-TIME ACCESS'}</span>
                    </button>
                  </div>
                </div>
              );
          })}
        </div>

        {/* Test Access Result Dialog Card */}
        {testResult && (
          <div className="space-y-3 pt-6 border-t border-[#D4AF37]/30">
            <div className="flex items-center justify-between">
              <h3 className="font-serif-display text-xl text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#D4AF37]"/>
                Policy Decision Result for: {testResult.resource.name}
              </h3>
              <button 
                onClick={() => setTestResult(null)} 
                className="text-xs font-mono text-gray-400 hover:text-white cursor-pointer"
              >
                [CLOSE RESULT]
              </button>
            </div>

            <XaiExplanationCard evaluation={testResult.evaluation} onAskCopilot={onOpenCopilot}/>
          </div>
        )}

        {/* Access Request Submission Modal */}
        <AccessRequestModal 
          isOpen={requestModalOpen} 
          onClose={() => setRequestModalOpen(false)} 
          currentUser={currentUser} 
          resources={resources} 
          onSubmitted={onRefreshData}
        />
      </div>
    );
};

