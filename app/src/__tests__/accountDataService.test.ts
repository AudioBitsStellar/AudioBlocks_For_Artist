import { describe, it, expect, beforeEach } from "vitest";
import {
  getDataExportStatus,
  requestDataExport,
  clearDataExport,
  getAccountDeletionStatus,
  requestAccountDeletion,
  cancelAccountDeletion,
} from "@/services/accountDataService";

describe("accountDataService", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  describe("data export", () => {
    it("returns idle status initially", () => {
      const status = getDataExportStatus();
      expect(status.status).toBe("idle");
    });

    it("creates a queued export job", async () => {
      const job = await requestDataExport();
      expect(job.status).toBe("queued");
      expect(job.jobId).toMatch(/^export_/);

      const saved = getDataExportStatus();
      expect(saved.jobId).toBe(job.jobId);
    });

    it("clears export status", async () => {
      await requestDataExport();
      clearDataExport();
      const status = getDataExportStatus();
      expect(status.status).toBe("idle");
    });
  });

  describe("account deletion", () => {
    it("rejects deletion without exact confirmation phrase", async () => {
      await expect(requestAccountDeletion("no")).rejects.toThrow(
        'Please type "DELETE" exactly to confirm account deletion.'
      );
    });

    it("schedules deletion with 14-day grace period when confirmed", async () => {
      const job = await requestAccountDeletion("DELETE");
      expect(job.status).toBe("pending_grace_period");
      expect(job.gracePeriodDays).toBe(14);
      expect(getAccountDeletionStatus()?.jobId).toBe(job.jobId);
    });

    it("cancels pending deletion", async () => {
      await requestAccountDeletion("DELETE");
      await cancelAccountDeletion();
      expect(getAccountDeletionStatus()).toBeNull();
    });
  });
});
