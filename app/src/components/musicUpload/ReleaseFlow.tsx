"use client";

import { useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import { ArrowDown, ArrowUp, Check, Plus, Trash2 } from "lucide-react";
import { MUSIC_GENRES } from "../shared/music_genre";
import { useToast } from "@/hooks/useToastHandler";
import useAlbumServices from "@/services/albumService";
import {
  AUDIO_FILE_RULES,
  COVER_IMAGE_RULES,
  toAcceptAttribute,
  validateFile,
} from "@/utils/fileValidation";
import {
  RELEASE_TYPE_LABELS,
  TRACK_LIMITS,
  addTrack,
  buildReleaseFormData,
  emptyDraft,
  moveTrack,
  removeTrack,
  updateTrack,
  validateDetails,
  validateTracks,
  type ReleaseDraft,
  type ReleaseType,
} from "@/utils/releaseDraft";

const STEPS = ["Details", "Tracks", "Review"] as const;

const inputBase =
  "w-full rounded-lg border bg-[#161616] px-4 py-3 text-white placeholder:text-[#6F6F6F] focus:border-[#885FA8] focus:outline-none";
const primaryBtn =
  "rounded-lg bg-[#D2045B] px-6 py-3 font-semibold text-white transition-colors hover:bg-[#B8043F] disabled:cursor-not-allowed disabled:bg-[#8a8a8a] disabled:opacity-70";
const secondaryBtn =
  "rounded-lg border border-[#2A2A2A] px-6 py-3 font-semibold text-white transition-colors hover:bg-white/5 disabled:opacity-50";

/**
 * Album / EP creation flow (#398): Details -> Tracks -> Review & publish.
 */
const ReleaseFlow = () => {
  const toast = useToast();
  const { useCreateAlbum } = useAlbumServices();
  const createRelease = useCreateAlbum();
  const ids = { title: useId(), genre: useId(), price: useId(), date: useId() };

  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<ReleaseDraft>(() => emptyDraft("album"));
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const nextId = useRef(1);
  const coverInput = useRef<HTMLInputElement>(null);
  const trackInput = useRef<HTMLInputElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  const label = RELEASE_TYPE_LABELS[draft.type];
  const limits = TRACK_LIMITS[draft.type];
  const detailErrors = validateDetails(draft);
  const trackValidation = validateTracks(draft);
  const detailsOk = Object.keys(detailErrors).length === 0;
  const tracksOk = !trackValidation.list && Object.keys(trackValidation.tracks).length === 0;
  const isBusy = createRelease.isPending;

  const patch = (p: Partial<ReleaseDraft>) => setDraft((d) => ({ ...d, ...p }));

  const handleCover = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const { valid, error } = validateFile(file, COVER_IMAGE_RULES);
    if (!valid) {
      setFileError(error);
      return;
    }
    setFileError(null);
    patch({ cover: file });
    const reader = new FileReader();
    reader.onloadend = () => setCoverPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleAddTracks = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    let tracks = draft.tracks;
    for (const file of files) {
      if (tracks.length >= limits.max) {
        setFileError(`An ${label} can have at most ${limits.max} tracks`);
        break;
      }
      const { valid, error } = validateFile(file, AUDIO_FILE_RULES);
      if (!valid) {
        setFileError(error);
        continue;
      }
      setFileError(null);
      tracks = addTrack(tracks, nextId.current++, file);
    }
    patch({ tracks });
  };

  const goNext = () => {
    const ok = step === 0 ? detailsOk : tracksOk;
    if (!ok) {
      setShowErrors(true);
      return;
    }
    setShowErrors(false);
    setStep((s) => s + 1);
  };

  const handlePublish = async () => {
    try {
      await createRelease.mutateAsync(buildReleaseFormData(draft));
      toast.success(`${label} created`);
      setDraft(emptyDraft(draft.type));
      setCoverPreview(null);
      setStep(0);
    } catch {
      // error toast is raised by the mutation's onError
    }
  };

  const err = (msg?: string, id?: string) =>
    showErrors && msg ? (
      <p id={id} className="text-[10px] text-red-500" role="alert">
        {msg}
      </p>
    ) : null;

  return (
    <div className="space-y-6">
      {/* Stepper */}
      <ol className="flex items-center gap-2 text-sm" aria-label="Release creation progress">
        {STEPS.map((name, i) => (
          <li key={name} className="flex items-center gap-2">
            <span
              aria-current={i === step ? "step" : undefined}
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                i < step
                  ? "bg-[#D2045B] text-white"
                  : i === step
                    ? "border-2 border-[#D2045B] text-white"
                    : "border border-[#2A2A2A] text-[#6F6F6F]"
              }`}
            >
              {i < step ? <Check size={14} aria-hidden="true" /> : i + 1}
            </span>
            <span className={i === step ? "text-white" : "text-[#A3A3A3]"}>{name}</span>
            {i < STEPS.length - 1 && (
              <span className="mx-1 h-px w-6 bg-[#2A2A2A]" aria-hidden="true" />
            )}
          </li>
        ))}
      </ol>

      <h2 ref={headingRef} tabIndex={-1} className="text-xl font-bold text-white outline-none">
        {step === 0 && `${label} details`}
        {step === 1 && `Tracks (${draft.tracks.length}/${limits.min}–${limits.max})`}
        {step === 2 && `Review your ${label}`}
      </h2>

      {step === 0 && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="space-y-5 md:col-span-2">
            <fieldset>
              <legend className="mb-2 text-sm font-medium text-white">Release type</legend>
              <div className="flex gap-3" role="radiogroup">
                {(["album", "ep"] as ReleaseType[]).map((t) => (
                  <label
                    key={t}
                    className={`cursor-pointer rounded-lg border px-5 py-2 text-sm font-semibold ${
                      draft.type === t
                        ? "border-[#D2045B] bg-[#D2045B]/10 text-white"
                        : "border-[#2A2A2A] text-[#A3A3A3]"
                    }`}
                  >
                    <input
                      type="radio"
                      name="release-type"
                      value={t}
                      checked={draft.type === t}
                      onChange={() => patch({ type: t })}
                      className="sr-only"
                    />
                    {RELEASE_TYPE_LABELS[t]}{" "}
                    <span className="font-normal text-[#6F6F6F]">
                      ({TRACK_LIMITS[t].min}–{TRACK_LIMITS[t].max} tracks)
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="space-y-2">
              <label htmlFor={ids.title} className="text-sm font-medium text-white">
                {label} title <span className="text-[#D2045B]">*</span>
              </label>
              <input
                id={ids.title}
                value={draft.title}
                maxLength={100}
                onChange={(e) => patch({ title: e.target.value })}
                aria-invalid={showErrors && !!detailErrors.title}
                className={`${inputBase} ${showErrors && detailErrors.title ? "border-red-500" : "border-[#2A2A2A]"}`}
                placeholder={`Enter ${label} title`}
              />
              {err(detailErrors.title)}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor={ids.genre} className="text-sm font-medium text-white">
                  Genre <span className="text-[#D2045B]">*</span>
                </label>
                <select
                  id={ids.genre}
                  value={draft.genre}
                  onChange={(e) => patch({ genre: e.target.value })}
                  aria-invalid={showErrors && !!detailErrors.genre}
                  className={`${inputBase} ${showErrors && detailErrors.genre ? "border-red-500" : "border-[#2A2A2A]"}`}
                >
                  <option value="">Select genre</option>
                  {MUSIC_GENRES.map((g) => (
                    <option key={g} value={g} className="bg-[#161616]">
                      {g}
                    </option>
                  ))}
                </select>
                {err(detailErrors.genre)}
              </div>

              <div className="space-y-2">
                <label htmlFor={ids.price} className="text-sm font-medium text-white">
                  Purchase price
                </label>
                <input
                  id={ids.price}
                  inputMode="decimal"
                  value={draft.purchasePrice}
                  onChange={(e) => patch({ purchasePrice: e.target.value })}
                  aria-invalid={showErrors && !!detailErrors.purchasePrice}
                  className={`${inputBase} border-[#2A2A2A]`}
                  placeholder="0.00"
                />
                {err(detailErrors.purchasePrice)}
              </div>

              <div className="space-y-2">
                <label htmlFor={ids.date} className="text-sm font-medium text-white">
                  Release date (optional)
                </label>
                <input
                  id={ids.date}
                  type="date"
                  value={draft.releaseDate}
                  onChange={(e) => patch({ releaseDate: e.target.value })}
                  aria-invalid={showErrors && !!detailErrors.releaseDate}
                  className={`${inputBase} border-[#2A2A2A]`}
                />
                {err(detailErrors.releaseDate)}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-[#2A2A2A] bg-[#161616] p-6">
            <div className="relative mb-4 aspect-square w-full overflow-hidden rounded-lg bg-gradient-to-br from-teal-500 via-purple-500 to-pink-500">
              {coverPreview && (
                <Image
                  src={coverPreview}
                  alt={`${label} cover`}
                  fill
                  className="object-cover"
                  unoptimized
                />
              )}
            </div>
            <h3 className="mb-2 font-semibold text-white">
              {label} cover <span className="text-[#D2045B]">*</span>
            </h3>
            <input
              ref={coverInput}
              type="file"
              accept={toAcceptAttribute(COVER_IMAGE_RULES)}
              onChange={handleCover}
              className="hidden"
              aria-label="Upload cover image"
            />
            <button
              type="button"
              onClick={() => coverInput.current?.click()}
              className={`${secondaryBtn} w-full`}
            >
              {draft.cover ? "Change cover" : "Add cover"}
            </button>
            {err(detailErrors.cover)}
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <input
            ref={trackInput}
            type="file"
            multiple
            accept={toAcceptAttribute(AUDIO_FILE_RULES)}
            onChange={handleAddTracks}
            className="hidden"
            aria-label="Upload track audio files"
          />
          {draft.tracks.length === 0 ? (
            <p className="text-sm text-[#A3A3A3]">
              Add {limits.min}–{limits.max} tracks. You can rename and reorder them before
              publishing.
            </p>
          ) : (
            <ol className="space-y-2" aria-label="Track list">
              {draft.tracks.map((t, i) => {
                const trackError = trackValidation.tracks[t.id];
                return (
                  <li
                    key={t.id}
                    className="flex flex-wrap items-center gap-3 rounded-lg bg-[#1a1a1a] p-3"
                  >
                    <span className="w-6 text-right text-sm text-[#A3A3A3]">{i + 1}</span>
                    <div className="min-w-0 flex-1 space-y-1">
                      <input
                        aria-label={`Track ${i + 1} title`}
                        value={t.title}
                        maxLength={100}
                        onChange={(e) =>
                          patch({
                            tracks: updateTrack(draft.tracks, t.id, { title: e.target.value }),
                          })
                        }
                        aria-invalid={showErrors && !!trackError}
                        className={`${inputBase} py-2 text-sm ${showErrors && trackError ? "border-red-500" : "border-[#2A2A2A]"}`}
                      />
                      <p className="truncate text-[10px] text-[#6F6F6F]">{t.file?.name}</p>
                      {err(trackError)}
                    </div>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => patch({ tracks: moveTrack(draft.tracks, t.id, -1) })}
                        disabled={i === 0}
                        aria-label={`Move track ${i + 1} up`}
                        className="rounded p-2 text-[#A3A3A3] hover:text-white disabled:opacity-30"
                      >
                        <ArrowUp size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => patch({ tracks: moveTrack(draft.tracks, t.id, 1) })}
                        disabled={i === draft.tracks.length - 1}
                        aria-label={`Move track ${i + 1} down`}
                        className="rounded p-2 text-[#A3A3A3] hover:text-white disabled:opacity-30"
                      >
                        <ArrowDown size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => patch({ tracks: removeTrack(draft.tracks, t.id) })}
                        aria-label={`Remove track ${i + 1}`}
                        className="rounded p-2 text-[#A3A3A3] hover:text-white"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
          <button
            type="button"
            onClick={() => trackInput.current?.click()}
            disabled={draft.tracks.length >= limits.max}
            className={`${secondaryBtn} inline-flex items-center gap-2`}
          >
            <Plus size={16} aria-hidden="true" /> Add tracks
          </button>
          {showErrors && trackValidation.list && (
            <p className="text-xs text-red-500" role="alert">
              {trackValidation.list}
            </p>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-[#161616]">
            {coverPreview && (
              <Image
                src={coverPreview}
                alt={`${label} cover`}
                fill
                className="object-cover"
                unoptimized
              />
            )}
          </div>
          <div className="space-y-3 md:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#D2045B]">{label}</p>
            <p className="text-2xl font-bold text-white" data-testid="review-title">
              {draft.title}
            </p>
            <p className="text-sm text-[#A3A3A3]">
              {draft.genre} · {draft.tracks.length} tracks
              {draft.purchasePrice ? ` · ${draft.purchasePrice}` : ""}
              {draft.releaseDate ? ` · Releases ${draft.releaseDate}` : ""}
            </p>
            <ol className="space-y-1 text-sm text-white" aria-label="Final track order">
              {draft.tracks.map((t, i) => (
                <li key={t.id}>
                  {i + 1}. {t.title}
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}

      {fileError && (
        <p className="text-xs text-red-500" role="alert">
          {fileError}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        {step > 0 && (
          <button
            type="button"
            onClick={() => setStep((s) => s - 1)}
            disabled={isBusy}
            className={secondaryBtn}
          >
            Back
          </button>
        )}
        {step < 2 ? (
          <button type="button" onClick={goNext} className={primaryBtn}>
            Next
          </button>
        ) : (
          <button type="button" onClick={handlePublish} disabled={isBusy} className={primaryBtn}>
            {isBusy ? "Publishing..." : `Publish ${label}`}
          </button>
        )}
      </div>
    </div>
  );
};

export default ReleaseFlow;
