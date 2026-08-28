"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X, BadgeCheck } from "lucide-react";
import { useState } from "react";
import { submitVerificationApplication } from "@/services/verificationService";

interface VerificationApplicationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmitted: () => void;
}

const DEFAULT_FORM = {
  legalName: "",
  proofUrl: "",
  note: "",
};

export default function VerificationApplicationModal({
  open,
  onOpenChange,
  onSubmitted,
}: VerificationApplicationModalProps) {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleFieldChange =
    (field: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
    };

  const handleClose = () => {
    onOpenChange(false);
    setForm(DEFAULT_FORM);
    setErrors({});
  };

  const handleSubmit = () => {
    const newErrors: Record<string, string> = {};
    if (!form.legalName.trim()) {
      newErrors.legalName = "Legal name is required";
    }
    if (!form.proofUrl.trim()) {
      newErrors.proofUrl = "A link proving your identity is required";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    submitVerificationApplication({
      legalName: form.legalName.trim(),
      proofUrl: form.proofUrl.trim(),
      note: form.note.trim() || undefined,
    });
    onSubmitted();
    handleClose();
  };

  if (!open) {
    return null;
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange} modal={true}>
      <Dialog.Portal>
        <Dialog.Overlay
          className="fixed inset-0 bg-black/70 backdrop-blur-sm"
          style={{ zIndex: 99999 }}
        />
        <Dialog.Content
          className="fixed top-1/2 left-1/2 w-[90%] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-[#0F0F0F] border border-[#2E2E2E] p-8 shadow-xl focus:outline-none text-white"
          style={{ zIndex: 100000 }}
          onEscapeKeyDown={handleClose}
          onPointerDownOutside={handleClose}
        >
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#1D4ED8]/20 border border-[#3B82F6]/40 flex items-center justify-center">
                <BadgeCheck className="w-5 h-5 text-[#60A5FA]" />
              </div>
              <Dialog.Title className="text-2xl font-semibold text-white">
                Apply for Verification
              </Dialog.Title>
            </div>
            <Dialog.Close asChild>
              <button
                onClick={handleClose}
                aria-label="Close dialog"
                className="flex items-center justify-center min-w-11 min-h-11 hover:text-gray-400 transition"
              >
                <X className="w-6 h-6" />
              </button>
            </Dialog.Close>
          </div>

          <p className="text-sm text-[#A3A3A3] mb-6">
            Verified artists get a badge on their profile so fans know it&apos;s really you.
            Submit your legal name and a link that proves your identity (official website,
            verified social profile, distributor account, etc).
          </p>

          <div className="space-y-4 mb-6">
            <div>
              <label htmlFor="verification-legal-name" className="text-sm font-medium text-white">
                Legal name <span className="text-[#D2045B]">*</span>
              </label>
              <input
                id="verification-legal-name"
                value={form.legalName}
                onChange={handleFieldChange("legalName")}
                placeholder="Your full legal name"
                maxLength={100}
                className="mt-2 w-full px-4 py-3 rounded-lg bg-[#1E1E1E] border border-[#2E2E2E] text-white placeholder-[#A3A3A3] focus:outline-none focus:border-[#D2045B]"
              />
              {errors.legalName && (
                <p className="text-red-500 text-xs mt-1">{errors.legalName}</p>
              )}
            </div>

            <div>
              <label htmlFor="verification-proof-url" className="text-sm font-medium text-white">
                Proof of identity link <span className="text-[#D2045B]">*</span>
              </label>
              <input
                id="verification-proof-url"
                value={form.proofUrl}
                onChange={handleFieldChange("proofUrl")}
                placeholder="https://..."
                maxLength={300}
                className="mt-2 w-full px-4 py-3 rounded-lg bg-[#1E1E1E] border border-[#2E2E2E] text-white placeholder-[#A3A3A3] focus:outline-none focus:border-[#D2045B]"
              />
              {errors.proofUrl && <p className="text-red-500 text-xs mt-1">{errors.proofUrl}</p>}
            </div>

            <div>
              <label htmlFor="verification-note" className="text-sm font-medium text-white">
                Additional notes
              </label>
              <textarea
                id="verification-note"
                value={form.note}
                onChange={handleFieldChange("note")}
                placeholder="Anything else that helps us verify you"
                maxLength={500}
                rows={3}
                className="mt-2 w-full px-4 py-3 rounded-lg bg-[#1E1E1E] border border-[#2E2E2E] text-white placeholder-[#A3A3A3] focus:outline-none focus:border-[#D2045B] resize-none"
              />
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={handleClose}
              className="flex-1 px-6 py-3 rounded-lg bg-transparent border border-[#2E2E2E] text-white hover:bg-[#1E1E1E] transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="flex-1 px-6 py-3 rounded-lg bg-[#D2045B] text-white hover:bg-[#B8043F] transition"
            >
              Submit Application
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export { VerificationApplicationModal };
