"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from "react";
import { Permission, Role, ROLE_INFO, ROLE_PERMISSION_TABLE } from "@/types/role";
import { getRoleFromToken } from "@/utils/jwt";

export interface RoleContextValue {
  role: Role;
  info: (typeof ROLE_INFO)[Role];
  permissions: ReadonlyArray<Permission>;
  /**
   * Check whether the current role has a given permission.
   */
  can: (permission: Permission) => boolean;
  /**
   * Inverse of {@link can} – useful for readability in conditional rendering.
   */
  cannot: (permission: Permission) => boolean;
  /**
   * Programmatically switch the active role. Mainly useful for demo UIs and
   * acceptance tests; production code should let the role come from the
   * session (see {@link resolveSessionRole}).
   */
  setRole: (role: Role) => void;
}

/**
 * Role used when the caller gives no explicit `initialRole` and the session
 * JWT carries no usable `role` claim. Deliberately the least-privileged role:
 * an unknown session must not be treated as the workspace owner. Mirrors the
 * no-provider fallback in `useRole()`.
 */
const FALLBACK_ROLE: Role = "viewer";

/**
 * Resolve the role to start from: an explicit `initialRole` (tests, Storybook,
 * demo UIs) always wins; otherwise the role claim on the authenticated
 * session JWT; otherwise {@link FALLBACK_ROLE}.
 */
export function resolveSessionRole(explicit?: Role): Role {
  return explicit ?? getRoleFromToken() ?? FALLBACK_ROLE;
}

export const RoleContext = createContext<RoleContextValue | undefined>(undefined);

export interface RoleProviderProps {
  /**
   * Explicit role override for tests, Storybook, and demo UIs. When omitted,
   * the provider derives the role from the authenticated session JWT and
   * falls back to `'viewer'` for an unknown session.
   */
  initialRole?: Role;
  children: ReactNode;
}

export function RoleProvider({ initialRole, children }: RoleProviderProps) {
  const [role, setRoleState] = useState<Role>(() => resolveSessionRole(initialRole));

  // If the provider mounted before the session token was readable, adopt the
  // session role once it is. An explicit `initialRole` is never overridden.
  useEffect(() => {
    if (initialRole) return;
    const sessionRole = getRoleFromToken();
    if (sessionRole && sessionRole !== role) {
      setRoleState(sessionRole);
    }
  }, [initialRole, role]);

  const permissions = useMemo(() => ROLE_PERMISSION_TABLE[role], [role]);

  const can = useCallback(
    (permission: Permission) => permissions.includes(permission),
    [permissions]
  );

  const cannot = useCallback(
    (permission: Permission) => !permissions.includes(permission),
    [permissions]
  );

  const setRole = useCallback((next: Role) => {
    setRoleState(next);
  }, []);

  const value = useMemo<RoleContextValue>(
    () => ({
      role,
      info: ROLE_INFO[role],
      permissions,
      can,
      cannot,
      setRole,
    }),
    [role, permissions, can, cannot, setRole]
  );

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export default RoleProvider;
