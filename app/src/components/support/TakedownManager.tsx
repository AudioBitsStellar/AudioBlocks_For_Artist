'use client';

import React, { useState, useEffect } from 'react';
import { submitTakedownRequest, fetchTakedownRequests, TakedownRequestRecord } from '@/services/takedownService';

interface TakedownManagerProps {
  prefilledTrackIdOrUrl?: string;
}

export const TakedownManager: React.FC<TakedownManagerProps> = ({ prefilledTrackIdOrUrl = '' }) => {
  const [requests, setRequests] = useState<TakedownRequestRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form State matching TakedownRequestDTO
  const [infringingTrackIdOrUrl, setInfringingTrackIdOrUrl] = useState(prefilledTrackIdOrUrl);
  const [originalWorkReference, setOriginalWorkReference] = useState('');
  const [goodFaithStatement, setGoodFaithStatement] = useState(false);
  const [signature, setSignature] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const data = await fetchTakedownRequests();
      setRequests(data);
    } catch (err: any) {
      setError('Failed to load submitted takedown requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!infringingTrackIdOrUrl.trim()) {
      setError('Please provide the infringing song URL or track ID.');
      return;
    }
    if (!originalWorkReference.trim()) {
      setError('Please provide a reference or link to your original copyrighted work.');
      return;
    }
    if (!goodFaithStatement) {
      setError('You must certify your good-faith belief under penalty of perjury.');
      return;
    }
    if (!signature.trim()) {
      setError('Electronic signature (full legal name) is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      await submitTakedownRequest({
        infringingTrackIdOrUrl,
        originalWorkReference,
        goodFaithStatement,
        signature,
      });
      setSuccessMsg('DMCA takedown request submitted successfully. Our legal compliance team is reviewing the report.');
      setInfringingTrackIdOrUrl('');
      setOriginalWorkReference('');
      setGoodFaithStatement(false);
      setSignature('');
      await loadRequests();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit takedown request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-3xl mx-auto p-6">
      <div className="space-y-2">
        <h2 className="text-xl font-bold">Report Copyright Infringement (DMCA Takedown)</h2>
        <p className="text-sm text-muted">
          Use this form to submit a Digital Millennium Copyright Act (DMCA) takedown notice for unauthorized re-uploads of your creative works. Please review our{' '}
          <a href="/legal/copyright-policy" target="_blank" rel="noopener noreferrer" className="text-primary underline">
            Copyright & Takedown Policy
          </a>{' '}
          before proceeding.
        </p>
      </div>

      {error && <div className="p-3 bg-error/10 border border-error/30 rounded text-sm text-error">{error}</div>}
      {successMsg && <div className="p-3 bg-success/10 border border-success/30 rounded text-sm text-success">{successMsg}</div>}

      {/* Takedown Submission Form */}
      <form onSubmit={handleSubmit} className="bg-surface border border-border rounded-xl p-6 space-y-5">
        <div>
          <label className="block text-xs font-medium mb-1">Infringing Track URL or ID *</label>
          <input
            type="text"
            required
            placeholder="https://audioblocks.io/tracks/abc123xyz or track ID"
            value={infringingTrackIdOrUrl}
            onChange={(e) => setInfringingTrackIdOrUrl(e.target.value)}
            className="w-full px-3 py-2 bg-background border border-border rounded text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-medium mb-1">Original Work Reference *</label>
          <textarea
            required
            rows={3}
            placeholder="Provide links, ISRC codes, or descriptions proving your ownership of the original copyrighted work."
            value={originalWorkReference}
            onChange={(e) => setOriginalWorkReference(e.target.value)}
            className="w-full px-3 py-2 bg-background border border-border rounded text-sm"
          />
        </div>

        <div className="p-4 bg-background border border-border rounded-lg space-y-3">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              required
              checked={goodFaithStatement}
              onChange={(e) => setGoodFaithStatement(e.target.checked)}
              className="mt-1"
            />
            <span className="text-xs text-muted leading-relaxed">
              <strong>Good-Faith Statement:</strong> I swear, under penalty of perjury, that the information in this notification is accurate and that I am the copyright owner or am authorized to act on behalf of the owner of an exclusive right that is allegedly infringed.
            </span>
          </label>
        </div>

        <div>
          <label className="block text-xs font-medium mb-1">Electronic Signature (Full Legal Name) *</label>
          <input
            type="text"
            required
            placeholder="e.g. Muhammad A. Yahay"
            value={signature}
            onChange={(e) => setSignature(e.target.value)}
            className="w-full px-3 py-2 bg-background border border-border rounded text-sm"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-2.5 bg-error text-error-foreground font-medium text-sm rounded-lg hover:opacity-90 disabled:opacity-50 transition"
        >
          {isSubmitting ? 'Submitting Takedown Notice...' : 'Submit Takedown Request'}
        </button>
      </form>

      {/* Submitted Requests History */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold">Your Submitted Takedown Requests</h3>
        <div className="bg-surface rounded-xl border border-border overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-sm text-muted">Loading requests...</div>
          ) : requests.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted">No takedown requests submitted.</div>
          ) : (
            <div className="divide-y divide-border">
              {requests.map((req) => (
                <div key={req.id} className="p-4 flex items-center justify-between text-sm">
                  <div>
                    <p className="font-semibold font-mono text-xs">{req.infringingTrackIdOrUrl}</p>
                    <p className="text-xs text-muted mt-1">Submitted on: {new Date(req.submittedAt).toLocaleDateString()}</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded text-xs font-semibold uppercase ${
                    req.status === 'actioned' ? 'bg-success/10 text-success' :
                    req.status === 'rejected' ? 'bg-error/10 text-error' : 'bg-warning/10 text-warning'
                  }`}>
                    {req.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};