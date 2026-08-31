import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { vi } from "vitest";
import { Sidebar } from "@/components/Sidebar";
import * as messageService from "@/services/messageService";
import userEvent from "@testing-library/user-event";

// Mock next/navigation
const mockUsePathname = vi.fn(() => "/dashboard/overview");
vi.mock("next/navigation", () => ({
  usePathname: () => mockUsePathname(),
}));

// Mock next/link to pass ref and props
vi.mock("next/link", () => {
  return {
    __esModule: true,
    default: React.forwardRef(function MockLink(
      { children, href, onClick, className, onKeyDown, ...props }: any,
      ref: any
    ) {
      return (
        <a
          ref={ref}
          href={href}
          onClick={onClick}
          onKeyDown={onKeyDown}
          className={className}
          data-testid="nav-link"
          {...props}
        >
          {children}
        </a>
      );
    }),
  };
});

// Mock next/image
vi.mock("next/image", () => {
  return {
    __esModule: true,
    default: ({ src, alt }: any) => <img src={src} alt={alt} />,
  };
});

describe("Sidebar", () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUsePathname.mockReturnValue("/dashboard/overview");
    vi.spyOn(messageService, "getTotalUnreadCount").mockReturnValue(0);
  });

  it("renders all navigation items correctly", () => {
    render(<Sidebar open={true} onClose={mockOnClose} />);

    expect(screen.getByText("Overview")).toBeInTheDocument();
    expect(screen.getByText("My Music")).toBeInTheDocument();
    expect(screen.getByText("Analytics")).toBeInTheDocument();
    expect(screen.getByText("Events")).toBeInTheDocument();
    expect(screen.getByText("Merches")).toBeInTheDocument();
    expect(screen.getByText("Messages")).toBeInTheDocument();
    expect(screen.getByText("Premium")).toBeInTheDocument();
    expect(screen.getByText("Settings")).toBeInTheDocument();

    const links = screen.getAllByTestId("nav-link");
    expect(links.length).toBeGreaterThan(0);
  });

  it("highlights the active state for the current route", () => {
    mockUsePathname.mockReturnValue("/dashboard/my-music");

    render(<Sidebar open={true} onClose={mockOnClose} />);

    // Since the link wraps the text, we can find the <a> containing "My Music"
    const activeLink = screen.getByText("My Music").closest("a");
    expect(activeLink).toHaveClass("bg-pink-500/10");
    expect(activeLink).toHaveAttribute("aria-current", "page");

    // Check inactive link
    const inactiveLink = screen.getByText("Overview").closest("a");
    expect(inactiveLink).not.toHaveClass("bg-pink-500/10");
    expect(inactiveLink).not.toHaveAttribute("aria-current", "page");
  });

  it("triggers route changes when clicking navigation links", async () => {
    render(<Sidebar open={true} onClose={mockOnClose} />);
    const link = screen.getByText("Events").closest("a");
    expect(link).toHaveAttribute("href", "/dashboard/events");
    
    // clicking link should close sidebar on mobile
    if (link) {
      await userEvent.click(link);
    }
    expect(mockOnClose).toHaveBeenCalled();
  });

  it("supports keyboard navigation for accessibility", async () => {
    render(<Sidebar open={true} onClose={mockOnClose} />);
    
    const navLinks = screen.getAllByTestId("nav-link").filter(el => 
      el.getAttribute("href")?.startsWith("/dashboard/")
    );
    
    const firstLink = navLinks[0];
    const secondLink = navLinks[1];
    
    firstLink.focus();
    expect(firstLink).toHaveFocus();
    
    // Test ArrowDown
    fireEvent.keyDown(firstLink, { key: "ArrowDown" });
    expect(secondLink).toHaveFocus();
    
    // Test ArrowUp
    fireEvent.keyDown(secondLink, { key: "ArrowUp" });
    expect(firstLink).toHaveFocus();
    
    // Test End
    fireEvent.keyDown(firstLink, { key: "End" });
    const lastLink = navLinks[navLinks.length - 1];
    expect(lastLink).toHaveFocus();
    
    // Test Home
    fireEvent.keyDown(lastLink, { key: "Home" });
    expect(firstLink).toHaveFocus();
  });

  it("calls onClose when the escape key is pressed", () => {
    render(<Sidebar open={true} onClose={mockOnClose} />);
    
    fireEvent.keyDown(window, { key: "Escape" });
    expect(mockOnClose).toHaveBeenCalled();
  });

  it("renders unread message count badge if greater than zero", () => {
    vi.spyOn(messageService, "getTotalUnreadCount").mockReturnValue(3);
    render(<Sidebar open={true} onClose={mockOnClose} />);

    expect(screen.getByText("3")).toBeInTheDocument();
  });
});
