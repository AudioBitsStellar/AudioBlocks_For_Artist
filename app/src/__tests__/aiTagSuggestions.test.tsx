// AI tag and genre suggestions during upload (#542).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React, { useState } from "react";

const { mockPost } = vi.hoisted(() => ({ mockPost: vi.fn() }));

vi.mock("@/api/axios", () => ({
  createApiClient: vi.fn().mockResolvedValue({ post: mockPost }),
}));
vi.mock("@/hooks/useToastHandler", () => ({
  useHandleSuccess: () => vi.fn(),
  useHandleError: () => vi.fn(),
}));

import AiTagSuggestions from "@/components/musicUpload/AiTagSuggestions";
import { SUGGESTION_DEBOUNCE_MS } from "@/hooks/useTagSuggestions";
import { ARTIST_UPLOAD_ENDPOINTS } from "@/api/api-endpoint";

const GENRES = [
  { value: "Afrobeats", label: "Afrobeats" },
  { value: "Amapiano", label: "Amapiano" },
  { value: "Jazz", label: "Jazz" },
];

function Harness({
  title: initialTitle = "Lagos Nights",
  description = "late night groove",
  withTags = true,
}: {
  title?: string;
  description?: string;
  withTags?: boolean;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [genre, setGenre] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  return (
    <>
      <input aria-label="title" value={title} onChange={(event) => setTitle(event.target.value)} />
      <p data-testid="genre">{genre}</p>
      <p data-testid="tags">{tags.join(",")}</p>
      <AiTagSuggestions
        title={title}
        description={description}
        genreOptions={GENRES}
        currentGenre={genre}
        onAcceptGenre={setGenre}
        {...(withTags
          ? { acceptedTags: tags, onAcceptTag: (tag: string) => setTags((t) => [...t, tag]) }
          : {})}
      />
    </>
  );
}

function renderHarness(props: React.ComponentProps<typeof Harness> = {}) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <Harness {...props} />
    </QueryClientProvider>
  );
}

