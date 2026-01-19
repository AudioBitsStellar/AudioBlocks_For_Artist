import OverviewCards from '@/components/OverviewCards';
import EarningsRoyalties from '@/components/EarningsRoyalties';
import MyAlbums from '@/components/MyAlbums';
import FansEngagement from '@/components/FansEngagement';
import Transactions from '@/components/Transactions';
import Comments from '@/components/Comments';

export default function OverviewPage() {
  return (
    
        <>
          <OverviewCards />
          <EarningsRoyalties />
          <MyAlbums />
          <FansEngagement />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="w-full col-span-1 md:col-span-2">
              <Transactions />
            </div>
            <div className="w-full col-span-1 md:col-span-1">
              <Comments />
            </div>
          </div>
        </>
  );
}

