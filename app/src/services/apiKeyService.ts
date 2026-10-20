import axios from 'axios';

export interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  lastFour: string;
  scopes: string[];
  tier: string;
  createdAt: string;
  lastUsedAt?: string;
}

export interface CreateApiKeyPayload {
  name: string;
  scopes: string[];
}

export interface CreateApiKeyResponse {
  key: string; // Full unmasked key shown only once
  apiKey: ApiKey;
}

export const fetchApiKeys = async (): Promise<ApiKey[]> => {
  const response = await axios.get('/api/api-keys');
  return response.data.keys;
};

export const createApiKey = async (payload: CreateApiKeyPayload): Promise<CreateApiKeyResponse> => {
  const response = await axios.post('/api/api-keys', payload);
  return response.data;
};

export const revokeApiKey = async (id: string): Promise<void> => {
  await axios.delete(`/api/api-keys/${id}`);
};