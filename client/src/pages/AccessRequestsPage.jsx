import React, { useState } from 'react';
import { StatusBadge } from '../components/Badges';
import { Plus, Check, X } from 'lucide-react';
import { AccessRequestModal } from '../components/AccessRequestModal';

export const AccessRequestsPage = ({ requests, currentUser, resources, onRefreshData }) => {
    const [modalOpen, setModalOpen] = useState(false);
    const [reviewNotes, setReviewNotes] = useState({});
    const [processingId, setProcessingId] = useState(null);

    const handleApprove = async (requestId) => {
        try {
            setProcessingId(requestId);
            await fetch(`/api/access-requests/${requestId}/approve`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ notes: reviewNotes[requestId] || 'Approved after context verification.' })
            });
            onRefreshData();
        }
        catch (err) {
            console.error('Failed to approve request', err);
        }
        finally {
            setProcessingId(null);
        }
    };

    const handleReject = async (requestId) => {
        try {
            setProcessingId(requestId);
            await fetch(`/api/access-requests/${requestId}/reject`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ notes: reviewNotes[requestId] || 'Rejected due to least-privilege boundary.' })
            });
            onRefreshData();
        }
        catch (err) {
            console.error('Failed to reject request', err);
        }
        finally {
            setProcessingId(null);
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
                GOVERNANCE &amp; APPROVAL WORKFLOW
              </span>
              <span className="text-xs text-gray-400 font-mono">
                Just-In-Time (JIT) Least Privilege
              </span>
            </div>
            <h1 className="font-serif-display text-3xl sm:text-4xl text-white font-normal tracking-wide">
              Resource Access Petitions
            </h1>
            <p className="text-xs text-gray-400 max-w-2xl mt-2 leading-relaxed font-sans">
              Review cross-department access petitions with AI-assisted risk evaluations. High-risk actions hold access until explicit manager or SOC lead approval.
            </p>
          </div>

          <button 
            onClick={() => setModalOpen(true)} 
            className="px-5 py-2.5 bg-[#D4AF37] hover:bg-[#A67C00] text-black hover:text-white font-mono font-bold text-xs tracking-wider transition-all shadow-md flex items-center gap-2 self-start md:self-auto cursor-pointer border border-[#D4AF37] hover:border-[#A67C00]"
          >
            <Plus className="w-4 h-4"/>
            <span>NEW PETITION</span>
          </button>
        </div>

        {/* Requests Stream */}
        <div className="space-y-4">
          {requests.length === 0 ? (
            <div className="p-16 text-center bg-[#111111] border border-[#D4AF37]/20 text-gray-400 font-mono text-xs">
              NO PENDING ACCESS PETITIONS IN QUEUE
            </div>
          ) : (
            requests.map(req => {
              const isPending = req.status === 'PENDING';
              return (
                <div 
                  key={req.id} 
                  className="bg-[#111111] border border-[#D4AF37]/20 hover:border-[#D4AF37] p-6 shadow-lg text-xs space-y-4 transition-all"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#D4AF37]/20">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-[#D4AF37] font-bold tracking-wider">{req.id}</span>
                      <span className="text-gray-500">•</span>
                      <span className="font-serif-display text-base text-white">{req.userName}</span>
                      <span className="text-gray-400 font-mono">[{req.userDepartment}]</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-[11px] font-mono text-gray-400">Risk at Request:</span>
                      <span className={`font-mono font-bold ${req.riskScoreAtRequest >= 60 ? 'text-orange-400' : 'text-[#D4AF37]'}`}>
                        {req.riskScoreAtRequest}/100
                      </span>
                      <StatusBadge status={req.status}/>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-black p-4 border border-[#D4AF37]/15 space-y-1.5">
                      <span className="text-[10px] font-mono uppercase text-[#D4AF37] block tracking-wider">Requested Target Asset</span>
                      <p className="font-serif-display text-lg text-white">{req.resourceName}</p>
                      <div className="flex items-center gap-2 text-[11px] font-mono text-gray-400 pt-1">
                        <span>Owner Dept: {req.resourceDepartment}</span>
                        <span>•</span>
                        <span className="text-orange-400 font-bold">{req.resourceSensitivity}</span>
                      </div>
                    </div>

                    <div className="bg-black p-4 border border-[#D4AF37]/15 space-y-1.5">
                      <span className="text-[10px] font-mono uppercase text-[#D4AF37] block tracking-wider">Business Justification</span>
                      <p className="text-gray-300 text-xs italic font-sans">"{req.reason}"</p>
                      <span className="text-[10px] text-gray-500 font-mono block pt-1">
                        Submitted at {new Date(req.requestedAt).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {req.aiRiskAssessment && (
                    <div className="p-3.5 bg-black border border-[#D4AF37]/30 text-xs text-gray-300">
                      <strong className="text-[#D4AF37] font-mono uppercase text-[11px] block mb-1 tracking-wider">
                        Policy Engine Context Analysis:
                      </strong>
                      <p className="font-sans leading-relaxed text-gray-300">{req.aiRiskAssessment}</p>
                    </div>
                  )}

                  {isPending && (
                    <div className="flex flex-col sm:flex-row items-center gap-3 pt-3 border-t border-[#D4AF37]/20">
                      <input 
                        type="text" 
                        placeholder="Optional approval/rejection notes..." 
                        value={reviewNotes[req.id] || ''} 
                        onChange={(e) => setReviewNotes({ ...reviewNotes, [req.id]: e.target.value })} 
                        className="flex-1 bg-black border border-[#D4AF37]/30 px-3.5 py-2 text-xs text-white outline-none focus:border-[#D4AF37] font-mono"
                      />

                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <button 
                          onClick={() => handleReject(req.id)} 
                          disabled={processingId === req.id} 
                          className="flex-1 sm:flex-initial px-4 py-2 bg-black hover:bg-red-950 text-red-400 border border-red-500/40 font-mono text-xs transition-all disabled:opacity-50 cursor-pointer"
                        >
                          REJECT
                        </button>

                        <button 
                          onClick={() => handleApprove(req.id)} 
                          disabled={processingId === req.id} 
                          className="flex-1 sm:flex-initial px-4 py-2 bg-[#D4AF37] hover:bg-[#A67C00] text-black hover:text-white border border-[#D4AF37] hover:border-[#A67C00] font-mono font-bold text-xs transition-all disabled:opacity-50 cursor-pointer shadow-md"
                        >
                          APPROVE ACCESS
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Access Request Submission Modal */}
        <AccessRequestModal 
          isOpen={modalOpen} 
          onClose={() => setModalOpen(false)} 
          currentUser={currentUser} 
          resources={resources} 
          onSubmitted={onRefreshData}
        />
      </div>
    );
};

