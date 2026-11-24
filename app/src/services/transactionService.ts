
/**
 * Transaction service
 *
 * Sources:
 * - REST: /api/activity/onchain
 * - SSE:  /api/activity/onchain/stream
 *
 * Responsibilities:
 * - Fetch indexed on-chain activity
 * - Normalize backend events into UI-friendly transactions
 * - Filter transactions by artist, token, type, and date
 * - Paginate transaction results
 * - Subscribe to live activity using SSE over fetch()
 * - Support mock mode
 */

export type TransactionType =
  | "MINT"
  | "PRIMARY_SALE"
  | "RESALE"
  | "TRANSFER"
  | "UNKNOWN";

export type TransactionStatus = "SUCCESS" | "FAILED" | "PENDING";

export interface ArtistTransaction {
  id: string;
  type: TransactionType;
  songId?: string;
  songTitle: string;
  tokenId?: string;
  counterparty?: string;
  counterpartyShort?: string;
  fromAddress?: string;
  toAddress?: string;
  amount?: string;
  asset?: string;
  royaltyEarned?: string;
  timestamp: string;
  status: TransactionStatus;
  transactionHash?: string;
  explorerUrl?: string;
}

export interface OnchainActivityFilters {
  artistAddress?: string;
  tokenIds?: string[];
  type?: TransactionType | "ALL";
  fromDate?: string;
  toDate?: string;
}

export interface TransactionPagination {
  page: number;
  pageSize: number;
}

