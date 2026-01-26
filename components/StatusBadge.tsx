import React from 'react';
import { ProjectStatus } from '../types';

interface Props {
  status: ProjectStatus;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<Props> = ({ status, size = 'md' }) => {
  const styles = {
    [ProjectStatus.ON_TRACK]: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    [ProjectStatus.AT_RISK]: 'bg-amber-100 text-amber-800 border-amber-200',
    [ProjectStatus.DELAYED]: 'bg-red-100 text-red-800 border-red-200',
    [ProjectStatus.COMPLETED]: 'bg-blue-100 text-blue-800 border-blue-200',
    [ProjectStatus.ON_HOLD]: 'bg-slate-100 text-slate-800 border-slate-200',
  };

  const labels = {
    [ProjectStatus.ON_TRACK]: 'On Track',
    [ProjectStatus.AT_RISK]: 'At Risk',
    [ProjectStatus.DELAYED]: 'Delayed',
    [ProjectStatus.COMPLETED]: 'Completed',
    [ProjectStatus.ON_HOLD]: 'On Hold',
  };

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-0.5 text-sm';

  return (
    <span className={`inline-flex items-center justify-center rounded-full font-medium border ${styles[status]} ${sizeClasses}`}>
      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${status === ProjectStatus.ON_TRACK ? 'bg-emerald-500' : status === ProjectStatus.AT_RISK ? 'bg-amber-500' : status === ProjectStatus.DELAYED ? 'bg-red-500' : 'bg-blue-500'}`}></span>
      {labels[status]}
    </span>
  );
};