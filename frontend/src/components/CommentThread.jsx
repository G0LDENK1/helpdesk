/**
 * Comment thread component for ticket detail view.
 * Shows public + internal comments (internal only visible to staff).
 * Includes a form to add new comments.
 */

import React, { useState, useEffect } from 'react';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function CommentThread({ ticketId }) {
  const { user } = useAuth();
  const [comments, setComments] = useState([]);
  const [content, setContent] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const isStaff = user?.role === 'technician' || user?.role === 'admin';

  const fetchComments = async () => {
    try {
      const res = await client.get(`/tickets/${ticketId}/comments`);
      setComments(res.data);
    } catch (err) {
      console.error('Failed to fetch comments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [ticketId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    setSubmitting(true);
    try {
      await client.post(`/tickets/${ticketId}/comments`, {
        content: content.trim(),
        is_internal: isInternal,
      });
      setContent('');
      setIsInternal(false);
      fetchComments();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to post comment');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  if (loading) {
    return <div className="text-dark-400 text-sm py-4">Loading comments...</div>;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white flex items-center gap-2">
        💬 Comments
        <span className="text-sm text-dark-400 font-normal">({comments.length})</span>
      </h3>

      {/* Comment list */}
      <div className="space-y-3">
        {comments.length === 0 ? (
          <p className="text-sm text-dark-400 py-4 text-center">No comments yet</p>
        ) : (
          comments.map((comment) => (
            <div
              key={comment.id}
              className={`rounded-lg p-4 ${
                comment.is_internal
                  ? 'bg-amber-500/10 border border-amber-500/20'
                  : 'bg-dark-800 border border-dark-700'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-dark-600 flex items-center justify-center text-xs font-bold text-white">
                    {comment.author?.username?.charAt(0).toUpperCase() || '?'}
                  </div>
                  <span className="text-sm font-medium text-white">
                    {comment.author?.username || `User #${comment.user_id}`}
                  </span>
                  {comment.is_internal && (
                    <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      Internal
                    </span>
                  )}
                </div>
                <span className="text-xs text-dark-500">{formatDate(comment.created_at)}</span>
              </div>
              <p className="text-sm text-dark-200 whitespace-pre-wrap">{comment.content}</p>
            </div>
          ))
        )}
      </div>

      {/* New comment form */}
      <form onSubmit={handleSubmit} className="bg-dark-800 rounded-lg border border-dark-700 p-4">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write a comment..."
          rows={3}
          className="w-full bg-dark-900 border border-dark-600 rounded-lg px-3 py-2 text-sm text-white placeholder-dark-500 focus:outline-none focus:border-blue-500 resize-none"
        />
        <div className="flex items-center justify-between mt-3">
          <div>
            {isStaff && (
              <label className="flex items-center gap-2 text-sm text-dark-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isInternal}
                  onChange={(e) => setIsInternal(e.target.checked)}
                  className="rounded border-dark-600 bg-dark-900 text-blue-500 focus:ring-blue-500"
                />
                Internal note (staff only)
              </label>
            )}
          </div>
          <button
            type="submit"
            disabled={submitting || !content.trim()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
          >
            {submitting ? 'Posting...' : 'Post Comment'}
          </button>
        </div>
      </form>
    </div>
  );
}
