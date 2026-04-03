/**
 * Sidebar navigation with user info, nav links, and notification badge.
 * Responsive: collapses on mobile with hamburger menu.
 */

import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { path: '/', label: 'Dashboard', icon: '📊' },
  { path: '/tickets', label: 'Tickets', icon: '🎫' },
  { path: '/tickets/new', label: 'New Ticket', icon: '➕' },
];

export default function Sidebar() {
  const { user, logout, unreadCount, markAllRead, notifications } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const roleLabel = {
    end_user: 'End User',
    technician: 'Technician',
    admin: 'Admin',
  };

  const roleBadgeColor = {
    end_user: 'bg-green-600',
    technician: 'bg-blue-600',
    admin: 'bg-purple-600',
  };

  const sidebarContent = (
    <>
      {/* Logo / Brand */}
      <div className="p-6 border-b border-dark-700">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          🛠️ <span>Help Desk</span>
        </h1>
        <p className="text-xs text-dark-400 mt-1">IT Support Portal</p>
      </div>

      {/* User Info */}
      <div className="p-4 border-b border-dark-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-dark-600 flex items-center justify-center text-lg font-bold text-white">
            {user?.username?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.username}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full text-white ${roleBadgeColor[user?.role]}`}>
              {roleLabel[user?.role]}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                  : 'text-dark-300 hover:bg-dark-700 hover:text-white'
              }`
            }
          >
            <span className="text-lg">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Notifications */}
      <div className="p-4 border-t border-dark-700">
        <button
          onClick={() => setShowNotifs(!showNotifs)}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm text-dark-300 hover:bg-dark-700 hover:text-white"
        >
          <span className="flex items-center gap-2">
            🔔 Notifications
          </span>
          {unreadCount > 0 && (
            <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
              {unreadCount}
            </span>
          )}
        </button>

        {showNotifs && (
          <div className="mt-2 bg-dark-800 rounded-lg border border-dark-600 max-h-60 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="p-3 text-xs text-dark-400 text-center">No notifications</p>
            ) : (
              <>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="w-full text-xs text-blue-400 hover:text-blue-300 p-2 border-b border-dark-700"
                  >
                    Mark all as read
                  </button>
                )}
                {notifications.slice(0, 10).map((n) => (
                  <div
                    key={n.id}
                    className={`p-2.5 text-xs border-b border-dark-700 last:border-0 cursor-pointer hover:bg-dark-700 ${
                      n.is_read ? 'text-dark-400' : 'text-dark-200 font-medium'
                    }`}
                    onClick={() => n.ticket_id && navigate(`/tickets/${n.ticket_id}`)}
                  >
                    {!n.is_read && <span className="inline-block w-1.5 h-1.5 bg-blue-500 rounded-full mr-1.5" />}
                    {n.message}
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>

      {/* Logout */}
      <div className="p-4 border-t border-dark-700">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
        >
          🚪 Logout
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-dark-800 rounded-lg text-white"
      >
        {mobileOpen ? '✕' : '☰'}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static z-40 h-full w-64 bg-dark-900 border-r border-dark-700 flex flex-col transform transition-transform lg:transform-none ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
