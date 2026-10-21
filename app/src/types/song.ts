export interface SongTrack {
  id: string;
  title: string;
  coverUrl: string;
  isMinted: boolean;
  isNearDuplicate?: boolean;
  duplicateOfSongId?: string;
  duplicateSimilarityScore?: number;
  originalSongTitle?: string;
  originalSongUrl?: string;
}


export interface SongTrack {
  id: string;
  title: string;
  coverUrl: string;
  isMinted: boolean;
  flagged?: boolean;
  flagReason?: string;
  flaggedAt?: string;
  isTakenDown?: boolean;
  takedownReason?: string;
  takedownAt?: string;
}