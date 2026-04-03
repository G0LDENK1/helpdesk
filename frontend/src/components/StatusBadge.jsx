/**
 * Color-coded badge for ticket status and priority values.
 * Renders as a small pill with contextual coloring.
 */

import React from 'react';

const statusStyles = {
  open: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  in_progress: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  resolved: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  closed: 'bg-dark-500/20 text-dark-400 border-dark-500/30',
};

const priorityStyles = {
  low: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  critical: 'bg-red-500/20 text-red-400 border-red-500/30',
};

const statusLabels = {
  open: 'Open',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed',
};

const priorityLabels = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
};

export function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusStyles[status] || ''}`}>
      {statusLabels[status] || status}
    </span>
  );
}

export function PriorityBadge({ priority }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${priorityStyles[priority] || ''}`}>
      {priorityLabels[priority] || priority}
    </span>
  );
}

export function CategoryBadge({ category }) {
  const icons = { network: '🌐', hardware: '🖥️', software: '💿', access: '🔑', other: '📋' };
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-dark-700 text-dark-300 border border-dark-600">
      {icons[category] || '📋'} {category?.charAt(0).toUpperCase() + category?.slice(1)}
    </span>
  );
}
