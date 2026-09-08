import React, { useState } from 'react';
import { KeyRound, CheckCircle2, X } from 'lucide-react';

export const AccessRequestModal = ({ isOpen, onClose, currentUser, resources = [], onSubmitted }) => {
    const [selectedResourceId, setSelectedResourceId] = useState(resources[0]?.id || '');
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState(null);

    if (!isOpen) return null;

    const selectedResource = resources.find(r => r.id === selectedResourceId);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!reason.trim()) {
            setError('Please provide a business justification.');
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/access-requests', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: currentUser.id,
                    resourceId: selectedResourceId,
                    reason
                })
            });
            const data = await res.json();
            if (data.success) {
                setSuccess(true);
                setTimeout(() => {
                    onSubmitted?.();
                    onClose();
                }, 1200);
            }
            else {
                setError(data.error?.message || 'Failed to submit access request.');
            }
        }
        catch (err) {
            setError('Network connection error.');
        }
        finally {
            setLoading(false);
        }
    };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
        <div className="bg-[#0D0E12] border border-[#D4AF37]/40 max-w-lg w-full p-8 shadow-2xl relative text-gray-100">
          <button 
            onClick={onClose} 
            className="absolute top-6 right-6 text-gray-400 hover:text-[#D4AF37] transition-colors"
          >
            <X className="w-5 h-5"/>
          </button>

          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[#D4AF37]/20">
            <div className="p-2.5 border border-[#D4AF37]/40 bg-black">
              <KeyRound className="w-6 h-6 text-[#D4AF37]"/>
            </div>
            <div>
              <h3 className="font-serif-display text-2xl font-light text-white">
                Request Resource Access
              </h3>
              <p className="text-xs text-gray-400 font-mono">
                Zero Trust Least-Privilege Access Authorization
              </p>
            </div>
          </div>

          {success ? (
            <div className="p-8 border border-[#D4AF37]/40 bg-black text-center text-[#D4AF37] space-y-3">
              <CheckCircle2 className="w-10 h-10 mx-auto text-[#D4AF37] animate-pulse"/>
              <p className="font-serif-display text-xl text-white">Access Request Queued</p>
              <p className="text-xs text-gray-400 font-mono">
                Queued for administrative evaluation. Policy engine evaluated initial risk.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="bg-black p-3.5 border border-[#D4AF37]/20 text-xs font-mono">
                <div className="flex justify-between py-1 border-b border-[#D4AF37]/10">
                  <span className="text-gray-500">REQUESTER:</span>
                  <span className="font-semibold text-white">{currentUser?.name} ({currentUser?.employeeId})</span>
                </div>
                <div className="flex justify-between py-1 pt-2">
                  <span className="text-gray-500">DEPARTMENT:</span>
                  <span className="text-[#D4AF37]">{currentUser?.department}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-gray-400 mb-1.5">
                  Target Enterprise Resource
                </label>
                <select 
                  value={selectedResourceId} 
                  onChange={(e) => setSelectedResourceId(e.target.value)} 
                  className="w-full bg-black border border-[#D4AF37]/30 px-3 py-2 text-xs text-white outline-none focus:border-[#D4AF37] font-mono"
                >
                  {resources.map(r => (
                    <option key={r.id} value={r.id} className="bg-black text-white">
                      [{r.department}] {r.name} ({r.sensitivity})
                    </option>
                  ))}
                </select>
              </div>

              {selectedResource && (
                <div className="p-3 bg-black border border-[#D4AF37]/20 text-xs space-y-1.5">
                  <p className="text-gray-300 font-sans">{selectedResource.description}</p>
                  <div className="flex items-center gap-2 pt-1 font-mono">
                    <span className="text-[10px] px-2 py-0.5 border border-[#D4AF37]/30 text-[#D4AF37]">
                      Sensitivity: {selectedResource.sensitivity}
                    </span>
                    {selectedResource.department !== currentUser?.department && (
                      <span className="text-[10px] px-2 py-0.5 border border-amber-500/40 text-amber-400 bg-amber-500/10">
                        Cross-Department Request
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-gray-400 mb-1.5">
                  Business Justification
                </label>
                <textarea 
                  rows={3} 
                  value={reason} 
                  onChange={(e) => setReason(e.target.value)} 
                  placeholder="Detail operational justification, ticket ID, or access timeframe..." 
                  className="w-full bg-black border border-[#D4AF37]/30 p-3 text-xs text-white outline-none focus:border-[#D4AF37] resize-none font-sans"
                />
              </div>

              {error && (<p className="text-xs text-red-400 font-mono">{error}</p>)}

              <div className="flex gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={onClose} 
                  className="flex-1 px-4 py-2.5 border border-gray-700 bg-black text-gray-300 hover:border-[#D4AF37] hover:text-white text-xs font-mono tracking-wider transition-colors cursor-pointer"
                >
                  CANCEL
                </button>
                <button 
                  type="submit" 
                  disabled={loading} 
                  className="flex-1 px-4 py-2.5 bg-[#D4AF37] hover:bg-[#A67C00] text-black hover:text-white font-mono font-bold text-xs tracking-wider transition-all disabled:opacity-50 cursor-pointer border border-[#D4AF37] hover:border-[#A67C00]"
                >
                  {loading ? 'EVALUATING...' : 'SUBMIT REQUEST'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    );
};

