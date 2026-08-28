import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Song from "@/components/musicUpload/Song";

const mockMutateChunk = vi.fn().mockResolvedValue({});
const mockMutateCover = vi.fn().mockResolvedValue({ data: { cover: "ipfs://cover_hash" } });
const mockMutateFinalize = vi.fn().mockResolvedValue({ data: { id: "song123" } });

// Mock dependencies
vi.mock("@/services/uploadSerive", () => ({
  default: () => ({
    useUploadChunk: () => ({ mutateAsync: mockMutateChunk, isPending: false }),
    useUploadCover: () => ({ mutateAsync: mockMutateCover, isPending: false }),
    useFinalizeUpload: () => ({ mutateAsync: mockMutateFinalize, isPending: false }),
  }),
}));

vi.mock("@/hooks/useToastHandler", () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
  }),
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

describe("Music Upload Flow Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
  });

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
});
