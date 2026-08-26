import Breadcrumb from "@/components/Breadcrumb";
import dynamic from "next/dynamic";

const MerchInventory = dynamic(() => import("@/components/MerchInventory"));

export default function MerchInventoryPage() {
  return (
    <div>
      <Breadcrumb
        items={[
          { label: "Merches", href: "/dashboard/merches" },
          { label: "Inventory", isActive: true },
        ]}
      />
      <MerchInventory />
    </div>
  );
}
