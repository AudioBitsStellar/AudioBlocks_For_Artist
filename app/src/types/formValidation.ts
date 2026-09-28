import { z } from "zod";
import { ROLES } from "@/types/role";
import { MUSIC_GENRES } from "@/components/shared/music_genre";
import {
  NEW_TRACK_DEFAULT_VISIBILITY,
  TRACK_VISIBILITIES,
  type TrackVisibility,
} from "@/services/trackVisibilityService";

/**
 * The three track visibilities (#458), read from the service so the form can
 * never accept a mode the rules module doesn't know how to enforce.
 * The cast is only for zod's non-empty-tuple signature.
 */
const trackVisibilityField = z.enum(TRACK_VISIBILITIES as [TrackVisibility, ...TrackVisibility[]], {
  required_error: "Choose who can see this track",
  invalid_type_error: "Choose who can see this track",
});

/**
 * The upload form's copy additionally defaults, because a draft saved before
 * #458 has no visibility at all and restoring it must not block the upload.
 */
const uploadVisibilityField = trackVisibilityField.default(NEW_TRACK_DEFAULT_VISIBILITY);

export const songFormSchema = z.object({
  visibility: uploadVisibilityField,
  title: z
    .string()
    .min(1, "Song title is required")
    .max(100, "Title must be 100 characters or less"),
  description: z
    .string()
    .min(1, "Description is required")
    .max(500, "Description must be 500 characters or less"),
  genre: z
    .string()
    .min(1, "Please select a genre")
    .refine((val) => MUSIC_GENRES.includes(val), "Invalid genre selection"),
  composer: z
    .string()
    .min(1, "Composer name is required")
    .max(100, "Composer name must be 100 characters or less"),
});

export const albumFormSchema = z.object({
  albumTitle: z
    .string()
    .min(1, "Album title is required")
    .max(100, "Title must be 100 characters or less"),
  genre: z
    .string()
    .min(1, "Please select a genre")
    .refine((val) => MUSIC_GENRES.includes(val), "Invalid genre selection"),
  songTitle: z
    .string()
    .min(1, "Song title is required")
    .max(100, "Title must be 100 characters or less"),
  purchasePrice: z
    .string()
    .optional()
    .refine(
      (val) => !val || val.trim() === "" || (!Number.isNaN(Number(val)) && Number(val) >= 0),
      "Price must be a valid non-negative number"
    ),
});

export const trackEditSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Track title is required")
    .max(100, "Title must be 100 characters or less"),
  albumName: z
    .string()
    .trim()
    .min(1, "Please select an album")
    .max(100, "Album name must be 100 characters or less"),
  visibility: trackVisibilityField,
});

export const profileFormSchema = z.object({
  username: z
    .string()
    .min(1, "Display name is required")
    .max(50, "Display name must be 50 characters or less"),
  bio: z.string().max(500, "Bio must be 500 characters or less").optional(),
  website: z.string().url("Please enter a valid URL").or(z.literal("")).optional(),
  twitter: z.string().max(50, "Twitter username must be 50 characters or less").optional(),
});

/* ------------------------------------------------------------------ *
 * Shared helpers for the schemas below
 * ------------------------------------------------------------------ */

/** Optional leading "$", up to 7 integer digits, up to 2 decimals. */
const PRICE_REGEX = /^\$?\d{1,7}(\.\d{1,2})?$/;
/** 24h `HH:MM` or 12h `H:MM AM/PM`. */
const TIME_REGEX = /^(?:([01]?\d|2[0-3]):[0-5]\d|(?:0?[1-9]|1[0-2]):[0-5]\d\s?(?:AM|PM))$/i;

/**
 * Parses `DD-MM-YYYY` or `YYYY-MM-DD` into a local-midnight `Date`.
 * Returns `null` when the text is malformed or isn't a real calendar date
 * (e.g. `31-02-2030`).
 */
export function parseFormDate(value: string): Date | null {
  const text = value.trim();
  let day: number, month: number, year: number;

  let match = /^(\d{2})-(\d{2})-(\d{4})$/.exec(text);
  if (match) {
    [day, month, year] = [Number(match[1]), Number(match[2]), Number(match[3])];
  } else if ((match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text))) {
    [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  } else {
    return null;
  }

  const date = new Date(year, month - 1, day);
  const isRealDate =
    date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
  return isRealDate ? date : null;
}

const dateField = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .refine((val) => parseFormDate(val) !== null, `${label} must be a valid date (DD-MM-YYYY)`);