export interface PaginatedTransactions {
  items: ArtistTransaction[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface TransactionQueryOptions
  extends OnchainActivityFilters,
    TransactionPagination {}

export interface TransactionServiceConfig {
  baseUrl?: string;
  activityEndpoint?: string;
  streamEndpoint?: string;
  explorerBaseUrl?: string;
  getAccessToken?: () => string | null | Promise<string | null>;
  mockMode?: boolean;
  mockTransactions?: ArtistTransaction[];
  fetcher?: typeof fetch;
}

export interface OnchainActivityResponse {
  data?: unknown;
  items?: unknown;
  activities?: unknown;
  results?: unknown;
  pagination?: unknown;
  [key: string]: unknown;
}

export interface OnchainStreamEvent {
  type: string;
  transaction?: ArtistTransaction;
  raw?: unknown;
}

export type TransactionStreamListener = (
  event: OnchainStreamEvent,
) => void;

export type TransactionStreamErrorListener = (
  error: Error,
) => void;

const DEFAULT_ACTIVITY_ENDPOINT = "/api/activity/onchain";
const DEFAULT_STREAM_ENDPOINT = "/api/activity/onchain/stream";

const DEFAULT_EXPLORER_BASE_URL =
  "https://stellar.expert/explorer";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 100;

/**
 * Convert an address/hash to a shortened representation.
 */
export function shortenAddress(
  address?: string | null,
  prefixLength = 5,
  suffixLength = 4,
): string {
  if (!address) return "—";

  if (address.length <= prefixLength + suffixLength + 3) {
    return address;
  }

  return `${address.slice(0, prefixLength)}...${address.slice(-suffixLength)}`;
}

/**
 * Safely converts unknown values to strings.
 */
function toStringValue(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  if (typeof value === "bigint") {
    return value.toString();
  }

  return undefined;
}

/**
 * Converts an unknown object into a record.
 */
function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

/**
 * Extracts a list from common activity response shapes.
 */
function extractActivityList(response: unknown): unknown[] {
  if (Array.isArray(response)) {
    return response;
  }

  const root = asRecord(response);

  const candidates = [
    root.data,
    root.items,
    root.activities,
    root.results,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate;
    }

    const nested = asRecord(candidate);

    for (const key of ["items", "activities", "results"]) {
      if (Array.isArray(nested[key])) {
        return nested[key] as unknown[];
      }
    }
  }

  return [];
}

/**
 * Normalize raw event type names to the supported UI transaction types.
 */
export function normalizeTransactionType(
  rawType?: string | null,
): TransactionType {
  const type = (rawType ?? "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");

  if (
    type.includes("MINT") ||
    type.includes("CREATED") ||
    type.includes("TOKEN_CREATE")
  ) {
    return "MINT";
  }

  if (
    type.includes("PRIMARY") ||
    type.includes("PURCHASE") ||
    type.includes("SALE")
  ) {
    if (type.includes("RESALE") || type.includes("SECONDARY")) {
      return "RESALE";
    }

    return "PRIMARY_SALE";
  }

  if (
    type.includes("RESALE") ||
    type.includes("SECONDARY")
  ) {
    return "RESALE";
  }

  if (
    type.includes("TRANSFER") ||
    type.includes("SEND") ||
    type.includes("RECEIVE")
  ) {
    return "TRANSFER";
  }

  return "UNKNOWN";
}

/**
 * Normalize transaction status from the backend.
 */
function normalizeStatus(
  rawStatus?: string | null,
): TransactionStatus {
  const status = (rawStatus ?? "")
    .trim()
    .toUpperCase();

  if (
    status.includes("FAIL") ||
    status.includes("ERROR") ||
    status.includes("REJECT")
  ) {
    return "FAILED";
  }

  if (
    status.includes("PENDING") ||
    status.includes("PROCESS")
  ) {
    return "PENDING";
  }

  return "SUCCESS";
}

/**
 * Resolve transaction hash from common backend fields.
 */
function getTransactionHash(
  record: Record<string, unknown>,
): string | undefined {
  return (
    toStringValue(record.transactionHash) ??
    toStringValue(record.txHash) ??
    toStringValue(record.hash) ??
    toStringValue(record.transaction_id) ??
    toStringValue(record.tx_id)
  );
}

/**
 * Resolve event timestamp from common backend fields.
 */
function getTimestamp(
  record: Record<string, unknown>,
): string {
  const raw =
    record.timestamp ??
    record.createdAt ??
    record.created_at ??
    record.ledgerTimestamp ??
    record.ledger_time ??
    record.time;

  if (typeof raw === "number") {
    const milliseconds = raw < 1_000_000_000_000
      ? raw * 1000
      : raw;

    const date = new Date(milliseconds);

    return Number.isNaN(date.getTime())
      ? new Date().toISOString()
      : date.toISOString();
  }

  if (typeof raw === "string") {
    const date = new Date(raw);

    if (!Number.isNaN(date.getTime())) {
      return date.toISOString();
    }
  }

  return new Date().toISOString();
}

/**
 * Resolve song/token metadata from an activity record.
 */
function getSongTitle(
  record: Record<string, unknown>,
): string {
  const token = asRecord(record.token);
  const asset = asRecord(record.asset);
  const metadata = asRecord(record.metadata);
  const song = asRecord(record.song);

  return (
    toStringValue(record.songTitle) ??
    toStringValue(record.song_name) ??
    toStringValue(record.title) ??
    toStringValue(song.title) ??
    toStringValue(song.name) ??
    toStringValue(token.title) ??
    toStringValue(token.name) ??
    toStringValue(asset.name) ??
    toStringValue(metadata.title) ??
    "Unknown song"
  );
}

/**
 * Resolve token ID from an activity record.
 */
function getTokenId(
  record: Record<string, unknown>,
): string | undefined {
  const token = asRecord(record.token);
  const asset = asRecord(record.asset);

  return (
    toStringValue(record.tokenId) ??
    toStringValue(record.token_id) ??
    toStringValue(record.assetId) ??
    toStringValue(record.asset_id) ??
    toStringValue(token.id) ??
    toStringValue(asset.tokenId)
  );
}

/**
 * Resolve addresses from the activity record.
 */
function getAddresses(
  record: Record<string, unknown>,
): {
  fromAddress?: string;
  toAddress?: string;
  counterparty?: string;
} {
  const fromAddress =
    toStringValue(record.from) ??
    toStringValue(record.fromAddress) ??
    toStringValue(record.from_address) ??
    toStringValue(record.sender);

  const toAddress =
    toStringValue(record.to) ??
    toStringValue(record.toAddress) ??
    toStringValue(record.to_address) ??
    toStringValue(record.receiver);

  const counterparty =
    toStringValue(record.counterparty) ??
    toStringValue(record.counterpartyAddress) ??
    toStringValue(record.counterparty_address) ??
    toStringValue(record.buyer) ??
    toStringValue(record.seller) ??
    toStringValue(record.destination) ??
    toStringValue(record.source);

  return {
    fromAddress,
    toAddress,
    counterparty,
  };
}

/**
 * Resolve amount and asset from the event.
 */
function getAmountAndAsset(
  record: Record<string, unknown>,
): {
  amount?: string;
  asset?: string;
} {
  const payment = asRecord(record.payment);
  const amountRecord = asRecord(record.amount);
  const assetRecord = asRecord(record.asset);

  const amount =
    toStringValue(record.amount) ??
    toStringValue(record.value) ??
    toStringValue(record.price) ??
    toStringValue(record.paymentAmount) ??
    toStringValue(record.payment_amount) ??
    toStringValue(payment.amount) ??
    toStringValue(amountRecord.value);

  const asset =
    toStringValue(record.assetCode) ??
    toStringValue(record.asset_code) ??
    toStringValue(record.currency) ??
    toStringValue(record.symbol) ??
    toStringValue(payment.asset) ??
    toStringValue(payment.currency) ??
    toStringValue(assetRecord.code) ??
    toStringValue(assetRecord.symbol) ??
    toStringValue(assetRecord.name);

  return { amount, asset };
}

/**
 * Resolve royalty amount from event fields.
 */
function getRoyaltyEarned(
  record: Record<string, unknown>,
): string | undefined {
  const royalty = asRecord(record.royalty);
  const royalties = asRecord(record.royalties);

  return (
    toStringValue(record.royaltyEarned) ??
    toStringValue(record.royalty_earned) ??
    toStringValue(record.royaltyAmount) ??
    toStringValue(record.royalty_amount) ??
    toStringValue(royalty.amount) ??
    toStringValue(royalties.earned)
  );
}

/**
 * Resolve a song ID from the record.
 */
function getSongId(
  record: Record<string, unknown>,
): string | undefined {
  const song = asRecord(record.song);

  return (
    toStringValue(record.songId) ??
    toStringValue(record.song_id) ??
    toStringValue(song.id)
  );
}

/**
 * Build an explorer URL.
 */
function buildExplorerUrl(
  hash: string | undefined,
  baseUrl: string,
): string | undefined {
  if (!hash) return undefined;

  return `${baseUrl.replace(/\/$/, "")}/tx/${encodeURIComponent(hash)}`;
}

/**
 * Normalize one backend activity event.
 */
export function normalizeOnchainActivity(
  raw: unknown,
  explorerBaseUrl = DEFAULT_EXPLORER_BASE_URL,
): ArtistTransaction {
  const record = asRecord(raw);
  const hash = getTransactionHash(record);
  const addresses = getAddresses(record);
  const amount = getAmountAndAsset(record);
  const type = normalizeTransactionType(
    toStringValue(record.type) ??
    toStringValue(record.eventType) ??
    toStringValue(record.event_type) ??
    toStringValue(record.operation) ??
    toStringValue(record.action),
  );

  const counterparty =
    addresses.counterparty ??
    addresses.toAddress ??
    addresses.fromAddress;

  return {
    id:
      toStringValue(record.id) ??
      hash ??
      `${getTokenId(record) ?? "activity"}-${getTimestamp(record)}`,
    type,
    songId: getSongId(record),
    songTitle: getSongTitle(record),
    tokenId: getTokenId(record),
    counterparty,
    counterpartyShort: shortenAddress(counterparty),
    fromAddress: addresses.fromAddress,
    toAddress: addresses.toAddress,
    amount: amount.amount,
    asset: amount.asset,
    royaltyEarned: getRoyaltyEarned(record),
    timestamp: getTimestamp(record),
    status: normalizeStatus(
      toStringValue(record.status) ??
      toStringValue(record.transactionStatus) ??
      toStringValue(record.transaction_status),
    ),
    transactionHash: hash,
    explorerUrl: buildExplorerUrl(hash, explorerBaseUrl),
  };
}

/**
 * Basic client-side activity filters.
 */
export function filterTransactions(
  transactions: ArtistTransaction[],
  filters: OnchainActivityFilters = {},
): ArtistTransaction[] {
  const {
    artistAddress,
    tokenIds,
    type = "ALL",
    fromDate,
    toDate,
  } = filters;

  const normalizedArtistAddress = artistAddress?.toLowerCase();
  const tokenSet = tokenIds?.length
    ? new Set(tokenIds.map((id) => id.toLowerCase()))
    : undefined;

  const from = fromDate ? new Date(fromDate).getTime() : undefined;
  const to = toDate ? new Date(toDate).getTime() : undefined;

  return transactions.filter((transaction) => {
    if (type !== "ALL" && transaction.type !== type) {
      return false;
    }

    if (
      tokenSet &&
      (!transaction.tokenId ||
        !tokenSet.has(transaction.tokenId.toLowerCase()))
    ) {
      return false;
    }

    if (normalizedArtistAddress) {
      const addressMatches =
        transaction.fromAddress?.toLowerCase() === normalizedArtistAddress ||
        transaction.toAddress?.toLowerCase() === normalizedArtistAddress ||
        transaction.counterparty?.toLowerCase() === normalizedArtistAddress;

      if (!addressMatches) {
        return false;
      }
    }

    const timestamp = new Date(transaction.timestamp).getTime();

    if (from !== undefined && timestamp < from) {
      return false;
    }

    if (to !== undefined && timestamp > to) {
      return false;
    }

    return true;
  });
}

/**
 * Client-side pagination.
 */
export function paginateTransactions(
  transactions: ArtistTransaction[],
  pagination: TransactionPagination,
): PaginatedTransactions {
  const page = Math.max(1, Math.floor(pagination.page || DEFAULT_PAGE));
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Math.floor(pagination.pageSize || DEFAULT_PAGE_SIZE)),
  );

  const total = transactions.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;

  return {
    items: transactions.slice(start, start + pageSize),
    total,
    page: safePage,
    pageSize,
    totalPages,
  };
}

