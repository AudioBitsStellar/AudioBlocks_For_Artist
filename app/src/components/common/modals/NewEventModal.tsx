'use client';

import Image from 'next/image';
import { Loader2, Check } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useAutoSave } from '@/hooks/useAutoSave';
import useEventsService from '@/services/eventsService';
import Modal from '@/components/shared/Modal';

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
  const hasRestored = useRef(false);

  const { restore: restoreDraft, clearSavedData } = useAutoSave('create-event', form, step === 'progress' || createMutation.isPending);

  const resetState = () => {
    setStep('form');
    setForm(DEFAULT_FORM);
    hasRestored.current = false;
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

  useEffect(() => {
    if (open && step === 'form' && !hasRestored.current) {
      const saved = restoreDraft();
      if (saved) {
        setForm({ ...DEFAULT_FORM, ...saved });
        toast.success('Draft restored');
      }
      hasRestored.current = true;
    }
  }, [open, step]);

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
      clearSavedData();
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

  if (step === 'form') {
    return (
      <Modal
        open={open}
        onOpenChange={onOpenChange}
        title="Add New Event"
        subtitle="Add New Event Modal"
        size="lg"
        closeAriaLabel="Close new event dialog"
      >
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
                maxLength={100}
                className="w-full rounded-xl border border-[#2A2A2A] bg-[#111111] px-4 py-3 text-white placeholder:text-[#6F6F6F] focus:border-[#885FA8] focus:outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-[#A3A3A3]">Event Ticket Price*</label>
              <input
                value={form.price}
                onChange={handleFieldChange('price')}
                placeholder="Please select price"
                maxLength={20}
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
              maxLength={2000}
              className="w-full resize-none rounded-xl border border-[#2A2A2A] bg-[#111111] px-4 py-3 text-white placeholder:text-[#6F6F6F] focus:border-[#885FA8] focus:outline-none"
            />
            {form.description.length >= 1800 && (
              <p className={`text-xs text-right ${form.description.length >= 2000 ? 'text-red-500' : 'text-yellow-500'}`}>
                {form.description.length}/2000
              </p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-[#A3A3A3]">Event Time*</label>
              <input
                value={form.time}
                onChange={handleFieldChange('time')}
                placeholder="Please select time"
                maxLength={20}
                className="w-full rounded-xl border border-[#2A2A2A] bg-[#111111] px-4 py-3 text-white placeholder:text-[#6F6F6F] focus:border-[#885FA8] focus:outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-[#A3A3A3]">Event Date*</label>
              <input
                value={form.date}
                onChange={handleFieldChange('date')}
                placeholder="Please select date"
                maxLength={20}
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
      </Modal>
    );
  }

  if (step === 'progress') {
    return (
      <Modal open={open} onOpenChange={onOpenChange} showCloseButton={false} size="sm">
        <div className="text-center">
          <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#D2045B] to-[#885FA8]">
            <Loader2 className="h-10 w-10 animate-spin text-white" />
          </div>
          <h2 className="text-2xl font-semibold text-white">In Progress...</h2>
          <p className="mt-3 text-sm text-[#A3A3A3]">Please wait for transaction to be complete</p>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange} showCloseButton={false} size="sm">
      <div className="text-center">
        <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#D2045B] to-[#885FA8]">
          <Check className="h-10 w-10 text-white" />
        </div>
        <h2 className="text-2xl font-semibold text-white">Completed!</h2>
        <p className="mt-3 text-sm text-[#A3A3A3]">Your event has been successfully created</p>
      </div>
    </Modal>
  );
}

export { NewEventModal };
