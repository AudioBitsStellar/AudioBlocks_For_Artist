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
    <>

      <Breadcrumb items={[{ label: 'Events', isActive: true }]} />
      <EventsContent onNewEvent={() => setIsNewEventOpen(true)} />

      <NewEventModal open={isNewEventOpen} onOpenChange={setIsNewEventOpen} />
    </>
  );
}
