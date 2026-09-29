"use client";

import { useMemo, useState } from "react";
import { AlertCircle, Plus, Save, Scale, Trash2 } from "lucide-react";
import { toast } from "sonner";
import Breadcrumb from "@/components/Breadcrumb";
import ConfirmationDialog from "@/components/shared/ConfirmationDialog";
import EmptyState from "@/components/shared/EmptyState";
import {
  addSplitRow,
  deleteSplit,
  distributeEqually,
  draftForRelease,
  isSplitSaved,
  listCollabReleases,
  removeSplitRow,
  saveSplit,
  setRowField,
  setSplitPercent,
} from "@/services/royaltySplitService";
import {
  formatPercent,
  MAX_COLLABORATORS,
  totalPercent,
  validateSplitDraft,
  type SplitParticipant,
} from "@/utils/royaltySplits";

const PERCENT_CHANGE = 5;

export default function RoyaltySplitsPage() {
  const releases = listCollabReleases();
  const [releaseId, setReleaseId] = useState(releases[0]?.id ?? "");
  const [rows, setRows] = useState<SplitParticipant[]>(() =>
    draftForRelease(releases[0]?.id ?? "")
  );
  const [resetTarget, setResetTarget] = useState<string | null>(null);

  const errors = useMemo(() => validateSplitDraft(rows), [rows]);
  const total = totalPercent(rows);
  const isBalanced = Math.abs(total - 100) < 0.0001;
  const saved = isSplitSaved(releaseId, rows);

  const updateRows = (next: SplitParticipant[]) => setRows(next);

  const handleReleaseChange = (nextId: string) => {
    setReleaseId(nextId);
    setRows(draftForRelease(nextId));
  };

  const handleSave = () => {
    const result = saveSplit(releaseId, rows);
    if (result.ok) {
      toast.success("Royalty split saved for this release.");
      return;
    }
    toast.error("Fix the highlighted rows before saving.");
  };

  const handleReset = () => {
    if (!resetTarget) return;
    deleteSplit(resetTarget);
    setRows(draftForRelease(resetTarget));
    setResetTarget(null);
    toast.success("Saved split cleared.");
  };

  const release = releases.find((entry) => entry.id === releaseId);

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Collaborators", href: "/dashboard/collaborators" },
          { label: "Royalty splits", isActive: true },
        ]}
      />

      <header className="space-y-2">
        <h1 className="text-2xl font-bold text-text">Split royalties</h1>
        <p className="max-w-2xl text-sm text-text-muted">
          Decide who gets what before a collaboration goes out. Shares are stored as basis points
          and must add up to exactly 100% — the same rule the on-chain contract enforces.
        </p>
      </header>

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[16rem] flex-1">
          <label htmlFor="split-release" className="mb-1 block text-sm font-medium text-text">
            Release
          </label>
          <select
            id="split-release"
            value={releaseId}
            onChange={(event) => handleReleaseChange(event.target.value)}
            className="w-full rounded-full border border-border bg-surface px-4 py-2 text-sm text-text focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {releases.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.title}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={() => updateRows(distributeEqually(rows))}
          disabled={rows.length === 0}
          className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold text-text-muted transition-colors hover:text-text disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Scale size={16} aria-hidden="true" />
          Split evenly
        </button>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={Scale}
          title="No collaborators on this release"
          description="Add the people you collaborated with, then give each of them a share."
          ctaLabel="Add collaborator"
          onCta={() => updateRows(addSplitRow(rows))}
        />
      ) : (
        <section
          aria-labelledby="split-rows-heading"
          className="overflow-hidden rounded-2xl border border-border-subtle bg-surface"
        >
          <h2 id="split-rows-heading" className="sr-only">
            Collaborator shares
          </h2>
          <table className="w-full text-left text-sm">
            <caption className="sr-only">
              Royalty share per collaborator. Shares must total 100 percent.
            </caption>
            <thead className="border-b border-border-subtle text-xs uppercase tracking-wide text-text-muted">
              <tr>
                <th scope="col" className="px-4 py-3">
                  Collaborator
                </th>
                <th scope="col" className="px-4 py-3">
                  Stellar address
                </th>
                <th scope="col" className="px-4 py-3 text-right">
                  Share
                </th>
                <th scope="col" className="px-4 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const rowError = errors.rows[row.id];
                return (
                  <tr key={row.id} className="border-b border-border-subtle last:border-b-0">
                    <td className="px-4 py-3 align-top">
                      <label htmlFor={`split-name-${row.id}`} className="sr-only">
                        Collaborator name
                      </label>
                      <input
                        id={`split-name-${row.id}`}
                        value={row.name}
                        onChange={(event) =>
                          updateRows(setRowField(rows, row.id, "name", event.target.value))
                        }
                        aria-invalid={rowError ? true : undefined}
                        className="w-full rounded-lg border border-border bg-surface-sunken px-3 py-2 text-sm text-text focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      />
                    </td>
                    <td className="px-4 py-3 align-top">
                      <label htmlFor={`split-address-${row.id}`} className="sr-only">
                        Stellar address for {row.name || "collaborator"}
                      </label>
                      <input
                        id={`split-address-${row.id}`}
                        value={row.address}
                        onChange={(event) =>
                          updateRows(setRowField(rows, row.id, "address", event.target.value))
                        }
                        aria-invalid={rowError ? true : undefined}
                        className="w-full rounded-lg border border-border bg-surface-sunken px-3 py-2 font-mono text-xs text-text focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      />
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            updateRows(setSplitPercent(rows, row.id, row.percent - PERCENT_CHANGE))
                          }
                          aria-label={`Decrease ${row.name || "collaborator"} share by 5%`}
                          className="h-8 w-8 rounded-full border border-border text-text-muted transition-colors hover:text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        >
                          −
                        </button>
                        <span
                          data-testid={`split-percent-${row.id}`}
                          className="w-16 text-center font-semibold text-text"
                        >
                          {formatPercent(row.percent)}%
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            updateRows(setSplitPercent(rows, row.id, row.percent + PERCENT_CHANGE))
                          }
                          aria-label={`Increase ${row.name || "collaborator"} share by 5%`}
                          className="h-8 w-8 rounded-full border border-border text-text-muted transition-colors hover:text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        >
                          +
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top text-right">
                      <button
                        type="button"
                        onClick={() => updateRows(removeSplitRow(rows, row.id))}
                        aria-label={`Remove ${row.name || "collaborator"} from the split`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-text-muted transition-colors hover:text-error focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <Trash2 size={16} aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-subtle px-4 py-3">
            <button
              type="button"
              onClick={() => updateRows(addSplitRow(rows))}
              disabled={rows.length >= MAX_COLLABORATORS}
              className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold text-text-muted transition-colors hover:text-text disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Plus size={16} aria-hidden="true" />
              Add collaborator
            </button>
            <p
              role="status"
              className={`text-sm font-semibold ${isBalanced ? "text-success" : "text-warning"}`}
            >
              Total: {formatPercent(total)}%
            </p>
          </div>
        </section>
      )}

      {(errors.total || Object.keys(errors.rows).length > 0) && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-[#7F1D1D] bg-surface px-4 py-3 text-sm text-error"
        >
          <AlertCircle size={16} aria-hidden="true" className="mt-0.5 flex-shrink-0" />
          <span>
            {errors.total ??
              Object.values(errors.rows).find(Boolean) ??
              "Check the highlighted rows."}
          </span>
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2 text-sm font-semibold text-primary-contrast transition-colors hover:bg-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <Save size={16} aria-hidden="true" />
          Save split for {release?.title ?? "this release"}
        </button>
        <button
          type="button"
          onClick={() => setResetTarget(releaseId)}
          className="rounded-full border border-border px-5 py-2 text-sm font-semibold text-text-muted transition-colors hover:text-text"
        >
          Clear saved split
        </button>
        {saved && (
          <span role="status" className="text-sm font-semibold text-success">
            Saved
          </span>
        )}
      </div>

      <ConfirmationDialog
        isOpen={Boolean(resetTarget)}
        onClose={() => setResetTarget(null)}
        onConfirm={handleReset}
        title="Clear this split?"
        message="The saved shares for this release will be removed and the form reset to its defaults."
        confirmText="Clear split"
      />
    </div>
  );
}
