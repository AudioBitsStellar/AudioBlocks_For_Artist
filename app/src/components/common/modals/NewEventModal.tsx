'use client';

import * as Dialog from '@radix-ui/react-dialog';
import Image from 'next/image';
import { X, Loader2, Check } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import useEventsService from '@/services/eventsService';

interface NewEventModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = 'form' | 'progress' | 'completed';

const DEFAULT_FORM = {
  name: '',
  price: '',
  description: '',
  time: '',
  date: '',
};

export default function NewEventModal({ open, onOpenChange }: NewEventModalProps) {
  const { useCreateEvent } = useEventsService();
  const createMutation = useCreateEvent();
  const [step, setStep] = useState<Step>('form');
  const [form, setForm] = useState(DEFAULT_FORM);
  const progressTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetState = () => {
    setStep('form');
    setForm(DEFAULT_FORM);
    if (progressTimeout.current) {
      clearTimeout(progressTimeout.current);
    }
    if (closeTimeout.current) {
      clearTimeout(closeTimeout.current);
    }
  };

  useEffect(() => {
    if (!open) {
      resetState();
    }
  }, [open]);

  const handleCreate = async () => {
    setStep('progress');
    try {
      await createMutation.mutateAsync({
        title: form.name,
        price: form.price,
        tickets: '100 Tickets Available',
        date: form.date,
        time: form.time,
        image: '/artist_hub/HeroImage.png',
      });
      setStep('completed');
      closeTimeout.current = setTimeout(() => {
        onOpenChange(false);
      }, 1800);
    } catch (err) {
      console.error(err);
      setStep('form');
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  const handleFieldChange = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange} modal>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/70 backdrop-blur-sm" style={{ zIndex: 100000 }} />
        <Dialog.Content
          className="fixed inset-0 flex items-center justify-center p-4"
          style={{ zIndex: 100001 }}
        >
          {step === 'form' && (
            <div className="w-full max-w-xl rounded-3xl border border-[#2A2A2A] bg-[#0F0F0F] px-8 py-6 shadow-2xl">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-[#A3A3A3]">Add New Event Modal</p>
                  <Dialog.Title className="mt-2 text-2xl font-semibold text-white">Add New Event</Dialog.Title>
                </div>
                <Dialog.Close asChild>
                  <button onClick={handleCancel} className="rounded-full p-2 text-gray-400 transition hover:bg-white/5 hover:text-white">
                    <X className="h-5 w-5" />
                  </button>
                </Dialog.Close>
              </div>

              <div className="mb-6 overflow-hidden rounded-2xl border border-[#252525] bg-[#121212]">
                <Image src="/artist_hub/HeroImage.png" alt="Event artwork" width={512} height={256} className="w-full object-cover" />
              </div>

              <div className="space-y-5 text-sm">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wide text-[#A3A3A3]">Event Name*</label>
                    <input
                      value={form.name}
                      onChange={handleFieldChange('name')}
                      placeholder="Please add the title of the event"
                      className="w-full rounded-xl border border-[#2A2A2A] bg-[#111111] px-4 py-3 text-white placeholder:text-[#6F6F6F] focus:border-[#885FA8] focus:outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wide text-[#A3A3A3]">Event Ticket Price*</label>
                    <input
                      value={form.price}
                      onChange={handleFieldChange('price')}
                      placeholder="Please select price"
                      className="w-full rounded-xl border border-[#2A2A2A] bg-[#111111] px-4 py-3 text-white placeholder:text-[#6F6F6F] focus:border-[#885FA8] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wide text-[#A3A3A3]">Event Description*</label>
                  <textarea
                    value={form.description}
                    onChange={handleFieldChange('description')}
                    placeholder="Please describe the experience"
                    rows={4}
                    className="w-full resize-none rounded-xl border border-[#2A2A2A] bg-[#111111] px-4 py-3 text-white placeholder:text-[#6F6F6F] focus:border-[#885FA8] focus:outline-none"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wide text-[#A3A3A3]">Event Time*</label>
                    <input
                      value={form.time}
                      onChange={handleFieldChange('time')}
                      placeholder="Please select time"
                      className="w-full rounded-xl border border-[#2A2A2A] bg-[#111111] px-4 py-3 text-white placeholder:text-[#6F6F6F] focus:border-[#885FA8] focus:outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wide text-[#A3A3A3]">Event Date*</label>
                    <input
                      value={form.date}
                      onChange={handleFieldChange('date')}
                      placeholder="Please select date"
                      className="w-full rounded-xl border border-[#2A2A2A] bg-[#111111] px-4 py-3 text-white placeholder:text-[#6F6F6F] focus:border-[#885FA8] focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
                <button
                  onClick={handleCancel}
                  className="rounded-full border border-transparent px-6 py-2 text-sm font-semibold text-[#A3A3A3] transition hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  className="rounded-full bg-[#D2045B] px-8 py-2 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(210,4,91,0.35)] transition hover:bg-[#B8043F]"
                >
                  Create
                </button>
              </div>
            </div>
          )}

          {step === 'progress' && (
            <div className="w-full max-w-md rounded-3xl border border-[#2A2A2A] bg-[#111111] px-10 py-12 text-center shadow-2xl">
              <Dialog.Title className="sr-only">Creating Event</Dialog.Title>
              <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#D2045B] to-[#885FA8]">
                <Loader2 className="h-10 w-10 animate-spin text-white" />
              </div>
              <h2 className="text-2xl font-semibold text-white">In Progress...</h2>
              <p className="mt-3 text-sm text-[#A3A3A3]">Please wait for transaction to be complete</p>
            </div>
          )}

          {step === 'completed' && (
            <div className="w-full max-w-md rounded-3xl border border-[#2A2A2A] bg-[#111111] px-10 py-12 text-center shadow-2xl">
              <Dialog.Title className="sr-only">Event Created</Dialog.Title>
              <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#D2045B] to-[#885FA8]">
                <Check className="h-10 w-10 text-white" />
              </div>
              <h2 className="text-2xl font-semibold text-white">Completed!</h2>
              <p className="mt-3 text-sm text-[#A3A3A3]">Your event has been successfully created</p>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}





