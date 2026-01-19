import Breadcrumb from '@/components/Breadcrumb';
import MerchesContent from '@/components/MerchesContent';

export default function MerchesPage() {
  return (
        <div>
          <Breadcrumb items={[{ label: 'Merches', isActive: true }]} />
          <MerchesContent />
        </div>
  );
}





