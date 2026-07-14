import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Log In — AudioBlocks for Artists',
  description:
    'Sign in to your AudioBlocks artist dashboard to manage music, events, and earnings on the Stellar network.',
  openGraph: {
    title: 'Log In — AudioBlocks for Artists',
    description:
      'Sign in to your AudioBlocks artist dashboard to manage music, events, and earnings on the Stellar network.',
  },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