/**
 * Filter and paginate transactions in one operation.
 */
export function queryTransactions(
  transactions: ArtistTransaction[],
  options: TransactionQueryOptions,
): PaginatedTransactions {
  const filtered = filterTransactions(transactions, options);

  return paginateTransactions(filtered, options);
}

/**
 * Simple mock data for development mode.
 *
 * Replace with existing project mock data if available.
 */
export const DEFAULT_MOCK_TRANSACTIONS: ArtistTransaction[] = [
  {
    id: "mock-tx-1",
    type: "MINT",
    songTitle: "Sample Track",
    tokenId: "sample-token-1",
    amount: "0",
    asset: "XLM",
    royaltyEarned: "0",
    timestamp: new Date().toISOString(),
    status: "SUCCESS",
    transactionHash: "mock-hash-1",
    explorerUrl: `${DEFAULT_EXPLORER_BASE_URL}/tx/mock-hash-1`,
  },
];

/**
 * TransactionService
 *
 * Create a configured service instance using createTransactionService().
 */
export class TransactionService {
  private readonly baseUrl: string;
  private readonly activityEndpoint: string;
  private readonly streamEndpoint: string;
  private readonly explorerBaseUrl: string;
  private readonly getAccessToken?: TransactionServiceConfig["getAccessToken"];
  private readonly mockMode: boolean;
  private readonly mockTransactions: ArtistTransaction[];
  private readonly fetcher: typeof fetch;

