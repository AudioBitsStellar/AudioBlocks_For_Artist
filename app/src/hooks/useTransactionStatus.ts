"use client";

import { useCallback, useEffect, useState } from "react";
import {
  clearTrackedTransaction,
  fetchTransactionStatus,
  readTrackedTransaction,
  writeTrackedTransaction,
  type TrackedTransaction,
} from "@/lib/transactionStatus";

export function useTransactionStatus(storageKey: string) {
  const [record, setRecord] = useState<TrackedTransaction | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      setRecord(readTrackedTransaction(storageKey));
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to restore transaction status.");
    } finally {
      setIsReady(true);
    }
  }, [storageKey]);

  const track = useCallback(
    (txHash: string, metadata: Pick<TrackedTransaction, "tokenId" | "toAddress"> = {}) => {
      const next: TrackedTransaction = { txHash, status: "pending", ...metadata };
      setRecord(next);
      setError(null);
      try {
        writeTrackedTransaction(storageKey, next);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Unable to save transaction status.");
      }
    },
    [storageKey]
  );

  const clear = useCallback(() => {
    setRecord(null);
    setError(null);
    try {
      clearTrackedTransaction(storageKey);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to clear transaction status.");
    }
  }, [storageKey]);

  useEffect(() => {
    if (!isReady || record?.status !== "pending") return;

    let cancelled = false;
    let delay = 1_500;
    let timer: ReturnType<typeof setTimeout>;

    const poll = async () => {
      try {
        const status = await fetchTransactionStatus(record.txHash);
        if (cancelled) return;
        const next = { ...record, status };
        if (status !== record.status) setRecord(next);
        setError(null);
        try {
          writeTrackedTransaction(storageKey, next);
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : "Unable to save transaction status.");
        }
        if (status === "pending") {
          timer = setTimeout(poll, delay);
          delay = Math.min(delay * 2, 30_000);
        }
      } catch (cause) {
        if (cancelled) return;
        setError(cause instanceof Error ? cause.message : "Unable to check transaction status.");
        timer = setTimeout(poll, delay);
        delay = Math.min(delay * 2, 30_000);
      }
    };

    timer = setTimeout(poll, delay);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [isReady, record, storageKey]);

  return { record, isReady, error, track, clear };
}
