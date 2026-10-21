import axios from 'axios';

export interface TakedownRequestPayload {
  infringingTrackIdOrUrl: string;
  originalWorkReference: string;
  goodFaithStatement: boolean;
  signature: string;
}

export interface TakedownRequestRecord {
  id: string;
  infringingTrackIdOrUrl: string;
  originalWorkReference: string;
  status: 'pending' | 'reviewed' | 'actioned' | 'rejected';
  submittedAt: string;
}

export const submitTakedownRequest = async (payload: TakedownRequestPayload): Promise<TakedownRequestRecord> => {
  const response = await axios.post('/api/takedown', payload);
  return response.data.request;
};

export const fetchTakedownRequests = async (): Promise<TakedownRequestRecord[]> => {
  const response = await axios.get('/api/takedown');
  return response.data.requests;
};