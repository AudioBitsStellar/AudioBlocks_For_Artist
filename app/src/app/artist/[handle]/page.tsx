import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Disc3, Globe, LucideIcon, Music, Radio, UserRound, Users } from "lucide-react";
import {
  displayNameFromHandle,
  fetchPublicArtistProfile,
  type PublicArtistProfile,
} from "@/lib/publicArtistProfile";
import { generateArtistMetadata, generateArtistStructuredData } from "@/utils/metadata";
import { formatDate } from "@/utils/date";
import { VerifiedBadge } from "@/components/common/VerifiedBadge";
import ErrorBoundary from "@/components/ErrorBoundary";

interface ArtistProfilePageProps {
  params: { handle: string };
}

const profilePath = (handle: string) => `/artist/${encodeURIComponent(handle)}`;

/**
 * App Router params are already decoded, so this is a no-op for real routes —
 * but a handle containing a stray `%` would make `decodeURIComponent` throw, and
 * a 500 from a URL is never the right answer.
 */
const safeDecode = (value: string) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

/**
 * Artist names, bios and socials are artist-authored, so the JSON-LD string is
 * escaped before it is inlined: a literal `</script>` inside a bio would
 * otherwise close the tag early and turn the block into executable markup.
 * `\u003c` is a valid JSON escape, so crawlers still read `<`.
 */
const jsonLdScript = (data: unknown) =>
  JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");

/**
 * Per-artist SEO metadata (issue #421).
 *
 * Rendered on the server from the public profile so crawlers and social
 * scrapers get the real name/bio/avatar. When the profile can't be fetched we
 * still emit a usable title from the handle but mark the page `noindex` so a
 * backend outage can't push thin pages into search results.
 */
export async function generateMetadata({ params }: ArtistProfilePageProps): Promise<Metadata> {
  const handle = safeDecode(params.handle);
  const result = await fetchPublicArtistProfile(handle);
  const profile = result.status === "ok" ? result.profile : undefined;

  return generateArtistMetadata({
    name: profile?.name ?? displayNameFromHandle(handle),
    handle: profile?.handle ?? handle,
    bio: profile?.bio,
    profileImage: profile?.profileImage,
    website: profile?.website,
    twitter: profile?.twitter,
    genres: profile?.genres,
    songCount: profile?.songCount,
    albumCount: profile?.albumCount,
    url: profilePath(handle),
    indexable: result.status === "ok",
  });
}

const STATS: { key: keyof PublicArtistProfile; label: string; icon: typeof Music }[] = [
  { key: "songCount", label: "Songs", icon: Music },
  { key: "albumCount", label: "Albums", icon: Disc3 },
  { key: "listenersCount", label: "Listeners", icon: Users },
  { key: "followersCount", label: "Followers", icon: UserRound },
];

/**
 * Placeholder for a part of the profile that is genuinely empty (issue #425).
 *
 * Only a reported `0` renders one: when the profile could not be fetched the
 * counts are simply absent, and claiming an artist has no tracks because their
 * API call failed would be a lie.
 */
function ProfileEmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-[#1F1F1F] bg-[#111111] px-6 py-8 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#1E1E1E] text-[#A3A3A3]">
        <Icon size={22} aria-hidden="true" />
      </div>
      <div>
        <p className="font-semibold text-white">{title}</p>
        <p className="mt-1 max-w-sm text-sm text-[#A3A3A3]">{description}</p>
      </div>
    </div>
  );
}

