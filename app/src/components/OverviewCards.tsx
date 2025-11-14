export default function OverviewCards() {
  const cards = [
    { title: 'Songs Published', value: '12', isFirst: true },
    { title: 'Total Earnings', value: '$3,250', isFirst: false },
    { title: 'Listeners Count', value: '$5,000.00', isFirst: false },
    { title: 'Most Streamed Region', value: '$50.00', isFirst: false },
  ];

  return (
    <div>
      <h2 className="text-white text-lg font-semibold mb-4">Overview</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card, index) => (
          <div key={index}>
            {card.isFirst ? (
              // First card with gradient border
              <div className="relative rounded-lg p-[1px] bg-gradient-to-br from-purple-500 via-pink-500 to-gray-900">
                <div className="bg-[#0F0F0F] rounded-lg">
                  <div className="p-6">
                    <p className="text-gray-400 text-sm font-normal mb-2">{card.title}</p>
                    <p className="text-white text-2xl font-bold">{card.value}</p>
                  </div>
                </div>
              </div>
            ) : (
              // Other cards with subtle dark gray border
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

