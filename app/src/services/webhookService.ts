import axios from 'axios';

export interface WebhookSubscription {
  id: string;
  url: string;
  events: string[];
  createdAt: string;
  status: 'active' | 'paused';
}

export interface WebhookDelivery {
  id: string;
  subscriptionId: string;
  event: string;
  statusCode: number;
  responseBody?: string;
  deliveredAt: string;
  status: 'success' | 'failed';
}

export interface CreateWebhookPayload {
  url: string;
  events: string[];
}

export interface CreateWebhookResponse {
  secret: string; // Signing secret shown only once upon creation
  subscription: WebhookSubscription;
}

export const fetchWebhooks = async (): Promise<WebhookSubscription[]> => {
  const response = await axios.get('/api/webhooks');
  return response.data.subscriptions;
};

export const createWebhook = async (payload: CreateWebhookPayload): Promise<CreateWebhookResponse> => {
  const response = await axios.post('/api/webhooks', payload);
  return response.data;
};

export const deleteWebhook = async (id: string): Promise<void> => {
  await axios.delete(`/api/webhooks/${id}`);
};

export const fetchWebhookDeliveries = async (subscriptionId: string): Promise<WebhookDelivery[]> => {
  const response = await axios.get(`/api/webhooks/${subscriptionId}/deliveries`);
  return response.data.deliveries;
};

export const redeliverWebhook = async (subscriptionId: string, deliveryId: string): Promise<void> => {
  await axios.post(`/api/webhooks/${subscriptionId}/deliveries/${deliveryId}/redeliver`);
};

export const sendTestEvent = async (subscriptionId: string, event: string): Promise<void> => {
  await axios.post(`/api/webhooks/${subscriptionId}/test`, { event });
};