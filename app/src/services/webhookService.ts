import axios from 'axios';

/**
 * Represents a webhook subscription registered by a user.
 */
export interface WebhookSubscription {
  id: string;
  url: string;
  events: string[];
  createdAt: string;
  status: 'active' | 'paused';
}

/**
 * Represents an individual webhook delivery attempt.
 */
export interface WebhookDelivery {
  id: string;
  subscriptionId: string;
  event: string;
  statusCode: number;
  responseBody?: string;
  deliveredAt: string;
  status: 'success' | 'failed';
}

/**
 * Payload used when creating a webhook subscription.
 */
export interface CreateWebhookPayload {
  url: string;
  events: string[];
}

/**
 * Response returned when a webhook subscription is created.
 * The signing secret is only returned once.
 */
export interface CreateWebhookResponse {
  secret: string;
  subscription: WebhookSubscription;
}

/**
 * API response wrappers.
 */
interface FetchWebhooksResponse {
  subscriptions: WebhookSubscription[];
}

interface FetchWebhookDeliveriesResponse {
  deliveries: WebhookDelivery[];
}

/**
 * Fetch all webhook subscriptions for the authenticated user.
 */
export const fetchWebhooks = async (): Promise<WebhookSubscription[]> => {
  const response = await axios.get<FetchWebhooksResponse>('/api/webhooks');

  return response.data.subscriptions;
};

/**
 * Create a new webhook subscription.
 */
export const createWebhook = async (
  payload: CreateWebhookPayload,
): Promise<CreateWebhookResponse> => {
  const response = await axios.post<CreateWebhookResponse>(
    '/api/webhooks',
    payload,
  );

  return response.data;
};

/**
 * Delete a webhook subscription by ID.
 */
export const deleteWebhook = async (id: string): Promise<void> => {
  await axios.delete(`/api/webhooks/${encodeURIComponent(id)}`);
};

/**
 * Fetch delivery history for a specific webhook subscription.
 */
export const fetchWebhookDeliveries = async (
  subscriptionId: string,
): Promise<WebhookDelivery[]> => {
  const response = await axios.get<FetchWebhookDeliveriesResponse>(
    `/api/webhooks/${encodeURIComponent(subscriptionId)}/deliveries`,
  );

  return response.data.deliveries;
};

/**
 * Retry a failed webhook delivery.
 */
export const redeliverWebhook = async (
  subscriptionId: string,
  deliveryId: string,
): Promise<void> => {
  await axios.post(
    `/api/webhooks/${encodeURIComponent(subscriptionId)}/deliveries/${encodeURIComponent(deliveryId)}/redeliver`,
  );
};

/**
 * Send a test event to a webhook subscription.
 */
export export const sendTestEvent = async (
  subscriptionId: string,
  event: string,
): Promise<void> => {
  await axios.post(
    `/api/webhooks/${encodeURIComponent(subscriptionId)}/test`,
    { event },
  );
};