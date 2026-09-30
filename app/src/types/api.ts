// Typed shapes for every API response returned by the AudioBlocks backend.
// Import from here instead of inlining interface definitions in service files.

import type { ArtistDirectoryStatus } from "@/api/api-endpoint";
import type { TrackVisibility } from "@/services/trackVisibilityService";

// ── Shared envelope ───────────────────────────────────────────────────────────

export interface ApiEnvelope<T = unknown> {
  success: boolean;
  message?: string;
  data: T;
}

export interface ApiError {
  success: false;
  message: string;
  errors?: Record<string, string[]>;
  statusCode?: number;
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email?: string;
  role: string;
  username?: string;
  name?: string;
  /**
   * Whether the address has passed onboarding verification (#459). Left
   * optional because the backend does not return it yet; `undefined` means
   * "unknown" and is treated as verified so existing accounts are not locked
   * out — see `requiresEmailVerification()`.
   */
  emailVerified?: boolean;
}

export interface AuthResponse {
  user: AuthUser;
  token: string;
}

export interface RegisterEmailPayload {
  email: string;
  password: string;
  role: "artist" | "listener" | "admin";
  username?: string;
  name?: string;
}

export interface LoginEmailPayload {
  email: string;
  password: string;
}

export interface RefreshTokenResponse {
  token: string;
  expiresIn: number;
}

// ── Artist profile ────────────────────────────────────────────────────────────

export interface ArtistProfile {
  id: string;
  username: string;
  name?: string;
  bio?: string;
  website?: string;
  twitter?: string;
  profileImageUrl?: string;
  pageCoverUrl?: string;
  stellarPublicKey?: string;
  createdAt: string;
}

export interface UpdateProfilePayload {
  username: string;
  bio: string;
  website: string;
  profileImage?: File | string;
  pageCover?: string;
  twitter: string;
}

export type ArtistProfileResponse = ApiEnvelope<ArtistProfile>;

/** `GET` profile response consumed by `useGetProfile` (artistServices). */
export interface ProfileResponse {
  user: AuthUser;
}

// ── Overview KPIs ─────────────────────────────────────────────────────────────

export interface OverviewKpi {
  songsPublished: number;
  totalEarnings: number;
  listenersCount: number;
  mostStreamedRegion: string;
}

export type OverviewResponse = ApiEnvelope<OverviewKpi>;

// ── Earnings ──────────────────────────────────────────────────────────────────

export interface EarningsDataPoint {
  month: string;
  earnings: number;
  royalties: number;
}

export interface EarningsSummary {
  totalEarnings: number;
  comparedToLastMonth: number;
  data: EarningsDataPoint[];
}

export type EarningsResponse = ApiEnvelope<EarningsSummary>;

// ── Platform Revenue Breakdown ──────────────────────────────────────────────

export interface PlatformRevenue {
  platform: string;
  revenue: number;
  percentage: number;
  streams: number;
}

export interface PlatformRevenueSummary {
  totalRevenue: number;
  platforms: PlatformRevenue[];
}

export type PlatformRevenueResponse = ApiEnvelope<PlatformRevenueSummary>;

// ── Transactions ───────────────────────────────────────────────────────────

export interface DashboardTransaction {
  id: string | number;
  type: string;
  song: string;
  value: string;
  date: string;
  receiptUrl?: string;
}

export interface TransactionsResponse {
  success: boolean;
  data: DashboardTransaction[];
}

// ── Albums ────────────────────────────────────────────────────────────────────

export interface Album {
  id: string;
  title: string;
  coverArtUrl?: string;
  releaseDate?: string;
  songCount?: number;
}

export type AlbumsResponse = ApiEnvelope<Album[]>;

/** Multipart fields sent to `POST /artist/albums` (see albumService). */
export interface CreateAlbumPayload {
  albumTitle: string;
  genre: string;
  songTitle: string;
  purchasePrice: string;
}

// ── Songs / upload ────────────────────────────────────────────────────────────

