"use client";

import { useMemo, useSyncExternalStore } from "react";
import { useRole } from "@/hooks/useRole";
import {
  MAX_TEAM_SEATS,
  OWNER_MEMBER_ID,
  canManageTeam,
  getTeamRestrictionReason,
  getTeamRoster,
  getTeamRosterServerSnapshot,
  listTeamMembers,
  subscribeToTeamRoster,
  type TeamMember,
  type WorkspaceOwner,
} from "@/services/teamService";
import { getDisplayNameFromToken, getEmailFromToken } from "@/utils/jwt";

export interface UseTeamReturn {
  /** The signed-in artist: the audit actor, and the owner row's identity. */
  owner: WorkspaceOwner;
  /** Staff only, most recently added first (the owner row is not repeated here). */
  staff: Array<TeamMember>;
  canManage: boolean;
  /** Why the manage controls are hidden for this role; "" when allowed. */
  restrictionReason: string;
  seatsUsed: number;
  seatsRemaining: number;
}

/**
 * Live view of the artist's team / staff roster (#460).
 *
 * The acting member's role comes from `useRole()`, which is the same source the
 * rest of the dashboard trusts, and `canManage` is the existing `roles:manage`
 * permission rather than a new rule. Reading is through `useSyncExternalStore`,
 * so a change made in one place shows up everywhere without an effect.
 */
export function useTeam(): UseTeamReturn {
  const { role } = useRole();
  const roster = useSyncExternalStore(
    subscribeToTeamRoster,
    getTeamRoster,
    getTeamRosterServerSnapshot
  );

  // Both reads are unverified JWT claims, used for labels and as the audit
  // actor's identity only — `teamService` re-checks the permission itself.
  const owner = useMemo<WorkspaceOwner>(
    () => ({
      id: OWNER_MEMBER_ID,
      name: getDisplayNameFromToken("You"),
      email: getEmailFromToken() ?? "",
      role,
    }),
    [role]
  );

  // listTeamMembers owns the ordering rules, including the tie-break for invites
  // created in the same millisecond; the owner row is the page's own header.
  const staff = useMemo(() => listTeamMembers(owner, roster).slice(1), [owner, roster]);

  return useMemo(
    () => ({
      owner,
      staff,
      canManage: canManageTeam(role),
      restrictionReason: getTeamRestrictionReason(role),
      seatsUsed: roster.length + 1,
      seatsRemaining: Math.max(MAX_TEAM_SEATS - (roster.length + 1), 0),
    }),
    [owner, staff, roster, role]
  );
}
