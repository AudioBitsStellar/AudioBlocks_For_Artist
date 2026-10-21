'use client';

import React, { useState, useEffect } from 'react';
import {
  fetchWebhooks,
  createWebhook,
  deleteWebhook,
  fetchWebhookDeliveries,
  redeliverWebhook,
  sendTestEvent,
  WebhookSubscription,
  WebhookDelivery,
} from '@/services/webhookService';

const AVAILABLE_EVENTS = [
  { id: 'song.minted', label: 'Song Minted', description: 'Triggered when a new track NFT is minted.' },
  { id: 'mint_status_changed', label: 'Mint Status Changed', description: 'Triggered on mint status state updates.' },
  { id: 'sales', label: 'New Sale / Royalty', description: 'Triggered when a track sale or royalty distribution occurs.' },
];

export default function WebhooksSettingsPage() {
  const [subscriptions, setSubscriptions] = useState<WebhookSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Creation State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [url, setUrl] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [newSigningSecret, setNewSigningSecret] = useState<string | null>(null);
  const [copiedSecret, setCopiedSecret] = useState(false);

  // Deliveries Drawer / History State
  const [selectedSub, setSelectedSub] = useState<WebhookSubscription | null>(null);
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);
  const [loadingDeliveries, setLoadingDeliveries] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const loadSubscriptions = async () => {
    setLoading(true);
    try {
      const data = await fetchWebhooks();
      setSubscriptions(data);
    } catch (err: any) {
      setError('Failed to load webhook subscriptions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubscriptions();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.startsWith('https://')) {
      setError('Webhook endpoint URL must use HTTPS.');
      return;
    }
    if (selectedEvents.length === 0) return;

    try {
      const res = await createWebhook({ url, events: selectedEvents });
      setNewSigningSecret(res.secret);
      setUrl('');
      setSelectedEvents([]);
      setShowCreateModal(false);
      await loadSubscriptions();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create webhook subscription.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this webhook subscription?')) return;
    try {
      await deleteWebhook(id);
      if (selectedSub?.id === id) setSelectedSub(null);
      await loadSubscriptions();
    } catch (err: any) {
      setError('Failed to delete webhook subscription.');
    }
  };

  const handleOpenDeliveries = async (sub: WebhookSubscription) => {
    setSelectedSub(sub);
    setLoadingDeliveries(true);
    setActionFeedback(null);
    try {
      const data = await fetchWebhookDeliveries(sub.id);
      setDeliveries(data);
    } catch (err: any) {
      setActionFeedback('Failed to load delivery history.');
    } finally {
      setLoadingDeliveries(false);
    }
  };

  const handleRedeliver = async (deliveryId: string) => {
    if (!selectedSub) return;
    try {
      await redeliverWebhook(selectedSub.id, deliveryId);
      setActionFeedback('Redelivery request submitted.');
      handleOpenDeliveries(selectedSub);
    } catch (err: any) {
      setActionFeedback('Redelivery attempt failed.');
    }
  };

  const handleSendTestEvent = async (sub: WebhookSubscription) => {
    try {
      await sendTestEvent(sub.id, sub.events[0] || 'song.minted');
      setActionFeedback('Test event dispatched successfully!');
      if (selectedSub?.id === sub.id) handleOpenDeliveries(sub);
    } catch (err: any) {
      setActionFeedback('Failed to dispatch test event.');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Outbound Webhooks</h2>
          <p className="text-sm text-muted">
            Configure real-time event webhooks for Discord bots, external sites, and integrations.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:opacity-90 transition"
        >
          Add Webhook Endpoint
        </button>
      </div>

      {/* Docs Guidance Link */}
      <div className="p-4 bg-background border border-border rounded-lg text-sm flex items-center justify-between">
        <span>Need to verify payload HMAC signatures on your server?</span>
        <a
          href="/docs/webhooks/signature-verification"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline font-medium hover:text-primary-focus"
        >
          Read Signature Verification Docs &rarr;
        </a>
      </div>

      {error && <div className="p-3 bg-error/10 border border-error/30 rounded text-sm text-error">{error}</div>}

      {/* Signing Secret Reveal Banner */}
      {newSigningSecret && (
        <div className="p-6 bg-warning/10 border border-warning/30 rounded-xl space-y-3">
          <h3 className="font-bold text-warning">Webhook Signing Secret</h3>
          <p className="text-xs text-muted">
            Save this signing secret. It is used to verify payload HMAC signatures on your endpoint and won't be shown again.
          </p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={newSigningSecret}
              className="w-full px-3 py-2 bg-background border border-border rounded font-mono text-sm"
            />
            <button
              onClick={() => copyToClipboard(newSigningSecret)}
              className="px-4 py-2 bg-primary text-primary-foreground text-sm rounded font-medium whitespace-nowrap"
            >
              {copiedSecret ? 'Copied!' : 'Copy Secret'}
            </button>
          </div>
          <button
            onClick={() => setNewSigningSecret(null)}
            className="text-xs text-muted underline hover:text-foreground"
          >
            I have saved the secret, dismiss
          </button>
        </div>
      )}

      {/* Subscriptions List */}
      <div className="bg-surface rounded-xl border border-border overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-muted">Loading webhooks...</div>
        ) : subscriptions.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted">No webhook subscriptions configured yet.</div>
        ) : (
          <div className="divide-y divide-border">
            {subscriptions.map((sub) => (
              <div key={sub.id} className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-sm font-mono truncate max-w-md">{sub.url}</p>
                    <p className="text-xs text-muted mt-0.5">Events: {sub.events.join(', ')}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleSendTestEvent(sub)}
                      className="px-3 py-1.5 text-xs bg-background border border-border rounded hover:bg-surface transition font-medium"
                    >
                      Send Test Event
                    </button>
                    <button
                      onClick={() => handleOpenDeliveries(sub)}
                      className="px-3 py-1.5 text-xs bg-primary/10 text-primary rounded hover:bg-primary/20 transition font-medium"
                    >
                      Deliveries
                    </button>
                    <button
                      onClick={() => handleDelete(sub.id)}
                      className="px-3 py-1.5 text-xs bg-error/10 text-error rounded hover:bg-error/20 transition font-medium"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delivery History Panel */}
      {selectedSub && (
        <div className="p-6 bg-surface rounded-xl border border-border space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h3 className="text-md font-bold">
              Delivery History for <span className="font-mono text-sm">{selectedSub.url}</span>
            </h3>
            <button
              onClick={() => setSelectedSub(null)}
              className="text-xs text-muted hover:text-foreground"
            >
              Close
            </button>
          </div>

          {actionFeedback && (
            <div className="p-3 bg-info/10 border border-info/30 rounded text-xs text-info">{actionFeedback}</div>
          )}

          {loadingDeliveries ? (
            <p className="text-xs text-muted">Loading delivery logs...</p>
          ) : deliveries.length === 0 ? (
            <p className="text-xs text-muted">No delivery attempts recorded yet.</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {deliveries.map((del) => (
                <div key={del.id} className="p-3 bg-background rounded-lg border border-border flex items-center justify-between text-xs">
                  <div>
                    <span className={`font-semibold px-2 py-0.5 rounded text-[10px] mr-2 ${
                      del.status === 'success' ? 'bg-success/10 text-success' : 'bg-error/10 text-error'
                    }`}>
                      {del.statusCode} {del.status.toUpperCase()}
                    </span>
                    <span className="font-mono">{del.event}</span>
                    <span className="text-muted ml-2">• {new Date(del.deliveredAt).toLocaleString()}</span>
                  </div>
                  <button
                    onClick={() => handleRedeliver(del.id)}
                    className="px-2.5 py-1 bg-surface border border-border rounded hover:bg-background transition font-medium"
                  >
                    Redeliver
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <form onSubmit={handleCreate} className="bg-surface border border-border rounded-xl p-6 max-w-lg w-full space-y-4">
            <h3 className="text-lg font-bold">Add Webhook Subscription</h3>

            <div>
              <label className="block text-xs font-medium mb-1">Payload URL (HTTPS Required)</label>
              <input
                type="url"
                required
                placeholder="https://your-domain.com/webhooks/audioblocks"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-2">Subscribed Events</label>
              <div className="space-y-2">
                {AVAILABLE_EVENTS.map((ev) => {
                  const isChecked = selectedEvents.includes(ev.id);
                  return (
                    <label
                      key={ev.id}
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition ${
                        isChecked ? 'border-primary bg-primary/5' : 'border-border bg-background'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedEvents([...selectedEvents, ev.id]);
                          } else {
                            setSelectedEvents(selectedEvents.filter((id) => id !== ev.id));
                          }
                        }}
                        className="mt-0.5"
                      />
                      <div>
                        <p className="text-sm font-semibold">{ev.label}</p>
                        <p className="text-xs text-muted">{ev.description}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-sm text-muted hover:text-foreground"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!url || selectedEvents.length === 0}
                className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:opacity-90 disabled:opacity-50 transition"
              >
                Create Webhook
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}