const timeField = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .refine((val) => TIME_REGEX.test(val), `${label} must look like 18:30 or 6:30 PM`);

const priceField = z
  .string()
  .trim()
  .min(1, "Price is required")
  .refine((val) => PRICE_REGEX.test(val), "Price must be a valid amount, e.g. 25 or 25.50");

/**
 * Runs `schema` over `values` and returns the first error message per field
 * (empty object when valid). For forms that hold their state in `useState`
 * rather than react-hook-form.
 */
export function getFormErrors<T extends z.ZodTypeAny>(
  schema: T,
  values: unknown
): Record<string, string> {
  const result = schema.safeParse(values);
  if (result.success) return {};

  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!(key in errors)) errors[key] = issue.message;
  }
  return errors;
}

/* ------------------------------------------------------------------ *
 * Login
 * ------------------------------------------------------------------ */

export const loginFormSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .max(254, "Email must be 254 characters or less")
    .email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

/* ------------------------------------------------------------------ *
 * Events
 * ------------------------------------------------------------------ */

export const eventFormSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Event name is required")
      .max(100, "Event name must be 100 characters or less"),
    price: priceField,
    description: z
      .string()
      .trim()
      .min(1, "Event description is required")
      .max(2000, "Description must be 2000 characters or less"),
    time: timeField("Event time"),
    date: dateField("Event date"),
  })
  .superRefine((values, ctx) => {
    const date = parseFormDate(values.date);
    if (!date) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date.getTime() < today.getTime()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["date"],
        message: "Event date cannot be in the past",
      });
    }
  });

/* ------------------------------------------------------------------ *
 * Merch
 * ------------------------------------------------------------------ */

export const merchFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(100, "Title must be 100 characters or less"),
  detail: z.string().max(300, "Detail must be 300 characters or less").optional(),
  price: priceField.refine(
    (val) => Number(val.replace("$", "")) <= 999999.99,
    "Price exceeds maximum allowed value"
  ),
  date: z
    .string()
    .trim()
    .refine(
      (val) => val === "" || parseFormDate(val) !== null,
      "Date must be a valid date (DD-MM-YYYY)"
    )
    .optional(),
  time: z
    .string()
    .trim()
    .refine((val) => val === "" || TIME_REGEX.test(val), "Time must look like 18:30 or 6:30 PM")
    .optional(),
  image: z
    .string()
    .trim()
    .max(500, "Image URL must be 500 characters or less")
    .refine(
      (val) => val === "" || /^https?:\/\/\S+$/i.test(val),
      "Image must be a valid http(s) URL"
    )
    .optional(),
});

/* ------------------------------------------------------------------ *
 * Artist verification application
 * ------------------------------------------------------------------ */

export const verificationFormSchema = z.object({
  legalName: z
    .string()
    .trim()
    .min(1, "Legal name is required")
    .min(2, "Legal name must be at least 2 characters")
    .max(100, "Legal name must be 100 characters or less"),
  proofUrl: z
    .string()
    .trim()
    .min(1, "A link proving your identity is required")
    .max(300, "Link must be 300 characters or less")
    .refine((val) => {
      try {
        const { protocol } = new URL(val);
        return protocol === "http:" || protocol === "https:";
      } catch {
        return false;
      }
    }, "Please enter a valid link starting with http:// or https://"),
  note: z.string().trim().max(500, "Notes must be 500 characters or less").optional(),
});

/* ------------------------------------------------------------------ *
 * Artist name claim
 * ------------------------------------------------------------------ */

export const artistNameSchema = z
  .string()
  .trim()
  .min(2, "Artist name must be at least 2 characters")
  .max(100, "Artist name must be 100 characters or less")
  .regex(
    /^[\p{L}\p{N} ._'&-]+$/u,
    "Artist name can only contain letters, numbers, spaces and . _ ' & -"
  );

/* ------------------------------------------------------------------ *
 * Collaborator / co-artist invite (issue #416)
 * ------------------------------------------------------------------ */

export const collaboratorInviteSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email address is required")
    .max(254, "Email must be 254 characters or less")
    .email("Please enter a valid email address"),
  role: z
    .string()
    .trim()
    .min(1, "Choose a role for this collaborator")
    .refine((val) => (ROLES as ReadonlyArray<string>).includes(val), "Invalid role selection"),
  message: z.string().trim().max(300, "Message must be 300 characters or less").optional(),
});

