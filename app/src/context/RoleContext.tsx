'use client';

import { createContext, useCallback, useContext, useMemo, useState, ReactNode } from 'react';
import { Permission, Role, ROLE_INFO, ROLE_PERMISSION_TABLE } from '@/types/role';

export interface RoleContextValue {
  role: Role;
  info: typeof ROLE_INFO[Role];
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
   * acceptance tests; in a real backend this would be derived from the session.
   */
  setRole: (role: Role) => void;
}

const DEFAULT_ROLE: Role = 'owner';

export const RoleContext = createContext<RoleContextValue | undefined>(undefined);

export interface RoleProviderProps {
  /**
   * Optional initial role. Defaults to `'owner'`.
   */
  initialRole?: Role;
  children: ReactNode;
}

export function RoleProvider({ initialRole = DEFAULT_ROLE, children }: RoleProviderProps) {
  const [role, setRoleState] = useState<Role>(initialRole);

  const permissions = useMemo(() => ROLE_PERMISSION_TABLE[role], [role]);

  const can = useCallback(
    (permission: Permission) => permissions.includes(permission),
    [permissions],
  );

  const cannot = useCallback(
    (permission: Permission) => !permissions.includes(permission),
    [permissions],
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
    [role, permissions, can, cannot, setRole],
  );

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export default RoleProvider;
