// API Response types
export interface AxiosResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface updateProfilePayload {
  username: string;
  bio: string;
  website: string;
  profileImage?: File | string;
  pageCover?: string;
  twitter: string;
}

export interface UploadSong {
  fileId: string;
  totalChunks: number;
  title: string;
  coverArtPath: string;
  description: string;
  genre: string;
  composer: string;
}
export interface UploadCoverResponse {
  cover: File | string;
  fileId: string;
}

export interface UploadChunkResponse {
  chunkIndex: number;
  fileId: string;
  chunk: number | string;
}

export interface MusicFormValues {
  songTitle: string;
  albumTitle: string;
  genre: string;
  releaseDate: string;
  marketPrice: string;
  purchasePrice: string;
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

export interface EarningsDataPoint {
  month: string;
  earnings: number;
  royalties: number;
}

export interface EarningsSummary {
  totalEarnings: number;
  comparedToLastMonth: number; // negative = less, positive = more
  data: EarningsDataPoint[];
}

export interface EarningsResponse {
  success: boolean;
  data: EarningsSummary;
}

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

export interface PlatformRevenueResponse {
  success: boolean;
  data: PlatformRevenueSummary;
}

export interface OverviewKpi {
  songsPublished: number;
  totalEarnings: number;
  listenersCount: number;
  mostStreamedRegion: string;
}

export interface OverviewResponse {
  success: boolean;
  data: OverviewKpi;
}

export interface Album {
  id: string;
  title: string;
  coverArtUrl?: string;
}

export interface AlbumsResponse {
  success: boolean;
  data: Album[];
}

export interface Statistic {
  label: string;
  value: number;
}

export interface StatisticsResponse {
  success: boolean;
  data: Statistic[];
}

export interface TopSong {
  rank: number;
  name: string;
  listenings: number;
}

export interface StreamingRegion {
  name: string;
  value: number;
  color: string;
}

export interface TopStreamer {
  rank: number;
  name: string;
  duration: string;
}

export interface FansEngagementData {
  topSongs: TopSong[];
  streamingRegions: StreamingRegion[];
  topStreamers: TopStreamer[];
}

export interface FansEngagementResponse {
  success: boolean;
  data: FansEngagementData;
}

export interface CreateAlbumPayload {
  albumTitle: string;
  genre: string;
  songTitle: string;
  purchasePrice: string;
}

export interface AlbumCreateResponse {
  success: boolean;
  data: Album;
}

export interface RecentActivity {
  id: string;
  action: string;
  timestamp: string;
  details?: string;
}

export interface RecentActivityResponse {
  success: boolean;
  data: RecentActivity[];
}

// Multilingual content support for music metadata
export type SupportedLanguage = "en" | "es";

export interface MultilingualText {
  [lang: string]: string;
}

export interface MusicMetadata {
  // Primary multilingual fields
  title: MultilingualText;
  description?: MultilingualText;
  lyrics?: MultilingualText;

  // Standard fields
  genre?: string;
  artist?: string;
  album?: string;
  releaseDate?: string;
  tags?: string[];

  // Technical metadata
  language?: SupportedLanguage; // Primary language
  isMultilingual?: boolean;
}

export interface MultilingualMusicItem {
  id: string;
  metadata: MusicMetadata;
  coverArtUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Fan Rewards & Loyalty Program types
export type RewardTier = "bronze" | "silver" | "gold" | "platinum";

export interface RewardTierConfig {
  tier: RewardTier;
  minPoints: number;
  maxPoints: number;
  benefits: string[];
  bonusMultiplier: number; // e.g., 1.5 for 50% bonus
  color: string;
}

export interface LoyaltyPoints {
  current: number;
  total: number; // Lifetime points
  lastEarned?: string; // ISO date
  expiresAt?: string; // ISO date
}

export interface ExclusiveContent {
  id: string;
  title: string;
  description: string;
  type: "song" | "video" | "behind-the-scenes" | "merch" | "event";
  unlockRequiredPoints: number;
  currentTier?: RewardTier;
  isUnlocked: boolean;
  contentUrl?: string;
  thumbnailUrl?: string;
  releaseDate?: string;
  createdAt?: string;
}

export interface Reward {
  id: string;
  name: string;
  description: string;
  pointsCost: number;
  category: "discount" | "exclusive" | "experience" | "merchandise";
  expiresAt?: string;
  isRedeemable: boolean;
  redemptionCode?: string;
  icon?: string;
  benefitValue?: string; // e.g., "15% off", "Free shipping"
}

export interface RedeemableReward extends Reward {
  redeemedAt?: string;
  redeemedBy?: string;
  usedAt?: string;
}

export interface FanLoyaltyProgram {
  fanId: string;
  artistId: string;
  currentTier: RewardTier;
  points: LoyaltyPoints;
  exclusiveContent: ExclusiveContent[];
  availableRewards: Reward[];
  redeemedRewards: RedeemableReward[];
  referralBonusPoints: number;
  joinedAt: string; // ISO date
  lastActivityAt?: string; // ISO date
}

export interface LoyaltyProgramConfig {
  pointsPerStream: number;
  pointsPerPurchase: number;
  pointsPerShare: number;
  pointsPerReview: number;
  pointsPerEvent: number;
  referralBonusPoints: number;
  tiers: RewardTierConfig[];
}
