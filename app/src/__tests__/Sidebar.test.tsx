import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Sidebar from "@/components/Sidebar";

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("next/navigation", () => ({
  usePathname: vi.fn().mockReturnValue("/dashboard/overview"),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    onClick,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} onClick={onClick} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("next/image", () => ({
  default: ({
    src,
    alt,
    width,
    height,
  }: {
    src: string;
    alt: string;
    width: number;
    height: number;
  }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} width={width} height={height} />
  ),
}));

import { usePathname } from "next/navigation";
const mockUsePathname = vi.mocked(usePathname);

// ── Helpers ──────────────────────────────────────────────────────────────────

const navItems = [
  { name: "Overview", href: "/dashboard/overview" },
  { name: "My Music", href: "/dashboard/my-music" },
  { name: "Analytics", href: "/dashboard/analytics" },
  { name: "Events", href: "/dashboard/events" },
  { name: "Merches", href: "/dashboard/merches" },
  { name: "Premium", href: "/dashboard/premium" },
  { name: "Settings", href: "/dashboard/settings/notifications" },
];

function renderSidebar(open = false, onClose = vi.fn()) {
  return render(<Sidebar open={open} onClose={onClose} />);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockUsePathname.mockReturnValue("/dashboard/overview");
  document.body.style.overflow = "";
});

describe("Sidebar – navigation items", () => {
  it("renders all navigation items", () => {
    renderSidebar();
    for (const item of navItems) {
      expect(screen.getByRole("link", { name: new RegExp(item.name, "i") })).toBeInTheDocument();
    }
  });

  it("each nav item links to the correct href", () => {
    renderSidebar();
    for (const item of navItems) {
      const link = screen.getByRole("link", { name: new RegExp(item.name, "i") });
      expect(link).toHaveAttribute("href", item.href);
    }
  });

  it("renders legal links", () => {
    renderSidebar();
    expect(screen.getByRole("link", { name: /privacy center/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /privacy policy/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /cookies/i })).toBeInTheDocument();
  });
});

describe("Sidebar – active state", () => {
  it('marks the current page link with aria-current="page"', () => {
    mockUsePathname.mockReturnValue("/dashboard/overview");
    renderSidebar();
    const overviewLink = screen.getByRole("link", { name: /overview/i });
    expect(overviewLink).toHaveAttribute("aria-current", "page");
  });

  it("does not mark other links as active when on Overview", () => {
    mockUsePathname.mockReturnValue("/dashboard/overview");
    renderSidebar();
    const musicLink = screen.getByRole("link", { name: /my music/i });
    expect(musicLink).not.toHaveAttribute("aria-current", "page");
  });

  it("marks My Music as active when on /dashboard/my-music", () => {
    mockUsePathname.mockReturnValue("/dashboard/my-music");
    renderSidebar();
    expect(screen.getByRole("link", { name: /my music/i })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: /overview/i })).not.toHaveAttribute(
      "aria-current",
      "page"
    );
  });

  it("marks Settings as active for nested settings route", () => {
    mockUsePathname.mockReturnValue("/dashboard/settings/notifications");
    renderSidebar();
    expect(screen.getByRole("link", { name: /settings/i })).toHaveAttribute("aria-current", "page");
  });
});

describe("Sidebar – mobile behavior", () => {
  it("renders a close button when open on mobile", () => {
    renderSidebar(true);
    expect(screen.getByRole("button", { name: /close navigation menu/i })).toBeInTheDocument();
  });

  it("calls onClose when the close button is clicked", () => {
    const onClose = vi.fn();
    renderSidebar(true, onClose);
    fireEvent.click(screen.getByRole("button", { name: /close navigation menu/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("renders the dark overlay when open", () => {
    renderSidebar(true);
    // The overlay div has aria-hidden="true" and sits behind the sidebar
    const overlay = document.querySelector('[aria-hidden="true"]');
    expect(overlay).toBeInTheDocument();
  });

  it("does not render the dark overlay when closed", () => {
    renderSidebar(false);
    const overlay = document.querySelector('[aria-hidden="true"]');
    expect(overlay).toBeNull();
  });

  it("calls onClose when the overlay is clicked", () => {
    const onClose = vi.fn();
    renderSidebar(true, onClose);
    const overlay = document.querySelector('[aria-hidden="true"]') as HTMLElement;
    fireEvent.click(overlay);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("locks body scroll when open", () => {
    renderSidebar(true);
    expect(document.body.style.overflow).toBe("hidden");
  });

  it("unlocks body scroll when closed", () => {
    const { rerender } = renderSidebar(true);
    expect(document.body.style.overflow).toBe("hidden");
    rerender(<Sidebar open={false} onClose={vi.fn()} />);
    expect(document.body.style.overflow).toBe("");
  });

  it("calls onClose when a nav link is clicked (closes drawer)", () => {
    const onClose = vi.fn();
    renderSidebar(true, onClose);
    fireEvent.click(screen.getByRole("link", { name: /my music/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe("Sidebar – accessibility", () => {
  it("renders the nav region with an accessible label", () => {
    renderSidebar();
    expect(screen.getByRole("navigation", { name: /main navigation/i })).toBeInTheDocument();
  });

  it('has role="dialog" and aria-modal when open', () => {
    renderSidebar(true);
    const sidebar = screen.getByRole("dialog");
    expect(sidebar).toBeInTheDocument();
    expect(sidebar).toHaveAttribute("aria-modal", "true");
  });

  it("has no dialog role when closed", () => {
    renderSidebar(false);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("renders the AudioBlocks logo with alt text", () => {
    renderSidebar();
    const logos = screen.getAllByAltText(/audioblocks logo/i);
    expect(logos.length).toBeGreaterThan(0);
  });
});
