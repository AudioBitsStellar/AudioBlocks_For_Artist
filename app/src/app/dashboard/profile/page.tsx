import { USER_ENDPOINTS } from "@/api/api-endpoint";
import { fetchServerBackend } from "@/lib/serverBackend";
import type { ProfileResponse } from "@/types/api";
import ProfilePageClient from "./ProfilePageClient";

export default async function ProfilePage() {
  const initialProfile = await fetchServerBackend<ProfileResponse>(USER_ENDPOINTS.PROFILE);
  return <ProfilePageClient initialProfile={initialProfile} />;
}
