import "server-only";

import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/lib/session";
import { getBackendBaseUrl } from "@/lib/sessionServer";

export async function fetchServerBackend<T>(endpoint: string): Promise<T | undefined> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return undefined;

  try {
    const response = await fetch(`${getBackendBaseUrl()}${endpoint}`, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    if (response.status === 401) return undefined;
    if (!response.ok) {
      console.error(`Server data prefetch failed (${response.status}) for ${endpoint}`);
      return undefined;
    }

    return (await response.json()) as T;
  } catch (error) {
    console.error(`Server data prefetch failed for ${endpoint}`, error);
    return undefined;
  }
}