export interface SongMeta {
  id: string;
  title: string;
  genre: string;
  description?: string;
  composer?: string;
  coverArtUrl?: string;
  ipfsCid?: string;
  tokenId?: string;
  marketPrice?: string;
  purchasePrice?: string;
  albumId?: string;
  /**
   * Who may find and play this track (#458). Optional because the field is new
   * in the API contract: a record without it is treated as `public`, which is
   * how it behaved before the setting existed.
   */
  visibility?: TrackVisibility;
  createdAt: string;
}

export type UploadCoverResponse = ApiEnvelope<{ cover: string; fileId: string }>;

export interface UploadChunkResponse {
  chunkIndex: number;
  fileId: string;
  chunk: number | string;
}

export interface FinalizeSongPayload {
  fileId: string;
  totalChunks: number;
  title: string;
  coverArtPath: string;
  description: string;
  genre: string;
  composer: string;
  /** Omitted means the server's default; the upload form sends `private` explicitly. */
  visibility?: TrackVisibility;
}

export type FinalizeSongResponse = ApiEnvelope<SongMeta>;

// ── Merch ──────────────────────────────────────────────────────────────────

export interface MerchMetric {
  label: string;
  value: string;
  descriptor: string;
  gradient: string;
}

export interface MerchItem {
  id: number;
  title: string;
  detail: string;
  date: string;
  time: string;
  price: string;
  image: string;
}

export interface MerchListResponse {
  metrics: MerchMetric[];
  items: MerchItem[];
}

export interface CreateMerchPayload {
  title: string;
  detail: string;
  date: string;
  time: string;
  price: string;
  image?: string;
}

export type UpdateMerchPayload = Partial<CreateMerchPayload>;

export interface MerchInventoryItem {
  id: number;
  title: string;
  stock: number;
  reserved: number;
}

