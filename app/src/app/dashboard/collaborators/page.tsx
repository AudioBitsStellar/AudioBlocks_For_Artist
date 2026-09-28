"use client";

import { useEffect, useState } from "react";
import { Copy, Link2, RotateCw, Trash2, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import Breadcrumb from "@/components/Breadcrumb";
import EmptyState from "@/components/shared/EmptyState";
import ConfirmationDialog from "@/components/shared/ConfirmationDialog";
import CollaboratorInviteModal from "@/components/common/modals/CollaboratorInviteModal";
import { useRole } from "@/hooks/useRole";
import {
  getInviteLink,
  listInvites,
  resendInvite,
  revokeInvite,
  type CollaboratorInvite,
} from "@/services/collaboratorService";
import { INVITE_ROLE_LABELS } from "@/services/collaboratorService";

const STATUS_STYLES: Record<CollaboratorInvite["status"], string> = {
  pending: "bg-[#D2045B]/15 text-[#D2045B]",
  accepted: "bg-emerald-500/15 text-emerald-400",
  revoked: "bg-[#2A2A2A] text-[#A3A3A3]",
};

export default function CollaboratorsPage() {
  const { can } = useRole();
  const canManage = can("roles:manage");
  const [invites, setInvites] = useState<CollaboratorInvite[]>([]);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<CollaboratorInvite | null>(null);

  useEffect(() => {
    setInvites(listInvites());
  }, []);

  const refresh = () => setInvites(listInvites());

  const handleCopy = async (invite: CollaboratorInvite) => {
    try {
      await navigator.clipboard.writeText(getInviteLink(invite.token));
      toast.success("Invite link copied.");
    } catch {
      toast.error("Could not copy the invite link.");
    }
  };

  const handleResend = (invite: CollaboratorInvite) => {
    if (resendInvite(invite.id)) {
      refresh();
      toast.success(`Invite re-sent to ${invite.email}.`);
    }
  };

  const handleRevoke = () => {
    if (!revokeTarget) return;
    if (revokeInvite(revokeTarget.id)) {
      refresh();
      toast.success(`Invitation to ${revokeTarget.email} revoked.`);
    }
  };

  return (
    <div>
      <Breadcrumb items={[{ label: "Collaborators", isActive: true }]} />

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text">Collaborators</h1>
          <p className="text-sm text-text-muted">
            Invite co-artists and managers to work on your music, events and merch.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsInviteOpen(true)}
          disabled={!canManage}
          title={canManage ? undefined : "Only the workspace owner can invite collaborators."}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-contrast transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          <UserPlus size={16} aria-hidden="true" />
          Invite collaborator
        </button>
      </div>

      {!canManage && (
        <p
          role="status"
          className="mt-4 rounded-xl border border-border-subtle bg-surface px-4 py-3 text-sm text-text-muted"
        >
          Your role has read-only access to collaborators. Ask the workspace owner to send invites.
        </p>
      )}

      <div className="mt-6">
        {invites.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No collaborators yet"
            description="Invite a co-artist or manager and they will show up here once they accept."
            ctaLabel={canManage ? "Invite collaborator" : undefined}
            onCta={canManage ? () => setIsInviteOpen(true) : undefined}
          />
        ) : (
          <ul className="space-y-3">
            {invites.map((invite) => (
              <li
                key={invite.id}
                data-status={invite.status}
                className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border-subtle bg-surface p-4"
              >
                <div>
                  <p className="font-semibold text-text">{invite.email}</p>
                  <p className="text-sm text-text-muted">
                    {INVITE_ROLE_LABELS[invite.role]} · invited{" "}
                    {new Date(invite.invitedAt).toLocaleDateString()}
                  </p>
                  {invite.message && (
                    <p className="mt-1 text-sm text-text-muted">&ldquo;{invite.message}&rdquo;</p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${STATUS_STYLES[invite.status]}`}
                  >
                    {invite.status}
                  </span>
                  {invite.status === "pending" && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleCopy(invite)}
                        className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-text-muted hover:text-text"
                      >
                        <Copy size={14} aria-hidden="true" /> Copy link
                      </button>
                      <button
                        type="button"
                        onClick={() => handleResend(invite)}
                        className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-text-muted hover:text-text"
                      >
                        <RotateCw size={14} aria-hidden="true" /> Resend
                      </button>
                      <button
                        type="button"
                        onClick={() => setRevokeTarget(invite)}
                        className="inline-flex items-center gap-1 rounded-full border border-[#7F1D1D] px-3 py-1.5 text-xs font-semibold text-red-400 hover:text-red-300"
                      >
                        <Trash2 size={14} aria-hidden="true" /> Revoke
                      </button>
                    </>
                  )}
                  {invite.status === "accepted" && (
                    <span className="inline-flex items-center gap-1 text-xs text-text-muted">
                      <Link2 size={14} aria-hidden="true" /> Member of your workspace
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <CollaboratorInviteModal
        open={isInviteOpen}
        onOpenChange={setIsInviteOpen}
        onInvited={refresh}
      />

      <ConfirmationDialog
        isOpen={Boolean(revokeTarget)}
        onClose={() => setRevokeTarget(null)}
        onConfirm={handleRevoke}
        title="Revoke invitation?"
        message={`The invite link sent to ${revokeTarget?.email ?? ""} will stop working.`}
        confirmText="Revoke invite"
      />
    </div>
  );
}
