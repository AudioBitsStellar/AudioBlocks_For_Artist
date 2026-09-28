"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Users } from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb";
import EmptyState from "@/components/shared/EmptyState";
import ConfirmationDialog from "@/components/shared/ConfirmationDialog";
import AuditTrailPanel from "@/components/AuditTrailPanel";
import { useHasHydrated } from "@/hooks/useHasHydrated";
import { useTeam } from "@/hooks/useTeam";
import {
  ASSIGNABLE_ROLES,
  MAX_TEAM_SEATS,
  inviteTeamMember,
  removeTeamMember,
  updateTeamMemberRole,
  type TeamErrorCode,
  type TeamMember,
} from "@/services/teamService";
import { ROLE_BADGE_STYLES, ROLE_INFO, type Role } from "@/types/role";

/** Error copy keyed off the service's failure codes. */
const ERROR_COPY: Record<TeamErrorCode, string> = {
  forbidden: "You do not have permission to manage team access.",
  invalid_email: "Enter a valid email address.",
  invalid_name: "Enter the person's name (2+ characters).",
  invalid_role: "Choose either manager or viewer.",
  duplicate_email: "That address is already on this team.",
  seats_exhausted: `This workspace has all ${MAX_TEAM_SEATS} seats in use.`,
  not_found: "That team member is no longer on this team.",
  immutable_member: "The workspace owner cannot be changed here.",
};

