'use client';

import { useState } from 'react';
import { Monitor, Smartphone, ShoppingBag, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import Breadcrumb from '@/components/Breadcrumb';
import { MOCK_MERCH_ITEMS } from '@/lib/mockData';
import { featureFlags } from '@/lib/featureFlags';
import useMerchService from '@/services/merchService';

type PreviewMode = 'desktop' | 'mobile';

function EmptyMerchState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <ShoppingBag className="h-14 w-14 text-[#A3A3A3] mb-4" />
      <p className="text-white text-lg font-semibold mb-1">No merch items yet</p>
      <p className="text-[#A3A3A3] text-sm">Add items from the Merches page to see them here.</p>
      <Link
        href="/dashboard/merches"
        className="mt-6 rounded-full bg-[#D2045B] px-6 py-2 text-sm font-semibold text-white hover:bg-[#B8043F] transition-colors"
      >
        Go to Merches
      </Link>
    </div>
  );
}

function MerchCard({ item, compact }: { item: (typeof MOCK_MERCH_ITEMS)[0]; compact: boolean }) {
  return (
    <div
      className={`overflow-hidden rounded-3xl border border-[#1F1F1F] bg-[#151818] shadow-lg transition-transform duration-200 hover:-translate-y-1 ${
        compact ? 'max-w-[180px]' : ''
      }`}
    >
      <div className={`relative overflow-hidden ${compact ? 'h-36' : 'h-52'}`}>
        <img
          src={item.image}
          alt={item.title}
          className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
        />
      </div>
      <div className={`space-y-2 px-4 py-4 ${compact ? 'px-3 py-3' : ''}`}>
        <h3 className={`font-semibold text-white ${compact ? 'text-sm' : 'text-base'}`}>
          {item.title}
        </h3>
        <p className={`font-medium uppercase tracking-wide text-[#A3A3A3] ${compact ? 'text-[10px]' : 'text-xs'}`}>
          {item.detail}
        </p>
        <div className={`flex items-center gap-2 text-[#C9C9C9] ${compact ? 'text-[10px]' : 'text-xs'}`}>
          <span>{item.date}</span>
          <span>{item.time}</span>
        </div>
        <div className="flex items-center justify-between pt-1">
          <span className={`font-semibold text-white/90 ${compact ? 'text-xs' : 'text-sm'}`}>
            {item.price}
          </span>
          <button
            className={`rounded-full bg-[#D2045B] text-white font-semibold hover:bg-[#B8043F] transition-colors ${
              compact ? 'px-3 py-1 text-[10px]' : 'px-4 py-1.5 text-xs'
            }`}
          >
            Buy Now
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MerchPreviewPage() {
  const [mode, setMode] = useState<PreviewMode>('desktop');

  const { useGetMerches } = useMerchService();
  const { data } = useGetMerches();

  const items = featureFlags.useMockMerches ? MOCK_MERCH_ITEMS : (data?.items ?? MOCK_MERCH_ITEMS);

  const isMobile = mode === 'mobile';

  return (
    <div className="space-y-8">
      <Breadcrumb
        items={[
          { label: 'Merches', href: '/dashboard/merches' },
          { label: 'Preview', isActive: true },
        ]}
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.3em] text-[#A3A3A3]">Merch Preview</p>
          <h1 className="text-3xl font-bold text-white">Fan Store Preview</h1>
          <p className="text-sm text-[#A3A3A3]">See how your merch appears to fans before publishing.</p>
        </div>

        <div className="flex items-center gap-2 self-start">
          <button
            onClick={() => setMode('desktop')}
            aria-pressed={mode === 'desktop'}
            aria-label="Desktop preview"
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors border ${
              mode === 'desktop'
                ? 'bg-[#D2045B] border-[#D2045B] text-white'
                : 'border-[#2E2E2E] bg-[#111111] text-[#A3A3A3] hover:border-[#885FA8]'
            }`}
          >
            <Monitor className="h-4 w-4" />
            Desktop
          </button>
          <button
            onClick={() => setMode('mobile')}
            aria-pressed={mode === 'mobile'}
            aria-label="Mobile preview"
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors border ${
              mode === 'mobile'
                ? 'bg-[#D2045B] border-[#D2045B] text-white'
                : 'border-[#2E2E2E] bg-[#111111] text-[#A3A3A3] hover:border-[#885FA8]'
            }`}
          >
            <Smartphone className="h-4 w-4" />
            Mobile
          </button>
        </div>
      </div>

      <div
        className={`mx-auto rounded-2xl border border-[#2A2A2A] bg-[#0D0D0D] transition-all duration-300 ${
          isMobile ? 'max-w-sm px-4 py-6' : 'w-full px-8 py-8'
        }`}
        data-testid="preview-frame"
      >
        <div className="mb-6 flex items-center justify-between border-b border-[#1F1F1F] pb-4">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-[#D2045B]" />
            <span className="text-white font-semibold text-lg">Merch Store</span>
          </div>
          {!isMobile && (
            <p className="text-xs text-[#A3A3A3]">Fan-facing view — read only</p>
          )}
        </div>

        {items.length === 0 ? (
          <EmptyMerchState />
        ) : (
          <div
            className={`grid gap-5 ${
              isMobile
                ? 'grid-cols-2'
                : 'grid-cols-2 md:grid-cols-3 xl:grid-cols-4'
            }`}
            data-testid="merch-grid"
          >
            {items.map((item) => (
              <MerchCard key={item.id} item={item} compact={isMobile} />
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-start">
        <Link
          href="/dashboard/merches"
          className="flex items-center gap-2 text-sm text-[#A3A3A3] hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Merches
        </Link>
      </div>
    </div>
  );
}
