
import React from 'react';
import { ProjectStatus } from '../types';

interface Props {
  status: ProjectStatus | string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<Props> = ({ status, size = 'md' }) => {
  
  // Normalize status to handle DB enums (ON_TRACK) vs Frontend enums (On Track)
  const getNormalizedStatus = (s: string): ProjectStatus => {
    if (!s) return ProjectStatus.ON_TRACK;
    
    // Exact match check first
    if (Object.values(ProjectStatus).includes(s as ProjectStatus)) {
        return s as ProjectStatus;
    }

    // Map DB Enum style (ON_TRACK) to Frontend Style (On Track)
    const upper = s.toUpperCase();
    if (upper === 'ON_TRACK') return ProjectStatus.ON_TRACK;
    if (upper === 'AT_RISK') return ProjectStatus.AT_RISK;
    if (upper === 'DELAYED') return ProjectStatus.DELAYED;
    if (upper === 'COMPLETED') return ProjectStatus.COMPLETED;
    if (upper === 'ON_HOLD') return ProjectStatus.ON_HOLD;

    return ProjectStatus.ON_TRACK; // Default fallback
  };

  const safeStatus = getNormalizedStatus(status);

  const config = {
    [ProjectStatus.ON_TRACK]: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      border: 'border-emerald-200',
      dot: 'bg-emerald-500',
      label: 'On Track'
    },
    [ProjectStatus.AT_RISK]: {
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      border: 'border-amber-200',
      dot: 'bg-amber-500',
      label: 'At Risk'
    },
    [ProjectStatus.DELAYED]: {
      bg: 'bg-red-50',
      text: 'text-red-700',
      border: 'border-red-200',
      dot: 'bg-red-500',
      label: 'Delayed'
    },
    [ProjectStatus.COMPLETED]: {
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      border: 'border-blue-200',
      dot: 'bg-blue-500',
      label: 'Completed'
    },
    [ProjectStatus.ON_HOLD]: {
      bg: 'bg-slate-50',
      text: 'text-slate-600',
      border: 'border-slate-200',
      dot: 'bg-slate-400',
      label: 'On Hold'
    },
  };

  // Safe access with fallback
  const style = config[safeStatus] || config[ProjectStatus.ON_TRACK];
  
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';
  const dotSize = size === 'sm' ? 'w-1 h-1' : 'w-1.5 h-1.5';

  return (
    <span className={`inline-flex items-center justify-center rounded-full font-semibold border ${style.bg} ${style.text} ${style.border} ${sizeClasses} shadow-sm whitespace-nowrap`}>
      <span className="relative flex h-2 w-2 mr-1.5 items-center justify-center">
        {(safeStatus === ProjectStatus.DELAYED || safeStatus === ProjectStatus.AT_RISK) && (
             <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${style.dot}`}></span>
        )}
        <span className={`relative inline-flex rounded-full ${dotSize} ${style.dot}`}></span>
      </span>
      {style.label}
    </span>
  );
};
