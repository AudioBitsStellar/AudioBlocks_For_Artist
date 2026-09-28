"use client";

import { useState } from "react";
import { toast } from "sonner";
import Modal from "@/components/shared/Modal";
import { createInvite, type CollaboratorInvite } from "@/services/collaboratorService";
import { getFormErrors, collaboratorInviteSchema } from "@/types/formValidation";
import { ROLES, ROLE_INFO, type Role } from "@/types/role";

interface CollaboratorInviteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInvited: (invite: CollaboratorInvite) => void;
}

const DEFAULT_FORM = { email: "", role: "manager" as Role, message: "" };

export default function CollaboratorInviteModal({
  open,
  onOpenChange,
  onInvited,
}: CollaboratorInviteModalProps) {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleClose = () => {
    onOpenChange(false);
    setForm(DEFAULT_FORM);
    setErrors({});
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const newErrors = getFormErrors(collaboratorInviteSchema, form);
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const result = createInvite({
      email: form.email,
      role: form.role,
      message: form.message || undefined,
    });

    if (!result.ok) {
      setErrors({ email: result.error });
      return;
    }

    toast.success(`Invitation sent to ${result.invite.email}`);
    onInvited(result.invite);
    handleClose();
  };

  return (
    <Modal
      open={open}
      onOpenChange={(next) => (!next ? handleClose() : onOpenChange(next))}
      subtitle="Collaborators"
      title="Invite a co-artist"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-white" noValidate>
        <p className="text-sm text-[#A3A3A3]">
          Invite a co-artist or manager to your workspace. They get access as soon as they accept
          the invite link.
        </p>

        <div>
          <label htmlFor="invite-email" className="text-sm font-medium">
            Email address <span className="text-[#D2045B]">*</span>
          </label>
          <input
            id="invite-email"
            type="email"
            value={form.email}
            onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
            placeholder="coartist@example.com"
            aria-invalid={errors.email ? "true" : "false"}
            aria-describedby={errors.email ? "invite-email-error" : undefined}
            className="mt-2 w-full rounded-lg border border-[#2E2E2E] bg-[#1E1E1E] px-4 py-3 text-white placeholder-[#A3A3A3] focus:outline-none focus:border-[#D2045B]"
          />
          {errors.email && (
            <p id="invite-email-error" role="alert" className="mt-1 text-xs text-red-500">
              {errors.email}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="invite-role" className="text-sm font-medium">
            Role <span className="text-[#D2045B]">*</span>
          </label>
          <select
            id="invite-role"
            value={form.role}
            onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value as Role }))}
            aria-invalid={errors.role ? "true" : "false"}
            className="mt-2 w-full rounded-lg border border-[#2E2E2E] bg-[#1E1E1E] px-4 py-3 text-white focus:outline-none focus:border-[#D2045B]"
          >
            {ROLES.filter((role) => role !== "owner").map((role) => (
              <option key={role} value={role}>
                {ROLE_INFO[role].label} — {ROLE_INFO[role].description}
              </option>
            ))}
          </select>
          {errors.role && (
            <p role="alert" className="mt-1 text-xs text-red-500">
              {errors.role}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="invite-message" className="text-sm font-medium">
            Message <span className="text-[#A3A3A3]">(optional)</span>
          </label>
          <textarea
            id="invite-message"
            rows={3}
            maxLength={300}
            value={form.message}
            onChange={(e) => setForm((prev) => ({ ...prev, message: e.target.value }))}
            placeholder="Hey, want to join my workspace?"
            aria-invalid={errors.message ? "true" : "false"}
            className="mt-2 w-full resize-none rounded-lg border border-[#2E2E2E] bg-[#1E1E1E] px-4 py-3 text-white placeholder-[#A3A3A3] focus:outline-none focus:border-[#D2045B]"
          />
          {errors.message && (
            <p role="alert" className="mt-1 text-xs text-red-500">
              {errors.message}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={handleClose}
            className="rounded-full border border-[#2A2A2A] px-5 py-2 text-sm font-semibold text-[#A3A3A3] hover:text-white"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-full bg-[#D2045B] px-5 py-2 text-sm font-semibold text-white hover:bg-[#B8043F]"
          >
            Send invite
          </button>
        </div>
      </form>
    </Modal>
  );
}

export { CollaboratorInviteModal };
