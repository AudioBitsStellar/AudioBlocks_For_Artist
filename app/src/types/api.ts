// Typed shapes for every API response returned by the AudioBlocks backend.
// Import from here instead of inlining interface definitions in service files.

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

export interface ArtistProfileResponse extends ApiEnvelope<ArtistProfile> {}

// ── Overview KPIs ─────────────────────────────────────────────────────────────

export interface OverviewKpi {
  songsPublished: number;
  totalEarnings: number;
  listenersCount: number;
  mostStreamedRegion: string;
}

export interface OverviewResponse extends ApiEnvelope<OverviewKpi> {}

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

export interface EarningsResponse extends ApiEnvelope<EarningsSummary> {}

// ── Transactions ──────────────────────────────────────────────────────────────

export type TransactionType = "Royalty" | "Sale" | "Payout" | "Refund";

export interface TransactionItem {
  id: string;
  type: TransactionType;
  song?: string;
  album?: string;
  value: string;
  currency: string;
  date: string;
  status: "completed" | "pending" | "failed";
  txHash?: string;
}

export interface TransactionListResponse extends ApiEnvelope<TransactionItem[]> {}

// ── Albums ────────────────────────────────────────────────────────────────────

export interface Album {
  id: string;
  title: string;
  coverArtUrl?: string;
  releaseDate?: string;
  songCount?: number;
}

export interface AlbumsResponse extends ApiEnvelope<Album[]> {}

export interface CreateAlbumPayload {
  title: string;
  releaseDate?: string;
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
  createdAt: string;
}

export interface UploadCoverResponse extends ApiEnvelope<{ cover: string; fileId: string }> {}

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
}

export interface FinalizeSongResponse extends ApiEnvelope<SongMeta> {}

// ── Merch ─────────────────────────────────────────────────────────────────────

export interface MerchItem {
  id: number;
  name: string;
  description?: string;
  price: number;
  currency: string;
  imageUrl?: string;
  inventory?: number;
  createdAt: string;
}

export interface MerchMetric {
  totalSales: number;
  revenue: number;
  topItem?: string;
}

export interface MerchListResponse extends ApiEnvelope<{
  items: MerchItem[];
  metrics: MerchMetric;
}> {}

export interface CreateMerchPayload {
  name: string;
  description?: string;
  price: number;
  currency: string;
  imageUrl?: string;
  inventory?: number;
}

export type UpdateMerchPayload = Partial<CreateMerchPayload>;

export interface MerchInventoryItem {
  itemId: number;
  remaining: number;
  reserved: number;
}

export interface PriceValidation {
  valid: boolean;
  minPrice: number;
  maxPrice: number;
  currency: string;
}

// ── Events ────────────────────────────────────────────────────────────────────

export interface EventItem {
  id: string;
  title: string;
  venue?: string;
  location?: string;
  date: string;
  ticketUrl?: string;
  description?: string;
  imageUrl?: string;
  createdAt: string;
}

export interface EventMetric {
  upcomingCount: number;
  totalAttendees: number;
}

export interface EventListResponse extends ApiEnvelope<{
  events: EventItem[];
  metrics: EventMetric;
}> {}

export interface CreateEventPayload {
  title: string;
  venue?: string;
  location?: string;
  date: string;
  ticketUrl?: string;
  description?: string;
  imageUrl?: string;
}

export type UpdateEventPayload = Partial<CreateEventPayload>;

// ── Analytics ─────────────────────────────────────────────────────────────────

export interface AnalyticsSummary {
  totalPlays: number;
  uniqueListeners: number;
  engagementRate: number;
  growthPercentage: number;
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

export interface AnalyticsData {
  summary: AnalyticsSummary;
  playTrends: PlayTrendData[];
  geographicDistribution: GeographicData[];
  period: "last30days" | "last90days";
}

export interface AnalyticsResponse extends ApiEnvelope<AnalyticsData> {}

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

// ── Notification preferences ──────────────────────────────────────────────────

export type NotificationEventKey = "newFan" | "earnings" | "eventReminder";
export type NotificationChannel = "email" | "inApp";

export type NotificationPreferences = Record<
  NotificationEventKey,
  Record<NotificationChannel, boolean>
>;

export interface NotificationPreferencesResponse extends ApiEnvelope<NotificationPreferences> {}

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
