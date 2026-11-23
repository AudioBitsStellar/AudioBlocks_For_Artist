"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X, Search, Check } from "lucide-react";
import { useState, useEffect, useRef, memo } from "react";
import { useRouter } from "next/navigation";
import { artistNameSchema } from "@/types/formValidation";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { fetchArtistHandleProfile, normalizeArtistHandle } from "@/lib/claimArtistHandle";
import useArtistServices from "@/services/artistServices";

interface ClaimArtistNameModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Availability = { handle: string; status: "available" | "taken" | "error" };

function ClaimArtistNameFlow({ onOpenChange }: Pick<ClaimArtistNameModalProps, "onOpenChange">) {
  const [step, setStep] = useState<"search" | "confirm" | "complete">("search");
  const [artistName, setArtistName] = useState("");
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const submitting = useRef(false);
  const mounted = useRef(false);
  const title = useRef<HTMLHeadingElement>(null);
  const router = useRouter();
  const { useUpdateArtistProfile, useGetArtistProfile } = useArtistServices();
  const profile = useGetArtistProfile(true);
  const artistId = profile.data?.user.id;
  const profilePath =
    artistId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(artistId)
      ? `/artist/${encodeURIComponent(artistId)}`
      : null;
  const updateProfile = useUpdateArtistProfile();
  const handle = normalizeArtistHandle(artistName);
  const debouncedHandle = useDebouncedValue(handle, 500);
  const validation = artistNameSchema.safeParse(handle);
  const nameError =
    artistName.length > 0 && !validation.success ? validation.error.issues[0].message : null;
  const status = validation.success
    ? availability?.handle === handle
      ? availability.status
      : "checking"
    : "idle";

  useEffect(() => {
    title.current?.focus();
  }, [step]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (
      saveError ||
      step !== "search" ||
      handle !== debouncedHandle ||
      !artistNameSchema.safeParse(handle).success
    )
      return;
    const controller = new AbortController();
    let current = true;
    void fetchArtistHandleProfile(handle, controller.signal)
      .then((result) => {
        if (!current) return;
        setAvailability({
          handle,
          status:
            result.status === "not-found"
              ? "available"
              : result.status === "ok"
                ? "taken"
                : "error",
        });
      })
      .catch(() => {
        if (current) setAvailability({ handle, status: "error" });
      });
    return () => {
      current = false;
      controller.abort();
    };
  }, [handle, debouncedHandle, attempt, step, saveError]);

  const complete = async () => {
    if (submitting.current || status !== "available" || step !== "confirm") return;
    submitting.current = true;
    setSaving(true);
    setSaveError(null);
    try {
      // PATCH only the chosen handle; do not erase the artist's other profile fields.
      await updateProfile.mutateAsync({ username: handle });
      if (mounted.current) setStep("complete");
    } catch (error) {
      if (!mounted.current) return;
      const httpStatus =
        error && typeof error === "object" && "status" in error ? error.status : undefined;
      if (httpStatus === 409) {
        setAvailability({ handle, status: "taken" });
        setSaveError("Someone claimed this handle before you finished. Please choose another.");
        setStep("search");
      } else {
        setSaveError(
          httpStatus === 401
            ? "Sign in to save your artist handle."
            : "Your handle could not be saved. Please try again."
        );
      }
    } finally {
      submitting.current = false;
      if (mounted.current) setSaving(false);
    }
  };

  const buttonClass =
    "flex-1 px-6 py-3 rounded-lg bg-[#D2045B] text-white hover:bg-[#B8043F] transition disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <Dialog.Root open onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay
          className="fixed inset-0 bg-black/70 backdrop-blur-sm"
          style={{ zIndex: 99999 }}
        />
        <Dialog.Content
          className="fixed top-1/2 left-1/2 w-[90%] max-w-lg max-h-[90vh] overflow-y-auto -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-[#0F0F0F] border border-[#2E2E2E] p-8 shadow-xl focus:outline-none text-white"
          style={{ zIndex: 100000 }}
        >
          <div className="flex justify-between items-start mb-6">
            <div>
              <Dialog.Title
                ref={title}
                tabIndex={-1}
                className="text-2xl font-semibold text-white mb-2"
              >
                {step === "search"
                  ? "Search Artist Name"
                  : step === "confirm"
                    ? "Claim Your Artist Name"
                    : "Artist handle saved"}
              </Dialog.Title>
              {step !== "complete" && (
                <span className="text-sm text-[#A3A3A3]">{step === "search" ? "1/2" : "2/2"}</span>
              )}
            </div>
            <Dialog.Close asChild>
              <button
                aria-label="Close dialog"
                className="flex items-center justify-center min-w-11 min-h-11 hover:text-gray-400 transition"
              >
                <X className="w-6 h-6" />
              </button>
            </Dialog.Close>
          </div>
          <Dialog.Description className="text-sm text-[#A3A3A3] mb-6">
            {step === "complete"
              ? "Your artist handle has been saved to your profile."
              : "Choose the handle fans will use to find your public artist profile."}
          </Dialog.Description>

          {step === "search" && (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                if (status === "available") setStep("confirm");
              }}
            >
              <div className="mb-6">
                <label htmlFor="artist-handle" className="block text-sm mb-2">
                  Artist handle
                </label>
                <div className="relative">
                  <Search
                    aria-hidden="true"
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#A3A3A3]"
                  />
                  <input
                    id="artist-handle"
                    type="text"
                    value={artistName}
                    onChange={(event) => {
                      setArtistName(event.target.value);
                      if (normalizeArtistHandle(event.target.value) !== handle) {
                        setAvailability(null);
                        setSaveError(null);
                      }
                    }}
                    placeholder="Your artist handle"
                    maxLength={101}
                    autoCapitalize="none"
                    spellCheck={false}
                    aria-invalid={Boolean(nameError) || status === "taken"}
                    aria-describedby="artist-name-status"
                    className="w-full pl-12 pr-4 py-3 rounded-lg bg-[#1E1E1E] border border-[#2E2E2E] text-white placeholder-[#A3A3A3] focus:outline-none focus:border-[#D2045B]"
                  />
                </div>
                <p
                  id="artist-name-status"
                  role="status"
                  aria-live="polite"
                  aria-atomic="true"
                  className="text-sm text-[#C9C9C9] mt-2 min-h-5"
                >
                  {nameError ??
                    (status === "checking"
                      ? "Checking availability..."
                      : status === "available"
                        ? "Username available"
                        : status === "taken"
                          ? "Username taken"
                          : status === "error"
                            ? "Could not check availability. Please try again."
                            : "")}
                </p>
                {status === "error" && (
                  <button
                    type="button"
                    className="text-sm underline mt-2"
                    onClick={() => {
                      setAvailability(null);
                      setAttempt((value) => value + 1);
                    }}
                  >
                    Retry availability check
                  </button>
                )}
                {saveError && (
                  <p role="status" aria-live="polite" className="text-sm text-red-400 mt-2">
                    {saveError}
                  </p>
                )}
              </div>
              <div className="flex gap-4">
                <Dialog.Close asChild>
                  <button
                    type="button"
                    className="flex-1 px-6 py-3 rounded-lg border border-[#2E2E2E]"
                  >
                    Cancel
                  </button>
                </Dialog.Close>
                <button type="submit" disabled={status !== "available"} className={buttonClass}>
                  Next
                </button>
              </div>
            </form>
          )}

          {step === "confirm" && (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void complete();
              }}
            >
              <p className="mb-6 break-all text-[#C9C9C9]">Your artist handle: @{handle}</p>
              <p
                role="status"
                aria-live="polite"
                aria-atomic="true"
                className="text-sm text-[#C9C9C9] mb-4"
              >
                {saving ? "Saving your artist handle..." : saveError}
              </p>
              <div className="flex gap-4">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => {
                    setAvailability(null);
                    setSaveError(null);
                    setStep("search");
                  }}
                  className="flex-1 px-6 py-3 rounded-lg border border-[#2E2E2E] disabled:opacity-50"
                >
                  Back
                </button>
                <button type="submit" disabled={saving} className={buttonClass}>
                  {saving ? "Saving..." : "Complete"}
                </button>
              </div>
            </form>
          )}

          {step === "complete" && (
            <div className="text-center">
              <Check aria-hidden="true" className="w-12 h-12 text-green-400 mx-auto mb-6" />
              <p role="status" aria-live="polite" className="text-sm text-[#C9C9C9] mb-6">
                @{handle} is now saved.
              </p>
              <button
                className={buttonClass}
                onClick={() => {
                  onOpenChange(false);
                  if (profilePath) router.push(profilePath);
                }}
              >
                {profilePath ? "View public profile" : "Done"}
              </button>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// Unmount each closed session so pending checks and previous form state cannot leak on reopen.
const ClaimArtistNameModal = memo(({ open, onOpenChange }: ClaimArtistNameModalProps) =>
  open ? <ClaimArtistNameFlow onOpenChange={onOpenChange} /> : null
);
ClaimArtistNameModal.displayName = "ClaimArtistNameModal";
export default ClaimArtistNameModal;
