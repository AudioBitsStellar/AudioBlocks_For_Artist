/**
 * Artist team / staff access management (#460).
 *
 * Multi-user artist accounts: an artist can give a manager or a viewer access to
 * their workspace without handing over the login. Roles and permissions come
 * from the existing RBAC model (`@/types/role`) — this service does not invent a
 * second permission system, and `roles:manage` (already declared there) is what
 * gates every mutation here.
 *
 * Like the other surfaces waiting on backend work, the roster is persisted in
 * localStorage (`notificationPreferences.ts`, `emailVerificationService.ts` set
 * the precedent) behind the same call shapes a REST client would use, so the UI
 * does not change when `/api/v1/team` ships. The signature check that really
 * protects these invitations is server-side; see `context/RBAC.md`.
 *
 * Every accepted *and* rejected mutation is written to the audit trail (#461).
 *
 * Pure functions – no React deps so it can be tested in isolation.
 */

import {
  recordAuditEvent,
  recordDeniedAttempt,
  type AuditAction,
  type AuditActor,
} from "@/services/auditLogService";
import { ROLE_PERMISSION_TABLE, type Role } from "@/types/role";

export type TeamMemberStatus = "invited" | "active";

export interface TeamMember {
  id: string;
  name: string;
  /** Lower-cased; also the join key for an outstanding invite. */
  email: string;
  role: Role;
  status: TeamMemberStatus;
  /** Epoch ms the row was created. */
  addedAt: number;
  /** Id of the member who added this one, for the audit trail. */
  addedBy: string;
  /** Set for active members only — when they were last seen. */
  lastActiveAt?: number;
}

export interface InviteTeamMemberPayload {
  name: string;
  email: string;
  role: Role;
}

export type TeamErrorCode =
  | "forbidden"
  | "invalid_email"
  | "invalid_name"
  | "invalid_role"
  | "duplicate_email"
  | "seats_exhausted"
  | "not_found"
  | "immutable_member";

export type TeamResult<T> =
  { ok: true; value: T } | { ok: false; error: TeamErrorCode; message: string };

/**
 * A soft ceiling on seats. It is a product limit, not a security control, and
 * exists so a mocked roster cannot grow into storage the UI can't render.
 */
export const MAX_TEAM_SEATS = 8;

/**
 * Roles that can be granted to another person. `owner` is excluded: the owner is
 * the artist who owns the workspace, and handing ownership to a staff member is
 * an account-transfer operation with billing consequences, not a team setting.
 */
export const ASSIGNABLE_ROLES: ReadonlyArray<Role> = ["manager", "viewer"];

const EMAIL_REGEX = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;

const STORAGE_KEY = "audioblocks:team:v1";
const CHANGE_EVENT = "audioblocks:team:changed";

/** Id of the synthetic roster entry that stands for the signed-in artist. */
export const OWNER_MEMBER_ID = "self";

const EMPTY_ROSTER: Array<TeamMember> = [];

let cachedRaw: string | null = null;
let cachedRoster: Array<TeamMember> = EMPTY_ROSTER;

function isStatus(value: unknown): value is TeamMemberStatus {
  return value === "invited" || value === "active";
}

function parseMember(value: unknown): TeamMember | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  if (typeof raw.id !== "string" || !raw.id) return null;
  if (typeof raw.name !== "string" || typeof raw.email !== "string") return null;
  if (raw.role !== "owner" && raw.role !== "manager" && raw.role !== "viewer") return null;
  if (!isStatus(raw.status)) return null;
  if (typeof raw.addedAt !== "number" || typeof raw.addedBy !== "string") return null;

  const member: TeamMember = {
    id: raw.id,
    name: raw.name,
    email: raw.email.toLowerCase(),
    role: raw.role,
    status: raw.status,
    addedAt: raw.addedAt,
    addedBy: raw.addedBy,
  };
  if (typeof raw.lastActiveAt === "number") member.lastActiveAt = raw.lastActiveAt;
  return member;
}

function parseRoster(raw: string): Array<TeamMember> {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return EMPTY_ROSTER;
    return parsed.map(parseMember).filter((m): m is TeamMember => m !== null);
  } catch {
    return EMPTY_ROSTER;
  }
}

