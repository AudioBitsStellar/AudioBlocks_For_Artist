/**
 * Collaborator / co-artist invite flow (issue #416).
 *
 * There's no invite endpoint yet, so invites are stored locally – the same
 * local-first pattern used by notificationPreferences.ts and
 * verificationService.ts. The exported functions are the seam where the
 * backend invite API (see COLLABORATOR_ENDPOINTS) gets dropped in.
 *
 * Pure functions – no React deps so it can be tested in isolation.
 */

import { ROLES, type Role } from "@/types/role";

export type InviteStatus = "pending" | "accepted" | "revoked";

export interface CollaboratorInvite {
  id: string;
  email: string;
  role: Role;
  message?: string;
  status: InviteStatus;
  invitedAt: string;
  /** Opaque token used to build the accept link sent to the co-artist. */
  token: string;
}

export interface CreateInviteInput {
  email: string;
  role: Role;
  message?: string;
}

export type CreateInviteResult =
  { ok: true; invite: CollaboratorInvite } | { ok: false; error: string };

const STORAGE_KEY = "audioblocks:collaborators:v1";

const ROLE_LABELS: Record<Role, string> = {
  owner: "Owner",
  manager: "Manager",
  viewer: "Viewer",
};

export const INVITE_ROLE_LABELS = ROLE_LABELS;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function randomToken(): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  const cryptoApi = typeof globalThis.crypto !== "undefined" ? globalThis.crypto : undefined;
  const length = 24;

  if (cryptoApi?.getRandomValues) {
    const bytes = new Uint8Array(length);
    cryptoApi.getRandomValues(bytes);
    for (let i = 0; i < bytes.length; i += 1) {
      out += alphabet[bytes[i] % alphabet.length];
    }
    return out;
  }

  for (let i = 0; i < length; i += 1) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as ReadonlyArray<string>).includes(value);
}

function isInvite(value: unknown): value is CollaboratorInvite {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<CollaboratorInvite>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.email === "string" &&
    isRole(candidate.role) &&
    (candidate.status === "pending" ||
      candidate.status === "accepted" ||
      candidate.status === "revoked") &&
    typeof candidate.invitedAt === "string" &&
    typeof candidate.token === "string"
  );
}

/** All invites, oldest first. Corrupted storage reads as an empty list. */
export function listInvites(): CollaboratorInvite[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isInvite);
  } catch {
    return [];
  }
}

function persist(invites: CollaboratorInvite[]): CollaboratorInvite[] {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(invites));
    } catch {
      // storage unavailable (private mode) – callers still get the result
    }
  }
  return invites;
}

/**
 * Creates an invite for a co-artist. Duplicate pending invites for the same
 * email are rejected so the artist doesn't send the same link twice.
 */
export function createInvite(input: CreateInviteInput): CreateInviteResult {
  const email = input.email.trim().toLowerCase();
  const message = input.message?.trim();

  if (!email) return { ok: false, error: "Email address is required." };
  if (!EMAIL_PATTERN.test(email)) return { ok: false, error: "Enter a valid email address." };
  if (!isRole(input.role)) return { ok: false, error: "Choose a role for this collaborator." };

  const invites = listInvites();
  const alreadyPending = invites.some(
    (invite) => invite.email === email && invite.status === "pending"
  );
  if (alreadyPending) {
    return { ok: false, error: "This person already has a pending invitation." };
  }

  const invite: CollaboratorInvite = {
    id: `${Date.now().toString(36)}-${randomToken().slice(0, 8)}`,
    email,
    role: input.role,
    message: message ? message : undefined,
    status: "pending",
    invitedAt: new Date().toISOString(),
    token: randomToken(),
  };

  persist([...invites, invite]);
  return { ok: true, invite };
}

/** Revokes a pending invite – the accept link stops working for the artist view. */
export function revokeInvite(id: string): CollaboratorInvite | null {
  const invites = listInvites();
  let updated: CollaboratorInvite | null = null;
  const next = invites.map((invite) => {
    if (invite.id !== id || invite.status !== "pending") return invite;
    updated = { ...invite, status: "revoked" as const };
    return updated;
  });
  if (!updated) return null;
  persist(next);
  return updated;
}

/** Re-issues the token + send date for an existing pending invite. */
export function resendInvite(id: string): CollaboratorInvite | null {
  const invites = listInvites();
  let updated: CollaboratorInvite | null = null;
  const next = invites.map((invite) => {
    if (invite.id !== id || invite.status !== "pending") return invite;
    updated = {
      ...invite,
      token: randomToken(),
      invitedAt: new Date().toISOString(),
      status: "pending" as const,
    };
    return updated;
  });
  if (!updated) return null;
  persist(next);
  return updated;
}

/** Marks an invite as accepted (used by the invitee's accept link handler). */
export function acceptInvite(token: string): CollaboratorInvite | null {
  const invites = listInvites();
  let updated: CollaboratorInvite | null = null;
  const next = invites.map((invite) => {
    if (invite.token !== token || invite.status !== "pending") return invite;
    updated = { ...invite, status: "accepted" as const };
    return updated;
  });
  if (!updated) return null;
  persist(next);
  return updated;
}

/** Shareable accept link for an invite token. */
export function getInviteLink(token: string): string {
  const path = `/invite/${token}`;
  if (typeof window === "undefined" || !window.location?.origin) return path;
  return `${window.location.origin}${path}`;
}

export function clearInvites(): void {
  persist([]);
}
