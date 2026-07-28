"use client";

import * as Sentry from "@sentry/nextjs";
import React, { useEffect, ReactNode } from "react";

export interface SentryProviderProps {
  children: ReactNode;
  artistId?: string;
  artistEmail?: string;
}

export function SentryProvider({ children, artistId, artistEmail }: SentryProviderProps) {
  useEffect(() => {
    if (artistId) {
      Sentry.setUser({
        id: artistId,
        email: artistEmail,
        type: "artist",
      });
    } else {
      Sentry.setUser(null);
    }
  }, [artistId, artistEmail]);

  return <>{children}</>;
}

export function setSentryUserContext(artistId: string | null, extra?: Record<string, unknown>) {
  if (artistId) {
    Sentry.setUser({ id: artistId, ...extra });
  } else {
    Sentry.setUser(null);
  }
}
