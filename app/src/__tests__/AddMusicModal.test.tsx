import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import AddMusicModal from "@/components/common/modals/AddMusicModal";
import { getScheduledReleases } from "@/services/scheduledReleaseService";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

function fillRequiredFields() {
  fireEvent.change(screen.getByPlaceholderText("Add Song Title"), {
    target: { value: "Test Song" },
  });
  fireEvent.change(screen.getByPlaceholderText("Add Genre of song"), {
    target: { value: "Pop" },
  });
  fireEvent.change(screen.getByPlaceholderText("Add Price of Song"), {
    target: { value: "10" },
  });
}

describe("AddMusicModal scheduling", () => {
  beforeEach(() => {
    getScheduledReleases().length = 0;
  });

  it("defaults to the DD-MM-YYYY release date input in publish-now mode", () => {
    render(<AddMusicModal open onOpenChange={vi.fn()} />);

    expect(screen.getByPlaceholderText("DD-MM-YYYY")).toBeInTheDocument();
  });

  it("switches to a datetime-local picker when scheduling for later", () => {
    render(<AddMusicModal open onOpenChange={vi.fn()} />);

    fireEvent.click(screen.getByText("Schedule for Later"));

    expect(screen.queryByPlaceholderText("DD-MM-YYYY")).not.toBeInTheDocument();
    expect(screen.getByText("Scheduled Publish Date & Time")).toBeInTheDocument();
  });

  it("rejects a scheduled date/time in the past", () => {
    render(<AddMusicModal open onOpenChange={vi.fn()} />);
    fillRequiredFields();
    fireEvent.click(screen.getByText("Schedule for Later"));

    const dateTimeInput = document.querySelector('input[type="datetime-local"]') as HTMLInputElement;
    fireEvent.change(dateTimeInput, { target: { value: "2020-01-01T10:00" } });
    fireEvent.click(screen.getByText("Schedule Release"));

    expect(screen.getByText("Scheduled date & time must be in the future")).toBeInTheDocument();
    expect(getScheduledReleases()).toHaveLength(0);
  });

  it("schedules a release when given a future date/time", () => {
    const onOpenChange = vi.fn();
    render(<AddMusicModal open onOpenChange={onOpenChange} />);

    // Album mode has no required audio-file upload, keeping this test focused on scheduling.
    fireEvent.click(screen.getByText("Add Album"));
    fireEvent.change(screen.getByPlaceholderText("Enter Album Title"), {
      target: { value: "Test Album" },
    });
    fireEvent.change(screen.getByPlaceholderText("Add Genre of song"), {
      target: { value: "Pop" },
    });
    fireEvent.change(screen.getByPlaceholderText("Add Price of Song"), {
      target: { value: "10" },
    });
    fireEvent.click(screen.getByText("Schedule for Later"));

    const dateTimeInput = document.querySelector('input[type="datetime-local"]') as HTMLInputElement;
    fireEvent.change(dateTimeInput, { target: { value: "2099-01-01T10:00" } });
    fireEvent.click(screen.getByText("Schedule Release"));

    expect(getScheduledReleases()).toHaveLength(1);
    expect(getScheduledReleases()[0].title).toBe("Test Album");
    expect(getScheduledReleases()[0].status).toBe("scheduled");
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
