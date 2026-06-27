'use client';

import { featureFlags } from '@/lib/featureFlags';
import { MOCK_OVERVIEW_CARDS } from '@/lib/mockData';
import MockDataBadge from '@/components/MockDataBadge';
import useOverviewServices from '@/services/overviewService';

interface KpiCard {
  title: string;
  value: string;
  isFirst: boolean;
}

function formatCurrency(n: number): string {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function kpiToCards(data: { songsPublished: number; totalEarnings: number; listenersCount: number; mostStreamedRegion: string }): KpiCard[] {
  return [
    { title: 'Songs Published', value: String(data.songsPublished), isFirst: true },
    { title: 'Total Earnings', value: formatCurrency(data.totalEarnings), isFirst: false },
    { title: 'Listeners Count', value: data.listenersCount.toLocaleString('en-US'), isFirst: false },
    { title: 'Most Streamed Region', value: data.mostStreamedRegion, isFirst: false },
  ];
}

function CardGrid({ cards, isMock }: { cards: KpiCard[]; isMock: boolean }) {
  return (
    <div>
      <h2 className="text-white text-lg font-semibold mb-4 flex items-center">
        Overview
        {isMock && <MockDataBadge label="overview" />}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card, index) => (
          <div key={index}>
            {card.isFirst ? (
              <div className="relative rounded-lg p-[1px] bg-gradient-to-br from-purple-500 via-pink-500 to-gray-900">
                <div className="bg-[#0F0F0F] rounded-lg">
                  <div className="p-6">
                    <p className="text-gray-400 text-sm font-normal mb-2">{card.title}</p>
                    <p className="text-white text-2xl font-bold">{card.value}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-[#0F0F0F] border border-gray-800 rounded-lg p-6">
                <p className="text-gray-400 text-sm font-normal mb-2">{card.title}</p>
                <p className="text-white text-2xl font-bold">{card.value}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function OverviewCardsSkeleton() {
  return (
    <div>
      <h2 className="text-white text-lg font-semibold mb-4">Overview</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-[#0F0F0F] border border-gray-800 rounded-lg p-6 animate-pulse">
            <div className="h-3 bg-gray-700 rounded w-2/3 mb-3" />
            <div className="h-6 bg-gray-700 rounded w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
}

function LiveOverviewCards() {
  const { useGetOverviewKpi } = useOverviewServices();
  const { data, isLoading, isError } = useGetOverviewKpi();

  if (isLoading) return <OverviewCardsSkeleton />;

  if (isError || !data?.data) {
    return (
      <div>
        <h2 className="text-white text-lg font-semibold mb-4">Overview</h2>
        <p className="text-red-400 text-sm">Failed to load overview data. Please try again later.</p>
      </div>
    );
  }

  return <CardGrid cards={kpiToCards(data.data)} isMock={false} />;
}

export default function OverviewCards() {
  if (featureFlags.useMockOverviewCards) {
    return <CardGrid cards={MOCK_OVERVIEW_CARDS} isMock />;
  }
  return <LiveOverviewCards />;
}
