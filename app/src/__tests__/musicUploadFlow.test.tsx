import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Song from "@/components/musicUpload/Song";
import { CHUNK_SIZE } from "@/utils/chunkUploader";

const mockMutateChunk = vi.fn().mockResolvedValue({});
const mockMutateCover = vi.fn().mockResolvedValue({ data: { cover: "ipfs://cover_hash" } });
const mockMutateFinalize = vi.fn().mockResolvedValue({ data: { id: "song123" } });

// Mock dependencies
vi.mock("@/services/uploadService", () => ({
  default: () => ({
    useUploadChunk: () => ({ mutateAsync: mockMutateChunk, isPending: false }),
    useUploadCover: () => ({ mutateAsync: mockMutateCover, isPending: false }),
    useFinalizeUpload: () => ({ mutateAsync: mockMutateFinalize, isPending: false }),
    useTranscribeLyrics: () => ({ mutateAsync: vi.fn(), isPending: false }),
  }),
}));

vi.mock("@/hooks/useToastHandler", () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
  }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
}));

vi.mock("@/hooks/useAutoSave", () => ({
  useAutoSave: () => ({
    restore: vi.fn().mockReturnValue(null),
    clearSavedData: vi.fn(),
  }),
}));

vi.mock("@/lib/analytics", () => ({
  analytics: {
    uploadStarted: vi.fn(),
    uploadCompleted: vi.fn(),
    uploadFailed: vi.fn(),
  },
}));

vi.mock("@/components/common/wallet/MintSongButton", () => ({
  default: ({ songId }: { songId: string }) => (
    <button data-testid="mint-song-btn">Mint Song {songId}</button>
  ),
}));

vi.mock("@/components/common/wallet/TransferSongButton", () => ({
  default: ({ songId }: { songId: string }) => (
    <button data-testid="transfer-song-btn">Transfer Song {songId}</button>
  ),
}));

function Wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

async function prepareUpload(audioFile: File) {
  const user = userEvent.setup();
  render(<Song />, { wrapper: Wrapper });

  await user.type(screen.getByLabelText(/Song Title/i), "Retry Test Song");
  await user.type(screen.getByLabelText(/Song Description/i), "Testing upload recovery.");
  await user.selectOptions(screen.getByLabelText(/Genre/i), "Afrobeats");
  await user.type(screen.getByLabelText(/Composer/i), "Test Composer");
  await user.upload(screen.getByLabelText(/Upload audio file/i), audioFile);
  await user.upload(
    screen.getByLabelText(/Upload cover image/i),
    new File(["image content"], "cover.png", { type: "image/png" })
  );

  return user;
}

describe("Music Upload Flow Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: vi.fn(() => "blob:test-audio"),
    });
  });

  it("completes the full music upload flow", async () => {
    const user = userEvent.setup();
    render(<Song />, { wrapper: Wrapper });

    // 1. Fill out text fields
    await user.type(screen.getByLabelText(/Song Title/i), "My Test Song");
    await user.type(
      screen.getByLabelText(/Song Description/i),
      "This is an integration test song."
    );
    await user.selectOptions(screen.getByLabelText(/Genre/i), "Afrobeats");
    await user.type(screen.getByLabelText(/Composer/i), "Test Composer");

    // 2. Upload audio file
    const audioFile = new File(["audio content"], "test.mp3", { type: "audio/mpeg" });
    const audioInput = screen.getByLabelText(/Upload audio file/i);
    await user.upload(audioInput, audioFile);

    // 3. Upload cover image
    const coverFile = new File(["image content"], "cover.png", { type: "image/png" });
    const coverInput = screen.getByLabelText(/Upload cover image/i);
    await user.upload(coverInput, coverFile);

    // 4. Submit form
    const submitBtn = screen.getByRole("button", { name: /Add Music/i });
    expect(submitBtn).not.toBeDisabled();
    await user.click(submitBtn);

    // 5. Verify upload sequence
    await waitFor(() => {
      expect(mockMutateChunk).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(mockMutateCover).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(mockMutateFinalize).toHaveBeenCalledTimes(1);
    });

    // Check finalize payload
    const finalizePayload = mockMutateFinalize.mock.calls[0][0];
    expect(finalizePayload).toMatchObject({
      title: "My Test Song",
      description: "This is an integration test song.",
      genre: "Afrobeats",
      composers: "Test Composer",
      coverArtPath: "ipfs://cover_hash",
    });

    // Check that mint button is displayed
    expect(screen.getByTestId("mint-song-btn")).toBeInTheDocument();
    // Typing every field with userEvent is slow; give it room on CI.
  }, 20_000);

  it("shows validation error for oversized files", async () => {
    const user = userEvent.setup();
    render(<Song />, { wrapper: Wrapper });

    // Try to upload an oversized file
    const hugeFile = new File([""], "huge.mp3", { type: "audio/mpeg" });
    Object.defineProperty(hugeFile, "size", { value: 201 * 1024 * 1024 }); // 201 MB
    const audioInput = screen.getByLabelText(/Upload audio file/i);

    await user.upload(audioInput, hugeFile);

    // Should display size error
    expect(await screen.findByText(/File too large/i)).toBeInTheDocument();

    // Submit should be disabled
    const submitBtn = screen.getByRole("button", { name: /Add Music/i });
    expect(submitBtn).toHaveAttribute("aria-disabled", "true");
  });

  it("resumes from the failed chunk and completes the upload on retry", async () => {
    mockMutateChunk
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValue({});

    const user = await prepareUpload(
      new File([new Uint8Array(CHUNK_SIZE * 2 + 16)], "retry.mp3", { type: "audio/mpeg" })
    );
    await user.click(screen.getByRole("button", { name: /Add Music/i }));

    const retryButton = await screen.findByRole("button", { name: "Retry upload" });
    await user.click(retryButton);

    await waitFor(() => expect(mockMutateFinalize).toHaveBeenCalledTimes(1));
    const uploadedChunkIndexes = mockMutateChunk.mock.calls.map(([form]) =>
      (form as FormData).get("chunkIndex")
    );
    // Chunks upload in parallel, so the first pass tries every chunk; the
    // retry then uploads only the one that failed (chunk 1).
    expect(uploadedChunkIndexes.slice(0, 3).sort()).toEqual(["0", "1", "2"]);
    expect(uploadedChunkIndexes.slice(3)).toEqual(["1"]);
  });

  it("shows a terminal error and start-over action after three retries", async () => {
    mockMutateChunk.mockRejectedValue(new Error("Network error"));

    const user = await prepareUpload(
      new File(["audio content"], "retry-limit.mp3", { type: "audio/mpeg" })
    );
    await user.click(screen.getByRole("button", { name: /Add Music/i }));

    for (let attempt = 0; attempt < 3; attempt++) {
      const retryButton = await screen.findByRole("button", { name: "Retry upload" });
      await user.click(retryButton);
      await waitFor(() => expect(mockMutateChunk).toHaveBeenCalledTimes(attempt + 2));
    }

    expect(
      await screen.findByText(/Upload failed after 3 retries\. Start over to try again\./i)
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Retry upload" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start over" })).toBeInTheDocument();
  });
});
