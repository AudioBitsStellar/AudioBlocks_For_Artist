export interface AnalyticsSummary {
  totalPlays: number;
  uniqueListeners: number;
  engagementRate: number;
  growthPercentage: number;
}

export interface PlayTrendData {
  date: string;
  plays: number;
}

export interface GeographicData {
  country: string;
  region: string;
  plays: number;
}

export interface AnalyticsData {
  summary: AnalyticsSummary;
  playTrends: PlayTrendData[];
  geographicDistribution: GeographicData[];
  period: 'last30days' | 'last90days';
}

// Mock data for analytics dashboard
const generateMockPlayTrends = (days: number): PlayTrendData[] => {
  const trends: PlayTrendData[] = [];
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  for (let i = 0; i < days; i++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(currentDate.getDate() + i);

    trends.push({
      date: currentDate.toISOString().split('T')[0],
      plays: Math.floor(Math.random() * 500) + 100,
    });
  }

  return trends;
};

const mockGeographicData: GeographicData[] = [
  { country: 'United States', region: 'North America', plays: 2500 },
  { country: 'United Kingdom', region: 'Europe', plays: 1800 },
  { country: 'Canada', region: 'North America', plays: 1200 },
  { country: 'Germany', region: 'Europe', plays: 1000 },
  { country: 'Australia', region: 'Oceania', plays: 980 },
  { country: 'France', region: 'Europe', plays: 850 },
  { country: 'Japan', region: 'Asia', plays: 720 },
  { country: 'Brazil', region: 'South America', plays: 650 },
  { country: 'Mexico', region: 'North America', plays: 580 },
  { country: 'Netherlands', region: 'Europe', plays: 520 },
];

export function getAnalyticsData(period: 'last30days' | 'last90days'): AnalyticsData {
  const days = period === 'last30days' ? 30 : 90;
  const playTrends = generateMockPlayTrends(days);
  const totalPlays = playTrends.reduce((sum, trend) => sum + trend.plays, 0);
  const uniqueListeners = Math.floor(totalPlays * 0.6);
  const engagementRate = parseFloat((Math.random() * 10 + 3).toFixed(2));
  const growthPercentage = parseFloat((Math.random() * 30 + 5).toFixed(2));

  return {
    summary: {
      totalPlays,
      uniqueListeners,
      engagementRate,
      growthPercentage,
    },
    playTrends,
    geographicDistribution: mockGeographicData,
    period,
  };
}

export function getAnalyticsSummary(): AnalyticsSummary {
  return {
    totalPlays: Math.floor(Math.random() * 50000) + 5000,
    uniqueListeners: Math.floor(Math.random() * 30000) + 2000,
    engagementRate: parseFloat((Math.random() * 15 + 2).toFixed(2)),
    growthPercentage: parseFloat((Math.random() * 50 + 10).toFixed(2)),
  };
}
