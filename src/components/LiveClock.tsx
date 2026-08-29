import React, { useState, useEffect } from 'react';
import { Calendar, Clock } from 'lucide-react';

interface LiveClockProps {
  className?: string;
  variant?: 'compact' | 'full' | 'pill';
  showSeconds?: boolean;
}

export const LiveClock: React.FC<LiveClockProps> = ({
  className = '',
  variant = 'pill',
  showSeconds = true,
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDate(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' });
  const formattedDate = currentDate.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const formattedTime = currentDate.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: showSeconds ? '2-digit' : undefined,
    hour12: true,
  });

  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-1.5 text-xs text-slate-300 font-mono ${className}`}>
        <span className="font-semibold text-teal-300">{dayName}</span>
        <span className="text-slate-500">•</span>
        <span>{formattedDate}</span>
        <span className="text-slate-500">•</span>
        <span className="text-emerald-400 font-bold">{formattedTime}</span>
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800/90 text-xs shadow-inner ${className}`}
      title="Live Real-Time Clock"
    >
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
      </span>
      <div className="flex items-center gap-1.5 font-medium text-slate-300">
        <Calendar className="w-3.5 h-3.5 text-teal-400" />
        <span className="font-bold text-slate-100">{dayName}</span>
        <span className="text-slate-400 text-[11px]">{formattedDate}</span>
      </div>
      <span className="text-slate-700 font-bold">|</span>
      <div className="flex items-center gap-1 font-mono font-bold text-teal-300">
        <Clock className="w-3.5 h-3.5 text-teal-400" />
        <span>{formattedTime}</span>
      </div>
    </div>
  );
};
