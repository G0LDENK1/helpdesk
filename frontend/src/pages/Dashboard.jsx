/**
 * Dashboard page showing ticket statistics and recent tickets.
 * Content varies by role: admin sees system-wide stats, others see scoped views.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import TicketCard from '../components/TicketCard';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [recentTickets, setRecentTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, ticketsRes] = await Promise.all([
          client.get('/tickets/stats'),
          client.get('/tickets', { params: { per_page: 5 } }),
        ]);
        setStats(statsRes.data);
        setRecentTickets(ticketsRes.data.tickets);
      } catch (err) {
        console.error('Dashboard fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500" />
      </div>
    );
  }

  const statCards = [
    { label: 'Total Tickets', value: stats?.total_tickets || 0, icon: '🎫', color: 'border-blue-500/30 bg-blue-500/10' },
    { label: 'Open', value: stats?.open_tickets || 0, icon: '🟢', color: 'border-emerald-500/30 bg-emerald-500/10' },
    { label: 'In Progress', value: stats?.in_progress_tickets || 0, icon: '🔵', color: 'border-blue-500/30 bg-blue-500/10' },
    { label: 'Resolved', value: stats?.resolved_tickets || 0, icon: '🟡', color: 'border-amber-500/30 bg-amber-500/10' },
    { label: 'Critical', value: stats?.critical_tickets || 0, icon: '🔴', color: 'border-red-500/30 bg-red-500/10' },
    { label: 'Unassigned', value: stats?.unassigned_tickets || 0, icon: '⚪', color: 'border-dark-500/30 bg-dark-500/10' },
  ];

  // Add admin-only stats
  if (user?.role === 'admin') {
    statCards.push(
      { label: 'Total Users', value: stats?.total_users || 0, icon: '👥', color: 'border-purple-500/30 bg-purple-500/10' },
      { label: 'Technicians', value: stats?.total_technicians || 0, icon: '🔧', color: 'border-cyan-500/30 bg-cyan-500/10' },
    );
  }

  const greeting = {
    end_user: "Here's an overview of your support tickets.",
    technician: "Here's your ticket queue and assignments.",
    admin: "System-wide overview of the help desk.",
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Welcome back, {user?.username} 👋
          </h1>
          <p className="text-dark-400 mt-1">{greeting[user?.role]}</p>
        </div>
        <button
          onClick={() => navigate('/tickets/new')}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
        >
          ➕ New Ticket
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className={`rounded-xl border p-4 ${card.color}`}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">{card.icon}</span>
              <span className="text-xs text-dark-400 font-medium">{card.label}</span>
            </div>
            <p className="text-2xl font-bold text-white">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Recent Tickets */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Recent Tickets</h2>
          <button
            onClick={() => navigate('/tickets')}
            className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
          >
            View all →
          </button>
        </div>
        {recentTickets.length === 0 ? (
          <div className="bg-dark-800 border border-dark-700 rounded-xl p-8 text-center">
            <p className="text-dark-400">No tickets yet. Create one to get started!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentTickets.map((ticket) => (
              <TicketCard key={ticket.id} ticket={ticket} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