async function settle(ms = SUGGESTION_DEBOUNCE_MS) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  mockPost.mockReset();
  mockPost.mockResolvedValue({
    data: {
      success: true,
      data: { tags: ["Chill", "night drive", "chill"], genres: ["afrobeats", "Drill"] },
    },
  });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("AiTagSuggestions", () => {
  it("asks once, after the artist stops typing, with the title and description", async () => {
    renderHarness();
    expect(mockPost).not.toHaveBeenCalled();

    await settle(SUGGESTION_DEBOUNCE_MS - 1);
    expect(mockPost).not.toHaveBeenCalled();
    await settle(1);

    expect(mockPost).toHaveBeenCalledTimes(1);
    expect(mockPost).toHaveBeenCalledWith(
      ARTIST_UPLOAD_ENDPOINTS.SUGGEST_TAGS,
      { title: "Lagos Nights", description: "late night groove" },
      { headers: undefined }
    );
  });

  it("labels the suggestions as AI and applies nothing on its own", async () => {
    renderHarness();
    await settle();

    expect(screen.getByRole("region", { name: "AI suggestions" })).toHaveTextContent(
      "AI suggestions"
    );
    expect(screen.getByTestId("genre")).toHaveTextContent("");
    expect(screen.getByTestId("tags")).toHaveTextContent("");
  });

  it("only offers genres the form accepts, mapped to its own values", async () => {
    renderHarness();
    await settle();

    expect(
      screen.getByRole("button", { name: "Use suggested genre Afrobeats" })
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Drill/ })).not.toBeInTheDocument();
  });

  it("accepts a genre into the genre field, then stops offering it", async () => {
    renderHarness();
    await settle();

    fireEvent.click(screen.getByRole("button", { name: "Use suggested genre Afrobeats" }));

    expect(screen.getByTestId("genre")).toHaveTextContent("Afrobeats");
    expect(
      screen.queryByRole("button", { name: "Use suggested genre Afrobeats" })
    ).not.toBeInTheDocument();
  });

  it("accepts tags one at a time, deduplicated and lower-cased", async () => {
    renderHarness();
    await settle();

    fireEvent.click(screen.getByRole("button", { name: "Add suggested tag chill" }));
    expect(screen.getByTestId("tags")).toHaveTextContent("chill");
    expect(
      screen.queryByRole("button", { name: "Add suggested tag chill" })
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Add suggested tag night drive" })
    ).toBeInTheDocument();
  });

  it("lets each suggestion be dismissed without applying it", async () => {
    renderHarness();
    await settle();

    fireEvent.click(screen.getByRole("button", { name: "Dismiss suggested tag chill" }));
    fireEvent.click(screen.getByRole("button", { name: "Dismiss suggested genre Afrobeats" }));

    expect(screen.queryByRole("button", { name: /suggested tag chill/ })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /suggested genre Afrobeats/ })
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("genre")).toHaveTextContent("");
    expect(screen.getByTestId("tags")).toHaveTextContent("");
  });

  it("offers genres only when the form has no tag field", async () => {
    renderHarness({ withTags: false });
    await settle();

    expect(
      screen.getByRole("button", { name: "Use suggested genre Afrobeats" })
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /suggested tag/ })).not.toBeInTheDocument();
  });

  it("does not ask again for input it already has suggestions for", async () => {
    renderHarness();
    await settle();
    const input = screen.getByRole("textbox", { name: "title" });

    fireEvent.change(input, { target: { value: "Lagos Nights!" } });
    await settle();
    fireEvent.change(input, { target: { value: "Lagos Nights" } });
    await settle();

    expect(mockPost).toHaveBeenCalledTimes(2);
  });

  it("only sends the last value while the artist is still typing", async () => {
    renderHarness({ title: "" });
    const input = screen.getByRole("textbox", { name: "title" });

    for (const value of ["Lag", "Lago", "Lagos", "Lagos N"]) {
      fireEvent.change(input, { target: { value } });
      await settle(200);
    }
    await settle();

    expect(mockPost).toHaveBeenCalledTimes(1);
    expect(mockPost.mock.calls[0][1]).toMatchObject({ title: "Lagos N" });
  });

  it("waits for a title long enough to suggest from", async () => {
    renderHarness({ title: "Hi" });
    await settle();
    expect(mockPost).not.toHaveBeenCalled();
  });

  it.each([
    ["over budget", { response: { status: 429 }, message: "AI budget exceeded" }],
    ["switched off", { response: { status: 503 }, message: "AI features disabled" }],
  ])("hides quietly and stops asking when AI is %s", async (_label, failure) => {
    mockPost.mockRejectedValue(Object.assign(new Error(failure.message), failure));
    renderHarness();
    await settle();

    expect(screen.queryByRole("region", { name: "AI suggestions" })).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole("textbox", { name: "title" }), {
      target: { value: "Another song" },
    });
    await settle();
    expect(mockPost).toHaveBeenCalledTimes(1);
  });

  it("hides quietly on any other failure, and tries again for new input", async () => {
    mockPost.mockRejectedValueOnce(new Error("Network Error"));
    renderHarness();
    await settle();
    expect(screen.queryByRole("region", { name: "AI suggestions" })).not.toBeInTheDocument();

    fireEvent.change(screen.getByRole("textbox", { name: "title" }), {
      target: { value: "Another song" },
    });
    await settle();
    expect(mockPost).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("region", { name: "AI suggestions" })).toBeInTheDocument();
  });

  it("renders nothing when the backend has no suggestions (feature off returns empty lists)", async () => {
    mockPost.mockResolvedValue({ data: { success: true, data: { tags: [], genres: [] } } });
    renderHarness();
    await settle();

    expect(screen.queryByRole("region", { name: "AI suggestions" })).not.toBeInTheDocument();
  });
});