/** The stored roster (staff only), oldest first. Malformed rows are skipped. */
export function getTeamRoster(): Array<TeamMember> {
  if (typeof window === "undefined") return EMPTY_ROSTER;
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return EMPTY_ROSTER;
  }
  if (raw === null) return EMPTY_ROSTER;
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedRoster = parseRoster(raw);
  }
  return cachedRoster;
}

/** Empty roster for server rendering, where storage doesn't exist. */
export function getTeamRosterServerSnapshot(): Array<TeamMember> {
  return EMPTY_ROSTER;
}

/** Subscribes to roster changes (this tab and other tabs). */
export function subscribeToTeamRoster(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => {
    cachedRaw = null;
    onChange();
  };
  window.addEventListener(CHANGE_EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(CHANGE_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

function notifyTeamChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function writeRoster(members: Array<TeamMember>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(members));
  } catch {
    return;
  }
  notifyTeamChanged();
}

function newMemberId(): string {
  const cryptoObj = typeof globalThis.crypto === "undefined" ? undefined : globalThis.crypto;
  if (cryptoObj?.randomUUID) return cryptoObj.randomUUID();
  return `member-${Date.now().toString(36)}-${Math.floor(Math.random() * 1_000_000).toString(36)}`;
}

/** Whether a role may manage the team, per the shared RBAC table. */
export function canManageTeam(role: Role): boolean {
  return ROLE_PERMISSION_TABLE[role].includes("roles:manage");
}

/**
 * Why a role can't manage the team, for disabled controls. Returns an empty
 * string when the role may.
 */
export function getTeamRestrictionReason(role: Role): string {
  if (canManageTeam(role)) return "";
  if (role === "manager") return "Team access is managed by the workspace owner.";
  return "You have read-only access; team access is managed by the workspace owner.";
}

/** The signed-in artist, as the roster and the audit trail need to see them. */
export type WorkspaceOwner = AuditActor & { email: string };

/**
 * Roster as the UI should show it: the signed-in artist first as the immutable
 * owner, then staff, most recent first.
 */
export function listTeamMembers(
  owner: WorkspaceOwner,
  roster: Array<TeamMember> = getTeamRoster()
): Array<TeamMember> {
  const ownerMember: TeamMember = {
    id: OWNER_MEMBER_ID,
    name: owner.name,
    email: owner.email,
    role: "owner",
    status: "active",
    addedAt: 0,
    addedBy: OWNER_MEMBER_ID,
  };
  // `addedAt` has millisecond resolution, so two invites fired from one form
  // submit can tie. Break ties by insertion order (later wins) to keep the
  // listing deterministic instead of leaning on a stable sort's accident.
  const staff = roster
    .map((member, position) => ({ member, position }))
    .sort((a, b) => b.member.addedAt - a.member.addedAt || b.position - a.position)
    .map(({ member }) => member);
  return [ownerMember, ...staff];
}

/** Seats taken, counting the owner, who holds one too. */
export function countSeatsUsed(): number {
  return getTeamRoster().length + 1;
}

function fail(
  error: TeamErrorCode,
  message: string
): { ok: false; error: TeamErrorCode; message: string } {
  return { ok: false, error, message };
}

/**
 * The RBAC gate shared by every mutation. A denied attempt is written to the
 * trail before it is reported — that is the whole point of having one.
 */
function guard(actor: AuditActor, action: AuditAction): TeamResult<void> {
  if (canManageTeam(actor.role)) return { ok: true, value: undefined };
  recordDeniedAttempt(actor, action);
  return fail(
    "forbidden",
    getTeamRestrictionReason(actor.role) || "You cannot manage team access."
  );
}

function findMember(id: string): TeamMember | undefined {
  return getTeamRoster().find((member) => member.id === id);
}

/** The owner row is derived from the session, so it can never be edited away. */
function isImmutable(id: string): boolean {
  return id === OWNER_MEMBER_ID;
}

/**
 * Invite a staff member. The invite is recorded as `status: "invited"` because
 * no backend can confirm the address until the recipient accepts it.
 */
export function inviteTeamMember(
  payload: InviteTeamMemberPayload,
  actor: AuditActor
): TeamResult<TeamMember> {
  const allowed = guard(actor, "member.invited");
  if (!allowed.ok) return allowed;

  const name = payload.name.trim();
  if (name.length < 2) return fail("invalid_name", "Enter the person's name (2+ characters).");

  const email = payload.email.trim().toLowerCase();
  if (!EMAIL_REGEX.test(email)) return fail("invalid_email", "Enter a valid email address.");

  if (!ASSIGNABLE_ROLES.includes(payload.role)) {
    return fail("invalid_role", `A team member can be a manager or a viewer.`);
  }

  if (getTeamRoster().some((member) => member.email === email)) {
    return fail("duplicate_email", `${email} is already on this team.`);
  }

  if (countSeatsUsed() >= MAX_TEAM_SEATS) {
    return fail("seats_exhausted", `This workspace has all ${MAX_TEAM_SEATS} seats in use.`);
  }

  const member: TeamMember = {
    id: newMemberId(),
    name,
    email,
    role: payload.role,
    status: "invited",
    addedAt: Date.now(),
    addedBy: actor.id,
  };
  writeRoster([...getTeamRoster(), member]);
  recordAuditEvent({
    actor,
    action: "member.invited",
    outcome: "success",
    targetId: member.id,
    targetName: member.email,
    detail: member.role,
  });
  return { ok: true, value: member };
}

/**
 * Change a staff member's role. Takes effect immediately: a manager who is
 * having a bad week should not keep edit rights until they next sign in.
 */
export function updateTeamMemberRole(
  id: string,
  role: Role,
  actor: AuditActor
): TeamResult<TeamMember> {
  const allowed = guard(actor, "member.role_changed");
  if (!allowed.ok) return allowed;

  if (isImmutable(id))
    return fail("immutable_member", "The workspace owner's role cannot be changed.");
  if (!ASSIGNABLE_ROLES.includes(role)) {
    return fail("invalid_role", "Choose either manager or viewer.");
  }

  const current = findMember(id);
  if (!current) return fail("not_found", "That team member is no longer on this team.");
  if (current.role === role) return { ok: true, value: current };

  const updated: TeamMember = { ...current, role };
  writeRoster(getTeamRoster().map((member) => (member.id === id ? updated : member)));
  recordAuditEvent({
    actor,
    action: "member.role_changed",
    outcome: "success",
    targetId: updated.id,
    targetName: updated.email,
    detail: `${current.role} -> ${updated.role}`,
  });
  return { ok: true, value: updated };
}

/**
 * Remove a member, or withdraw an invite that has not been accepted yet. Those
 * are separate audit actions: the trail should read differently depending on
 * whether the person ever had access.
 */
export function removeTeamMember(id: string, actor: AuditActor): TeamResult<TeamMember> {
  const allowed = guard(actor, "member.removed");
  if (!allowed.ok) return allowed;

  if (isImmutable(id)) return fail("immutable_member", "The workspace owner cannot be removed.");

  const current = findMember(id);
  if (!current) return fail("not_found", "That team member is no longer on this team.");

  writeRoster(getTeamRoster().filter((member) => member.id !== id));
  const action = current.status === "invited" ? "member.invite_revoked" : "member.removed";
  recordAuditEvent({
    actor,
    action,
    outcome: "success",
    targetId: current.id,
    targetName: current.email,
    detail: current.role,
  });
  return { ok: true, value: current };
}

/**
 * Accept an invite as the invited person, flipping the row to `active`. Kept
 * separate from `inviteTeamMember` because a real backend performs this through
 * a signed link, not from the workspace owner's session.
 */
export function acceptTeamInvitation(email: string): TeamResult<TeamMember> {
  const normalized = email.trim().toLowerCase();
  const current = getTeamRoster().find((member) => member.email === normalized);
  if (!current) return fail("not_found", "There is no invite for that address.");
  if (current.status === "active") return { ok: true, value: current };

  const updated: TeamMember = { ...current, status: "active", lastActiveAt: Date.now() };
  writeRoster(getTeamRoster().map((member) => (member.id === updated.id ? updated : member)));
  recordAuditEvent({
    actor: { id: updated.id, name: updated.name, role: updated.role },
    action: "member.joined",
    outcome: "success",
    targetId: updated.id,
    targetName: updated.email,
    detail: updated.role,
  });
  return { ok: true, value: updated };
}

/** Drops the roster — used on logout and by tests. Does not touch the audit trail. */
export function clearTeamRoster(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    return;
  }
  cachedRaw = null;
  cachedRoster = EMPTY_ROSTER;
  notifyTeamChanged();
}