export interface MerchOrder {
  id: number;
  itemId: number;
  itemTitle: string;
  quantity: number;
  price: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

export interface PriceValidation {
  valid: boolean;
  errors: Record<string, string>;
}

export interface PriceValidation {
  valid: boolean;
  errors: Record<string, string>;
}

/** Body for placing a merch order. */
export interface MerchOrderPayload {
  itemId: number;
  quantity: number;
}

// ── Events ─────────────────────────────────────────────────────────────────

export interface EventMetric {
  label: string;
  value: string;
  descriptor: string;
  gradient: string;
}

export interface EventItem {
  id: string | number;
  title: string;
  tickets: string;
  date: string;
  time: string;
  price: string;
  image: string;
}

export interface EngagementTrendPoint {
  date: string;
  score: number;
  attendees: number;
}

export interface EventEngagement {
  metrics: EventMetric[];
  trend: EngagementTrendPoint[];
}

export interface EventListResponse {
  metrics: EventMetric[];
  engagement: EventEngagement;
  items: EventItem[];
}

export interface CreateEventPayload {
  title: string;
  tickets: string;
  date: string;
  time: string;
  price: string;
  image?: string;
}

export type UpdateEventPayload = Partial<CreateEventPayload>;

// ── Analytics ──────────────────────────────────────────────────────────────

export interface AnalyticsSummary {
  totalPlays: number;
  uniqueListeners: number;
  engagementRate: number;
  growthPercentage: number;
  engagementTrendPercentage?: number;
  listenerGrowthPercentage?: number;
}

export interface PlayTrendData {
  date: string;
  plays: number;
}

export interface GeographicData {
  country: string;
  region: string;
  plays: number;
}

export interface AgeDemographic {
  range: string;
  percentage: number;
}

export interface GenderDemographic {
  category: string;
  percentage: number;
}

export interface DeviceDemographic {
  device: string;
  percentage: number;
}

export interface DemographicsData {
  age: AgeDemographic[];
  gender: GenderDemographic[];
  device: DeviceDemographic[];
}

export interface AnalyticsData {
  summary: AnalyticsSummary;
  playTrends: PlayTrendData[];
  geographicDistribution: GeographicData[];
  demographics?: DemographicsData;
  period: "last30days" | "last90days";
  insights?: AnalyticsInsights;
}

export interface AnalyticsInsights {
  peakListeningHours: string;
  topPerformingTrackPlays: number;
  topPerformingTrackGrowthPercentage: number;
  listenerRetentionPercentage: number;
}

export interface AnalyticsResponse {
  success: boolean;
  data: AnalyticsData;
}

export interface AnalyticsSummaryResponse {
  success: boolean;
  data: AnalyticsSummary;
}

// ── On-chain (Soroban / Stellar) ──────────────────────────────────────────────

export interface PreparedTransaction {
  xdr: string;
  networkPassphrase: string;
}

export interface ConnectWalletRequest {
  stellarPublicKey: string;
}

export interface ConnectWalletResponse {
  stellarPublicKey: string;
}

export interface PrepareArtistSetupRequest {
  cid: string;
}

export interface SubmitArtistSetupRequest {
  signedXdr: string;
}

export interface SubmitArtistSetupResponse {
  txHash: string;
  artistId: string;
  tokenId: string;
}

export interface PrepareSongMintRequest {
  albumId?: number;
}

export interface SubmitSongMintRequest {
  signedXdr: string;
}

export interface SubmitSongMintResponse {
  txHash: string;
  songId: string;
  tokenId: string;
}

export interface PrepareSongTransferRequest {
  toAddress: string;
}

export interface SubmitSongTransferRequest {
  signedXdr: string;
}

export interface SubmitSongTransferResponse {
  txHash: string;
  songId: string;
  toAddress: string;
}

// ── Notification preferences ──────────────────────────────────────────────────

export type NotificationEventKey =
  | "newFan"
  | "earnings"
  | "eventReminder"
  | "qualityCheck";
export type NotificationChannel = "email" | "inApp";

export type NotificationPreferences = Record<
  NotificationEventKey,
  Record<NotificationChannel, boolean>
>;

export type NotificationPreferencesResponse = ApiEnvelope<NotificationPreferences>;

// ── Artist directory ───────────────────────────────────────────────────────

/** One row of the admin artist directory. */
export interface ArtistDirectoryEntry {
  id: string;
  /** Display name, falling back to the handle when the artist has no stage name. */
  name: string;
  handle: string;
  email?: string;
  profileImage?: string;
  status: Exclude<ArtistDirectoryStatus, "all">;
  joinedAt?: string;
  songCount?: number;
  albumCount?: number;
  totalEarnings?: number;
}

export interface ArtistDirectoryResponse {
  success: boolean;
  data: ArtistDirectoryEntry[];
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ── Comments ───────────────────────────────────────────────────────────────

export interface DashboardComment {
  id: string | number;
  name: string;
  time: string;
  comment: string;
  avatar?: string;
  attachmentUrl?: string;
  attachmentName?: string;
}

export interface CommentsResponse {
  success: boolean;
  data: DashboardComment[];
}

export interface CreateCommentPayload {
  comment: string;
  attachment?: File;
}

export interface CreateCommentResponse {
  success: boolean;
  data: DashboardComment;
}

// ── Notifications ──────────────────────────────────────────────────────────

/** An in-app notification about something that happened to the artist. */
export interface ArtistNotification {
  id: string;
  /** Same keys as the notification preferences, so each kind can be muted in settings. */
  kind: NotificationEventKey;
  title: string;
  message: string;
  /** ISO 8601 timestamp. */
  createdAt: string;
  read: boolean;
  /** Dashboard route to open when the notification is selected. */
  href?: string;
}

// ── Royalty distribution ───────────────────────────────────────────────────

/** Response after submitting a royalty split transaction. */
export interface SubmitRoyaltySplitResponse {
  txHash: string;
  songId: string;
  splitId: string;
  recipients: Array<{
    address: string;
    basisPoints: number;
  }>;
}

/** A royalty distribution record. */
export interface RoyaltyDistribution {
  songId: string;
  splitId: string;
  recipients: Array<{
    address: string;
    basisPoints: number;
    sharePercentage: number;
  }>;
  totalBasisPoints: number;
  createdAt: string;
}

// ── Pagination meta ───────────────────────────────────────────────────────────

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> extends ApiEnvelope<T[]> {
  meta: PaginationMeta;
}
