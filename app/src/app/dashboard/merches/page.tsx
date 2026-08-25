import Breadcrumb from "@/components/Breadcrumb";
import dynamic from "next/dynamic";

const MerchesContent = dynamic(() => import("@/components/MerchesContent"));

export default function MerchesPage() {
  return (
    <div>
      <Breadcrumb items={[{ label: "Merches", isActive: true }]} />
      <MerchesContent />
    </div>
  );
}