function ProfileHeader({ profile }: { profile: PublicArtistProfile }) {
  return (
    <header className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-start sm:text-left">
      <div className="h-28 w-28 shrink-0 overflow-hidden rounded-full border-2 border-[#2A2A2A] bg-[#1E1E1E] sm:h-32 sm:w-32">
        {profile.profileImage ? (
          // Artist avatars come from arbitrary user-supplied hosts, which
          // next/image would reject at runtime (remotePatterns allowlist).
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.profileImage}
            alt={`${profile.name} profile picture`}
            width={128}
            height={128}
            loading="eager"
            decoding="async"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-4xl font-bold text-[#6F6F6F]">
            {profile.name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      <div className="min-w-0">
        <h1 className="flex flex-wrap items-center justify-center gap-2 text-3xl font-bold text-white sm:justify-start">
          {profile.name}
          {profile.status === "verified" && <VerifiedBadge />}
        </h1>
        <p className="mt-1 text-[#A3A3A3]">@{profile.handle}</p>
        {profile.bio && <p className="mt-3 max-w-2xl text-sm text-[#C9C9C9]">{profile.bio}</p>}

        <div className="mt-4 flex flex-wrap items-center justify-center gap-3 sm:justify-start">
          {profile.website && (
            <a
              href={profile.website.startsWith("http") ? profile.website : `https://${profile.website}`}
              rel="noopener noreferrer nofollow"
              target="_blank"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#2A2A2A] px-3 py-1.5 text-sm text-white transition-colors hover:bg-white/5"
            >
              <Globe size={14} aria-hidden="true" />
              Website
            </a>
          )}
          {profile.twitter && (
            <a
              href={`https://x.com/${profile.twitter.replace(/^@/, "")}`}
              rel="noopener noreferrer nofollow"
              target="_blank"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#2A2A2A] px-3 py-1.5 text-sm text-white transition-colors hover:bg-white/5"
            >
              <Radio size={14} aria-hidden="true" />
              X (Twitter)
            </a>
          )}
        </div>
      </div>
    </header>
  );
}

export default async function ArtistProfilePage({ params }: ArtistProfilePageProps) {
  const handle = safeDecode(params.handle);
  const result = await fetchPublicArtistProfile(handle);

  // Only a definitive 404 from the API means the artist does not exist; an
  // unreachable API still renders a (noindex) shell rather than a 404.
  if (result.status === "not-found") notFound();

  const profile: PublicArtistProfile =
    result.status === "ok"
      ? result.profile
      : {
          id: handle,
          handle,
          name: displayNameFromHandle(handle),
        };

  // An unparsable date renders nothing rather than "since Invalid Date".
  const joinedLabel = profile.joinedAt ? formatDate(profile.joinedAt, "full") : "";

  // Only a reported `0` means "nothing here yet". When the profile itself could
  // not be fetched the counts are absent, and telling visitors an artist has no
  // tracks because our API call failed would be worse than saying nothing
  // (the unavailable notice above already covers that case).
  const emptyStates =
    result.status === "ok"
      ? [
          ...(profile.songCount === 0
            ? [
                {
                  icon: Music,
                  title: "No tracks yet",
                  description: `${profile.name} hasn't released any music yet. Check back soon.`,
                },
              ]
            : []),
          ...(profile.followersCount === 0
            ? [
                {
                  icon: Users,
                  title: "No followers yet",
                  description: `Nobody follows ${profile.name} yet — be the first to listen.`,
                },
              ]
            : []),
        ]
      : [];

  const structuredData = generateArtistStructuredData({
    name: profile.name,
    handle: profile.handle,
    bio: profile.bio,
    profileImage: profile.profileImage,
    website: profile.website,
    twitter: profile.twitter,
    genres: profile.genres,
    songCount: profile.songCount,
    albumCount: profile.albumCount,
    url: profilePath(handle),
  });

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(structuredData) }} />

      <ErrorBoundary fallbackTitle="This artist profile couldn't be displayed">
        <main
          id="main-content"
          tabIndex={-1}
          className="mx-auto w-full max-w-3xl space-y-10 px-4 py-10 focus:outline-none sm:px-6"
        >
          <ProfileHeader profile={profile} />

          {result.status === "unavailable" && (
            <p
              role="status"
              className="rounded-xl border border-[#2A2A2A] bg-[#161616] p-4 text-sm text-[#A3A3A3]"
            >
              This artist profile is temporarily unavailable. Please try again shortly.
            </p>
          )}

          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STATS.map(({ key, label, icon: Icon }) => {
              const value = profile[key];
              if (typeof value !== "number") return null;
              return (
                <div
                  key={key}
                  className="rounded-2xl border border-[#1F1F1F] bg-[#111111] p-6"
                >
                  <dt className="flex items-center gap-2 text-sm text-[#A3A3A3]">
                    <Icon size={16} aria-hidden="true" />
                    {label}
                  </dt>
                  <dd className="mt-2 text-2xl font-bold text-white">
                    {value.toLocaleString("en-US")}
                  </dd>
                </div>
              );
            })}
          </dl>

          {emptyStates.length > 0 && (
            <section
              aria-label="Nothing to show yet"
              className="grid gap-4 sm:grid-cols-2"
            >
              {emptyStates.map(({ icon: Icon, title, description }) => (
                <ProfileEmptyState
                  key={title}
                  icon={Icon}
                  title={title}
                  description={description}
                />
              ))}
            </section>
          )}

          {profile.genres && profile.genres.length > 0 && (
            <section aria-labelledby="artist-genres">
              <h2 id="artist-genres" className="text-lg font-semibold text-white">
                Genres
              </h2>
              <ul className="mt-3 flex flex-wrap gap-2">
                {profile.genres.map((genre) => (
                  <li
                    key={genre}
                    className="rounded-full bg-[#1E1E1E] px-3 py-1 text-sm text-[#C9C9C9]"
                  >
                    {genre}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {joinedLabel && (
            <p className="text-xs text-[#6F6F6F]">On AudioBlocks since {joinedLabel}</p>
          )}

          <Link
            href="/"
            className="inline-block text-sm text-[#A3A3A3] underline transition-colors hover:text-white"
          >
            Discover more artists on AudioBlocks
          </Link>
        </main>
      </ErrorBoundary>
    </>
  );
}
