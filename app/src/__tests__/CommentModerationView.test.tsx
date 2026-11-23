import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CommentModerationView from "@/components/CommentModerationView";
import type { DashboardComment } from "@/types/api";
import type { ModerationMap, ModerationStatus } from "@/services/commentModerationService";

// Mock the sanitize utility to verify it's being called
vi.mock("@/utils/sanitize", () => ({
  sanitize: (value: string) => {
    if (!value) return "";
    // Simulate escaping HTML
    return value.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  },
}));

describe("CommentModerationView — component behavior", () => {
  const mockComments: DashboardComment[] = [
    {
      id: "1",
      name: "Alice",
      time: "2 hours ago",
      comment: "Great song!",
    },
    {
      id: "2",
      name: "Bob",
      time: "1 hour ago",
      comment: "This is amazing",
    },
    {
      id: "3",
      name: "Charlie",
      time: "30 minutes ago",
      comment: "<script>alert('xss')</script>",
    },
    {
      id: "4",
      name: "Diana <div>inject</div>",
      time: "10 minutes ago",
      comment: "Love it!",
    },
  ];

  const emptyModeration: ModerationMap = {};

  let mockOnModerate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnModerate = vi.fn();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("rendering", () => {
    it("renders all comments when no filter is applied", () => {
      render(
        <CommentModerationView
          comments={mockComments}
          moderation={emptyModeration}
          onModerate={mockOnModerate}
        />
      );

      mockComments.forEach((comment) => {
        expect(screen.getByText(comment.name)).toBeInTheDocument();
      });
    });

    it("shows a loading state when isLoading is true", () => {
      render(
        <CommentModerationView
          comments={mockComments}
          moderation={emptyModeration}
          isLoading={true}
          onModerate={mockOnModerate}
        />
      );

      expect(screen.getByRole("status", { name: /loading/i })).toBeInTheDocument();
      expect(screen.queryByText("Alice")).not.toBeInTheDocument();
    });

    it("shows an error state when isError is true with a retry button", () => {
      const mockRetry = vi.fn();

      render(
        <CommentModerationView
          comments={mockComments}
          moderation={emptyModeration}
          isError={true}
          onRetry={mockRetry}
          onModerate={mockOnModerate}
        />
      );

      expect(screen.getByText("Unable to load comments")).toBeInTheDocument();
      const retryButton = screen.getByRole("button", { name: /retry/i });
      expect(retryButton).toBeInTheDocument();

      fireEvent.click(retryButton);
      expect(mockRetry).toHaveBeenCalledTimes(1);
    });

    it("shows empty state when no comments exist", () => {
      render(
        <CommentModerationView
          comments={[]}
          moderation={emptyModeration}
          onModerate={mockOnModerate}
        />
      );

      expect(screen.getByText("No fan comments yet")).toBeInTheDocument();
    });

    it("sanitizes HTML in comment text to prevent XSS", () => {
      render(
        <CommentModerationView
          comments={mockComments}
          moderation={emptyModeration}
          onModerate={mockOnModerate}
        />
      );

      const xssComment = screen.getByText("&lt;script&gt;alert('xss')&lt;/script&gt;");
      expect(xssComment).toBeInTheDocument();
    });

    it("sanitizes HTML in author names to prevent XSS", () => {
      render(
        <CommentModerationView
          comments={mockComments}
          moderation={emptyModeration}
          onModerate={mockOnModerate}
        />
      );

      const sanitizedName = screen.getByText("Diana &lt;div&gt;inject&lt;/div&gt;");
      expect(sanitizedName).toBeInTheDocument();
    });

    it("displays moderation status labels correctly", () => {
      const moderation: ModerationMap = {
        "1": { status: "hidden", moderatedAt: new Date().toISOString() },
        "2": { status: "flagged", moderatedAt: new Date().toISOString() },
      };

      render(
        <CommentModerationView
          comments={mockComments}
          moderation={moderation}
          onModerate={mockOnModerate}
        />
      );

      expect(screen.getByText(/Hidden/)).toBeInTheDocument();
      expect(screen.getByText(/Flagged/)).toBeInTheDocument();
    });
  });

  describe("filtering", () => {
    it("filters comments by visible status", async () => {
      const moderation: ModerationMap = {
        "1": { status: "hidden", moderatedAt: new Date().toISOString() },
        "2": { status: "hidden", moderatedAt: new Date().toISOString() },
      };

      render(
        <CommentModerationView
          comments={mockComments}
          moderation={moderation}
          onModerate={mockOnModerate}
        />
      );

      const visibleButton = screen.getByRole("tab", { name: /^Visible$/ });
      await userEvent.click(visibleButton);

      expect(screen.getByText("Charlie")).toBeInTheDocument();
      expect(screen.getByText("Diana <div>inject</div>")).toBeInTheDocument(); // Sanitized
      expect(screen.queryByText("Alice")).not.toBeInTheDocument();
    });

    it("filters comments by hidden status", async () => {
      const moderation: ModerationMap = {
        "1": { status: "hidden", moderatedAt: new Date().toISOString() },
      };

      render(
        <CommentModerationView
          comments={mockComments}
          moderation={moderation}
          onModerate={mockOnModerate}
        />
      );

      const hiddenButton = screen.getByRole("tab", { name: /^Hidden$/ });
      await userEvent.click(hiddenButton);

      expect(screen.getByText("Alice")).toBeInTheDocument();
      expect(screen.queryByText("Bob")).not.toBeInTheDocument();
    });

    it("filters by flagged status", async () => {
      const moderation: ModerationMap = {
        "1": { status: "flagged", moderatedAt: new Date().toISOString() },
      };

      render(
        <CommentModerationView
          comments={mockComments}
          moderation={moderation}
          onModerate={mockOnModerate}
        />
      );

      const flaggedButton = screen.getByRole("tab", { name: /^Flagged$/ });
      await userEvent.click(flaggedButton);

      expect(screen.getByText("Alice")).toBeInTheDocument();
      expect(screen.queryByText("Bob")).not.toBeInTheDocument();
    });

    it("filters by removed status", async () => {
      const moderation: ModerationMap = {
        "1": { status: "removed", moderatedAt: new Date().toISOString() },
      };

      render(
        <CommentModerationView
          comments={mockComments}
          moderation={moderation}
          onModerate={mockOnModerate}
        />
      );

      const removedButton = screen.getByRole("tab", { name: /^Removed$/ });
      await userEvent.click(removedButton);

      expect(screen.getByText("Alice")).toBeInTheDocument();
      expect(screen.queryByText("Bob")).not.toBeInTheDocument();
    });
  });

  describe("search", () => {
    it("filters comments by fan name", async () => {
      render(
        <CommentModerationView
          comments={mockComments}
          moderation={emptyModeration}
          onModerate={mockOnModerate}
        />
      );

      const searchInput = screen.getByPlaceholderText("Search by fan or text");
      await userEvent.type(searchInput, "Alice");

      expect(screen.getByText("Alice")).toBeInTheDocument();
      expect(screen.queryByText("Bob")).not.toBeInTheDocument();
    });

    it("filters comments by text content", async () => {
      render(
        <CommentModerationView
          comments={mockComments}
          moderation={emptyModeration}
          onModerate={mockOnModerate}
        />
      );

      const searchInput = screen.getByPlaceholderText("Search by fan or text");
      await userEvent.type(searchInput, "amazing");

      expect(screen.getByText("Bob")).toBeInTheDocument();
      expect(screen.queryByText("Alice")).not.toBeInTheDocument();
    });

    it("clears search when input is cleared", async () => {
      render(
        <CommentModerationView
          comments={mockComments}
          moderation={emptyModeration}
          onModerate={mockOnModerate}
        />
      );

      const searchInput = screen.getByPlaceholderText("Search by fan or text") as HTMLInputElement;
      await userEvent.type(searchInput, "Alice");

      expect(screen.queryByText("Bob")).not.toBeInTheDocument();

      await userEvent.clear(searchInput);

      expect(screen.getByText("Alice")).toBeInTheDocument();
      expect(screen.getByText("Bob")).toBeInTheDocument();
    });
  });

  describe("bulk selection", () => {
    it("selects all visible comments when select-all is checked", async () => {
      render(
        <CommentModerationView
          comments={mockComments}
          moderation={emptyModeration}
          onModerate={mockOnModerate}
        />
      );

      const selectAllCheckbox = screen.getByLabelText(/Select all \(/);
      await userEvent.click(selectAllCheckbox);

      mockComments.forEach((comment) => {
        const checkbox = screen.getByLabelText(`Select comment from ${comment.name}`);
        expect(checkbox).toBeChecked();
      });
    });

    it("deselects all when select-all is unchecked", async () => {
      render(
        <CommentModerationView
          comments={mockComments}
          moderation={emptyModeration}
          onModerate={mockOnModerate}
        />
      );

      const selectAllCheckbox = screen.getByLabelText(/Select all \(/);

      await userEvent.click(selectAllCheckbox);
      expect(selectAllCheckbox).toBeChecked();

      await userEvent.click(selectAllCheckbox);
      expect(selectAllCheckbox).not.toBeChecked();

      mockComments.forEach((comment) => {
        const checkbox = screen.getByLabelText(`Select comment from ${comment.name}`);
        expect(checkbox).not.toBeChecked();
      });
    });

    it("shows count of selected comments", async () => {
      render(
        <CommentModerationView
          comments={mockComments}
          moderation={emptyModeration}
          onModerate={mockOnModerate}
        />
      );

      // Select first comment
      const checkbox1 = screen.getByLabelText("Select comment from Alice");
      await userEvent.click(checkbox1);

      expect(screen.getByText("1 selected")).toBeInTheDocument();

      // Select second comment
      const checkbox2 = screen.getByLabelText("Select comment from Bob");
      await userEvent.click(checkbox2);

      expect(screen.getByText("2 selected")).toBeInTheDocument();
    });

    it("disables bulk action buttons when no comments are selected", () => {
      render(
        <CommentModerationView
          comments={mockComments}
          moderation={emptyModeration}
          onModerate={mockOnModerate}
        />
      );

      const approveButton = screen.getByRole("button", { name: /Approve/ });
      const hideButton = screen.getByRole("button", { name: /Hide/ });
      const flagButton = screen.getByRole("button", { name: /Flag/ });

      expect(approveButton).toBeDisabled();
      expect(hideButton).toBeDisabled();
      expect(flagButton).toBeDisabled();
    });

    it("enables bulk action buttons when comments are selected", async () => {
      render(
        <CommentModerationView
          comments={mockComments}
          moderation={emptyModeration}
          onModerate={mockOnModerate}
        />
      );

      const selectAllCheckbox = screen.getByLabelText(/Select all \(/);
      await userEvent.click(selectAllCheckbox);

      const approveButton = screen.getByRole("button", { name: /Approve/ });
      const hideButton = screen.getByRole("button", { name: /Hide/ });
      const flagButton = screen.getByRole("button", { name: /Flag/ });

      expect(approveButton).not.toBeDisabled();
      expect(hideButton).not.toBeDisabled();
      expect(flagButton).not.toBeDisabled();
    });
  });

  describe("bulk actions", () => {
    it("applies bulk hide action to all selected comments", async () => {
      render(
        <CommentModerationView
          comments={mockComments}
          moderation={emptyModeration}
          onModerate={mockOnModerate}
        />
      );

      // Select all
      const selectAllCheckbox = screen.getByLabelText(/Select all \(/);
      await userEvent.click(selectAllCheckbox);

      // Apply hide
      const hideButton = screen.getByRole("button", { name: /Hide/ });
      await userEvent.click(hideButton);

      expect(mockOnModerate).toHaveBeenCalledWith(
        expect.arrayContaining(["1", "2", "3", "4"]),
        "hidden"
      );
    });

    it("clears selection after bulk action is applied", async () => {
      render(
        <CommentModerationView
          comments={mockComments}
          moderation={emptyModeration}
          onModerate={mockOnModerate}
        />
      );

      const selectAllCheckbox = screen.getByLabelText(/Select all \(/);
      await userEvent.click(selectAllCheckbox);

      expect(screen.getByText("4 selected")).toBeInTheDocument();

      const hideButton = screen.getByRole("button", { name: /Hide/ });
      await userEvent.click(hideButton);

      expect(screen.getByText("0 selected")).toBeInTheDocument();
    });

    it("applies bulk approve action (visible status)", async () => {
      const moderation: ModerationMap = {
        "1": { status: "hidden", moderatedAt: new Date().toISOString() },
        "2": { status: "hidden", moderatedAt: new Date().toISOString() },
      };

      render(
        <CommentModerationView
          comments={mockComments}
          moderation={moderation}
          onModerate={mockOnModerate}
        />
      );

      // Select all visible comments
      const selectAllCheckbox = screen.getByLabelText(/Select all \(/);
      await userEvent.click(selectAllCheckbox);

      // Apply approve
      const approveButton = screen.getByRole("button", { name: /Approve/ });
      await userEvent.click(approveButton);

      expect(mockOnModerate).toHaveBeenCalledWith(
        expect.arrayContaining(["3", "4"]),
        "visible"
      );
    });

    it("applies bulk flag action", async () => {
      render(
        <CommentModerationView
          comments={mockComments}
          moderation={emptyModeration}
          onModerate={mockOnModerate}
        />
      );

      const checkbox1 = screen.getByLabelText("Select comment from Alice");
      const checkbox2 = screen.getByLabelText("Select comment from Bob");

      await userEvent.click(checkbox1);
      await userEvent.click(checkbox2);

      const flagButton = screen.getByRole("button", { name: /Flag/ });
      await userEvent.click(flagButton);

      expect(mockOnModerate).toHaveBeenCalledWith(expect.arrayContaining(["1", "2"]), "flagged");
    });

    it("does not call onModerate when no comments are selected", async () => {
      render(
        <CommentModerationView
          comments={mockComments}
          moderation={emptyModeration}
          onModerate={mockOnModerate}
        />
      );

      const hideButton = screen.getByRole("button", { name: /Hide/ });
      await userEvent.click(hideButton);

      expect(mockOnModerate).not.toHaveBeenCalled();
    });
  });

  describe("individual comment actions", () => {
    it("shows Hide button for visible comments", () => {
      render(
        <CommentModerationView
          comments={mockComments}
          moderation={emptyModeration}
          onModerate={mockOnModerate}
        />
      );

      const hideButtons = screen.getAllByRole("button", { name: /Hide/ });
      expect(hideButtons.length).toBeGreaterThanOrEqual(1);
    });

    it("shows Restore button for hidden comments", () => {
      const moderation: ModerationMap = {
        "1": { status: "hidden", moderatedAt: new Date().toISOString() },
      };

      render(
        <CommentModerationView
          comments={mockComments}
          moderation={moderation}
          onModerate={mockOnModerate}
        />
      );

      const restoreButton = screen.getByRole("button", { name: /Restore/ });
      expect(restoreButton).toBeInTheDocument();
    });

    it("calls onModerate with single comment ID and delete status", async () => {
      render(
        <CommentModerationView
          comments={mockComments}
          moderation={emptyModeration}
          onModerate={mockOnModerate}
        />
      );

      // Find the first Delete button (for first comment)
      const deleteButtons = screen.getAllByRole("button", { name: /Delete/ });
      await userEvent.click(deleteButtons[0]);

      expect(mockOnModerate).toHaveBeenCalledWith(["1"], "removed");
    });

    it("applies Flag action to individual comment", async () => {
      render(
        <CommentModerationView
          comments={mockComments}
          moderation={emptyModeration}
          onModerate={mockOnModerate}
        />
      );

      const flagButtons = screen.getAllByRole("button", { name: /Flag/ });
      await userEvent.click(flagButtons[0]);

      expect(mockOnModerate).toHaveBeenCalledWith(["1"], "flagged");
    });

    it("applies Hide action to individual comment", async () => {
      render(
        <CommentModerationView
          comments={mockComments}
          moderation={emptyModeration}
          onModerate={mockOnModerate}
        />
      );

      const hideButtons = screen.getAllByRole("button", { name: /Hide/ });
      await userEvent.click(hideButtons[0]);

      expect(mockOnModerate).toHaveBeenCalledWith(["1"], "hidden");
    });
  });

  describe("status updates and reconciliation", () => {
    it("updates button visibility when moderation status changes", async () => {
      const { rerender } = render(
        <CommentModerationView
          comments={mockComments}
          moderation={emptyModeration}
          onModerate={mockOnModerate}
        />
      );

      // Initially should show Hide buttons
      const hideButtons1 = screen.queryAllByRole("button", { name: /Hide/ });
      expect(hideButtons1.length).toBeGreaterThan(0);

      // Update to hide first comment
      const moderation: ModerationMap = {
        "1": { status: "hidden", moderatedAt: new Date().toISOString() },
      };

      rerender(
        <CommentModerationView
          comments={mockComments}
          moderation={moderation}
          onModerate={mockOnModerate}
        />
      );

      // Now should show Restore button for first comment
      const restoreButton = screen.getByRole("button", { name: /Restore/ });
      expect(restoreButton).toBeInTheDocument();
    });
  });

  describe("empty state after filtering", () => {
    it("shows empty state when search matches no comments", async () => {
      render(
        <CommentModerationView
          comments={mockComments}
          moderation={emptyModeration}
          onModerate={mockOnModerate}
        />
      );

      const searchInput = screen.getByPlaceholderText("Search by fan or text");
      await userEvent.type(searchInput, "nonexistent");

      expect(screen.getByText("No comments match")).toBeInTheDocument();
      expect(screen.getByText("Try another filter or clear the search box.")).toBeInTheDocument();
    });

    it("shows empty state when filter matches no comments", async () => {
      const moderation: ModerationMap = {};

      render(
        <CommentModerationView
          comments={mockComments}
          moderation={moderation}
          onModerate={mockOnModerate}
        />
      );

      // Filter by removed, but no comments are removed
      const removedButton = screen.getByRole("tab", { name: /^Removed$/ });
      await userEvent.click(removedButton);

      expect(screen.getByText("No comments match")).toBeInTheDocument();
    });
  });

  describe("accessibility", () => {
    it("has proper ARIA labels for select all checkbox", () => {
      render(
        <CommentModerationView
          comments={mockComments}
          moderation={emptyModeration}
          onModerate={mockOnModerate}
        />
      );

      const selectAllCheckbox = screen.getByLabelText(/Select all \(/);
      expect(selectAllCheckbox).toHaveAttribute("aria-label", /Select all/);
    });

    it("has proper ARIA labels for individual checkboxes", () => {
      render(
        <CommentModerationView
          comments={mockComments}
          moderation={emptyModeration}
          onModerate={mockOnModerate}
        />
      );

      const checkbox1 = screen.getByLabelText("Select comment from Alice");
      expect(checkbox1).toHaveAttribute("aria-label", /Select comment from Alice/);
    });

    it("has filter tabs with proper ARIA roles", () => {
      render(
        <CommentModerationView
          comments={mockComments}
          moderation={emptyModeration}
          onModerate={mockOnModerate}
        />
      );

      const allTab = screen.getByRole("tab", { name: /All/ });
      expect(allTab).toHaveAttribute("role", "tab");
      expect(allTab).toHaveAttribute("aria-selected", "true");
    });

    it("updates aria-selected when tabs are changed", async () => {
      render(
        <CommentModerationView
          comments={mockComments}
          moderation={emptyModeration}
          onModerate={mockOnModerate}
        />
      );

      const allTab = screen.getByRole("tab", { name: /All/ });
      const visibleTab = screen.getByRole("tab", { name: /Visible/ });

      expect(allTab).toHaveAttribute("aria-selected", "true");
      expect(visibleTab).toHaveAttribute("aria-selected", "false");

      await userEvent.click(visibleTab);

      expect(allTab).toHaveAttribute("aria-selected", "false");
      expect(visibleTab).toHaveAttribute("aria-selected", "true");
    });

    it("has proper label for search input", () => {
      render(
        <CommentModerationView
          comments={mockComments}
          moderation={emptyModeration}
          onModerate={mockOnModerate}
        />
      );

      const label = screen.getByText("Search comments");
      expect(label).toHaveClass("sr-only");
    });

    it("has live region for selected count updates", async () => {
      render(
        <CommentModerationView
          comments={mockComments}
          moderation={emptyModeration}
          onModerate={mockOnModerate}
        />
      );

      const liveRegion = screen.getByText("0 selected");
      expect(liveRegion).toHaveAttribute("aria-live", "polite");

      const selectAllCheckbox = screen.getByLabelText(/Select all \(/);
      await userEvent.click(selectAllCheckbox);

      expect(screen.getByText("4 selected")).toHaveAttribute("aria-live", "polite");
    });
  });
});
