'use client';

import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import TopHeader from '@/components/TopHeader';
import Breadcrumb from '@/components/Breadcrumb';
import EventsContent from '@/components/EventsContent';
import NewEventModal from '@/components/common/modals/NewEventModal';

export default function EventsPage() {
  const [isNewEventOpen, setIsNewEventOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-[#151918]">
      <Sidebar />
      <div className="flex-1 ml-64 min-w-0 flex flex-col">
        <TopHeader />
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-8 space-y-8">
          <Breadcrumb items={[{ label: 'Events', isActive: true }]} />
          <EventsContent onNewEvent={() => setIsNewEventOpen(true)} />
        </main>
      </div>
      <NewEventModal open={isNewEventOpen} onOpenChange={setIsNewEventOpen} />
    </div>
  );
}
