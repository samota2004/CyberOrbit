import React from 'react';

export const TrustGauge = ({ score, size = 'md', showLabel = true }) => {
    const clamped = Math.max(0, Math.min(100, score));
    
    // Golden Yellow & subtle luxury accents
    let strokeColor = '#D4AF37'; // High Trust >= 80
    let textColor = 'text-[#D4AF37]';
    let rating = 'EXEMPLARY TRUST';
    
    if (clamped < 40) {
        strokeColor = '#ef4444'; // Red < 40
        textColor = 'text-red-400';
        rating = 'UNTRUSTED';
    } else if (clamped < 65) {
        strokeColor = '#f59e0b'; // Amber 40-64
        textColor = 'text-amber-400';
        rating = 'DEGRADED';
    } else if (clamped < 80) {
        strokeColor = '#D4AF37'; // 65-79
        textColor = 'text-[#D4AF37]';
        rating = 'CONDITIONAL';
    }

    const radius = size === 'sm' ? 24 : (size === 'lg' ? 52 : 36);
    const stroke = size === 'sm' ? 3 : (size === 'lg' ? 6 : 5);
    const normalizedRadius = radius - stroke * 2;
    const circumference = normalizedRadius * 2 * Math.PI;
    const strokeDashoffset = circumference - (clamped / 100) * circumference;
    const dimension = radius * 2;

    return (
      <div className="flex flex-col items-center justify-center">
        <div className="relative flex items-center justify-center">
          <svg height={dimension} width={dimension} className="transform -rotate-90">
            {/* Background circle */}
            <circle 
              stroke="rgba(212, 175, 55, 0.15)" 
              fill="transparent" 
              strokeWidth={stroke} 
              r={normalizedRadius} 
              cx={radius} 
              cy={radius}
            />
            {/* Animated Value circle */}
            <circle 
              stroke={strokeColor} 
              fill="transparent" 
              strokeWidth={stroke} 
              strokeDasharray={`${circumference} ${circumference}`} 
              style={{ strokeDashoffset, transition: 'stroke-dashoffset 0.6s ease' }} 
              strokeLinecap="square" 
              r={normalizedRadius} 
              cx={radius} 
              cy={radius}
            />
          </svg>
          <div className="absolute flex flex-col items-center">
            <span className={`font-mono font-bold tracking-tight ${textColor} ${size === 'sm' ? 'text-xs' : (size === 'lg' ? 'text-2xl' : 'text-base')}`}>
              {clamped}
            </span>
            {size === 'lg' && <span className="text-[9px] uppercase font-mono tracking-widest text-gray-500">/ 100</span>}
          </div>
        </div>
        {showLabel && (
          <span className={`text-[10px] font-mono tracking-widest uppercase mt-1.5 ${textColor} font-semibold`}>
            {rating}
          </span>
        )}
      </div>
    );
};

