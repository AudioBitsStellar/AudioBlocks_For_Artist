import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import NewEventModal from "@/components/common/modals/NewEventModal";

const mockMutateAsync = vi.fn();
vi.mock("@/services/eventsService", () => ({
  default: () => ({
    useCreateEvent: () => ({ mutateAsync: mockMutateAsync, isPending: false }),
  }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: (props: { alt: string; src: string }) => <img alt={props.alt} src={props.src} />,
}));

const fill = (label: RegExp, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

describe("NewEventModal validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2030, 5, 15, 12, 0, 0));
  });
  afterEach(() => vi.useRealTimers());

  it("blocks submission and shows an error for every empty required field", () => {
    render(<NewEventModal open={true} onOpenChange={() => {}} />);

    fireEvent.click(screen.getByRole("button", { name: /^create$/i }));

    expect(screen.getByText("Event name is required")).toBeInTheDocument();
    expect(screen.getByText("Price is required")).toBeInTheDocument();
    expect(screen.getByText("Event description is required")).toBeInTheDocument();
    expect(screen.getByText("Event time is required")).toBeInTheDocument();
    expect(screen.getByText("Event date is required")).toBeInTheDocument();
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it("marks invalid fields and links them to their error message", () => {
    render(<NewEventModal open={true} onOpenChange={() => {}} />);

    fireEvent.click(screen.getByRole("button", { name: /^create$/i }));

    const name = screen.getByLabelText(/event name/i);
    expect(name).toHaveAttribute("aria-invalid", "true");
    expect(name).toHaveAttribute("aria-describedby", "event-name-error");
    expect(document.getElementById("event-name-error")).toHaveTextContent("Event name is required");
  });

  it("rejects a past date and clears an error once the field is edited", () => {
    render(<NewEventModal open={true} onOpenChange={() => {}} />);

    fill(/event name/i, "Launch party");
    fill(/ticket price/i, "20");
    fill(/event description/i, "Live set");
    fill(/event time/i, "18:30");
    fill(/event date/i, "01-01-2020");
    fireEvent.click(screen.getByRole("button", { name: /^create$/i }));

    expect(screen.getByText("Event date cannot be in the past")).toBeInTheDocument();
    expect(mockMutateAsync).not.toHaveBeenCalled();

    fill(/event date/i, "20-06-2030");
    expect(screen.queryByText("Event date cannot be in the past")).not.toBeInTheDocument();
  });

  it("submits when every field is valid", async () => {
    mockMutateAsync.mockResolvedValue({});
    render(<NewEventModal open={true} onOpenChange={() => {}} />);

    fill(/event name/i, "Launch party");
    fill(/ticket price/i, "20");
    fill(/event description/i, "Live set");
    fill(/event time/i, "18:30");
    fill(/event date/i, "20-06-2030");
    fireEvent.click(screen.getByRole("button", { name: /^create$/i }));

    await waitFor(() => expect(mockMutateAsync).toHaveBeenCalledTimes(1));
    expect(mockMutateAsync.mock.calls[0][0]).toMatchObject({
      title: "Launch party",
      price: "20",
      date: "20-06-2030",
      time: "18:30",
    });
  });
});
