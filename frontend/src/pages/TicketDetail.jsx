/**
 * Ticket detail page with full ticket info, assignment, status updates,
 * comment thread, and audit log.
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import { StatusBadge, PriorityBadge, CategoryBadge } from '../components/StatusBadge';
import CommentThread from '../components/CommentThread';

export default function TicketDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [ticket, setTicket] = useState(null);
  const [auditLog, setAuditLog] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showAudit, setShowAudit] = useState(false);

  const isStaff = user?.role === 'technician' || user?.role === 'admin';

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [ticketRes, techRes] = await Promise.all([
          client.get(`/tickets/${id}`),
          isStaff ? client.get('/users/technicians') : Promise.resolve({ data: [] }),
        ]);
        setTicket(ticketRes.data);
        setTechnicians(techRes.data);
      } catch (err) {
        if (err.response?.status === 404) navigate('/tickets');
        console.error('Failed to fetch ticket:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const fetchAuditLog = async () => {
    try {
      const res = await client.get(`/tickets/${id}/audit`);
      setAuditLog(res.data);
      setShowAudit(true);
    } catch (err) {
      console.error('Failed to fetch audit log:', err);
    }
  };

  const updateStatus = async (newStatus) => {
    setUpdating(true);
    try {
      const res = await client.put(`/tickets/${id}`, { status: newStatus });
      setTicket(res.data);
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const assignTicket = async (techId) => {
    setUpdating(true);
    try {
      const res = await client.post(`/tickets/${id}/assign`, { technician_id: parseInt(techId) });
      setTicket(res.data);
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to assign ticket');
    } finally {
      setUpdating(false);
    }
  };

  const deleteTicket = async () => {
    if (!confirm('Are you sure you want to delete this ticket?')) return;
    try {
      await client.delete(`/tickets/${id}`);
      navigate('/tickets');
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to delete ticket');
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (!ticket) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back button + header */}
      <div>
        <button
          onClick={() => navigate('/tickets')}
          className="text-sm text-dark-400 hover:text-white transition-colors mb-4 flex items-center gap-1"
        >
          ← Back to Tickets
        </button>

        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm text-dark-500 font-mono">#{ticket.id}</span>
              <StatusBadge status={ticket.status} />
              <PriorityBadge priority={ticket.priority} />
              <CategoryBadge category={ticket.category} />
            </div>
            <h1 className="text-2xl font-bold text-white">{ticket.title}</h1>
          </div>

          {user?.role === 'admin' && (
            <button
              onClick={deleteTicket}
              className="px-3 py-1.5 bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 text-sm rounded-lg transition-colors"
            >
              🗑️ Delete
            </button>
          )}
        </div>
      </div>

      {/* Ticket Info */}
      <div className="bg-dark-900 border border-dark-700 rounded-xl p-6 space-y-4">
        <div className="prose prose-invert max-w-none">
          <p className="text-dark-200 whitespace-pre-wrap">{ticket.description}</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-dark-700">
          <div>
            <p className="text-xs text-dark-500 mb-1">Created by</p>
            <p className="text-sm text-white">{ticket.creator?.username || `User #${ticket.created_by}`}</p>
          </div>
          <div>
            <p className="text-xs text-dark-500 mb-1">Assigned to</p>
            <p className="text-sm text-white">{ticket.assignee?.username || 'Unassigned'}</p>
          </div>
          <div>
            <p className="text-xs text-dark-500 mb-1">Created</p>
            <p className="text-sm text-dark-300">{formatDate(ticket.created_at)}</p>
          </div>
          <div>
            <p className="text-xs text-dark-500 mb-1">Last Updated</p>
            <p className="text-sm text-dark-300">{formatDate(ticket.updated_at)}</p>
          </div>
        </div>
      </div>

      {/* Staff Controls */}
      {isStaff && (
        <div className="bg-dark-900 border border-dark-700 rounded-xl p-4">
          <h3 className="text-sm font-medium text-dark-300 mb-3">Ticket Actions</h3>
          <div className="flex flex-wrap gap-3">
            {/* Status buttons */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-dark-500">Status:</span>
              {['open', 'in_progress', 'resolved', 'closed'].map((s) => (
                <button
                  key={s}
                  onClick={() => updateStatus(s)}
                  disabled={updating || ticket.status === s}
                  className={`px-3 py-1 text-xs rounded-lg border transition-colors ${
                    ticket.status === s
                      ? 'bg-blue-600/20 border-blue-500/30 text-blue-400'
                      : 'bg-dark-800 border-dark-600 text-dark-300 hover:bg-dark-700 hover:text-white'
                  } disabled:cursor-not-allowed`}
                >
                  {s.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                </button>
              ))}
            </div>

            {/* Assignment */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-dark-500">Assign:</span>
              <select
                value={ticket.assigned_to || ''}
                onChange={(e) => e.target.value && assignTicket(e.target.value)}
                disabled={updating}
                className="bg-dark-800 border border-dark-600 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                <option value="">Select technician...</option>
                {technicians.map((tech) => (
                  <option key={tech.id} value={tech.id}>
                    {tech.username} ({tech.role})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Comments */}
      <CommentThread ticketId={ticket.id} />

      {/* Audit Log */}
      <div>
        <button
          onClick={fetchAuditLog}
          className="text-sm text-dark-400 hover:text-white transition-colors flex items-center gap-1"
        >
          📋 {showAudit ? 'Refresh' : 'Show'} Audit Log
        </button>

        {showAudit && (
          <div className="mt-3 bg-dark-900 border border-dark-700 rounded-xl overflow-hidden">
            {auditLog.length === 0 ? (
              <p className="p-4 text-sm text-dark-400 text-center">No audit entries</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-dark-800">
                  <tr>
                    <th className="text-left px-4 py-2 text-xs text-dark-400 font-medium">Action</th>
                    <th className="text-left px-4 py-2 text-xs text-dark-400 font-medium">Old</th>
                    <th className="text-left px-4 py-2 text-xs text-dark-400 font-medium">New</th>
                    <th className="text-left px-4 py-2 text-xs text-dark-400 font-medium">When</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLog.map((entry) => (
                    <tr key={entry.id} className="border-t border-dark-700">
                      <td className="px-4 py-2 text-dark-200">{entry.action}</td>
                      <td className="px-4 py-2 text-dark-400">{entry.old_value || '—'}</td>
                      <td className="px-4 py-2 text-dark-300">{entry.new_value || '—'}</td>
                      <td className="px-4 py-2 text-dark-500 text-xs">{formatDate(entry.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
