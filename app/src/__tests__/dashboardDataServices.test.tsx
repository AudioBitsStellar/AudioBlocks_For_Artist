import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, Mock, vi } from "vitest";
import { useGet } from "@/api/queryClient";
import {
  ANALYTICS_ENDPOINTS,
  DASHBOARD_COMMENT_ENDPOINTS,
  DASHBOARD_TRANSACTION_ENDPOINTS,
} from "@/api/api-endpoint";
import {
  ANALYTICS_QUERY_KEY,
  getAnalyticsData,
  getAnalyticsSummary,
  default as useAnalyticsServices,
} from "@/services/analyticsService";
import useTransactionServices, { TRANSACTIONS_QUERY_KEY } from "@/services/transactionService";
import useCommentServices, {
  COMMENTS_QUERY_KEY,
  CreateCommentPayload,
  CreateCommentResponse,
} from "@/services/commentService";
import { createApiClient } from "@/api/axios";
import { useMutation, useQueryClient } from "@tanstack/react-query";

vi.mock("@/api/queryClient", () => ({
  useGet: vi.fn(),
}));

vi.mock("@/api/axios", () => ({
  createApiClient: vi.fn(),
}));

vi.mock("@tanstack/react-query", () => ({
  useMutation: vi.fn(),
  useQueryClient: vi.fn(),
}));

const mockUseGet = useGet as Mock;
const mockUseMutation = useMutation as Mock;
const mockUseQueryClient = useQueryClient as Mock;
const mockCreateApiClient = createApiClient as Mock;

interface MockedMutationOptions {
  mutationFn: (payload: CreateCommentPayload) => Promise<CreateCommentResponse>;
}

describe("dashboard data services", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseGet.mockReturnValue({ data: undefined, isLoading: false, isError: false });
    mockUseQueryClient.mockReturnValue({ invalidateQueries: vi.fn() });
    mockUseMutation.mockImplementation((options) => options);
  });

  it("fetches dashboard transactions from the backend endpoint", () => {
    renderHook(() => useTransactionServices().useGetTransactions());

    expect(mockUseGet).toHaveBeenCalledWith(
      TRANSACTIONS_QUERY_KEY,
      DASHBOARD_TRANSACTION_ENDPOINTS.LIST,
      { enabled: true, staleTime: 60000 }
    );
  });

  it("fetches dashboard comments from the backend endpoint", () => {
    renderHook(() => useCommentServices().useGetComments());

    expect(mockUseGet).toHaveBeenCalledWith(COMMENTS_QUERY_KEY, DASHBOARD_COMMENT_ENDPOINTS.LIST, {
      enabled: true,
      staleTime: 60000,
    });
  });

  it("posts text comments to the backend endpoint", async () => {
    const post = vi.fn().mockResolvedValue({ data: { success: true, data: { id: 1 } } });
    mockCreateApiClient.mockResolvedValue({ post });

    const { result } = renderHook(() => useCommentServices().useCreateComment());
    const response = await (result.current as unknown as MockedMutationOptions).mutationFn({
      comment: "Great song",
    });

    expect(post).toHaveBeenCalledWith(DASHBOARD_COMMENT_ENDPOINTS.CREATE, {
      comment: "Great song",
    });
    expect(response.success).toBe(true);
  });

  it("posts comment attachments as multipart form data", async () => {
    const post = vi.fn().mockResolvedValue({ data: { success: true, data: { id: 1 } } });
    const attachment = new File(["cover"], "cover.png", { type: "image/png" });
    mockCreateApiClient.mockResolvedValue({ post });

    const { result } = renderHook(() => useCommentServices().useCreateComment());
    await (result.current as unknown as MockedMutationOptions).mutationFn({
      comment: "See file",
      attachment,
    });

    const [, body, config] = post.mock.calls[0];
    expect(body).toBeInstanceOf(FormData);
    expect(body.get("comment")).toBe("See file");
    expect(body.get("attachment")).toBe(attachment);
    expect(config).toEqual({ headers: { "Content-Type": "multipart/form-data" } });
  });

  it("fetches analytics data from the backend endpoint", () => {
    renderHook(() => useAnalyticsServices().useGetAnalyticsData("last90days"));

    expect(mockUseGet).toHaveBeenCalledWith(
      [...ANALYTICS_QUERY_KEY, "last90days"],
      ANALYTICS_ENDPOINTS.DATA("last90days"),
      { enabled: true, staleTime: 60000 }
    );
  });

  it("returns stable analytics fallback data without random drift", () => {
    expect(getAnalyticsData("last30days")).toEqual(getAnalyticsData("last30days"));
    expect(getAnalyticsSummary()).toEqual(getAnalyticsSummary());
  });

  it("returns valid dated play trends for the 90 day analytics fallback", () => {
    const trends = getAnalyticsData("last90days").playTrends;

    expect(trends).toHaveLength(90);
    trends.forEach((trend) => {
      expect(Number.isNaN(new Date(trend.date).getTime())).toBe(false);
    });
  });
});
