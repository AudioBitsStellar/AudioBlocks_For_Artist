import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign Up — AudioBlocks for Artists',
  description:
    'Create your artist account on AudioBlocks to upload and mint music as NFTs on the Stellar network.',
  openGraph: {
    title: 'Sign Up — AudioBlocks for Artists',
    description:
      'Create your artist account on AudioBlocks to upload and mint music as NFTs on the Stellar network.',
  },
};

export default function SignupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
