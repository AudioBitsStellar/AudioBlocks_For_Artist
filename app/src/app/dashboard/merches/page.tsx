import Sidebar from '@/components/Sidebar';
import TopHeader from '@/components/TopHeader';
import Breadcrumb from '@/components/Breadcrumb';
import MerchesContent from '@/components/MerchesContent';

export default function MerchesPage() {
  return (
    <div className="flex min-h-screen bg-[#151918]">
      <Sidebar />
      <div className="flex-1 ml-64 min-w-0 flex flex-col">
        <TopHeader />
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-8 space-y-8">
          <Breadcrumb items={[{ label: 'Merches', isActive: true }]} />
          <MerchesContent />
        </main>
      </div>
    </div>
  );
}





