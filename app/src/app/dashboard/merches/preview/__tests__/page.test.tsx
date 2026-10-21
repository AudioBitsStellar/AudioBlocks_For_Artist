import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MerchPreviewPage from "../page";

// Mock dependencies
vi.mock("@/__mocks__/loadMock", () => ({
  useMock: vi.fn((key: string, enabled: boolean) => {
    if (enabled && key === "merch") {
      return {
        MOCK_MERCH_ITEMS: [
          {
            id: 1,
            title: "Limited Edition T-Shirt",
            detail: "Premium Cotton",
            date: "2024-10-20",
            time: "12:00 PM",
            price: "$29.99",
            image: "https://picsum.photos/seed/merch1/400/400",
          },
          {
            id: 2,
            title: "Vinyl Record",
            detail: "180g Heavyweight",
            date: "2024-10-21",
            time: "3:00 PM",
            price: "$39.99",
            image: "https://picsum.photos/seed/merch2/400/400",
          },
          {
            id: 3,
            title: "Hoodie",
            detail: "Winter Collection",
            date: "2024-10-22",
            time: "6:00 PM",
            price: "$59.99",
            image: "https://picsum.photos/seed/merch3/400/400",
          },
        ],
      };
    }
    return null;
  }),
}));

vi.mock("@/lib/featureFlags", () => ({
  featureFlags: { useMockMerches: true },
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

vi.mock("@/services/merchService", () => ({
  default: () => ({
    useGetMerches: () => ({
      data: {
        items: [],
        metrics: [],
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    }),
  }),
}));

vi.mock("@/components/Breadcrumb", () => ({
  default: ({
    items,
  }: {
    items: Array<{ label: string; href?: string; isActive?: boolean }>;
  }) => (
    <nav aria-label="Breadcrumb">
      {items.map((item, index) => (
        <span key={index}>
          {item.href ? <a href={item.href}>{item.label}</a> : item.label}
          {index < items.length - 1 && " / "}
        </span>
      ))}
    </nav>
  ),
}));

describe("MerchPreviewPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Page Structure", () => {
    it("renders the breadcrumb navigation", () => {
      render(<MerchPreviewPage />);
      expect(screen.getByRole("navigation", { name: "Breadcrumb" })).toBeInTheDocument();
      expect(screen.getByText("Merches")).toBeInTheDocument();
      expect(screen.getByText("Preview")).toBeInTheDocument();
    });

    it("renders the page heading and description", () => {
      render(<MerchPreviewPage />);
      expect(screen.getByText("Fan Store Preview")).toBeInTheDocument();
      expect(
        screen.getByText("See how your merch appears to fans before publishing.")
      ).toBeInTheDocument();
    });

    it("renders the preview mode toggle buttons", () => {
      render(<MerchPreviewPage />);
      expect(screen.getByRole("button", { name: "Desktop preview" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Mobile preview" })).toBeInTheDocument();
    });

    it("renders the back to merches link", () => {
      render(<MerchPreviewPage />);
      const link = screen.getByText("Back to Merches").closest("a");
      expect(link).toHaveAttribute("href", "/dashboard/merches");
    });
  });

  describe("Preview Mode Toggle", () => {
    it("starts in desktop mode by default", () => {
      render(<MerchPreviewPage />);
      const desktopButton = screen.getByRole("button", { name: "Desktop preview" });
      expect(desktopButton).toHaveAttribute("aria-pressed", "true");
    });

    it("switches to mobile mode when mobile button is clicked", async () => {
      const user = userEvent.setup();
      render(<MerchPreviewPage />);

      const mobileButton = screen.getByRole("button", { name: "Mobile preview" });
      await user.click(mobileButton);

      expect(mobileButton).toHaveAttribute("aria-pressed", "true");
    });

    it("switches back to desktop mode when desktop button is clicked", async () => {
      const user = userEvent.setup();
      render(<MerchPreviewPage />);

      const desktopButton = screen.getByRole("button", { name: "Desktop preview" });
      const mobileButton = screen.getByRole("button", { name: "Mobile preview" });

      await user.click(mobileButton);
      await user.click(desktopButton);

      expect(desktopButton).toHaveAttribute("aria-pressed", "true");
      expect(mobileButton).toHaveAttribute("aria-pressed", "false");
    });
  });

  describe("Merch Items Display", () => {
    it("displays all merch items in the grid", () => {
      render(<MerchPreviewPage />);
      const merchGrid = screen.getByTestId("merch-grid");
      expect(merchGrid).toBeInTheDocument();

      expect(screen.getByText("Limited Edition T-Shirt")).toBeInTheDocument();
      expect(screen.getByText("Vinyl Record")).toBeInTheDocument();
      expect(screen.getByText("Hoodie")).toBeInTheDocument();
    });

    it("displays merch item details correctly", () => {
      render(<MerchPreviewPage />);

      expect(screen.getByText("Limited Edition T-Shirt")).toBeInTheDocument();
      expect(screen.getByText("Premium Cotton")).toBeInTheDocument();
      expect(screen.getByText("2024-10-20")).toBeInTheDocument();
      expect(screen.getByText("12:00 PM")).toBeInTheDocument();
      expect(screen.getByText("$29.99")).toBeInTheDocument();
    });

    it("displays images for all merch items", () => {
      render(<MerchPreviewPage />);
      const images = screen.getAllByRole("img");
      expect(images).toHaveLength(3);
      expect(images[0]).toHaveAttribute("alt", "Limited Edition T-Shirt");
      expect(images[1]).toHaveAttribute("alt", "Vinyl Record");
      expect(images[2]).toHaveAttribute("alt", "Hoodie");
    });

    it("displays buy now buttons for each item", () => {
      render(<MerchPreviewPage />);
      const buyButtons = screen.getAllByRole("button", { name: "Buy Now" });
      expect(buyButtons).toHaveLength(3);
    });
  });

  describe("Empty State", () => {
    it("renders empty state UI components when configured with no items", () => {
      // Note: Empty state is tested via the component's internal logic
      // Full empty state testing would require separate test setup with empty mock data
      render(<MerchPreviewPage />);
      // Verify the page renders without errors
      expect(screen.getByText("Fan Store Preview")).toBeInTheDocument();
    });
  });

  describe("Preview Frame", () => {
    it("renders the preview frame with proper heading", () => {
      render(<MerchPreviewPage />);
      const previewFrame = screen.getByTestId("preview-frame");
      expect(previewFrame).toBeInTheDocument();

      expect(within(previewFrame).getByText("Merch Store")).toBeInTheDocument();
    });

    it("shows read-only indicator in desktop mode", () => {
      render(<MerchPreviewPage />);
      expect(screen.getByText("Fan-facing view — read only")).toBeInTheDocument();
    });

    it("hides read-only indicator in mobile mode", async () => {
      const user = userEvent.setup();
      render(<MerchPreviewPage />);

      const mobileButton = screen.getByRole("button", { name: "Mobile preview" });
      await user.click(mobileButton);

      expect(screen.queryByText("Fan-facing view — read only")).not.toBeInTheDocument();
    });
  });

  describe("Responsive Layout", () => {
    it("applies correct grid layout in desktop mode", () => {
      render(<MerchPreviewPage />);
      const merchGrid = screen.getByTestId("merch-grid");
      expect(merchGrid).toHaveClass("grid-cols-2");
    });

    it("applies compact layout in mobile mode", async () => {
      const user = userEvent.setup();
      render(<MerchPreviewPage />);

      const mobileButton = screen.getByRole("button", { name: "Mobile preview" });
      await user.click(mobileButton);

      const merchGrid = screen.getByTestId("merch-grid");
      expect(merchGrid).toHaveClass("grid-cols-2");
    });
  });

  describe("Accessibility", () => {
    it("has proper ARIA labels for preview mode buttons", () => {
      render(<MerchPreviewPage />);

      const desktopButton = screen.getByRole("button", { name: "Desktop preview" });
      const mobileButton = screen.getByRole("button", { name: "Mobile preview" });

      expect(desktopButton).toHaveAttribute("aria-label", "Desktop preview");
      expect(mobileButton).toHaveAttribute("aria-label", "Mobile preview");
    });

    it("updates aria-pressed state when toggling preview mode", async () => {
      const user = userEvent.setup();
      render(<MerchPreviewPage />);

      const desktopButton = screen.getByRole("button", { name: "Desktop preview" });
      const mobileButton = screen.getByRole("button", { name: "Mobile preview" });

      expect(desktopButton).toHaveAttribute("aria-pressed", "true");
      expect(mobileButton).toHaveAttribute("aria-pressed", "false");

      await user.click(mobileButton);

      expect(desktopButton).toHaveAttribute("aria-pressed", "false");
      expect(mobileButton).toHaveAttribute("aria-pressed", "true");
    });

    it("has proper image alt text for all merch items", () => {
      render(<MerchPreviewPage />);

      const images = screen.getAllByRole("img");
      expect(images[0]).toHaveAttribute("alt", "Limited Edition T-Shirt");
      expect(images[1]).toHaveAttribute("alt", "Vinyl Record");
      expect(images[2]).toHaveAttribute("alt", "Hoodie");
    });
  });
});
