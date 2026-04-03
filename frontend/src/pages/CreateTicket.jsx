/**
 * Create Ticket page with form validation.
 * Allows any authenticated user to submit a new support ticket.
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';

export default function CreateTicket() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: 'medium',
    category: 'other',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.title.length < 5) {
      setError('Title must be at least 5 characters');
      return;
    }
    if (form.description.length < 10) {
      setError('Description must be at least 10 characters');
      return;
    }

    setSubmitting(true);
    try {
      const res = await client.post('/tickets', form);
      navigate(`/tickets/${res.data.id}`);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create ticket');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <button
          onClick={() => navigate('/tickets')}
          className="text-sm text-dark-400 hover:text-white transition-colors mb-4 flex items-center gap-1"
        >
          ← Back to Tickets
        </button>
        <h1 className="text-2xl font-bold text-white">Create New Ticket</h1>
        <p className="text-dark-400 mt-1">Describe your issue and we'll get it resolved.</p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-dark-900 border border-dark-700 rounded-xl p-6 space-y-5"
      >
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-dark-300 mb-1.5">Title</label>
          <input
            type="text"
            name="title"
            value={form.title}
            onChange={handleChange}
            required
            maxLength={200}
            placeholder="Brief summary of the issue"
            className="w-full bg-dark-800 border border-dark-600 rounded-lg px-4 py-2.5 text-white placeholder-dark-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-dark-300 mb-1.5">Description</label>
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            required
            rows={6}
            maxLength={5000}
            placeholder="Provide detailed information about the issue, including steps to reproduce, expected behavior, etc."
            className="w-full bg-dark-800 border border-dark-600 rounded-lg px-4 py-2.5 text-white placeholder-dark-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
          />
          <p className="text-xs text-dark-500 mt-1">{form.description.length}/5000</p>
        </div>

        {/* Priority + Category */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1.5">Priority</label>
            <select
              name="priority"
              value={form.priority}
              onChange={handleChange}
              className="w-full bg-dark-800 border border-dark-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
            >
              <option value="low">🟢 Low</option>
              <option value="medium">🟡 Medium</option>
              <option value="high">🟠 High</option>
              <option value="critical">🔴 Critical</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1.5">Category</label>
            <select
              name="category"
              value={form.category}
              onChange={handleChange}
              className="w-full bg-dark-800 border border-dark-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
            >
              <option value="network">🌐 Network</option>
              <option value="hardware">🖥️ Hardware</option>
              <option value="software">💿 Software</option>
              <option value="access">🔑 Access</option>
              <option value="other">📋 Other</option>
            </select>
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate('/tickets')}
            className="px-4 py-2.5 bg-dark-800 border border-dark-600 text-dark-300 hover:bg-dark-700 hover:text-white text-sm font-medium rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {submitting ? 'Creating...' : '🎫 Create Ticket'}
          </button>
        </div>
      </form>
    </div>
  );
}
