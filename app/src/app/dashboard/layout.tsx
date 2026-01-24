'use client';

import Sidebar from '@/components/Sidebar';
import TopHeader from '@/components/TopHeader';
import { useState } from 'react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {


  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  return (
    <div className="flex min-h-screen bg-[#151918]">
      {/* Sidebar */}
      <Sidebar open={sidebarOpen}
        onClose={() => setSidebarOpen(false)} />


      {/* Main content */}
      <div className="md:ml-64 min-w-0 w-full flex flex-col">
        <TopHeader onMenuClick={() => setSidebarOpen(true)} />

        <main className="flex-1 w-11/12 m-auto overflow-y-auto overflow-x-hidden py-8 space-y-8">
          {children}
        </main>
      </div>
    </div>
  );
}
