import { featureFlags } from '@/lib/featureFlags';
import { MOCK_OVERVIEW_CARDS } from '@/lib/mockData';
import MockDataBadge from '@/components/MockDataBadge';

// TODO: replace with useGet hook once /artist/overview endpoint is ready
const getRealOverviewCards = () => [] as typeof MOCK_OVERVIEW_CARDS;

export default function OverviewCards() {
  const cards = featureFlags.useMockOverviewCards
    ? MOCK_OVERVIEW_CARDS
    : getRealOverviewCards();

  return (
    <div>
      <h2 className="text-white text-lg font-semibold mb-4 flex items-center">
        Overview
        {featureFlags.useMockOverviewCards && <MockDataBadge label="overview" />}
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
