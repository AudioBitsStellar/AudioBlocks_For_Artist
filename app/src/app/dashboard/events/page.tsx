'use client';

import { useState } from 'react';
import Breadcrumb from '@/components/Breadcrumb';
import dynamic from 'next/dynamic';

const EventsContent = dynamic(() => import('@/components/EventsContent'));
const NewEventModal = dynamic(() => import('@/components/common/modals/NewEventModal'));

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
