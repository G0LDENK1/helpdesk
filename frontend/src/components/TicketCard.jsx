/**
 * Ticket card component for list views.
 * Displays key ticket info with color-coded badges.
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { StatusBadge, PriorityBadge, CategoryBadge } from './StatusBadge';

export default function TicketCard({ ticket }) {
  const navigate = useNavigate();

  const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div
      onClick={() => navigate(`/tickets/${ticket.id}`)}
      className="bg-dark-800 border border-dark-700 rounded-xl p-4 hover:border-dark-500 hover:bg-dark-750 cursor-pointer transition-all group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-dark-500 font-mono">#{ticket.id}</span>
            <PriorityBadge priority={ticket.priority} />
            <StatusBadge status={ticket.status} />
          </div>
          <h3 className="text-sm font-semibold text-white group-hover:text-blue-400 truncate transition-colors">
            {ticket.title}
          </h3>
          <p className="text-xs text-dark-400 mt-1 line-clamp-2">{ticket.description}</p>
        </div>
        <CategoryBadge category={ticket.category} />
      </div>

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-dark-700">
        <div className="flex items-center gap-3 text-xs text-dark-400">
          <span>By: {ticket.creator?.username || `User #${ticket.created_by}`}</span>
          {ticket.assignee && (
            <span className="text-blue-400">→ {ticket.assignee.username}</span>
          )}
        </div>
        <span className="text-xs text-dark-500">{timeAgo(ticket.updated_at)}</span>
      </div>
    </div>
  );
}
