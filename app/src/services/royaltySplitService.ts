/**
 * Persistence for collaboration split-royalty configurations (#417).
 *
 * Configs are stored per release so a collab can be split differently from a
 * single. Everything is local for now; swapping the `localStorage` calls for the
 * `prepare-royalty-split` endpoints described in
 * `docs/ROYALTY_CONTRACT_DESIGN.md` does not change the shape of this module.
 */

import { validateRoyaltySplit } from "@/lib/royaltySplit";
import { TOTAL_BASIS_POINTS } from "@/types/royalty";
import {
  basisPointsToPercent,
  rebalanceToTotal,
  toBasisPointEntries,
  validateSplitDraft,
  type SplitDraftErrors,
  type SplitParticipant,
} from "@/utils/royaltySplits";

const STORAGE_KEY = "audioblocks:royalty-splits:v1";

export interface CollabRelease {
  id: string;
  title: string;
  /** Collaborators the artist has already worked with, used to seed new rows. */
  collaborators: { id: string; name: string; address: string }[];
}

export interface SavedSplit {
  releaseId: string;
  rows: SplitParticipant[];
  savedAt: string;
}

const RELEASES: CollabRelease[] = [
  {
    id: "rel_midnight_drive",
    title: "Midnight Drive (feat. Jaden Cole)",
    collaborators: [
      {
        id: "collab_jaden",
        name: "Jaden Cole",
        address: "GAB2CDEFGHIJKLMNOPQRSTUVWXYZ34567AB2CDEFGHIJKLMNOPQRSTUV",
      },
      {
        id: "collab_mara",
        name: "Mara Voss",
        address: "G76543ZYXWVUTSRQPONMLKJIHGFEDC2BAAB2CDEFGHIJKLMNOPQRSTUV",
      },
    ],
  },
  {
    id: "rel_lagos_live",
    title: "Lagos Live (single)",
    collaborators: [{ id: "collab_dexter", name: "Dexter Alaba", address: "" }],
  },
];

let splits: SavedSplit[] | null = null;
let rowCounter = 0;

function load(): SavedSplit[] {
  if (splits) return splits;
  if (typeof window === "undefined") {
    splits = [];
    return splits;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    splits = raw ? (JSON.parse(raw) as SavedSplit[]) : [];
  } catch {
    splits = [];
  }
  return splits;
}

function persist(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(splits ?? []));
  } catch {
    // Storage full or blocked — the config still lives for this session.
  }
}

/** Test seam: drops the memo so each spec starts from an empty store. */
export function resetRoyaltySplits(): void {
  splits = null;
  rowCounter = 0;
}

export function listCollabReleases(): CollabRelease[] {
  return RELEASES;
}

function newRowId(): string {
  rowCounter += 1;
  return `row_${rowCounter}`;
}

export function getSavedSplit(releaseId: string): SavedSplit | undefined {
  return load().find((split) => split.releaseId === releaseId);
}

/** A blank draft, pre-filled with the release's known collaborators. */
export function draftForRelease(releaseId: string): SplitParticipant[] {
  const saved = getSavedSplit(releaseId);
  if (saved) return saved.rows.map((row) => ({ ...row }));

  const release = RELEASES.find((entry) => entry.id === releaseId);
  if (!release) return [];
  return release.collaborators.map((collaborator) => ({
    id: newRowId(),
    name: collaborator.name,
    address: collaborator.address,
    percent: 0,
  }));
}

export function addSplitRow(rows: SplitParticipant[]): SplitParticipant[] {
  return [...rows, { id: newRowId(), name: "", address: "", percent: 0 }];
}

export function removeSplitRow(rows: SplitParticipant[], id: string): SplitParticipant[] {
  return rows.filter((row) => row.id !== id);
}

/** Applies an edited share and re-normalises the rest back to 100%. */
export function setSplitPercent(
  rows: SplitParticipant[],
  id: string,
  percent: number
): SplitParticipant[] {
  return rebalanceToTotal(rows, id, percent);
}

/** Spreads the whole 100% evenly, which is the usual starting point. */
export function distributeEqually(rows: SplitParticipant[]): SplitParticipant[] {
  if (rows.length === 0) return rows;
  const share = basisPointsToPercent(Math.floor(TOTAL_BASIS_POINTS / rows.length));
  return rows.map((row, index) => ({
    ...row,
    percent: index === 0 ? 100 - share * (rows.length - 1) : share,
  }));
}

export function setRowField(
  rows: SplitParticipant[],
  id: string,
  field: "name" | "address" | "percent",
  value: string | number
): SplitParticipant[] {
  return rows.map((row) => (row.id === id ? { ...row, [field]: value } : row));
}

export type SaveSplitResult =
  { ok: true; split: SavedSplit } | { ok: false; errors: SplitDraftErrors };

/**
 * Validates against both the artist-facing rules and the contract invariants
 * before anything is stored, so a config that reaches the chain is always
 * a legal one.
 */
export function saveSplit(releaseId: string, rows: SplitParticipant[]): SaveSplitResult {
  const errors = validateSplitDraft(rows);
  if (Object.keys(errors.rows).length > 0 || errors.total) {
    return { ok: false, errors };
  }

  const contract = validateRoyaltySplit(toBasisPointEntries(rows));
  if (!contract.valid) {
    return {
      ok: false,
      errors: { rows: { [rows[0]?.id ?? "row"]: contract.errors[0] } },
    };
  }

  const split: SavedSplit = { releaseId, rows, savedAt: new Date().toISOString() };
  const existing = load();
  const index = existing.findIndex((entry) => entry.releaseId === releaseId);
  if (index >= 0) existing[index] = split;
  else existing.push(split);
  persist();
  return { ok: true, split };
}

export function deleteSplit(releaseId: string): void {
  splits = load().filter((split) => split.releaseId !== releaseId);
  persist();
}

export function isSplitSaved(releaseId: string, rows: SplitParticipant[]): boolean {
  const saved = getSavedSplit(releaseId);
  if (!saved) return false;
  if (saved.rows.length !== rows.length) return false;
  return saved.rows.every((row) => {
    const match = rows.find((entry) => entry.id === row.id);
    return (
      match !== undefined &&
      match.name === row.name &&
      match.address === row.address &&
      Math.abs(match.percent - row.percent) < 0.0001
    );
  });
}
