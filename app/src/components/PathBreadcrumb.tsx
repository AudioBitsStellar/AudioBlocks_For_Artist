'use client';

import { usePathname } from 'next/navigation';
import Breadcrumb from '@/components/Breadcrumb';

const segmentLabels: Record<string, string> = {
  dashboard: 'Dashboard',
  'my-music': 'My Music',
  albums: 'Albums',
  tracks: 'Tracks',
  events: 'Events',
};

function formatSegment(segment: string): string {
  const decodedSegment = decodeURIComponent(segment);
  const knownLabel = segmentLabels[decodedSegment.toLowerCase()];

  if (knownLabel) return knownLabel;

  return decodedSegment
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export default function PathBreadcrumb() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);

  const items = segments.map((segment, index) => ({
    label: formatSegment(segment),
    href: index < segments.length - 1 ? `/${segments.slice(0, index + 1).join('/')}` : undefined,
    isActive: index === segments.length - 1,
  }));

  return <Breadcrumb items={items} />;
}
