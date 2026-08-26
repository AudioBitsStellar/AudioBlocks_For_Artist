"use client";

import { useContext } from "react";
import { RoleContext, RoleContextValue } from "@/context/RoleContext";
import { Permission, Role, ROLE_INFO } from "@/types/role";

/**
 * Access the current user's role + permission helpers.
 *
 * If no `RoleProvider` is mounted, the hook returns a safe default where
 * `role === 'viewer'` and `can(...)` is always `false`. This prevents
 * accidental privilege escalation in untested/legacy code paths.
 */
export function useRole(): RoleContextValue {
  const ctx = useContext(RoleContext);
  if (!ctx) {
    const fallbackPerms: ReadonlyArray<Permission> = [];
    return {
      role: "viewer",
      info: ROLE_INFO.viewer,
      permissions: fallbackPerms,
      can: () => false,
      cannot: () => true,
      setRole: () => {
        /* no-op when provider missing */
      },
    };
  }
  return ctx;
}

export type { Permission, Role };
