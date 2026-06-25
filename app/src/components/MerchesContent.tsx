'use client';

import { useState } from 'react';
import { Filter, Search, ShoppingBag, X, Loader2 } from 'lucide-react';
import { featureFlags } from '@/lib/featureFlags';
import { MOCK_MERCH_ITEMS, MOCK_MERCH_METRICS } from '@/lib/mockData';
import MockDataBadge from '@/components/MockDataBadge';
import useMerchService, { MerchItem, CreateMerchPayload } from '@/services/merchService';

interface MerchFormProps {
  initial?: Partial<MerchItem>;
  onSave: (payload: CreateMerchPayload) => void;
  onClose: () => void;
  isBusy: boolean;
}

function MerchForm({ initial, onSave, onClose, isBusy }: MerchFormProps) {
  const [form, setForm] = useState<CreateMerchPayload>({
    title: initial?.title ?? '',
    detail: initial?.detail ?? '',
    date: initial?.date ?? '',
    time: initial?.time ?? '',
    price: initial?.price ?? '',
    image: initial?.image ?? '',
  });

  const set = (key: keyof CreateMerchPayload) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSave = () => {
    if (!form.title.trim() || !form.price.trim()) return;
    onSave(form);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-[#2A2A2A] bg-[#161616] p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-white font-semibold text-lg">
            {initial ? 'Edit Merch' : 'New Merch'}
          </h2>
          <button onClick={onClose} className="text-[#A3A3A3] hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {(['title', 'detail', 'date', 'time', 'price', 'image'] as (keyof CreateMerchPayload)[]).map((field) => (
          <div key={field} className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[#A3A3A3] capitalize">{field}</label>
            <input
              value={form[field] ?? ''}
              onChange={set(field)}
              placeholder={field === 'image' ? 'Image URL' : field}
              className="rounded-lg border border-[#2A2A2A] bg-[#111111] px-4 py-2 text-sm text-white placeholder:text-[#6F6F6F] focus:border-[#885FA8] focus:outline-none"
            />
          </div>
        ))}

        <div className="flex gap-3 pt-2">
          <button
            onClick={handleSave}
            disabled={isBusy || !form.title.trim() || !form.price.trim()}
            className="flex-1 rounded-lg bg-[#D2045B] hover:bg-[#B8043F] disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-2 text-sm transition-colors flex items-center justify-center gap-2"
          >
            {isBusy && <Loader2 className="h-4 w-4 animate-spin" />}
            {isBusy ? 'Saving…' : 'Save'}
          </button>
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-[#2A2A2A] text-[#A3A3A3] hover:text-white py-2 text-sm transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MerchesContent() {
  const { useGetMerches, useCreateMerch, useUpdateMerch, useDeleteMerch } = useMerchService();
  const { data, isLoading } = useGetMerches();

  const createMutation = useCreateMerch();

  const [editTarget, setEditTarget] = useState<MerchItem | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const updateMutation = useUpdateMerch(editTarget?.id ?? 0);
  const deleteMutation = useDeleteMerch(deleteId ?? 0);

  const metrics = featureFlags.useMockMerches
    ? MOCK_MERCH_METRICS
    : (data?.metrics ?? []);

  const items = featureFlags.useMockMerches
    ? MOCK_MERCH_ITEMS
    : (data?.items ?? []);

  const handleCreate = (payload: CreateMerchPayload) => {
    createMutation.mutate(payload, { onSuccess: () => setShowCreate(false) });
  };

  const handleUpdate = (payload: CreateMerchPayload) => {
    updateMutation.mutate(payload, { onSuccess: () => setEditTarget(null) });
  };

  const handleDelete = (id: number) => {
    setDeleteId(id);
    deleteMutation.mutate(undefined as any, { onSuccess: () => setDeleteId(null) });
  };

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-[#A3A3A3]">My Merch</p>
          <h1 className="text-3xl font-bold text-white flex items-center">
            My Merch
            {featureFlags.useMockMerches && <MockDataBadge label="merches" />}
          </h1>
        </div>
        {!featureFlags.useMockMerches && (
          <button
            onClick={() => setShowCreate(true)}
            className="self-start rounded-full bg-[#D2045B] px-6 py-2 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(210,4,91,0.35)] transition-colors hover:bg-[#B8043F]"
          >
            New Merch
          </button>
        )}
        {featureFlags.useMockMerches && (
          <button className="self-start rounded-full bg-[#D2045B] px-6 py-2 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(210,4,91,0.35)] transition-colors hover:bg-[#B8043F]">
            New Merch
          </button>
        )}
      </div>

      {isLoading && !featureFlags.useMockMerches ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-[#D2045B]" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {metrics.map((metric) => (
              <div key={metric.label} className="relative overflow-hidden rounded-3xl p-[1px]">
                <div className={`absolute inset-0 rounded-3xl bg-gradient-to-r ${metric.gradient}`} aria-hidden />
                <div className="relative flex h-full flex-col justify-between rounded-3xl bg-[#121212] px-6 py-5">
                  <span className="text-xs font-semibold uppercase tracking-wide text-[#A3A3A3]">{metric.label}</span>
                  <p className="text-3xl font-semibold text-white">{metric.value}</p>
                  <span className="text-xs text-[#A3A3A3]">{metric.descriptor}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-2 text-[#A3A3A3]">
              <ShoppingBag className="h-5 w-5" />
              <h2 className="text-xl font-semibold text-white">Latest Drops</h2>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative w-full sm:w-72">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input type="text" placeholder="Search Merch" className="w-full rounded-full border border-[#2E2E2E] bg-[#111111] py-3 pl-12 pr-5 text-sm text-white placeholder:text-gray-500 focus:border-[#885FA8] focus:outline-none" />
              </div>
              <button className="flex items-center justify-center gap-2 rounded-full border border-[#2E2E2E] bg-[#111111] px-5 py-3 text-sm font-medium text-white transition-colors hover:border-[#885FA8]">
                <Filter className="h-4 w-4" /> Filter
              </button>
            </div>
          </div>

          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-gray-500 gap-2">
              <p className="text-lg font-semibold">No merch yet</p>
              <p className="text-sm">Add your first merch drop to get started.</p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {items.map((item) => (
                <div key={item.id} className="group overflow-hidden rounded-3xl border border-[#1F1F1F] bg-[#151818] shadow-lg transition-transform duration-200 hover:-translate-y-1">
                  <div className="relative h-48 overflow-hidden">
                    <img src={item.image} alt={item.title} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                  </div>
                  <div className="space-y-3 px-6 py-5">
                    <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                    <p className="text-xs font-medium uppercase tracking-wide text-[#A3A3A3]">{item.detail}</p>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-[#C9C9C9]">
                      <span>{item.date}</span>
                      <span>{item.time}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {!featureFlags.useMockMerches && (
                          <>
                            <button
                              onClick={() => setEditTarget(item)}
                              className="rounded-full border border-[#2E2E2E] px-5 py-1.5 text-xs font-medium text-white transition-colors hover:border-[#885FA8]"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(item.id)}
                              disabled={deleteId === item.id && deleteMutation.isPending}
                              className="rounded-full border border-[#2E2E2E] px-3 py-1.5 text-xs font-medium text-red-400 transition-colors hover:border-red-500 disabled:opacity-50"
                            >
                              {deleteId === item.id && deleteMutation.isPending ? '…' : 'Delete'}
                            </button>
                          </>
                        )}
                        {featureFlags.useMockMerches && (
                          <button className="rounded-full border border-[#2E2E2E] px-5 py-1.5 text-xs font-medium text-white transition-colors hover:border-[#885FA8]">
                            Edit
                          </button>
                        )}
                      </div>
                      <span className="text-sm font-semibold text-white/90">{item.price}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {showCreate && (
        <MerchForm
          onSave={handleCreate}
          onClose={() => setShowCreate(false)}
          isBusy={createMutation.isPending}
        />
      )}

      {editTarget && (
        <MerchForm
          initial={editTarget}
          onSave={handleUpdate}
          onClose={() => setEditTarget(null)}
          isBusy={updateMutation.isPending}
        />
      )}
    </div>
  );
}
