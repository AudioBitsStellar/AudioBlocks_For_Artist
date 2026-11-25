"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useCallback, useEffect, useRef, useState } from "react";

export interface TransactionSignSummary {
  action: string;
  amount: string;
  recipient: string;
  contract: string;
  fee: string;
}

interface TransactionSignReviewDialogProps {
  summary: TransactionSignSummary | null;
  onResolve: (approved: boolean) => void;
}

function TransactionSignReviewDialog({ summary, onResolve }: TransactionSignReviewDialogProps) {
  const details = summary
    ? [
        ["Action", summary.action],
        ["Amount", summary.amount],
        ["Recipient", summary.recipient],
        ["Contract", summary.contract],
        ["Estimated network fee", summary.fee],
      ]
    : [];

  return (
    <Dialog.Root
      open={summary !== null}
      onOpenChange={(open) => {
        if (!open) onResolve(false);
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[120] bg-black/70" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[121] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-lg border border-zinc-700 bg-zinc-950 p-6 text-white shadow-2xl focus:outline-none">
          <Dialog.Title className="text-lg font-semibold">Review transaction</Dialog.Title>
          <Dialog.Description className="mt-1 text-sm text-zinc-300">
            Check these details before continuing to Freighter. Only approve the wallet request if
            they match what you intend to do.
          </Dialog.Description>
          <dl className="mt-5 divide-y divide-zinc-800">
            {details.map(([label, value]) => (
              <div
                key={label}
                className="grid grid-cols-[minmax(7rem,0.8fr)_minmax(0,1.2fr)] gap-4 py-3 text-sm"
              >
                <dt className="text-zinc-400">{label}</dt>
                <dd className="break-all text-right font-medium text-white">{value}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-5 flex flex-wrap justify-end gap-3">
            <button
              type="button"
              onClick={() => onResolve(false)}
              className="rounded-md border border-zinc-600 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => onResolve(true)}
              className="rounded-md bg-pink-600 px-4 py-2 text-sm font-semibold text-white hover:bg-pink-700"
            >
              Continue to Freighter
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function useTransactionSignReview() {
  const [summary, setSummary] = useState<TransactionSignSummary | null>(null);
  const resolveRef = useRef<((approved: boolean) => void) | null>(null);

  const resolveReview = useCallback((approved: boolean) => {
    const resolve = resolveRef.current;
    resolveRef.current = null;
    setSummary(null);
    resolve?.(approved);
  }, []);

  const requestReview = useCallback((nextSummary: TransactionSignSummary) => {
    if (resolveRef.current) {
      resolveRef.current(false);
      resolveRef.current = null;
    }

    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
      setSummary(nextSummary);
    });
  }, []);

  useEffect(
    () => () => {
      resolveRef.current?.(false);
      resolveRef.current = null;
    },
    []
  );

  return {
    requestReview,
    reviewDialog: <TransactionSignReviewDialog summary={summary} onResolve={resolveReview} />,
  };
}
