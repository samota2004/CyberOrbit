import React, { useState } from 'react';
import { TrustGauge } from '../components/TrustGauge';
import { StatusBadge, SeverityBadge } from '../components/Badges';
import { Laptop, ShieldCheck, Clock, MapPin, FolderLock, KeyRound, Activity } from 'lucide-react';
import { AccessRequestModal } from '../components/AccessRequestModal';
export const ProfilePage = ({ currentUser, devices, resources, recentEvents, onRefreshData, onOpenCopilot }) => {
    const [requestModalOpen, setRequestModalOpen] = useState(false);
    const userDevices = devices.filter(d => d.userId === currentUser.id);
    const userEvents = recentEvents.filter(e => e.userId === currentUser.id);
    return (<div className="space-y-6">
      {/* Header */}
      <div className="bg-[#0F1115] border border-white/10 rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-mono font-semibold">
              EMPLOYEE SELF-SERVICE PORTAL
            </span>
            <span className="text-xs text-gray-400 font-mono">
              Individual Trust & Identity Telemetry
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            My Zero Trust Profile & Digital Identity
          </h1>
          <p className="text-xs text-gray-400 max-w-2xl mt-1 leading-relaxed">
            Review your dynamic trust rating, verified hardware endpoints, behavioral baseline parameters, and request elevated resource privileges.
          </p>
        </div>

        <button onClick={() => setRequestModalOpen(true)} className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-all shadow-lg shadow-blue-600/20 flex items-center gap-2">
          <KeyRound className="w-4 h-4"/>
          <span>Request Resource Access</span>
        </button>
      </div>

      {/* Main Grid: User Identity & Trust Gauge */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Persona & Gauge */}
        <div className="bg-[#15171B] border border-white/5 rounded-xl p-6 shadow-lg flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center font-mono text-xl font-bold text-blue-400">
            {currentUser.employeeId}
          </div>

          <div>
            <h2 className="text-lg font-bold text-white">{currentUser.name}</h2>
            <p className="text-xs text-gray-400 font-mono">{currentUser.email}</p>
            <div className="flex items-center justify-center gap-2 mt-2">
              <span className="text-xs font-semibold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                {currentUser.department}
              </span>
              <StatusBadge status={currentUser.status}/>
            </div>
          </div>

          <div className="w-full pt-4 border-t border-white/5">
            <span className="text-xs font-mono uppercase text-gray-400 block mb-3">
              Dynamic Real-Time Trust Rating
            </span>
            <TrustGauge score={currentUser.currentTrustScore} size={150}/>
          </div>
        </div>

        {/* Right 2 cols: Baseline & Registered Devices */}
        <div className="lg:col-span-2 space-y-4">
          {/* Established Behavioral Baseline */}
          <div className="bg-[#15171B] border border-white/5 rounded-xl p-5 shadow-lg space-y-3">
            <h3 className="font-bold text-xs font-mono uppercase text-blue-400 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4"/>
              Verified Organizational Baseline Profile
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="bg-[#0F1115] p-3 rounded-lg border border-white/10 space-y-1">
                <span className="text-gray-400 flex items-center gap-1.5 font-mono">
                  <Clock className="w-3.5 h-3.5 text-blue-400"/> Standard Work Hours:
                </span>
                <span className="font-semibold text-gray-200 block">
                  {currentUser.baseline.normalWorkHours.start}:00 - {currentUser.baseline.normalWorkHours.end}:00
                </span>
              </div>

              <div className="bg-[#0F1115] p-3 rounded-lg border border-white/10 space-y-1">
                <span className="text-gray-400 flex items-center gap-1.5 font-mono">
                  <FolderLock className="w-3.5 h-3.5 text-blue-400"/> Permitted Scopes:
                </span>
                <span className="font-semibold text-gray-200 block">
                  {currentUser.baseline.allowedDepartments.join(', ')}
                </span>
              </div>

              <div className="bg-[#0F1115] p-3 rounded-lg border border-white/10 space-y-1">
                <span className="text-gray-400 font-mono">Daily Download Quota:</span>
                <span className="font-semibold text-gray-200 block">
                  {currentUser.baseline.maxDownloadVolumeMB} MB / day
                </span>
              </div>

              <div className="bg-[#0F1115] p-3 rounded-lg border border-white/10 space-y-1">
                <span className="text-gray-400 flex items-center gap-1.5 font-mono">
                  <MapPin className="w-3.5 h-3.5 text-blue-400"/> Common Geofence:
                </span>
                <span className="font-semibold text-gray-200 block truncate">
                  {currentUser.baseline.typicalLocations.join(', ')}
                </span>
              </div>
            </div>
          </div>

          {/* Registered Endpoints */}
          <div className="bg-[#15171B] border border-white/5 rounded-xl p-5 shadow-lg space-y-3">
            <h3 className="font-bold text-xs font-mono uppercase text-blue-400 flex items-center gap-2">
              <Laptop className="w-4 h-4"/>
              Registered Hardware Endpoints ({userDevices.length})
            </h3>

            <div className="space-y-2">
              {userDevices.map(dev => (<div key={dev.id} className="p-3 bg-[#0F1115] rounded-lg border border-white/10 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-white block">{dev.deviceName}</span>
                    <span className="text-[11px] text-gray-400 font-mono">{dev.os} • {dev.ipAddress}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-mono text-emerald-400 font-bold">
                      Trust: {dev.trustScore}%
                    </span>
                    <StatusBadge status={dev.status}/>
                  </div>
                </div>))}
            </div>
          </div>
        </div>
      </div>

      {/* User's Recent Telemetry Stream */}
      <div className="bg-[#15171B] border border-white/5 rounded-xl p-5 shadow-lg space-y-3">
        <h3 className="font-bold text-xs font-mono uppercase text-blue-400 flex items-center gap-2">
          <Activity className="w-4 h-4"/>
          My Recent Security Events Stream
        </h3>

        <div className="space-y-2">
          {userEvents.length === 0 ? (<p className="text-xs text-gray-500 italic p-4 text-center">No recent security events recorded for this persona.</p>) : (userEvents.map(evt => (<div key={evt.id} className="p-3 bg-[#0F1115] rounded-lg border border-white/10 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-gray-200">{evt.eventType}</span>
                  <span className="text-gray-400 ml-2 font-mono text-[11px]">
                    {evt.resourceName ? `-> ${evt.resourceName}` : ''}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-mono text-gray-500">
                    {new Date(evt.timestamp).toLocaleTimeString()}
                  </span>
                  <SeverityBadge severity={evt.severity}/>
                </div>
              </div>)))}
        </div>
      </div>

      {/* Access Request Modal */}
      <AccessRequestModal isOpen={requestModalOpen} onClose={() => setRequestModalOpen(false)} currentUser={currentUser} resources={resources} onSubmitted={onRefreshData}/>
    </div>);
};
