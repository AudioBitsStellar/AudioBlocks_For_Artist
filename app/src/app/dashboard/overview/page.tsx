import Sidebar from '@/components/Sidebar';
import TopHeader from '@/components/TopHeader';
import OverviewCards from '@/components/OverviewCards';
import EarningsRoyalties from '@/components/EarningsRoyalties';
import MyAlbums from '@/components/MyAlbums';
import FansEngagement from '@/components/FansEngagement';
import Transactions from '@/components/Transactions';
import Comments from '@/components/Comments';

export default function OverviewPage() {
  return (
    <div className="flex min-h-screen bg-[#151918]">
      <Sidebar />
      <div className="flex-1 ml-64 min-w-0 flex flex-col">
        <TopHeader />
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-8 space-y-8">
          <OverviewCards />
          <EarningsRoyalties />
          <MyAlbums />
          <FansEngagement />
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="w-full lg:w-[70%]">
              <Transactions />
            </div>
            <div className="w-full lg:w-[30%]">
              <Comments />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

