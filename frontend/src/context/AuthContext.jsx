/**
 * Authentication context: manages login state, tokens, and user info.
 * Provides login/logout/register functions and current user data.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import client from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Load user profile from token on mount
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      client
        .get('/auth/me')
        .then((res) => setUser(res.data))
        .catch(() => {
          localStorage.clear();
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  // Fetch notifications periodically
  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const res = await client.get('/notifications', { params: { limit: 20 } });
      setNotifications(res.data);
      setUnreadCount(res.data.filter((n) => !n.is_read).length);
    } catch {
      // Silently ignore notification fetch errors
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 30000); // Poll every 30s
      return () => clearInterval(interval);
    }
  }, [user, fetchNotifications]);

  const login = async (username, password) => {
    const { data } = await client.post('/auth/login', { username, password });
    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);
    const meRes = await client.get('/auth/me');
    setUser(meRes.data);
    return meRes.data;
  };

  const register = async (username, email, password) => {
    await client.post('/auth/register', { username, email, password });
  };

  const logout = () => {
    localStorage.clear();
    setUser(null);
    setNotifications([]);
    setUnreadCount(0);
  };

  const markAllRead = async () => {
    await client.post('/notifications/read-all');
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        register,
        notifications,
        unreadCount,
        markAllRead,
        fetchNotifications,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