  constructor(config: TransactionServiceConfig = {}) {
    this.baseUrl = config.baseUrl ?? "";
    this.activityEndpoint =
      config.activityEndpoint ?? DEFAULT_ACTIVITY_ENDPOINT;
    this.streamEndpoint =
      config.streamEndpoint ?? DEFAULT_STREAM_ENDPOINT;
    this.explorerBaseUrl =
      config.explorerBaseUrl ?? DEFAULT_EXPLORER_BASE_URL;
    this.getAccessToken = config.getAccessToken;
    this.mockMode = config.mockMode ?? false;
    this.mockTransactions =
      config.mockTransactions ?? DEFAULT_MOCK_TRANSACTIONS;
    this.fetcher = config.fetcher ?? fetch;
  }

  private buildUrl(
    endpoint: string,
    params?: Record<string, string | string[] | undefined>,
  ): string {
    const url = new URL(
      `${this.baseUrl.replace(/\/$/, "")}${endpoint}`,
      typeof window !== "undefined"
        ? window.location.origin
        : "http://localhost",
    );

    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value === undefined) continue;

        if (Array.isArray(value)) {
          value.forEach((item) => url.searchParams.append(key, item));
        } else {
          url.searchParams.set(key, value);
        }
      }
    }

    return url.toString();
  }

  private async getHeaders(): Promise<Headers> {
    const headers = new Headers({
      Accept: "application/json",
    });

    const token = await this.getAccessToken?.();

    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    return headers;
  }

  private async requestActivity(
    filters: OnchainActivityFilters = {},
  ): Promise<ArtistTransaction[]> {
    if (this.mockMode) {
      return filterTransactions(this.mockTransactions, filters);
    }

    const params: Record<string, string | string[] | undefined> = {
      artistAddress: filters.artistAddress,
      tokenId: filters.tokenIds,
    };

    const url = this.buildUrl(this.activityEndpoint, params);
    const response = await this.fetcher(url, {
      method: "GET",
      headers: await this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch on-chain activity (${response.status})`,
      );
    }

    const payload: unknown = await response.json();
    const rawActivities = extractActivityList(payload);

    const normalized = rawActivities.map((activity) =>
      normalizeOnchainActivity(activity, this.explorerBaseUrl),
    );

    return filterTransactions(normalized, filters);
  }

  /**
   * Fetch all available indexed activity for an artist.
   *
   * Filtering and pagination are performed client-side so they can work
   * independently of backend query parameter support.
   */
  async getTransactions(
    options: TransactionQueryOptions,
  ): Promise<PaginatedTransactions> {
    const activity = await this.requestActivity(options);

    return queryTransactions(activity, options);
  }

  /**
   * Fetch all indexed activity without pagination.
   */
  async getAllTransactions(
    filters: OnchainActivityFilters = {},
  ): Promise<ArtistTransaction[]> {
    return this.requestActivity(filters);
  }

  /**
   * Fetch activity for specific tokens.
   */
  async getTokenTransactions(
    tokenIds: string[],
    options: Omit<TransactionQueryOptions, "tokenIds">,
  ): Promise<PaginatedTransactions> {
    return this.getTransactions({
      ...options,
      tokenIds,
    });
  }

  /**
   * Subscribe to live activity using fetch-based SSE.
   *
   * Unlike native EventSource, fetch allows an Authorization header
   * for bearer-token authentication.
   *
   * Returns a cleanup function that aborts the stream and reconnect loop.
   */
  subscribe(
    filters: OnchainActivityFilters,
    listener: TransactionStreamListener,
    onError?: TransactionStreamErrorListener,
  ): () => void {
    if (this.mockMode) {
      return () => undefined;
    }

    const controller = new AbortController();
    let stopped = false;
    let reconnectAttempt = 0;

    const reconnectDelay = (attempt: number) =>
      Math.min(1000 * 2 ** attempt, 30_000);

    const sleep = (ms: number) =>
      new Promise<void>((resolve) => {
        const timeout = setTimeout(resolve, ms);

        controller.signal.addEventListener(
          "abort",
          () => {
            clearTimeout(timeout);
            resolve();
          },
          { once: true },
        );
      });

    const parseEvent = (
      eventType: string,
      data: string,
    ): OnchainStreamEvent | null => {
      if (!data || data === "[DONE]") {
        return null;
      }

      try {
        const parsed: unknown = JSON.parse(data);
        const record = asRecord(parsed);

        const rawTransaction =
          record.transaction ??
          record.activity ??
          record.data ??
          parsed;

        const transaction = normalizeOnchainActivity(
          rawTransaction,
          this.explorerBaseUrl,
        );

        const filtered = filterTransactions(
          [transaction],
          filters,
        );

        if (!filtered.length) {
          return null;
        }

        return {
          type:
            toStringValue(record.type) ??
            eventType ??
            "activity",
          transaction,
          raw: parsed,
        };
      } catch {
        return {
          type: eventType || "message",
          raw: data,
        };
      }
    };

    const runStream = async () => {
      while (!stopped && !controller.signal.aborted) {
        try {
          const response = await this.fetcher(
            this.buildUrl(this.streamEndpoint, {
              artistAddress: filters.artistAddress,
              tokenId: filters.tokenIds,
            }),
            {
              method: "GET",
              headers: await this.getHeaders(),
              signal: controller.signal,
            },
          );

          if (!response.ok) {
            throw new Error(
              `Activity stream failed (${response.status})`,
            );
          }

          if (!response.body) {
            throw new Error("Activity stream response has no body");
          }

          reconnectAttempt = 0;

          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";

          while (!stopped && !controller.signal.aborted) {
            const { value, done } = await reader.read();

            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            // SSE messages are separated by blank lines.
            const messages = buffer.split(/\r?\n\r?\n/);
            buffer = messages.pop() ?? "";

            for (const message of messages) {
              let eventType = "message";
              const dataLines: string[] = [];

              for (const line of message.split(/\r?\n/)) {
                if (line.startsWith("event:")) {
                  eventType = line.slice(6).trim();
                } else if (line.startsWith("data:")) {
                  dataLines.push(line.slice(5).trim());
                }
              }

              const data = dataLines.join("\n");
              const parsedEvent = parseEvent(eventType, data);

              if (parsedEvent) {
                listener(parsedEvent);
              }
            }
          }

          try {
            await reader.cancel();
          } catch {
            // Ignore cancellation errors during cleanup.
          }
        } catch (error) {
          if (stopped || controller.signal.aborted) {
            break;
          }

          const normalizedError =
            error instanceof Error
              ? error
              : new Error("Unknown activity stream error");

          onError?.(normalizedError);

          await sleep(reconnectDelay(reconnectAttempt));
          reconnectAttempt += 1;
        }
      }
    };

    void runStream();

    return () => {
      stopped = true;
      controller.abort();
    };
  }
}

/**
 * Factory for creating a transaction service.
 */
export function createTransactionService(
  config: TransactionServiceConfig = {},
): TransactionService {
  return new TransactionService(config);
}

/**
 * Default service instance.
 *
 * Configure authentication and mock mode in the application integration
 * layer if your project has a centralized auth/environment provider.
 */
export const transactionService = createTransactionService({
  mockMode:
    import.meta.env?.VITE_USE_MOCK_TRANSACTIONS === "true",
});
