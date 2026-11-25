/**
 * Account Data Export and Deletion Service (#784).
 * Manages GDPR/CCPA data export requests and account termination jobs.
 */

export type ExportJobStatus = "idle" | "queued" | "processing" | "completed" | "failed";

export interface DataExportJob {
  jobId: string;
  status: ExportJobStatus;
  requestedAt: string;
  completedAt?: string;
  downloadUrl?: string;
  fileSizeBytes?: number;
  expiresAt?: string;
  error?: string;
}

export type DeletionJobStatus = "pending_grace_period" | "scheduled" | "processing" | "completed";

export interface AccountDeletionJob {
  jobId: string;
  status: DeletionJobStatus;
  requestedAt: string;
  scheduledExecutionAt: string;
  gracePeriodDays: number;
}

const EXPORT_STORAGE_KEY = "audioblocks:account-data-export:v1";
const DELETION_STORAGE_KEY = "audioblocks:account-deletion:v1";

export function getDataExportStatus(): DataExportJob {
  if (typeof window === "undefined") {
    return { jobId: "", status: "idle", requestedAt: "" };
  }
  try {
    const raw = window.localStorage.getItem(EXPORT_STORAGE_KEY);
    if (!raw) return { jobId: "", status: "idle", requestedAt: "" };
    return JSON.parse(raw) as DataExportJob;
  } catch {
    return { jobId: "", status: "idle", requestedAt: "" };
  }
}

export async function requestDataExport(): Promise<DataExportJob> {
  const current = getDataExportStatus();
  if (current.status === "queued" || current.status === "processing") {
    return current;
  }

  const newJob: DataExportJob = {
    jobId: `export_${Date.now()}`,
    status: "queued",
    requestedAt: new Date().toISOString(),
  };

  if (typeof window !== "undefined") {
    window.localStorage.setItem(EXPORT_STORAGE_KEY, JSON.stringify(newJob));
  }

  // Simulate background job transition to completed
  setTimeout(() => {
    if (typeof window !== "undefined") {
      const completedJob: DataExportJob = {
        ...newJob,
        status: "completed",
        completedAt: new Date().toISOString(),
        downloadUrl: `/api/backend/account/export/${newJob.jobId}.json`,
        fileSizeBytes: 148200,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      };
      window.localStorage.setItem(EXPORT_STORAGE_KEY, JSON.stringify(completedJob));
    }
  }, 1000);

  return newJob;
}

export function clearDataExport(): void {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(EXPORT_STORAGE_KEY);
  }
}

export function getAccountDeletionStatus(): AccountDeletionJob | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DELETION_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AccountDeletionJob;
  } catch {
    return null;
  }
}

export async function requestAccountDeletion(confirmationPhrase: string): Promise<AccountDeletionJob> {
  if (confirmationPhrase.trim().toUpperCase() !== "DELETE") {
    throw new Error('Please type "DELETE" exactly to confirm account deletion.');
  }

  const now = Date.now();
  const graceDays = 14;
  const executionDate = new Date(now + graceDays * 24 * 60 * 60 * 1000).toISOString();

  const job: AccountDeletionJob = {
    jobId: `del_${now}`,
    status: "pending_grace_period",
    requestedAt: new Date(now).toISOString(),
    scheduledExecutionAt: executionDate,
    gracePeriodDays: graceDays,
  };

  if (typeof window !== "undefined") {
    window.localStorage.setItem(DELETION_STORAGE_KEY, JSON.stringify(job));
  }

  return job;
}

export async function cancelAccountDeletion(): Promise<void> {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(DELETION_STORAGE_KEY);
  }
}
