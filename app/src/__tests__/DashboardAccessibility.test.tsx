/**
 * Automated accessibility audit for the artist dashboard pages and
 * primary navigation components (issue #166).
 *
 * Uses axe-core (via vitest-axe) to catch critical WCAG violations on
 * every PR. Critical violations fail the build; all other violations are
 * reported as warnings via the CI artifact.
 *
 * `toHaveNoViolations` is registered globally in src/test/setup.ts.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { axe } from 'vitest-axe';

// ── Shared mocks ─────────────────────────────────────────────────────────────

vi.mock('next/navigation', () => ({
  usePathname: vi.fn().mockReturnValue('/dashboard/overview'),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}));

vi.mock('next/link', () => ({
  default: ({ href, children, onClick, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} onClick={onClick} {...props}>{children}</a>
  ),
}));

vi.mock('next/image', () => ({
  default: ({ src, alt, width, height }: { src: string; alt: string; width: number; height: number }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} width={width} height={height} />
  ),
}));

vi.mock('next/font/google', () => ({
  Geist: () => ({ variable: '--font-geist-sans', className: 'geist-sans' }),
  Geist_Mono: () => ({ variable: '--font-geist-mono', className: 'geist-mono' }),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), loading: vi.fn(), dismiss: vi.fn() },
  Toaster: () => null,
}));

vi.mock('@tanstack/react-query', () => ({
  QueryClient: vi.fn(() => ({ defaultOptions: {} })),
  QueryClientProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useQuery: () => ({ data: undefined, isLoading: false, error: null }),
  useMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock('@/services/authService', () => ({
  default: () => ({
    useRegisterEmail: () => ({ mutateAsync: vi.fn(), isPending: false }),
    useLoginEmail: () => ({ mutateAsync: vi.fn(), isPending: false }),
  }),
}));

// ── Sidebar accessibility ────────────────────────────────────────────────────

describe('Sidebar – axe audit', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('closed sidebar has no critical axe violations', async () => {
    const { default: Sidebar } = await import('@/components/Sidebar');
    const { container } = render(<Sidebar open={false} onClose={vi.fn()} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('open sidebar has no critical axe violations', async () => {
    const { default: Sidebar } = await import('@/components/Sidebar');
    const { container } = render(<Sidebar open={true} onClose={vi.fn()} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

// ── TopHeader accessibility ──────────────────────────────────────────────────

describe('TopHeader – axe audit', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('has no critical axe violations', async () => {
    const { default: TopHeader } = await import('@/components/TopHeader');
    const { container } = render(<TopHeader onMenuClick={vi.fn()} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations with notification badge visible', async () => {
    const { default: TopHeader } = await import('@/components/TopHeader');
    const { container } = render(<TopHeader onMenuClick={vi.fn()} notificationCount={5} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

// ── Login page accessibility ──────────────────────────────────────────────────

describe('Login page – axe audit', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('has no critical axe violations', async () => {
    const { default: LoginPage } = await import('@/app/login/page');
    const { container } = render(<LoginPage />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

// ── Signup page accessibility ─────────────────────────────────────────────────

describe('Signup page – axe audit', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('has no critical axe violations', async () => {
    const { default: SignupPage } = await import('@/app/signup/page');
    const { container } = render(<SignupPage />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
