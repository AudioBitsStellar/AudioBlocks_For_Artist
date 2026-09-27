"use client";

import Sidebar from "@/components/Sidebar";
import TopHeader from "@/components/TopHeader";
import MobileNav from "@/components/MobileNav";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import RoleProvider from "@/context/RoleContext";
import { DashboardCustomizationProvider } from "@/context/DashboardCustomizationContext";
import { useState } from "react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <RoleProvider>
      <DashboardCustomizationProvider>
        <div className="flex min-h-screen bg-[#151918]">
          {/* Sidebar — permanent from md, slide-over drawer below it */}
          <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

          {/* Main content */}
          <div className="md:ml-64 min-w-0 w-full flex flex-col">
            <TopHeader onMenuClick={() => setSidebarOpen(true)} sidebarOpen={sidebarOpen} />

            {/* Full-bleed on phones (no 11/12 gutter), constrained from sm up,
                with extra bottom padding so MobileNav never covers content. */}
            <main
              id="main-content"
              tabIndex={-1}
              className="flex-1 w-full max-w-7xl m-auto overflow-y-auto overflow-x-hidden px-4 pb-24 pt-6 space-y-6 focus:outline-none sm:px-6 sm:pt-8 sm:space-y-8 md:pb-8"
            >
              {children}
            </main>
          </div>
        </div>
        <MobileNav />
        <ServiceWorkerRegister />
      </DashboardCustomizationProvider>
    </RoleProvider>
  );
}