function formatDate(at: number): string {
  if (!at) return "—";
  return new Date(at).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function TeamPage() {
  const hydrated = useHasHydrated();
  const { owner, staff, canManage, restrictionReason, seatsUsed, seatsRemaining } = useTeam();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("viewer");
  const [error, setError] = useState<string | null>(null);
  const [pendingRemoval, setPendingRemoval] = useState<TeamMember | null>(null);

  const handleInvite = (event: FormEvent) => {
    event.preventDefault();
    const result = inviteTeamMember({ name, email, role }, owner);
    if (!result.ok) {
      setError(ERROR_COPY[result.error]);
      toast.error(ERROR_COPY[result.error]);
      return;
    }
    setError(null);
    setName("");
    setEmail("");
    setRole("viewer");
    toast.success(`Invite sent to ${result.value.email}`);
  };

  const handleRoleChange = (member: TeamMember, nextRole: Role) => {
    const result = updateTeamMemberRole(member.id, nextRole, owner);
    if (!result.ok) {
      toast.error(ERROR_COPY[result.error]);
      return;
    }
    toast.success(`${member.email} is now ${ROLE_INFO[nextRole].label.toLowerCase()}`);
  };

  const handleConfirmRemoval = () => {
    if (!pendingRemoval) return;
    const result = removeTeamMember(pendingRemoval.id, owner);
    if (!result.ok) toast.error(ERROR_COPY[result.error]);
    else toast.success(`Removed ${pendingRemoval.email} from the team`);
    setPendingRemoval(null);
  };

  // The roster lives in storage, which the server render cannot see.
  if (!hydrated) return null;

  return (
    <div className="space-y-8">
      <Breadcrumb items={[{ label: "Team & staff", isActive: true }]} />

      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-text-muted">Artist workspace</p>
        <h1 className="text-3xl font-bold text-text">Team &amp; staff</h1>
        <p className="text-sm text-text-muted">
          Give a manager or a viewer access to this workspace instead of sharing your login.{" "}
          <span data-testid="seat-count">
            {seatsUsed} of {MAX_TEAM_SEATS} seats in use.
          </span>
        </p>
      </header>

      {!canManage ? (
        <p
          role="note"
          className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text-muted"
        >
          {restrictionReason} You can still see who has access below.
        </p>
      ) : (
        <section
          aria-labelledby="team-invite-heading"
          className="rounded-2xl border border-border bg-surface p-5 space-y-4"
        >
          <div>
            <h2 id="team-invite-heading" className="text-lg font-semibold text-text">
              Invite a team member
            </h2>
            <p className="text-sm text-text-muted mt-1">
              {seatsRemaining} seat{seatsRemaining === 1 ? "" : "s"} left. Invites stay pending
              until the person accepts.
            </p>
          </div>

          <form onSubmit={handleInvite} className="space-y-4" noValidate>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="flex flex-col gap-2">
                <label htmlFor="team-name" className="text-sm font-medium text-white">
                  Name
                </label>
                <input
                  id="team-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Alex Rivera"
                  maxLength={100}
                  autoComplete="off"
                  aria-invalid={error ? "true" : "false"}
                  aria-describedby="team-invite-error"
                  className="h-11 rounded-xl border border-border bg-surface-sunken px-3 text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor="team-email" className="text-sm font-medium text-white">
                  Email
                </label>
                <input
                  id="team-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="alex@studio.com"
                  maxLength={254}
                  autoComplete="off"
                  aria-invalid={error ? "true" : "false"}
                  aria-describedby="team-invite-error"
                  className="h-11 rounded-xl border border-border bg-surface-sunken px-3 text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor="team-role" className="text-sm font-medium text-white">
                  Role
                </label>
                <select
                  id="team-role"
                  value={role}
                  onChange={(event) => setRole(event.target.value as Role)}
                  className="h-11 rounded-xl border border-border bg-surface-sunken px-3 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {ASSIGNABLE_ROLES.map((assignable) => (
                    <option key={assignable} value={assignable}>
                      {ROLE_INFO[assignable].label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <p className="text-xs text-text-muted">{ROLE_INFO[role].description}</p>

            <button
              type="submit"
              disabled={seatsRemaining === 0}
              className={`rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-contrast ${
                seatsRemaining === 0
                  ? "cursor-not-allowed opacity-50"
                  : "cursor-pointer hover:bg-primary-hover"
              } focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2`}
            >
              Send invite
            </button>

            <p
              id="team-invite-error"
              role="alert"
              aria-live="polite"
              className="text-xs text-red-500"
            >
              {error ?? ""}
            </p>
          </form>
        </section>
      )}

      <section aria-labelledby="team-members-heading" className="space-y-4">
        <h2 id="team-members-heading" className="text-xl font-semibold text-text">
          Who has access
        </h2>

        {staff.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No one else has access"
            description="Only you can manage this workspace. Invite a manager or a viewer when you need help with uploads, merch, or messages."
          />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <caption className="sr-only">
                Team members of this artist workspace with their roles and status.
              </caption>
              <thead className="bg-surface text-xs uppercase tracking-wide text-text-muted">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Member
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Role
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Added
                  </th>
                  {canManage ? (
                    <th scope="col" className="px-4 py-3 font-medium">
                      <span className="sr-only">Actions</span>
                    </th>
                  ) : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-surface/40">
                {staff.map((member) => (
                  <tr key={member.id}>
                    <th scope="row" className="px-4 py-3 font-normal">
                      <span className="block text-text">{member.name}</span>
                      <span className="block text-xs text-text-muted">{member.email}</span>
                    </th>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${ROLE_BADGE_STYLES[member.role]}`}
                      >
                        {ROLE_INFO[member.role].label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-text-muted">
                      {member.status === "invited" ? "Invite pending" : "Active"}
                    </td>
                    <td className="px-4 py-3 text-text-muted tabular-nums">
                      {formatDate(member.addedAt)}
                    </td>
                    {canManage ? (
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <label htmlFor={`role-${member.id}`} className="sr-only">
                            Role for {member.email}
                          </label>
                          <select
                            id={`role-${member.id}`}
                            value={member.role}
                            onChange={(event) =>
                              handleRoleChange(member, event.target.value as Role)
                            }
                            className="h-9 rounded-lg border border-border bg-surface-sunken px-2 text-xs text-text focus:outline-none focus:ring-2 focus:ring-primary"
                          >
                            {ASSIGNABLE_ROLES.map((assignable) => (
                              <option key={assignable} value={assignable}>
                                {ROLE_INFO[assignable].label}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => setPendingRemoval(member)}
                            className="h-9 rounded-lg border border-border bg-surface-sunken px-3 text-xs text-text-muted transition-colors hover:border-red-500/60 hover:text-red-400 focus:outline-none focus:ring-2 focus:ring-primary"
                          >
                            Remove
                          </button>
                        </div>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <AuditTrailPanel />

      <ConfirmationDialog
        isOpen={pendingRemoval !== null}
        onClose={() => setPendingRemoval(null)}
        onConfirm={handleConfirmRemoval}
        title="Remove team member"
        message={
          pendingRemoval
            ? `Revoke ${pendingRemoval.email}'s access to this workspace? The removal is recorded in the activity log.`
            : ""
        }
        confirmText="Remove"
        cancelText="Keep access"
      />
    </div>
  );
}
